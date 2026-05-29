// All document types applicable under Maltese law
// Split by company type for smart filtering

export const DOC_TYPES = {
  // ── Sales / Revenue ──────────────────────────────────────────────────────
  tax_invoice:                    { label: 'Tax Invoice',                    category: 'Sales',      both: true },
  fiscal_receipt:                 { label: 'Fiscal Receipt',                 category: 'Sales',      both: true },
  credit_note:                    { label: 'Credit Note',                    category: 'Sales',      both: true },
  debit_note:                     { label: 'Debit Note',                     category: 'Sales',      both: true },
  proforma_invoice:               { label: 'Proforma Invoice',               category: 'Sales',      both: true },
  receipt:                        { label: 'Receipt',                        category: 'Sales',      both: true },

  // ── Purchases / Expenses ──────────────────────────────────────────────────
  purchase_invoice:               { label: 'Purchase Invoice',               category: 'Expenses',   both: true },
  petty_cash_voucher:             { label: 'Petty Cash Voucher',             category: 'Expenses',   both: true },
  expense_claim:                  { label: 'Expense Claim',                  category: 'Expenses',   both: true },

  // ── VAT ───────────────────────────────────────────────────────────────────
  vat_return:                     { label: 'VAT Return',                     category: 'VAT',        both: true },
  recapitulative_statement:       { label: 'Recapitulative Statement (EC)',  category: 'VAT',        both: true },
  intrastat_declaration:          { label: 'Intrastat Declaration',          category: 'VAT',        both: true },

  // ── Payroll (Company only) ────────────────────────────────────────────────
  payslip:                        { label: 'Payslip',                        category: 'Payroll',    company: true },
  fs3:                            { label: 'FS3 — Annual Employee Statement', category: 'Payroll',   company: true },
  fs5:                            { label: 'FS5 — Monthly NI/Tax',           category: 'Payroll',    company: true },
  fs7:                            { label: 'FS7 — Annual Reconciliation',    category: 'Payroll',    company: true },

  // ── Income Tax ────────────────────────────────────────────────────────────
  it_return:                      { label: 'Income Tax Return',              category: 'Tax',        both: true },
  provisional_tax_return:         { label: 'Provisional Tax Return',         category: 'Tax',        both: true },

  // ── Self-Employed specific ────────────────────────────────────────────────
  self_employment_income_declaration: { label: 'Self-Employment Income Declaration', category: 'Tax', self_employed: true },
  schedule_of_deductions:         { label: 'Schedule of Deductions',        category: 'Tax',        self_employed: true },

  // ── Banking ───────────────────────────────────────────────────────────────
  bank_statement:                 { label: 'Bank Statement',                 category: 'Banking',    both: true },
  bank_reconciliation:            { label: 'Bank Reconciliation',            category: 'Banking',    both: true },

  // ── Financial Statements ─────────────────────────────────────────────────
  trial_balance:                  { label: 'Trial Balance',                  category: 'Accounts',   both: true },
  balance_sheet:                  { label: 'Balance Sheet',                  category: 'Accounts',   both: true },
  profit_loss_statement:          { label: 'Profit & Loss Statement',        category: 'Accounts',   both: true },
  cash_flow_statement:            { label: 'Cash Flow Statement',            category: 'Accounts',   both: true },

  // ── Customs / Import-Export ───────────────────────────────────────────────
  customs_entry:                  { label: 'Customs Entry',                  category: 'Customs',    both: true },
  bill_of_lading:                 { label: 'Bill of Lading',                 category: 'Customs',    both: true },
  commercial_invoice:             { label: 'Commercial Invoice',             category: 'Customs',    both: true },

  // ── Legal / Other ─────────────────────────────────────────────────────────
  contract:                       { label: 'Contract',                       category: 'Legal',      both: true },
  lease_agreement:                { label: 'Lease Agreement',                category: 'Legal',      both: true },
  other:                          { label: 'Other',                          category: 'Other',      both: true },
}

export const CATEGORIES = [...new Set(Object.values(DOC_TYPES).map(d => d.category))]

export function getDocTypesForCompany(companyType) {
  return Object.entries(DOC_TYPES)
    .filter(([, v]) => v.both || v[companyType])
    .map(([key, v]) => ({ value: key, ...v }))
}

export const STATUS_LABELS = {
  pending:       { label: 'Pending',       color: '#ffd040' },
  ai_processed:  { label: 'AI Processed',  color: '#57b8ff' },
  confirmed:     { label: 'Confirmed',     color: '#b8ff57' },
  rejected:      { label: 'Rejected',      color: '#ff5040' },
}

export const VAT_RATES = [0, 5, 7, 12, 18]

export const MALTESE_TOWNS = [
  'Attard','Balzan','Birgu','Birkirkara','Birzebbuga','Bormla','Dingli',
  'Fgura','Floriana','Fontana','Ghajnsielem','Gharb','Gharghur','Ghasri',
  'Ghaxaq','Gudja','Gzira','Hamrun','Iklin','Imdina','Imgarr','Imqabba',
  'Imsida','Imtarfa','Isla','Kalkara','Kercem','Kirkop','Lija','Luqa',
  'Marsa','Marsaskala','Marsaxlokk','Mellieha','Mosta','Mqabba','Msida',
  'Munxar','Nadur','Naxxar','Paola','Pembroke','Pieta','Qala','Qormi',
  'Qrendi','Rabat','Safi','San Gwann','San Lawrenz','Sannat','Santa Lucija',
  'Santa Venera','Siggiewi','Sliema','St Julian\'s','St Paul\'s Bay',
  'Swieqi','Ta\'Xbiex','Tarxien','Valletta','Victoria','Xaghra','Xewkija',
  'Xghajra','Zabbar','Zebbug (Gozo)','Zebbug (Malta)','Zejtun','Zurrieq',
]
