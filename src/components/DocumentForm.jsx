import { useState } from 'react'
import { DOC_TYPES, getDocTypesForCompany, STATUS_LABELS, VAT_RATES } from '../lib/documents'

export default function DocumentForm({ document: doc, company, onSave, onCancel, isNew }) {
  const [form,   setForm]   = useState(doc)
  const [saving, setSaving] = useState(false)
  const [tab,    setTab]    = useState('details')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Auto-calculate VAT
  const handleSubtotalChange = (v) => {
    const sub = parseFloat(v) || 0
    const rate = parseFloat(form.vat_rate) || 0
    const vat = parseFloat((sub * rate / 100).toFixed(2))
    setForm(p => ({ ...p, subtotal: v, vat_amount: vat, total_amount: (sub + vat).toFixed(2) }))
  }

  const handleVatRateChange = (v) => {
    const sub = parseFloat(form.subtotal) || 0
    const rate = parseFloat(v) || 0
    const vat = parseFloat((sub * rate / 100).toFixed(2))
    setForm(p => ({ ...p, vat_rate: v, vat_amount: vat, total_amount: (sub + vat).toFixed(2) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const docTypes = getDocTypesForCompany(company.type)
  const confidence = doc.ai_confidence ? Math.round(doc.ai_confidence * 100) : null
  const confColor = confidence > 80 ? '#b8ff57' : confidence > 60 ? '#ffd040' : '#ff5040'

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <span style={s.title}>{isNew ? 'Review & Confirm Document' : 'Edit Document'}</span>
            {confidence !== null && (
              <span style={{ ...s.confidence, color: confColor }}>
                AI Confidence: {confidence}%
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {doc.original_file_url && (
              <a href={doc.original_file_url} target="_blank" rel="noreferrer" style={s.viewFileBtn}>
                View File ↗
              </a>
            )}
            <button style={s.closeBtn} onClick={onCancel}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {['details', 'parties', 'amounts'].map(t => (
            <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={s.body}>
          {tab === 'details' && (
            <>
              <Row label="Document Type">
                <select style={s.input} value={form.document_type || ''} onChange={e => set('document_type', e.target.value)}>
                  <option value="">— Select —</option>
                  {Object.entries(
                    docTypes.reduce((acc, dt) => {
                      if (!acc[dt.category]) acc[dt.category] = []
                      acc[dt.category].push(dt)
                      return acc
                    }, {})
                  ).map(([cat, types]) => (
                    <optgroup key={cat} label={cat}>
                      {types.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Row>
              <Row label="Document Number">
                <input style={s.input} value={form.document_number || ''} onChange={e => set('document_number', e.target.value)} />
              </Row>
              <Row label="Document Date">
                <input style={s.input} type="date" value={form.document_date || ''} onChange={e => set('document_date', e.target.value)} />
              </Row>
              <Row label="Due Date">
                <input style={s.input} type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
              </Row>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Row label="Period From">
                  <input style={s.input} type="date" value={form.period_from || ''} onChange={e => set('period_from', e.target.value)} />
                </Row>
                <Row label="Period To">
                  <input style={s.input} type="date" value={form.period_to || ''} onChange={e => set('period_to', e.target.value)} />
                </Row>
              </div>
              <Row label="Currency">
                <select style={s.input} value={form.currency || 'EUR'} onChange={e => set('currency', e.target.value)}>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                </select>
              </Row>
              <Row label="Notes">
                <textarea style={{ ...s.input, height: 70, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
              </Row>
            </>
          )}

          {tab === 'parties' && (
            <>
              <div style={s.sectionLabel}>SUPPLIER</div>
              <Row label="Name"><input style={s.input} value={form.supplier_name || ''} onChange={e => set('supplier_name', e.target.value)} /></Row>
              <Row label="VAT Number"><input style={s.input} value={form.supplier_vat || ''} onChange={e => set('supplier_vat', e.target.value)} /></Row>
              <Row label="Address"><textarea style={{ ...s.input, height: 60, resize: 'vertical' }} value={form.supplier_address || ''} onChange={e => set('supplier_address', e.target.value)} /></Row>

              <div style={{ ...s.sectionLabel, marginTop: 16 }}>CUSTOMER</div>
              <Row label="Name"><input style={s.input} value={form.customer_name || ''} onChange={e => set('customer_name', e.target.value)} /></Row>
              <Row label="VAT Number"><input style={s.input} value={form.customer_vat || ''} onChange={e => set('customer_vat', e.target.value)} /></Row>
              <Row label="Address"><textarea style={{ ...s.input, height: 60, resize: 'vertical' }} value={form.customer_address || ''} onChange={e => set('customer_address', e.target.value)} /></Row>
            </>
          )}

          {tab === 'amounts' && (
            <>
              <Row label="Subtotal">
                <input style={s.input} type="number" step="0.01" value={form.subtotal || ''} onChange={e => handleSubtotalChange(e.target.value)} />
              </Row>
              <Row label="VAT Rate (%)">
                <select style={s.input} value={form.vat_rate || ''} onChange={e => handleVatRateChange(e.target.value)}>
                  <option value="">—</option>
                  {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </Row>
              <Row label="VAT Amount">
                <input style={s.input} type="number" step="0.01" value={form.vat_amount || ''} onChange={e => set('vat_amount', e.target.value)} />
              </Row>
              <Row label="Total Amount">
                <input style={{ ...s.input, fontWeight: 600, color: '#b8ff57' }} type="number" step="0.01" value={form.total_amount || ''} onChange={e => set('total_amount', e.target.value)} />
              </Row>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Save Document' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 5, letterSpacing: '0.04em' }}>{label}</div>
      {children}
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 20px', borderBottom: '1px solid #1e1e1e', gap: 12 },
  title: { fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#bf57ff', letterSpacing: '0.06em', display: 'block', marginBottom: 3 },
  confidence: { fontSize: 10, fontFamily: "'Space Mono',monospace" },
  viewFileBtn: { fontSize: 11, color: '#bf57ff', textDecoration: 'none', border: '1px solid #bf57ff30', borderRadius: 4, padding: '3px 8px' },
  closeBtn: { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 },
  tabs: { display: 'flex', borderBottom: '1px solid #1e1e1e' },
  tab: { flex: 1, padding: '8px', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', borderBottom: '2px solid transparent', marginBottom: -1 },
  tabActive: { color: '#bf57ff', borderBottomColor: '#bf57ff' },
  body: { padding: '14px 20px', overflowY: 'auto', flex: 1 },
  sectionLabel: { fontSize: 9, color: '#555', letterSpacing: '0.12em', fontFamily: "'Space Mono',monospace", marginBottom: 10 },
  input: { width: '100%', background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#e0e0d8', fontSize: 13, outline: 'none', fontFamily: 'inherit' },
  footer: { display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid #1e1e1e' },
  cancelBtn: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { background: '#bf57ff', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
