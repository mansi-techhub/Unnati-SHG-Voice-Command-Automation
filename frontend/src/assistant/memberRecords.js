function matchesMember(row, memberId, memberName) {
  return ['memberId', 'member', 'memberName'].some((key) => {
    const reference = row[key]
    if (!reference) return false
    const id = reference._id || reference.id || reference
    if (String(id) === memberId) return true
    return String(reference.name || reference).trim().toLocaleLowerCase() === memberName
  })
}

export function countMemberRecords(member, data) {
  const memberId = String(member._id || member.id)
  const memberName = String(member.name || '').trim().toLocaleLowerCase()
  const countRows = (rows = []) => rows.filter((row) => matchesMember(row, memberId, memberName)).length
  const attendance = (data.meetings || []).reduce((total, meeting) =>
    total + countRows(meeting.attendance || []), 0)
  const counts = {
    savings: countRows(data.savings),
    loans: countRows(data.loans),
    applications: countRows(data.loanApplications),
    payments: countRows(data.paymentCollections),
    transactions: countRows(data.transactions),
    attendance,
  }
  counts.total = Object.values(counts).reduce((total, count) => total + count, 0)
  return counts
}
