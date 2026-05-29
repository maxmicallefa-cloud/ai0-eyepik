import { useState } from 'react'
import { MALTESE_TOWNS } from '../lib/documents'

export default function CompanyForm({ company, onSave, onCancel }) {
  const isEdit = !!company
  const [form, setForm] = useState(company || {
    name: '', type: 'self_employed', vat_number: '', id_card_number: '',
    registration_number: '', address: '', town: 'Valletta', postcode: '',
    country: 'Malta', contact_email: '', contact_phone: '',
    fiscal_year_start: '', fiscal_year_end: '', currency: 'EUR', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>{isEdit ? 'Edit Company' : 'New Company'}</span>
          <button style={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div style={s.body}>
          <Row label="Company Name *">
            <input style={s.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Max Consulting Ltd" />
          </Row>

          <Row label="Type">
            <div style={s.toggle}>
              <button style={{ ...s.toggleBtn, ...(form.type === 'self_employed' ? s.toggleActive : {}) }} onClick={() => set('type', 'self_employed')}>Self-Employed</button>
              <button style={{ ...s.toggleBtn, ...(form.type === 'company' ? s.toggleActive : {}) }} onClick={() => set('type', 'company')}>Company</button>
            </div>
          </Row>

          <Row label="VAT Number">
            <input style={s.input} value={form.vat_number || ''} onChange={e => set('vat_number', e.target.value)} placeholder="MT12345678" />
          </Row>

          {form.type === 'self_employed' && (
            <Row label="ID Card Number">
              <input style={s.input} value={form.id_card_number || ''} onChange={e => set('id_card_number', e.target.value)} placeholder="000000A" />
            </Row>
          )}

          {form.type === 'company' && (
            <Row label="MBR Registration No.">
              <input style={s.input} value={form.registration_number || ''} onChange={e => set('registration_number', e.target.value)} placeholder="C12345" />
            </Row>
          )}

          <Row label="Address">
            <input style={s.input} value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </Row>

          <Row label="Town">
            <select style={s.input} value={form.town || ''} onChange={e => set('town', e.target.value)}>
              {MALTESE_TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Row>

          <Row label="Postcode">
            <input style={s.input} value={form.postcode || ''} onChange={e => set('postcode', e.target.value)} placeholder="VLT1000" />
          </Row>

          <Row label="Contact Email">
            <input style={s.input} type="email" value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} />
          </Row>

          <Row label="Contact Phone">
            <input style={s.input} value={form.contact_phone || ''} onChange={e => set('contact_phone', e.target.value)} placeholder="+356 XXXX XXXX" />
          </Row>

          <Row label="Fiscal Year">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...s.input, flex: 1 }} type="date" value={form.fiscal_year_start || ''} onChange={e => set('fiscal_year_start', e.target.value)} />
              <span style={{ color: '#555', fontSize: 11 }}>to</span>
              <input style={{ ...s.input, flex: 1 }} type="date" value={form.fiscal_year_end || ''} onChange={e => set('fiscal_year_end', e.target.value)} />
            </div>
          </Row>

          <Row label="Currency">
            <select style={s.input} value={form.currency || 'EUR'} onChange={e => set('currency', e.target.value)}>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </Row>

          <Row label="Notes">
            <textarea style={{ ...s.input, height: 70, resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </Row>
        </div>

        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Company'}
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e1e1e' },
  title: { fontFamily: "'Space Mono',monospace", fontSize: 13, color: '#bf57ff', letterSpacing: '0.06em' },
  closeBtn: { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 },
  body: { padding: '16px 20px', overflowY: 'auto', flex: 1 },
  input: { width: '100%', background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#e0e0d8', fontSize: 13, outline: 'none', fontFamily: 'inherit' },
  toggle: { display: 'flex', gap: 6 },
  toggleBtn: { flex: 1, padding: '6px 12px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, color: '#888', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  toggleActive: { background: '#bf57ff20', borderColor: '#bf57ff60', color: '#bf57ff' },
  footer: { display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid #1e1e1e' },
  cancelBtn: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { background: '#bf57ff', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
