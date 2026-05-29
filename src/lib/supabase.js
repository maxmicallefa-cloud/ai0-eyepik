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
  const { data, error } = await supabase
    .from('eyepik_documents').insert(doc).select().single()
  if (error) throw error
  return data
}

export const updateDocument = async (id, patch, userId, reason = 'manual_edit') => {
  // Log change before update
  const { data: old } = await supabase.from('eyepik_documents').select('*').eq('id', id).single()
  if (old) {
    const changes = Object.keys(patch).filter(k => old[k] !== patch[k])
    if (changes.length > 0) {
      await supabase.from('eyepik_change_logs').insert({
        document_id: id,
        user_id: userId,
        reason,
        changes: changes.reduce((acc, k) => ({ ...acc, [k]: { from: old[k], to: patch[k] } }), {}),
      })
    }
  }
  const { data, error } = await supabase
    .from('eyepik_documents').update(patch).eq('id', id).select().single()
  if (error) throw error
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
  const ext = file.name.split('.').pop()
  const path = `${userId}/${companyId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('eyepik-documents').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('eyepik-documents').getPublicUrl(path)
  return { url: data.publicUrl, type: file.type, path }
}

// ── AI extraction ─────────────────────────────────────────────────────────
export async function extractDocumentWithAI(file, companyType) {
  // Convert file to base64
  const base64 = await new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result.split(',')[1])
    reader.onerror = rej
    reader.readAsDataURL(file)
  })

  const isPdf = file.type === 'application/pdf'
  const mediaType = file.type || 'image/jpeg'

  const systemPrompt = `You are an expert Maltese accountancy document reader. 
Extract all relevant fields from the provided document image.
Company type context: ${companyType === 'company' ? 'Limited Company' : 'Self-Employed'}.
Return ONLY a valid JSON object with these fields (use null for missing fields):
{
  "document_type": one of the maltese document type keys,
  "document_number": string,
  "document_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "period_from": "YYYY-MM-DD",
  "period_to": "YYYY-MM-DD",
  "supplier_name": string,
  "supplier_vat": string,
  "supplier_address": string,
  "customer_name": string,
  "customer_vat": string,
  "customer_address": string,
  "subtotal": number,
  "vat_rate": number,
  "vat_amount": number,
  "total_amount": number,
  "currency": string,
  "notes": string,
  "ai_confidence": number between 0 and 1
}
Document types available: tax_invoice, fiscal_receipt, credit_note, debit_note, proforma_invoice, receipt, purchase_invoice, petty_cash_voucher, expense_claim, vat_return, recapitulative_statement, intrastat_declaration, payslip, fs3, fs5, fs7, it_return, provisional_tax_return, self_employment_income_declaration, schedule_of_deductions, bank_statement, bank_reconciliation, trial_balance, balance_sheet, profit_loss_statement, cash_flow_statement, customs_entry, bill_of_lading, commercial_invoice, contract, lease_agreement, other`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [{
          type: isPdf ? 'document' : 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        }, {
          type: 'text',
          text: 'Extract all document fields and return as JSON only.',
        }],
      }],
    }),
  })

  const result = await response.json()
  const text = result.content?.[0]?.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    return { ai_confidence: 0, notes: 'Could not parse AI response' }
  }
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
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${companyName.replace(/\s+/g, '_')}_documents.csv`
  a.click()
}
