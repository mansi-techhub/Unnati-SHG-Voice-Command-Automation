import { normalizeCommand } from './intentEngine.js'

const allMembersPhrases = [
  'all', 'everyone', 'everybody', 'all members', 'sabhi', 'sab', 'सभी', 'सब', 'सगळे', 'सर्व',
]
const presentPhrases = ['present', 'उपस्थित', 'हजर', 'हाज़िर', 'हजेरी', 'उपस्थिती']
const absentPhrases = ['absent', 'अनुपस्थित', 'गैरहाज़िर', 'गैरहजर']
const exceptionPhrases = ['except', 'excluding', 'but not', 'छोड़कर', 'के अलावा', 'वगळता', 'सोडून']
const ignoredNameParts = new Set(['mr', 'mrs', 'ms', 'miss', 'श्रीमती', 'सुश्री'])

export function isAttendanceMarkRequest(value) {
  const text = normalizeCommand(value)
  const mentionsAttendance = /\battendance\b/.test(text)
    || ['हाजिरी', 'उपस्थिति', 'हजेरी', 'उपस्थिती'].some((phrase) => text.includes(phrase))
  const requestsMarking = /\b(mark|record|take|enter|save|set)\b/.test(text)
    || ['दर्ज', 'लगाओ', 'लिखो', 'नोंदवा', 'नोंद', 'भरा', 'लावा'].some((phrase) => text.includes(phrase))
  return mentionsAttendance && requestsMarking
}

export function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function mentionPositions(text, member) {
  const name = normalizeCommand(member.name)
  const fullNamePosition = name ? text.indexOf(name) : -1
  if (fullNamePosition >= 0) return [fullNamePosition]
  const parts = name.split(' ').filter((part) => part.length >= 2 && !ignoredNameParts.has(part))
  return parts.flatMap((part) => {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return [...text.matchAll(new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'g'))]
      .map((match) => match.index + match[0].length - part.length)
  })
}

function mentionedMembers(text, members) {
  const matches = members.filter((member) => mentionPositions(text, member).length > 0)
  const ids = matches.map((member) => String(member._id || member.id))
  return new Set(ids).size === matches.length ? matches : []
}

function hasAmbiguousPartialName(text, members) {
  return members.length > 1 && members.some((member) => {
    const fullName = normalizeCommand(member.name)
    return !fullName || !text.includes(fullName)
  })
}

function phraseMatches(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = /^[a-z\s]+$/i.test(phrase)
    ? new RegExp(`\\b${escaped}\\b`, 'g')
    : new RegExp(escaped, 'g')
  return [...text.matchAll(pattern)]
}

function findStatus(text) {
  const negatedPresent = [...text.matchAll(/\bnot present\b/g)].map((match) => match.index)
  const statuses = [
    ...presentPhrases.flatMap((phrase) => {
      return phraseMatches(text, phrase)
        .filter((match) => !negatedPresent.some((position) => position < match.index && match.index - position < 12))
        .map((match) => ({ position: match.index, value: 'Present' }))
    }),
    ...absentPhrases.flatMap((phrase) => {
      return phraseMatches(text, phrase)
        .map((match) => ({ position: match.index, value: 'Absent' }))
    }),
    ...negatedPresent.map((position) => ({ position, value: 'Absent' })),
  ]
  return statuses.sort((left, right) => left.position - right.position)
}

export function parseAttendanceStatuses(command, members) {
  const text = normalizeCommand(command)
  if (!Array.isArray(members) || members.length === 0) return { error: 'empty-roster' }
  const allPhrase = allMembersPhrases.find((phrase) => /^[a-z\s]+$/i.test(phrase)
    ? new RegExp(`\\b${phrase}\\b`, 'i').test(text)
    : text.includes(phrase))
  const statusMatches = findStatus(text)
  const exceptionMatch = exceptionPhrases
    .map((phrase) => ({ phrase, position: text.indexOf(phrase) }))
    .filter(({ position }) => position >= 0)
    .sort((left, right) => left.position - right.position)[0]

  if (allPhrase && statusMatches.length) {
    const globalStatus = statusMatches[0].value
    const exceptionText = exceptionMatch
      ? text.slice(exceptionMatch.position + exceptionMatch.phrase.length)
      : ''
    const exceptions = exceptionText ? mentionedMembers(exceptionText, members) : []
    if (exceptionText && exceptions.length === 0) return { error: 'unmatched-exception' }
    if (exceptionText && hasAmbiguousPartialName(exceptionText, exceptions)) return { error: 'ambiguous-member' }
    const exceptionIds = new Set(exceptions.map((member) => String(member._id || member.id)))
    return {
      statuses: Object.fromEntries(members.map((member) => {
        const id = String(member._id || member.id)
        return [id, exceptionIds.has(id) ? (globalStatus === 'Present' ? 'Absent' : 'Present') : globalStatus]
      })),
    }
  }

  const positionsByMember = members.map((member) => ({
    member,
    positions: mentionPositions(text, member),
    fullName: normalizeCommand(member.name),
  }))
  const sharedPartialMention = positionsByMember.some(({ positions }) =>
    positions.some((position) => {
      const matches = positionsByMember.filter((candidate) => candidate.positions.includes(position))
      return matches.length > 1 && matches.some((candidate) => !text.includes(candidate.fullName))
    }),
  )
  if (sharedPartialMention) return { error: 'ambiguous-member' }

  const memberStatuses = new Map()
  for (const member of members) {
    const positions = mentionPositions(text, member)
    if (!positions.length) continue
    const nearest = positions.flatMap((position) => statusMatches.map((status) => ({
      ...status,
      distance: Math.abs(status.position - position),
    }))).sort((left, right) => left.distance - right.distance)[0]
    if (nearest && nearest.distance <= 50) {
      memberStatuses.set(String(member._id || member.id), nearest.value)
    }
  }
  if (memberStatuses.size === 0) return { error: 'unrecognized' }
  return {
    statuses: Object.fromEntries(members.map((member) => [
      String(member._id || member.id),
      memberStatuses.get(String(member._id || member.id)) || 'Absent',
    ])),
  }
}
