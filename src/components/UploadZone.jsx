import { useState, useRef } from 'react'
import { uploadDocumentFile, extractDocumentWithAI } from '../lib/supabase'

export default function UploadZone({ company, userId, onDocumentReady, onCancel }) {
  const [stage,    setStage]    = useState('idle')
  const [pages,    setPages]    = useState([])   // { file, preview, url, type, path }
  const [progress, setProgress] = useState('')
  const [error,    setError]    = useState(null)

  const fileRef   = useRef(null)
  const cameraRef = useRef(null)

  // Add one or more files as pages
  const addFiles = (files) => {
    const newPages = Array.from(files).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }))
    setPages(p => [...p, ...newPages])
  }

  const removePage = (idx) => setPages(p => p.filter((_, i) => i !== idx))

  const handleDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }
  const handlePaste = (e) => { if (e.clipboardData.files.length) addFiles(e.clipboardData.files) }

  const handleProcess = async () => {
    if (pages.length === 0) return
    setError(null)

    try {
      // Step 1: Upload all files
      setStage('uploading')
      const uploaded = []
      for (let i = 0; i < pages.length; i++) {
        setProgress(`Uploading page ${i + 1} of ${pages.length}…`)
        const result = await uploadDocumentFile(pages[i].file, company.id, userId)
        uploaded.push({ ...result, file: pages[i].file })
      }

      // Step 2: AI reads all pages together
      setStage('processing')
      setProgress(`Reading ${pages.length} page${pages.length > 1 ? 's' : ''} with AI…`)
      const extracted = await extractDocumentWithAI(
        uploaded.map(u => u.file),
        company.type
      )

      setStage('done')
      onDocumentReady({
        ...extracted,
        company_id:         company.id,
        user_id:            userId,
        status:             'ai_processed',
        original_file_url:  uploaded[0].url,      // primary file
        original_file_type: uploaded[0].type,
        original_file_path: uploaded[0].path,
        // Store all page URLs in notes if multiple
        notes: extracted.notes || (uploaded.length > 1
          ? `Multi-page document (${uploaded.length} pages). Pages: ${uploaded.map(u => u.url).join(', ')}`
          : null),
      })
    } catch (e) {
      setStage('error')
      setError(e.message)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>Upload Document — {company.name}</span>
          <button style={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        {/* Idle: show add options + page list */}
        {(stage === 'idle' || stage === 'idle') && stage !== 'uploading' && stage !== 'processing' && stage !== 'error' && (
          <div style={s.body}>
            <input ref={fileRef}   type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment"    style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />

            {/* Add buttons */}
            <div style={s.addBtns}>
              <button style={s.cameraBtn} onClick={() => cameraRef.current?.click()}>
                <span style={{ fontSize: 24 }}>📷</span>
                <div>
                  <div style={s.btnTitle}>Take Photo</div>
                  <div style={s.btnSub}>Capture a page</div>
                </div>
              </button>
              <button style={s.browseBtn} onClick={() => fileRef.current?.click()}>
                <span style={{ fontSize: 24 }}>📁</span>
                <div>
                  <div style={s.btnTitle}>Browse Files</div>
                  <div style={s.btnSub}>Images or PDF</div>
                </div>
              </button>
            </div>

            {/* Drop zone */}
            <div
              style={s.dropZone}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onPaste={handlePaste}
              onClick={() => fileRef.current?.click()}
            >
              Drop files here or paste
            </div>

            {/* Pages list */}
            {pages.length > 0 && (
              <>
                <div style={s.pagesLabel}>
                  {pages.length} page{pages.length !== 1 ? 's' : ''} ready
                  <span style={s.pagesHint}> — add more or process</span>
                </div>
                <div style={s.pagesList}>
                  {pages.map((p, i) => (
                    <div key={i} style={s.pageItem}>
                      {p.preview
                        ? <img src={p.preview} alt={`Page ${i+1}`} style={s.pageThumb} />
                        : <div style={s.pagePdf}>PDF</div>
                      }
                      <div style={s.pageNum}>Page {i + 1}</div>
                      <button style={s.removePageBtn} onClick={() => removePage(i)}>✕</button>
                    </div>
                  ))}
                  {/* Add more page button */}
                  <button style={s.addMoreBtn} onClick={() => cameraRef.current?.click()}>
                    <span style={{ fontSize: 20 }}>+</span>
                    <span style={{ fontSize: 10, color: '#888' }}>Add page</span>
                  </button>
                </div>

                <button style={s.processBtn} onClick={handleProcess}>
                  Process {pages.length} page{pages.length !== 1 ? 's' : ''} with AI →
                </button>
              </>
            )}
          </div>
        )}

        {/* Processing */}
        {(stage === 'uploading' || stage === 'processing') && (
          <div style={s.processingPane}>
            <div style={s.pagesThumbs}>
              {pages.slice(0, 4).map((p, i) => (
                p.preview
                  ? <img key={i} src={p.preview} alt="" style={s.processingThumb} />
                  : <div key={i} style={{ ...s.processingThumb, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 10 }}>PDF</div>
              ))}
            </div>
            <div style={s.spinner} />
            <div style={s.progressText}>{progress}</div>
            <div style={s.progressSub}>
              {stage === 'processing'
                ? pages.length > 1
                  ? `Claude is reading all ${pages.length} pages together…`
                  : 'Claude is reading your document…'
                : 'Uploading securely…'
              }
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div style={s.errorPane}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div style={s.errorText}>{error}</div>
            <button style={s.retryBtn} onClick={() => setStage('idle')}>Try Again</button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #1e1e1e', flexShrink: 0 },
  title: { fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#bf57ff', letterSpacing: '0.06em' },
  closeBtn: { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 },
  body: { padding: 16, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 },
  addBtns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  cameraBtn: { display: 'flex', alignItems: 'center', gap: 10, background: '#bf57ff15', border: '1px solid #bf57ff40', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' },
  browseBtn: { display: 'flex', alignItems: 'center', gap: 10, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' },
  btnTitle: { fontSize: 13, fontWeight: 600, color: '#e0e0d8', marginBottom: 2 },
  btnSub: { fontSize: 10, color: '#888' },
  dropZone: { border: '2px dashed #2a2a2a', borderRadius: 8, padding: '14px', textAlign: 'center', cursor: 'pointer', fontSize: 12, color: '#555' },
  pagesLabel: { fontSize: 12, color: '#ccc', fontWeight: 500 },
  pagesHint: { color: '#555', fontWeight: 400 },
  pagesList: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  pageItem: { position: 'relative', width: 72, flexShrink: 0 },
  pageThumb: { width: 72, height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid #2a2a2a' },
  pagePdf: { width: 72, height: 90, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bf57ff', fontSize: 11, fontFamily: "'Space Mono',monospace" },
  pageNum: { fontSize: 9, color: '#555', textAlign: 'center', marginTop: 3 },
  removePageBtn: { position: 'absolute', top: -6, right: -6, background: '#ff5040', border: 'none', borderRadius: '50%', width: 18, height: 18, color: '#fff', cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  addMoreBtn: { width: 72, height: 90, background: 'transparent', border: '2px dashed #2a2a2a', borderRadius: 6, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#bf57ff' },
  processBtn: { background: '#bf57ff', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%', marginTop: 4 },
  processingPane: { padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  pagesThumbs: { display: 'flex', gap: 8, justifyContent: 'center' },
  processingThumb: { width: 52, height: 66, objectFit: 'cover', borderRadius: 4, opacity: 0.6 },
  spinner: { width: 32, height: 32, border: '3px solid #2a2a2a', borderTop: '3px solid #bf57ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  progressText: { fontSize: 14, color: '#ccc', fontWeight: 500 },
  progressSub: { fontSize: 11, color: '#555', textAlign: 'center' },
  errorPane: { padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 13, color: '#ff8080', textAlign: 'center' },
  retryBtn: { background: '#bf57ff', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
