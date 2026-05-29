import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
)

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Companies ─────────────────────────────────────────────────────────────
export const getCompanies = async (userId, isSuperAdmin) => {
  let q = supabase.from('eyepik_companies').select('*').order('name')
  if (!isSuperAdmin) q = q.eq('user_id', userId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const createCompany = async (userId, data) => {
  const { data: row, error } = await supabase
    .from('eyepik_companies').insert({ user_id: userId, ...data }).select().single()
  if (error) throw error
  return row
}

export const updateCompany = async (id, patch) => {
  const { data, error } = await supabase
    .from('eyepik_companies').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteCompany = async (id) => {
  const { error } = await supabase.from('eyepik_companies').delete().eq('id', id)
  if (error) throw error
}

// ── Documents ─────────────────────────────────────────────────────────────
export const getDocuments = async (companyId) => {
  const { data, error } = await supabase
    .from('eyepik_documents')
    .select('*')
    .eq('company_id', companyId)
    .order('document_date', { ascending: false })
  if (error) throw error
  return data
}

export const createDocument = async (doc) => {
  const { line_items, ...docData } = doc
  const { data, error } = await supabase
    .from('eyepik_documents').insert(docData).select().single()
  if (error) throw error

  // Save line items if any
  if (line_items?.length > 0) {
    await saveLineItems(data.id, line_items)
  }
  return data
}

export const updateDocument = async (id, patch, userId, reason = 'manual_edit') => {
  const { line_items, ...docPatch } = patch

  // Log change before update
  const { data: old } = await supabase.from('eyepik_documents').select('*').eq('id', id).single()
  if (old && userId) {
    const changes = Object.keys(docPatch).filter(k => old[k] !== docPatch[k])
    if (changes.length > 0) {
      await supabase.from('eyepik_change_logs').insert({
        document_id: id, user_id: userId, reason,
        changes: changes.reduce((acc, k) => ({ ...acc, [k]: { from: old[k], to: docPatch[k] } }), {}),
      })
    }
  }

  const { data, error } = await supabase
    .from('eyepik_documents').update(docPatch).eq('id', id).select().single()
  if (error) throw error

  // Update line items if provided
  if (line_items) {
    await saveLineItems(id, line_items)
  }

  return data
}

export const deleteDocument = async (id) => {
  const { error } = await supabase.from('eyepik_documents').delete().eq('id', id)
  if (error) throw error
}

export const confirmDocument = async (id, userId) => {
  return updateDocument(id, {
    status: 'confirmed',
    confirmed_by: userId,
    confirmed_at: new Date().toISOString(),
  }, userId, 'confirmed')
}

export const rejectDocument = async (id, userId) => {
  return updateDocument(id, { status: 'rejected' }, userId, 'rejected')
}

// ── Line Items ────────────────────────────────────────────────────────────
export const getLineItems = async (documentId) => {
  const { data, error } = await supabase
    .from('eyepik_line_items')
    .select('*')
    .eq('document_id', documentId)
    .order('position', { ascending: true })
  if (error) { console.warn('getLineItems error:', error.message); return [] }
  return data || []
}

export const saveLineItems = async (documentId, items) => {
  // Delete existing then reinsert
  await supabase.from('eyepik_line_items').delete().eq('document_id', documentId)
  if (!items?.length) return
  const rows = items.map((item, i) => ({
    document_id: documentId,
    description: item.description || '',
    quantity:    item.quantity    ?? null,
    unit_price:  item.unit_price  ?? null,
    vat_rate:    item.vat_rate    ?? null,
    vat_amount:  item.vat_amount  ?? null,
    line_total:  item.line_total  ?? null,
    position:    i,
  }))
  const { error } = await supabase.from('eyepik_line_items').insert(rows)
  if (error) console.warn('saveLineItems error:', error.message)
}

// ── Change logs ───────────────────────────────────────────────────────────
export const getChangeLogs = async (documentId) => {
  const { data, error } = await supabase
    .from('eyepik_change_logs')
    .select('*, profiles(email, display_name)')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── File upload ───────────────────────────────────────────────────────────
export const uploadDocumentFile = async (file, companyId, userId) => {
  const ext  = file.name?.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'jpg')
  const path = `${userId}/${companyId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('eyepik-documents').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('eyepik-documents').getPublicUrl(path)
  return { url: data.publicUrl, type: file.type, path }
}

// ── AI extraction via Edge Function (avoids CORS) ─────────────────────────
export async function extractDocumentWithAI(file, companyType) {
  let base64, mediaType

  // For images: resize to max 1200px to reduce payload size
  if (file.type.startsWith('image/')) {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    const MAX = 1200
    const ratio = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1)
    canvas.width  = Math.round(bitmap.width  * ratio)
    canvas.height = Math.round(bitmap.height * ratio)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    base64    = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
    mediaType = 'image/jpeg'
  } else {
    // PDF — convert directly
    base64 = await new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload  = () => res(reader.result.split(',')[1])
      reader.onerror = rej
      reader.readAsDataURL(file)
    })
    mediaType = 'application/pdf'
  }

  const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eyepik-extract`

  const res = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ base64, mediaType, companyType }),
  })

  if (!res.ok) throw new Error(`AI extraction failed: ${await res.text()}`)
  return await res.json()
}

// ── Export helpers ────────────────────────────────────────────────────────
export const exportToCSV = (documents, companyName) => {
  const headers = [
    'Document Type','Document Number','Date','Due Date',
    'Supplier','Supplier VAT','Customer','Customer VAT',
    'Subtotal','VAT Rate','VAT Amount','Total','Currency',
    'Status','Confirmed At',
  ]
  const rows = documents.map(d => [
    d.document_type, d.document_number, d.document_date, d.due_date,
    d.supplier_name, d.supplier_vat, d.customer_name, d.customer_vat,
    d.subtotal, d.vat_rate, d.vat_amount, d.total_amount, d.currency,
    d.status, d.confirmed_at,
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = `${companyName.replace(/\s+/g, '_')}_documents.csv`
  a.click()
}
