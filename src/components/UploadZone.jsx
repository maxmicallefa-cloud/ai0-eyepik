import { useState, useRef } from 'react'
import { uploadDocumentFile, extractDocumentWithAI } from '../lib/supabase'

export default function UploadZone({ company, userId, onDocumentReady, onCancel }) {
  const [stage,    setStage]    = useState('idle')   // idle | uploading | processing | done | error
  const [preview,  setPreview]  = useState(null)
  const [progress, setProgress] = useState('')
  const [error,    setError]    = useState(null)
  const fileRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError(null)

    // Preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }

    try {
      // Step 1: Upload to Supabase Storage
      setStage('uploading')
      setProgress('Uploading file…')
      const { url, type, path } = await uploadDocumentFile(file, company.id, userId)

      // Step 2: AI extraction
      setStage('processing')
      setProgress('Reading document with AI…')
      const extracted = await extractDocumentWithAI(file, company.type)

      setStage('done')
      onDocumentReady({
        ...extracted,
        company_id: company.id,
        user_id: userId,
        status: 'ai_processed',
        original_file_url: url,
        original_file_type: type,
        original_file_path: path,
      })
    } catch (e) {
      setStage('error')
      setError(e.message)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handlePaste = (e) => {
    const file = e.clipboardData.files[0]
    if (file) handleFile(file)
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>Upload Document — {company.name}</span>
          <button style={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        {stage === 'idle' && (
          <div
            style={s.dropZone}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onPaste={handlePaste}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
            <div style={s.dropIcon}>📄</div>
            <div style={s.dropText}>Drop a file, paste, or click to browse</div>
            <div style={s.dropSub}>Images (JPG, PNG) or PDF</div>
          </div>
        )}

        {(stage === 'uploading' || stage === 'processing') && (
          <div style={s.processingPane}>
            {preview && <img src={preview} alt="preview" style={s.previewImg} />}
            <div style={s.spinner}>⟳</div>
            <div style={s.progressText}>{progress}</div>
            <div style={s.progressSub}>
              {stage === 'processing' ? 'Claude is reading your document…' : 'Uploading securely…'}
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div style={s.errorPane}>
            <div style={s.errorIcon}>⚠️</div>
            <div style={s.errorText}>{error}</div>
            <button style={s.retryBtn} onClick={() => setStage('idle')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, width: '100%', maxWidth: 480 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e1e1e' },
  title: { fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#bf57ff', letterSpacing: '0.06em' },
  closeBtn: { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 },
  dropZone: { margin: 20, border: '2px dashed #2a2a2a', borderRadius: 10, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'border-color 0.15s' },
  dropIcon: { fontSize: 40, opacity: 0.5 },
  dropText: { fontSize: 14, color: '#ccc', fontWeight: 500 },
  dropSub: { fontSize: 11, color: '#555' },
  processingPane: { padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  previewImg: { width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 6, opacity: 0.6 },
  spinner: { fontSize: 32, color: '#bf57ff', animation: 'spin 1s linear infinite' },
  progressText: { fontSize: 14, color: '#ccc', fontWeight: 500 },
  progressSub: { fontSize: 11, color: '#555' },
  errorPane: { padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  errorIcon: { fontSize: 36 },
  errorText: { fontSize: 13, color: '#ff8080', textAlign: 'center' },
  retryBtn: { background: '#bf57ff', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
