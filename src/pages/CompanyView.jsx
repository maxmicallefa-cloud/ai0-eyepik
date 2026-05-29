import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  supabase, getDocuments, createDocument, updateDocument,
  confirmDocument, rejectDocument, deleteDocument, exportToCSV
} from '../lib/supabase'
import { DOC_TYPES, STATUS_LABELS, CATEGORIES } from '../lib/documents'
import UploadZone from '../components/UploadZone'
import DocumentForm from '../components/DocumentForm'
import ChangeLog from '../components/ChangeLog'

export default function CompanyView() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { user, isSuperAdmin } = useAuth()

  const [company,     setCompany]     = useState(null)
  const [documents,   setDocuments]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showUpload,  setShowUpload]  = useState(false)
  const [editDoc,     setEditDoc]     = useState(null)
  const [newDoc,      setNewDoc]      = useState(null)
  const [changeLogId, setChangeLogId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType,   setFilterType]   = useState('all')
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    loadAll()
  }, [companyId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [{ data: co }, docs] = await Promise.all([
        supabase.from('eyepik_companies').select('*').eq('id', companyId).single(),
        getDocuments(companyId),
      ])
      setCompany(co)
      setDocuments(docs)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  // ── Document actions ──────────────────────────────────────────────────────
  const handleDocumentReady = (extracted) => {
    setShowUpload(false)
    setNewDoc(extracted)
  }

  const handleSaveNew = async (form) => {
    const doc = await createDocument(form)
    setDocuments(p => [doc, ...p])
    setNewDoc(null)
  }

  const handleSaveEdit = async (form) => {
    const doc = await updateDocument(editDoc.id, form, user.id)
    setDocuments(p => p.map(d => d.id === doc.id ? doc : d))
    setEditDoc(null)
  }

  const handleConfirm = async (id) => {
    const doc = await confirmDocument(id, user.id)
    setDocuments(p => p.map(d => d.id === doc.id ? doc : d))
  }

  const handleReject = async (id) => {
    const doc = await rejectDocument(id, user.id)
    setDocuments(p => p.map(d => d.id === doc.id ? doc : d))
  }

  const handleDelete = async (id) => {
    await deleteDocument(id)
    setDocuments(p => p.filter(d => d.id !== id))
    setConfirmDel(null)
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = documents.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterType !== 'all' && d.document_type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        d.document_number?.toLowerCase().includes(q) ||
        d.supplier_name?.toLowerCase().includes(q) ||
        d.customer_name?.toLowerCase().includes(q) ||
        DOC_TYPES[d.document_type]?.label?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = {
    total:     documents.length,
    pending:   documents.filter(d => d.status === 'pending' || d.status === 'ai_processed').length,
    confirmed: documents.filter(d => d.status === 'confirmed').length,
    totalAmount: documents.filter(d => d.status === 'confirmed').reduce((s, d) => s + (d.total_amount || 0), 0),
  }

  const fmt = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const fmtMoney = (n) => n ? new Intl.NumberFormat('en-MT', { minimumFractionDigits: 2 }).format(n) : '—'

  if (loading) return <div style={s.loading}>Loading…</div>
  if (!company) return <div style={s.loading}>Company not found.</div>

  const docTypeOptions = [...new Set(documents.map(d => d.document_type).filter(Boolean))]

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => navigate('/')}>← Companies</button>
          <div>
            <div style={s.companyName}>{company.name}</div>
            <div style={s.companyType}>{company.type === 'company' ? 'Limited Company' : 'Self-Employed'} • {company.town}</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <button style={s.exportBtn} onClick={() => exportToCSV(documents.filter(d => d.status === 'confirmed'), company.name)}>
            ↓ Export CSV
          </button>
          <button style={s.uploadBtn} onClick={() => setShowUpload(true)}>+ Upload Document</button>
        </div>
      </header>

      <main style={s.main}>
        {/* Stats */}
        <div style={s.stats}>
          <Stat label="TOTAL DOCS" value={stats.total} />
          <Stat label="AWAITING REVIEW" value={stats.pending} color="#ffd040" />
          <Stat label="CONFIRMED" value={stats.confirmed} color="#b8ff57" />
          <Stat label="CONFIRMED TOTAL" value={`€${fmtMoney(stats.totalAmount)}`} color="#bf57ff" mono />
        </div>

        {/* Filters */}
        <div style={s.filters}>
          <input style={s.search} placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
          <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={s.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {docTypeOptions.map(t => <option key={t} value={t}>{DOC_TYPES[t]?.label ?? t}</option>)}
          </select>
        </div>

        {/* Documents table */}
        {filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 10 }}>📄</div>
            <div style={{ fontSize: 13, color: '#555' }}>No documents found.</div>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Type','Number','Date','Supplier','Total','Status',''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => {
                  const statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.pending
                  return (
                    <tr key={doc.id} style={s.tr}>
                      <td style={s.td}>
                        <div style={s.docType}>{DOC_TYPES[doc.document_type]?.label ?? doc.document_type ?? '—'}</div>
                        {doc.original_file_url && (
                          <a href={doc.original_file_url} target="_blank" rel="noreferrer" style={s.fileLink}>📎 file</a>
                        )}
                      </td>
                      <td style={s.td}>{doc.document_number || '—'}</td>
                      <td style={s.td}>{fmt(doc.document_date)}</td>
                      <td style={s.td}>{doc.supplier_name || doc.customer_name || '—'}</td>
                      <td style={{ ...s.td, fontFamily: "'Space Mono',monospace", color: '#b8ff57' }}>
                        {doc.total_amount ? `${doc.currency || 'EUR'} ${fmtMoney(doc.total_amount)}` : '—'}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.statusBadge, color: statusInfo.color, borderColor: statusInfo.color + '40', background: statusInfo.color + '15' }}>
                          {statusInfo.label}
                        </span>
                        {doc.ai_confidence && <div style={s.confidence}>AI: {Math.round(doc.ai_confidence * 100)}%</div>}
                      </td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                        <div style={s.docActions}>
                          <button style={s.iconBtn} onClick={() => setEditDoc(doc)} title="Edit">✏️</button>
                          {(doc.status === 'ai_processed' || doc.status === 'pending') && (
                            <>
                              <button style={{ ...s.iconBtn, color: '#b8ff57' }} onClick={() => handleConfirm(doc.id)} title="Confirm">✓</button>
                              <button style={{ ...s.iconBtn, color: '#ff5040' }} onClick={() => handleReject(doc.id)} title="Reject">✗</button>
                            </>
                          )}
                          <button style={s.iconBtn} onClick={() => setChangeLogId(doc.id)} title="History">🕐</button>
                          <button style={{ ...s.iconBtn, color: '#ff5040' }} onClick={() => setConfirmDel(doc)} title="Delete">🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modals */}
      {showUpload && <UploadZone company={company} userId={user.id} onDocumentReady={handleDocumentReady} onCancel={() => setShowUpload(false)} />}
      {newDoc && <DocumentForm document={newDoc} company={company} onSave={handleSaveNew} onCancel={() => setNewDoc(null)} isNew />}
      {editDoc && <DocumentForm document={editDoc} company={company} onSave={handleSaveEdit} onCancel={() => setEditDoc(null)} />}
      {changeLogId && <ChangeLog documentId={changeLogId} onClose={() => setChangeLogId(null)} />}

      {confirmDel && (
        <div style={s.confirmOverlay}>
          <div style={s.confirmModal}>
            <p style={{ fontSize: 13, color: '#ccc', marginBottom: 14, lineHeight: 1.6 }}>
              Delete document <strong>{confirmDel.document_number || confirmDel.document_type}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={s.cancelBtn} onClick={() => setConfirmDel(null)}>Cancel</button>
              <button style={s.delBtn} onClick={() => handleDelete(confirmDel.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color, mono }) {
  return (
    <div style={s.statCard}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: mono ? 14 : 22, fontWeight: 700, color: color || '#b8ff57' }}>{value}</div>
      <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.1em', marginTop: 3 }}>{label}</div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#0e0e0e', color: '#e0e0d8', fontFamily: "'Inter',sans-serif" },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#555' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', minHeight: 56, background: '#111', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, zIndex: 20, flexWrap: 'wrap', gap: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backBtn: { background: 'transparent', border: 'none', color: '#bf57ff', cursor: 'pointer', fontSize: 12, fontFamily: "'Space Mono',monospace", padding: 0 },
  companyName: { fontSize: 15, fontWeight: 600, color: '#e0e0d8' },
  companyType: { fontSize: 10, color: '#555', fontFamily: "'Space Mono',monospace" },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  exportBtn: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' },
  uploadBtn: { background: '#bf57ff', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  main: { maxWidth: 1200, margin: '0 auto', padding: '24px' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 24 },
  statCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '14px 16px' },
  filters: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  search: { background: '#161616', border: '1px solid #222', borderRadius: 6, padding: '6px 12px', color: '#ccc', fontSize: 12, outline: 'none', flex: 1, minWidth: 160, fontFamily: 'inherit' },
  select: { background: '#161616', border: '1px solid #222', borderRadius: 6, padding: '6px 10px', color: '#ccc', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#444' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '8px 12px', color: '#555', fontSize: 9, letterSpacing: '0.08em', borderBottom: '1px solid #1a1a1a', fontWeight: 500, fontFamily: "'Space Mono',monospace" },
  tr: { borderBottom: '1px solid #111' },
  td: { padding: '10px 12px', color: '#bbb', verticalAlign: 'middle' },
  docType: { fontSize: 12, color: '#e0e0d8', fontWeight: 500, marginBottom: 2 },
  fileLink: { fontSize: 10, color: '#bf57ff', textDecoration: 'none' },
  statusBadge: { fontSize: 10, border: '1px solid', borderRadius: 4, padding: '2px 7px', fontFamily: "'Space Mono',monospace", display: 'inline-block' },
  confidence: { fontSize: 9, color: '#444', fontFamily: "'Space Mono',monospace", marginTop: 2 },
  docActions: { display: 'flex', gap: 4, alignItems: 'center' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 3px', color: '#888' },
  confirmOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  confirmModal: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, padding: '20px', width: 320 },
  cancelBtn: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 4, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  delBtn: { background: '#ff4040', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
