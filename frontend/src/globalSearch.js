const searchableCollections = [
  { key: 'members', target: 'members' },
  { key: 'savings', target: 'savings' },
  { key: 'loans', target: 'loans' },
  { key: 'transactions', target: 'ledger' },
  { key: 'meetings', target: 'meetings' },
  { key: 'notifications', target: 'notifications' },
  { key: 'goals', target: 'goals' },
  { key: 'documents', target: 'documents' },
  { key: 'schemes', target: 'schemes' },
  { key: 'paymentCollections', target: 'loanCollection' },
  { key: 'loanApplications', target: 'loanApplications' },
  { key: 'editRequests', target: 'editRequests' },
  { key: 'ruleNotices', target: 'rulesNotice' },
]

const memberViewTargets = new Set([
  'savings', 'loans', 'ledger', 'meetings', 'notifications', 'goals', 'documents',
  'schemes', 'loanCollection', 'editRequests',
])

const privateSearchKeys = new Set(['password', 'token', 'image', 'photo', 'filedata', 'secret'])

function collectSearchText(value, depth = 0, key = '') {
  if (privateSearchKeys.has(key.toLowerCase()) || value == null || depth > 3) return []
  if (typeof value === 'string' || typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap((item) => collectSearchText(item, depth + 1, key))
  if (typeof value !== 'object') return []
  return Object.entries(value).flatMap(([childKey, childValue]) => collectSearchText(childValue, depth + 1, childKey))
}

function resultTitle(record) {
  return record.member?.name
    || record.memberName
    || record.name
    || record.title
    || record.loanId
    || record.memberId
    || record.description
    || record.schemeName
    || record.goalName
    || record._id
    || record.id
    || 'Record'
}

function resultSummary(record) {
  return [
    record.memberId,
    record.loanId,
    record.purpose,
    record.description,
    record.status,
    record.date || record.createdAt || record.month,
    record.amount != null ? String(record.amount) : '',
    record.outstanding != null ? String(record.outstanding) : '',
  ].filter(Boolean).join(' · ')
}

export function searchGroupRecords(data, query, role = 'admin', limit = 12) {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase()
  if (!normalizedQuery || !Number.isInteger(limit) || limit <= 0) return []

  const results = []
  searchableCollections.forEach(({ key, target }, collectionIndex) => {
    if (role !== 'admin' && !memberViewTargets.has(target)) return
    const records = Array.isArray(data?.[key]) ? data[key] : []
    records.forEach((record, recordIndex) => {
      if (!record || typeof record !== 'object') return
      const title = String(resultTitle(record))
      const searchableText = collectSearchText(record).join(' ').toLocaleLowerCase()
      if (!searchableText.includes(normalizedQuery)) return
      const normalizedTitle = title.toLocaleLowerCase()
      const score = normalizedTitle === normalizedQuery ? 100
        : normalizedTitle.startsWith(normalizedQuery) ? 80
          : normalizedTitle.includes(normalizedQuery) ? 60
            : 10
      results.push({
        key: `${key}-${record._id || record.id || recordIndex}`,
        title,
        summary: resultSummary(record),
        target,
        collection: key,
        score,
        order: collectionIndex * 100000 + recordIndex,
      })
    })
  })

  return results
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, limit)
    .map(({ key, title, summary, target, collection }) => ({ key, title, summary, target, collection }))
}
