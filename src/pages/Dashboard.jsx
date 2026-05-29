import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../lib/supabase'
import CompanyForm from '../components/CompanyForm'

const TYPE_LABELS = { self_employed: 'Self-Employed', company: 'Company' }

export default function Dashboard() {
  const { user, signOut, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [companies,    setCompanies]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editCompany,  setEditCompany]  = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    if (!user) return
    loadCompanies()
  }, [user])

  const loadCompanies = async () => {
    setLoading(true)
    try {
      const data = await getCompanies(user.id, isSuperAdmin)
      setCompanies(data)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const handleCreate = async (form) => {
    const c = await createCompany(user.id, form)
    setCompanies(p => [c, ...p])
    setShowForm(false)
  }

  const handleUpdate = async (form) => {
    const c = await updateCompany(editCompany.id, form)
    setCompanies(p => p.map(x => x.id === c.id ? c : x))
    setEditCompany(null)
  }

  const handleDelete = async (id) => {
    await deleteCompany(id)
    setCompanies(p => p.filter(c => c.id !== id))
    setConfirmDel(null)
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.town?.toLowerCase().includes(search.toLowerCase())
  )

  const name = user?.user_metadata?.full_name || user?.email || ''
  const avatar = user?.user_metadata?.avatar_url

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>EYE<span style={{ color: '#e0e0d8' }}>PIK</span></span>
        </div>
        <div style={s.headerRight}>
          <div style={s.userChip}>
            {avatar
              ? <img src={avatar} style={s.avatar} alt={name} />
              : <div style={s.avatarFb}>{name[0]?.toUpperCase()}</div>
            }
            <span style={s.userName}>{name.split(' ')[0]}</span>
            {isSuperAdmin && <span style={s.superBadge}>ADMIN</span>}
          </div>
          <a href={import.meta.env.VITE_LANDING_URL || '/'} style={s.backBtn}>← Dashboard</a>
          <button style={s.signOutBtn} onClick={signOut}>Sign out</button>
        </div>
      </header>

      {/* Main */}
      <main style={s.main}>
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Companies</h1>
            <p style={s.pageSub}>{companies.length} compan{companies.length !== 1 ? 'ies' : 'y'}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              style={s.search}
              placeholder="Search companies…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button style={s.newBtn} onClick={() => setShowForm(true)}>+ New Company</button>
          </div>
        </div>

        {loading && <div style={s.empty}>Loading…</div>}

        {!loading && filtered.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
              {search ? 'No companies match your search.' : 'No companies yet.'}
            </div>
            {!search && (
              <button style={s.newBtn} onClick={() => setShowForm(true)}>Create your first company</button>
            )}
          </div>
        )}

        <div style={s.grid}>
          {filtered.map(company => (
            <div key={company.id} style={s.card} onClick={() => navigate(`/company/${company.id}`)}>
              <div style={s.cardTop}>
                <div style={s.companyIcon}>
                  {company.type === 'company' ? '🏢' : '👤'}
                </div>
                <div style={s.cardActions} onClick={e => e.stopPropagation()}>
                  <button style={s.actionBtn} onClick={() => setEditCompany(company)} title="Edit">✏️</button>
                  <button style={{ ...s.actionBtn, color: '#ff5040' }} onClick={() => setConfirmDel(company)} title="Delete">🗑</button>
                </div>
              </div>
              <div style={s.companyName}>{company.name}</div>
              <div style={s.companyType}>{TYPE_LABELS[company.type]}</div>
              {company.town && <div style={s.companyMeta}>📍 {company.town}, {company.country}</div>}
              {company.vat_number && <div style={s.companyMeta}>VAT: {company.vat_number}</div>}
              {company.contact_email && <div style={s.companyMeta}>✉️ {company.contact_email}</div>}
              <div style={s.viewDocs}>View Documents →</div>
            </div>
          ))}
        </div>
      </main>

      {/* Modals */}
      {showForm && (
        <CompanyForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {editCompany && (
        <CompanyForm company={editCompany} onSave={handleUpdate} onCancel={() => setEditCompany(null)} />
      )}
      {confirmDel && (
        <div style={s.confirmOverlay}>
          <div style={s.confirmModal}>
            <p style={s.confirmText}>Delete <strong>{confirmDel.name}</strong>? All documents will be permanently deleted.</p>
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

const s = {
  root: { minHeight: '100vh', background: '#0e0e0e', color: '#e0e0d8', fontFamily: "'Inter',sans-serif" },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 52, background: '#111', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, zIndex: 20 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  logo: { fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: '#bf57ff', letterSpacing: '0.08em' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  userChip: { display: 'flex', alignItems: 'center', gap: 7, background: '#161616', border: '1px solid #222', borderRadius: 20, padding: '3px 10px 3px 4px' },
  avatar: { width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' },
  avatarFb: { width: 24, height: 24, borderRadius: '50%', background: '#bf57ff25', color: '#bf57ff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 12, color: '#ccc' },
  superBadge: { fontSize: 8, color: '#bf57ff', fontFamily: "'Space Mono',monospace", letterSpacing: '0.06em', background: '#bf57ff20', borderRadius: 3, padding: '1px 5px' },
  backBtn: { fontSize: 11, color: '#555', textDecoration: 'none', fontFamily: "'Space Mono',monospace" },
  signOutBtn: { background: 'transparent', color: '#444', border: '1px solid #1e1e1e', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' },
  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2 },
  pageSub: { fontSize: 12, color: '#555' },
  search: { background: '#161616', border: '1px solid #222', borderRadius: 6, padding: '7px 12px', color: '#ccc', fontSize: 12, outline: 'none', width: 200, fontFamily: 'inherit' },
  newBtn: { background: '#bf57ff', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#444' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px', cursor: 'pointer', transition: 'border-color 0.1s', display: 'flex', flexDirection: 'column', gap: 4 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  companyIcon: { fontSize: 28 },
  cardActions: { display: 'flex', gap: 4, opacity: 0.5 },
  actionBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px' },
  companyName: { fontSize: 15, fontWeight: 600, color: '#e0e0d8' },
  companyType: { fontSize: 10, color: '#bf57ff', fontFamily: "'Space Mono',monospace", letterSpacing: '0.06em', marginBottom: 4 },
  companyMeta: { fontSize: 11, color: '#666' },
  viewDocs: { fontSize: 11, color: '#bf57ff', marginTop: 10 },
  confirmOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  confirmModal: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, padding: '20px', width: 320 },
  confirmText: { fontSize: 13, color: '#ccc', marginBottom: 16, lineHeight: 1.6 },
  cancelBtn: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 4, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  delBtn: { background: '#ff4040', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
