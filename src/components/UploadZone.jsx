import { useState, useRef } from 'react'
import { uploadDocumentFile, extractDocumentWithAI } from '../lib/supabase'

export default function UploadZone({ company, userId, onDocumentReady, onCancel }) {
  const [stage,    setStage]    = useState('idle')
  const [preview,  setPreview]  = useState(null)
  const [progress, setProgress] = useState('')
  const [error,    setError]    = useState(null)
  const fileRef   = useRef(null)
  const cameraRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file))
    else setPreview(null)
    try {
      setStage('uploading'); setProgress('Uploading file...')
      const { url, type, path } = await uploadDocumentFile(file, company.id, userId)
      setStage('processing'); setProgress('Reading document with AI...')
      const extracted = await extractDocumentWithAI(file, company.type)
      setStage('done')
      onDocumentReady({ ...extracted, company_id: company.id, user_id: userId, status: 'ai_processed', original_file_url: url, original_file_type: type, original_file_path: path })
    } catch (e) { setStage('error'); setError(e.message) }
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }
  const handlePaste = (e) => { handleFile(e.clipboardData.files[0]) }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>Upload Document — {company.name}</span>
          <button style={s.closeBtn} onClick={onCancel}>x</button>
        </div>

        {stage === 'idle' && (
          <div style={s.body}>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={e => handleFile(e.target.files[0])} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e => handleFile(e.target.files[0])} />

            <button style={s.cameraBtn} onClick={() => cameraRef.current?.click()}>
              <span style={{fontSize:32,flexShrink:0}}>&#128247;</span>
              <div>
                <div style={s.cameraBtnTitle}>Take a Photo</div>
                <div style={s.cameraBtnSub}>Use your camera to capture a document</div>
              </div>
            </button>

            <div style={s.dropZone} onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onPaste={handlePaste} onClick={() => fileRef.current?.click()}>
              <div style={{fontSize:28,opacity:0.5}}>&#128193;</div>
              <div style={s.dropText}>Browse or drag and drop</div>
              <div style={s.dropSub}>Images (JPG, PNG) or PDF</div>
            </div>
          </div>
        )}

        {(stage === 'uploading' || stage === 'processing') && (
          <div style={s.processingPane}>
            {preview && <img src={preview} alt="preview" style={s.previewImg} />}
            <div style={s.spinner} />
            <div style={s.progressText}>{progress}</div>
            <div style={s.progressSub}>{stage === 'processing' ? 'Claude is reading your document...' : 'Uploading securely...'}</div>
          </div>
        )}

        {stage === 'error' && (
          <div style={s.errorPane}>
            <div style={{fontSize:36}}>!</div>
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
  overlay: {position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16},
  modal: {background:'#111',border:'1px solid #2a2a2a',borderRadius:14,width:'100%',maxWidth:460},
  header: {display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'1px solid #1e1e1e'},
  title: {fontFamily:"'Space Mono',monospace",fontSize:11,color:'#bf57ff',letterSpacing:'0.06em'},
  closeBtn: {background:'transparent',border:'none',color:'#555',cursor:'pointer',fontSize:14},
  body: {padding:20,display:'flex',flexDirection:'column',gap:12},
  cameraBtn: {display:'flex',alignItems:'center',gap:14,background:'#bf57ff15',border:'1px solid #bf57ff40',borderRadius:10,padding:'16px 18px',cursor:'pointer',width:'100%',textAlign:'left'},
  cameraBtnTitle: {fontSize:14,fontWeight:600,color:'#bf57ff',marginBottom:3},
  cameraBtnSub: {fontSize:11,color:'#888'},
  dropZone: {border:'2px dashed #2a2a2a',borderRadius:10,padding:'28px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer'},
  dropText: {fontSize:13,color:'#ccc',fontWeight:500},
  dropSub: {fontSize:11,color:'#555'},
  processingPane: {padding:'36px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:14},
  previewImg: {width:'100%',maxHeight:160,objectFit:'contain',borderRadius:6,opacity:0.6},
  spinner: {width:36,height:36,border:'3px solid #2a2a2a',borderTop:'3px solid #bf57ff',borderRadius:'50%',animation:'spin 0.8s linear infinite'},
  progressText: {fontSize:14,color:'#ccc',fontWeight:500},
  progressSub: {fontSize:11,color:'#555'},
  errorPane: {padding:'36px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:12},
  errorText: {fontSize:13,color:'#ff8080',textAlign:'center'},
  retryBtn: {background:'#bf57ff',color:'#0a0a0a',border:'none',borderRadius:6,padding:'8px 20px',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'},
}
