const memberModules = new Set([
  'dashboard', 'profile', 'notifications', 'passbook', 'savings', 'loanApplication',
  'loanDetails', 'loanDemandRisk', 'loans', 'ledger', 'monthly', 'memberBalanceSheet',
  'balance', 'meetings', 'attendance', 'documents', 'editRequests', 'calculationReport',
  'reports', 'insights', 'schemes',
])

export function canOpenModule(module, role) {
  return role === 'admin' || memberModules.has(module)
}
