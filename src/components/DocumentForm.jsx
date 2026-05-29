import { useState, useEffect } from 'react'
import { getDocTypesForCompany, STATUS_LABELS, VAT_RATES } from '../lib/documents'
import { getLineItems } from '../lib/supabase'

export default function DocumentForm({ document: doc, company, onSave, onCancel, isNew }) {
  const [form,      setForm]      = useState({ ...doc, line_items: doc.line_items || [] })
  const [saving,    setSaving]    = useState(false)
  const [tab,       setTab]       = useState('details')
  const [loadingLI, setLoadingLI] = useState(!isNew)

  // Load existing line items for edits
  useEffect(() => {
    if (!isNew && doc.id) {
      getLineItems(doc.id).then(items => {
        setForm(p => ({ ...p, line_items: items }))
        setLoadingLI(false)
      })
    } else {
      setLoadingLI(false)
    }
  }, [doc.id, isNew])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Auto-calculate totals from line items
  const recalcFromLines = (items) => {
    const subtotal   = items.reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0)
    const vat_amount = items.reduce((s, i) => s + (parseFloat(i.vat_amount) || 0), 0)
    setForm(p => ({
      ...p,
      line_items:   items,
      subtotal:     subtotal.toFixed(2),
      vat_amount:   vat_amount.toFixed(2),
      total_amount: (subtotal + vat_amount).toFixed(2),
    }))
  }

  const setLine = (idx, key, val) => {
    const items = [...form.line_items]
    items[idx] = { ...items[idx], [key]: val }
    // Auto-calc line total
    if (key === 'quantity' || key === 'unit_price' || key === 'vat_rate') {
      const qty   = parseFloat(key === 'quantity'  ? val : items[idx].quantity)  || 0
      const price = parseFloat(key === 'unit_price' ? val : items[idx].unit_price) || 0
      const rate  = parseFloat(key === 'vat_rate'   ? val : items[idx].vat_rate)   || 0
      const net   = qty * price
      const vat   = parseFloat((net * rate / 100).toFixed(2))
      items[idx].vat_amount = vat
      items[idx].line_total = parseFloat((net + vat).toFixed(2))
    }
    recalcFromLines(items)
  }

  const addLine = () => {
    const items = [...form.line_items, { description: '', quantity: 1, unit_price: null, vat_rate: 18, vat_amount: null, line_total: null }]
    recalcFromLines(items)
  }

  const removeLine = (idx) => {
    const items = form.line_items.filter((_, i) => i !== idx)
    recalcFromLines(items)
  }

  // Header-level VAT calc
  const handleSubtotalChange = (v) => {
    const sub  = parseFloat(v) || 0
    const rate = parseFloat(form.vat_rate) || 0
    const vat  = parseFloat((sub * rate / 100).toFixed(2))
    setForm(p => ({ ...p, subtotal: v, vat_amount: vat, total_amount: (sub + vat).toFixed(2) }))
  }

  const handleVatRateChange = (v) => {
    const sub  = parseFloat(form.subtotal) || 0
    const rate = parseFloat(v) || 0
    const vat  = parseFloat((sub * rate / 100).toFixed(2))
    setForm(p => ({ ...p, vat_rate: v, vat_amount: vat, total_amount: (sub + vat).toFixed(2) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const docTypes    = getDocTypesForCompany(company.type)
  const confidence  = doc.ai_confidence ? Math.round(doc.ai_confidence * 100) : null
  const confColor   = confidence > 80 ? '#b8ff57' : confidence > 60 ? '#ffd040' : '#ff5040'
  const fmtMoney    = (n) => n != null ? parseFloat(n).toFixed(2) : ''

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <span style={s.title}>{isNew ? 'Review & Confirm Document' : 'Edit Document'}</span>
            {confidence !== null && (
              <span style={{ ...s.confidence, color: confColor }}> — AI Confidence: {confidence}%</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {doc.original_file_url && (
              <a href={doc.original_file_url} target="_blank" rel="noreferrer" style={s.viewFileBtn}>View File ↗</a>
            )}
            <button style={s.closeBtn} onClick={onCancel}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {['details', 'parties', 'amounts', 'lines'].map(t => (
            <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
              {t === 'lines'
                ? `Line Items (${form.line_items?.length || 0})`
                : t.charAt(0).toUpperCase() + t.slice(1)
              }
            </button>
          ))}
        </div>

        <div style={s.body}>

          {/* ── Details tab ─────────────────────────────────────────── */}
          {tab === 'details' && (
            <>
              <Row label="Document Type">
                <select style={s.input} value={form.document_type || ''} onChange={e => set('document_type', e.target.value)}>
                  <option value="">— Select —</option>
                  {Object.entries(docTypes.reduce((acc, dt) => {
                    if (!acc[dt.category]) acc[dt.category] = []
                    acc[dt.category].push(dt); return acc
                  }, {})).map(([cat, types]) => (
                    <optgroup key={cat} label={cat}>
                      {types.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Row>
              <Row label="Document Number">
                <input style={s.input} value={form.document_number || ''} onChange={e => set('document_number', e.target.value)} />
              </Row>
              <div style={s.grid2}>
                <Row label="Document Date">
                  <input style={s.input} type="date" value={form.document_date || ''} onChange={e => set('document_date', e.target.value)} />
                </Row>
                <Row label="Due Date">
                  <input style={s.input} type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
                </Row>
              </div>
              <div style={s.grid2}>
                <Row label="Period From">
                  <input style={s.input} type="date" value={form.period_from || ''} onChange={e => set('period_from', e.target.value)} />
                </Row>
                <Row label="Period To">
                  <input style={s.input} type="date" value={form.period_to || ''} onChange={e => set('period_to', e.target.value)} />
                </Row>
              </div>
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
            </>
          )}

          {/* ── Parties tab ─────────────────────────────────────────── */}
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

          {/* ── Amounts tab ─────────────────────────────────────────── */}
          {tab === 'amounts' && (
            <>
              {form.line_items?.length > 0 && (
                <div style={s.infoBox}>Totals are auto-calculated from line items. Edit individual lines in the Line Items tab.</div>
              )}
              <Row label="Subtotal">
                <input style={s.input} type="number" step="0.01" value={fmtMoney(form.subtotal)} onChange={e => handleSubtotalChange(e.target.value)} />
              </Row>
              <Row label="VAT Rate (%)">
                <select style={s.input} value={form.vat_rate || ''} onChange={e => handleVatRateChange(e.target.value)}>
                  <option value="">—</option>
                  {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </Row>
              <Row label="VAT Amount">
                <input style={s.input} type="number" step="0.01" value={fmtMoney(form.vat_amount)} onChange={e => set('vat_amount', e.target.value)} />
              </Row>
              <Row label="Total Amount">
                <input style={{ ...s.input, fontWeight: 700, color: '#b8ff57', fontSize: 15 }} type="number" step="0.01" value={fmtMoney(form.total_amount)} onChange={e => set('total_amount', e.target.value)} />
              </Row>
            </>
          )}

          {/* ── Line Items tab ───────────────────────────────────────── */}
          {tab === 'lines' && (
            <>
              {loadingLI
                ? <div style={{ color: '#555', fontSize: 12, padding: 12 }}>Loading line items…</div>
                : (
                  <>
                    {form.line_items?.length === 0 && (
                      <div style={s.emptyLines}>No line items yet. Add one below or upload a document with itemised lines.</div>
                    )}
                    {form.line_items?.map((item, idx) => (
                      <div key={idx} style={s.lineItem}>
                        <div style={s.lineTop}>
                          <span style={s.lineNum}>#{idx + 1}</span>
                          <button style={s.removeLineBtn} onClick={() => removeLine(idx)}>✕</button>
                        </div>
                        <Row label="Description">
                          <input style={s.input} value={item.description || ''} onChange={e => setLine(idx, 'description', e.target.value)} placeholder="Item description" />
                        </Row>
                        <div style={s.grid4}>
                          <Row label="Qty">
                            <input style={s.input} type="number" step="0.001" value={item.quantity ?? ''} onChange={e => setLine(idx, 'quantity', e.target.value)} />
                          </Row>
                          <Row label="Unit Price">
                            <input style={s.input} type="number" step="0.01" value={item.unit_price ?? ''} onChange={e => setLine(idx, 'unit_price', e.target.value)} />
                          </Row>
                          <Row label="VAT %">
                            <select style={s.input} value={item.vat_rate ?? ''} onChange={e => setLine(idx, 'vat_rate', e.target.value)}>
                              <option value="">—</option>
                              {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </Row>
                          <Row label="Line Total">
                            <input style={{ ...s.input, color: '#b8ff57', fontWeight: 600 }} type="number" step="0.01" value={item.line_total ?? ''} onChange={e => setLine(idx, 'line_total', e.target.value)} readOnly />
                          </Row>
                        </div>
                      </div>
                    ))}

                    <button style={s.addLineBtn} onClick={addLine}>+ Add Line Item</button>

                    {form.line_items?.length > 0 && (
                      <div style={s.lineTotals}>
                        <div style={s.lineTotalRow}>
                          <span>Subtotal</span>
                          <span>{form.currency || 'EUR'} {fmtMoney(form.subtotal)}</span>
                        </div>
                        <div style={s.lineTotalRow}>
                          <span>VAT</span>
                          <span>{form.currency || 'EUR'} {fmtMoney(form.vat_amount)}</span>
                        </div>
                        <div style={{ ...s.lineTotalRow, ...s.lineTotalFinal }}>
                          <span>Total</span>
                          <span>{form.currency || 'EUR'} {fmtMoney(form.total_amount)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )
              }
            </>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving || !form.document_type}>
            {saving ? 'Saving…' : isNew ? 'Save Document' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 4, letterSpacing: '0.04em' }}>{label}</div>
      {children}
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, width: '100%', maxWidth: 620, maxHeight: '93vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 18px', borderBottom: '1px solid #1e1e1e', gap: 12 },
  title: { fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#bf57ff', letterSpacing: '0.06em' },
  confidence: { fontSize: 10, fontFamily: "'Space Mono',monospace" },
  viewFileBtn: { fontSize: 11, color: '#bf57ff', textDecoration: 'none', border: '1px solid #bf57ff30', borderRadius: 4, padding: '3px 8px' },
  closeBtn: { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 },
  tabs: { display: 'flex', borderBottom: '1px solid #1e1e1e', overflowX: 'auto' },
  tab: { padding: '8px 14px', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' },
  tabActive: { color: '#bf57ff', borderBottomColor: '#bf57ff' },
  body: { padding: '14px 18px', overflowY: 'auto', flex: 1 },
  sectionLabel: { fontSize: 9, color: '#555', letterSpacing: '0.12em', fontFamily: "'Space Mono',monospace", marginBottom: 10 },
  input: { width: '100%', background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#e0e0d8', fontSize: 13, outline: 'none', fontFamily: 'inherit' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 },
  infoBox: { background: '#1a1a2a', border: '1px solid #2a2a4a', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#8888cc', marginBottom: 12 },
  lineItem: { background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 12px', marginBottom: 8 },
  lineTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lineNum: { fontSize: 10, color: '#555', fontFamily: "'Space Mono',monospace" },
  removeLineBtn: { background: 'transparent', border: 'none', color: '#ff5040', cursor: 'pointer', fontSize: 11 },
  addLineBtn: { width: '100%', background: 'transparent', border: '1px dashed #2a2a2a', borderRadius: 6, padding: '8px', color: '#666', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', marginTop: 4 },
  emptyLines: { color: '#555', fontSize: 12, textAlign: 'center', padding: '20px 0', marginBottom: 12 },
  lineTotals: { background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 8, padding: '12px 14px', marginTop: 12 },
  lineTotalRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', padding: '3px 0' },
  lineTotalFinal: { color: '#b8ff57', fontWeight: 700, fontSize: 14, fontFamily: "'Space Mono',monospace", borderTop: '1px solid #2a2a2a', marginTop: 6, paddingTop: 6 },
  footer: { display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 18px', borderTop: '1px solid #1e1e1e' },
  cancelBtn: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { background: '#bf57ff', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
