import { useEffect, useState } from 'react'
import { getChangeLogs } from '../lib/supabase'
import { DOC_TYPES } from '../lib/documents'

export default function ChangeLog({ documentId, onClose }) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getChangeLogs(documentId).then(data => { setLogs(data || []); setLoading(false) })
  }, [documentId])

  const fmt = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const fmtValue = (key, val) => {
    if (val === null || val === undefined) return '—'
    if (key === 'document_type') return DOC_TYPES[val]?.label ?? val
    return String(val)
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>Change Log</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          {loading && <div style={s.empty}>Loading…</div>}
          {!loading && logs.length === 0 && <div style={s.empty}>No changes recorded yet.</div>}
          {logs.map(log => (
            <div key={log.id} style={s.logEntry}>
              <div style={s.logMeta}>
                <span style={s.logUser}>{log.profiles?.email || 'Unknown'}</span>
                <span style={s.logReason}>{log.reason}</span>
                <span style={s.logTime}>{fmt(log.created_at)}</span>
              </div>
              <div style={s.changes}>
                {Object.entries(log.changes || {}).map(([key, { from, to }]) => (
                  <div key={key} style={s.change}>
                    <span style={s.changeKey}>{key.replace(/_/g, ' ')}</span>
                    <span style={s.changeFrom}>{fmtValue(key, from)}</span>
                    <span style={s.arrow}>→</span>
                    <span style={s.changeTo}>{fmtValue(key, to)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 },
  modal: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #1e1e1e' },
  title: { fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#bf57ff', letterSpacing: '0.06em' },
  closeBtn: { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 },
  body: { padding: '12px 20px', overflowY: 'auto', flex: 1 },
  empty: { color: '#444', fontSize: 13, textAlign: 'center', padding: 24 },
  logEntry: { borderBottom: '1px solid #1a1a1a', paddingBottom: 12, marginBottom: 12 },
  logMeta: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  logUser: { fontSize: 12, color: '#bf57ff', fontWeight: 500 },
  logReason: { fontSize: 10, background: '#1e1e1e', color: '#888', borderRadius: 3, padding: '1px 6px', fontFamily: "'Space Mono',monospace" },
  logTime: { fontSize: 10, color: '#444', marginLeft: 'auto' },
  changes: { display: 'flex', flexDirection: 'column', gap: 4 },
  change: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, flexWrap: 'wrap' },
  changeKey: { color: '#666', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: 120 },
  changeFrom: { color: '#ff8080', textDecoration: 'line-through', fontSize: 11 },
  arrow: { color: '#555', fontSize: 10 },
  changeTo: { color: '#b8ff57', fontSize: 11 },
}
