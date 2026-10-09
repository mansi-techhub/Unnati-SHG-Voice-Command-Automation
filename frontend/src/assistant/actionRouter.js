import { api } from '../services/api.js'
import { normalizeCommand } from './intentEngine.js'

const mutationRegistry = Object.freeze({
  ADD_MEMBER: { method: 'POST', path: '/members', roles: ['admin'] },
  ADD_GOAL: { method: 'POST', path: '/goals', roles: ['admin'] },
  ADD_GOAL_CONTRIBUTION: { method: 'POST', path: '/goals', roles: ['admin'] },
  RECORD_SAVINGS: { method: 'POST', path: '/savings', roles: ['admin'] },
  UPDATE_MEMBER: { method: 'PATCH', path: '/members', roles: ['admin'] },
  DELETE_MEMBER: { method: 'DELETE', path: '/members', roles: ['admin'] },
  UPDATE_SHG_SETTING: { method: 'PATCH', path: '/shgs', roles: ['admin'] },
})
const updatableMemberFields = new Set(['name', 'phone', 'address', 'joinedDate', 'status'])
const updatableShgFields = new Set([
  'latePenaltyAmount', 'loanInterestRate', 'savingsInterestRate',
  'monthlySavingsAmount', 'monthlySavingsDueDay',
])


export async function executeRegisteredAction(actionId, payload, role) {
  const definition = mutationRegistry[actionId]
  if (!definition) throw new Error('This assistant action is not available.')
  if (!definition.roles.includes(role)) throw new Error('You do not have permission to perform this action.')
  const { shg, member, field, value } = payload
  if (actionId === 'UPDATE_MEMBER' && !updatableMemberFields.has(field)) {
    throw new Error('This member field cannot be updated through the assistant.')
  }
  if (actionId === 'UPDATE_SHG_SETTING'
    && (!updatableShgFields.has(field) || !Number.isFinite(Number(value)) || Number(value) < 0)) {
    throw new Error('This SHG setting value is invalid or cannot be updated through the assistant.')
  }
  if (actionId === 'UPDATE_SHG_SETTING' && field === 'monthlySavingsDueDay'
    && (!Number.isInteger(Number(value)) || Number(value) > 28 || Number(value) < 1)) {
    throw new Error('The monthly savings due day must be a whole number from 1 to 28.')
  }
  if (['UPDATE_MEMBER', 'DELETE_MEMBER'].includes(actionId) && !member) {
    throw new Error('A member record must be selected before this action.')
  }
  if (actionId === 'ADD_GOAL_CONTRIBUTION'
    && (!payload.goal || !Number.isFinite(Number(payload.amount)) || Number(payload.amount) <= 0)) {
    throw new Error('An active goal and positive contribution amount are required.')
  }
  if (['ADD_MEMBER', 'ADD_GOAL', 'RECORD_SAVINGS', 'DELETE_MEMBER', 'UPDATE_SHG_SETTING'].includes(actionId) && !shg) {
    throw new Error('The current SHG could not be identified.')
  }
  const resourcePath = actionId === 'ADD_GOAL_CONTRIBUTION'
    ? `${definition.path}/${encodeURIComponent(payload.goal)}/contributions`
    : actionId === 'UPDATE_SHG_SETTING'
      ? `${definition.path}/${encodeURIComponent(shg)}`
      : definition.path === '/members' && member
        ? `${definition.path}/${encodeURIComponent(member)}`
        : definition.path
  const requestBody = ['UPDATE_MEMBER', 'UPDATE_SHG_SETTING'].includes(actionId)
    ? { [field]: value }
    : actionId === 'ADD_GOAL_CONTRIBUTION'
      ? { amount: Number(payload.amount), ...(payload.note ? { note: payload.note } : {}) }
      : payload
  const result = await api(resourcePath, {
    method: definition.method,
    ...(definition.method === 'DELETE' ? {} : { body: JSON.stringify(requestBody) }),
  })

  if (actionId === 'ADD_MEMBER') {
    const rows = await api(`/members?shg=${encodeURIComponent(shg)}`)
    const persisted = Array.isArray(rows) && rows.find((row) =>
      row._id === result._id && row.name === payload.name,
    )
    if (!persisted) throw new Error('The server did not return the newly saved member when verified.')
  } else if (actionId === 'ADD_GOAL') {
    const rows = await api('/goals')
    const persisted = Array.isArray(rows) && rows.find((row) =>
      row._id === result._id && row.title === payload.title
      && Number(row.targetAmount) === Number(payload.targetAmount),
    )
    if (!persisted) throw new Error('The server did not return the newly saved goal when verified.')
  } else if (actionId === 'ADD_GOAL_CONTRIBUTION') {
    const goals = await api('/goals')
    const persisted = Array.isArray(goals) && goals.find((goal) =>
      String(goal._id || goal.id) === String(payload.goal)
      && Number(goal.savedAmount) >= Number(result.goal?.savedAmount)
      && (result.goal?.contributions || []).some((contribution) =>
        Number(contribution.amount) === Number(payload.amount)
        && (!payload.note || contribution.note === payload.note),
      )
      && (goal.contributions || []).some((contribution) =>
        Number(contribution.amount) === Number(payload.amount)
        && (!payload.note || contribution.note === payload.note),
      ),
    )
    if (!result.goal || !persisted) throw new Error('The goal contribution could not be verified.')
  } else if (actionId === 'RECORD_SAVINGS') {
    const rows = await api(`/savings?shg=${encodeURIComponent(shg)}&member=${encodeURIComponent(payload.member)}&month=${encodeURIComponent(payload.month)}`)
    const persisted = Array.isArray(rows) && rows.find((row) =>
      row._id === result._id && Number(row.amount) === Number(payload.amount),
    )
    if (!persisted) throw new Error('The server did not return the newly saved savings record when verified.')
  } else if (actionId === 'UPDATE_MEMBER') {
    const persisted = await api(`/members/${encodeURIComponent(member)}`)
    const persistedValue = field === 'joinedDate'
      ? new Date(persisted[field]).toISOString().slice(0, 10)
      : String(persisted[field])
    if (persistedValue !== String(value)) throw new Error('The updated member value could not be verified.')
  } else if (actionId === 'DELETE_MEMBER') {
    const rows = await api(`/members?shg=${encodeURIComponent(shg)}`)
    if (!Array.isArray(rows) || rows.some((row) => String(row._id) === String(member))) {
      throw new Error('The member still exists after the delete request.')
    }
  } else if (actionId === 'UPDATE_SHG_SETTING') {
    const persisted = await api(`/shgs/${encodeURIComponent(shg)}`)
    if (Number(persisted[field]) !== Number(value)) {
      throw new Error('The updated SHG setting could not be verified.')
    }
  }
  return result
}

function isDateKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export async function executeAttendanceAction(payload, role) {
  if (role !== 'admin') throw new Error('You do not have permission to perform this action.')
  const title = String(payload.title || '').trim()
  const date = String(payload.date || '')
  const members = Array.isArray(payload.members) ? payload.members : []
  const statuses = payload.statuses || {}
  if (!title || !isDateKey(date) || members.length === 0) {
    throw new Error('A meeting name, valid attendance date, and member roster are required.')
  }
  const memberIds = members.map((member) => String(member._id || member.id || ''))
  if (memberIds.some((id) => !id) || new Set(memberIds).size !== memberIds.length
    || memberIds.some((id) => !['Present', 'Absent'].includes(statuses[id]))) {
    throw new Error('Attendance must include one valid status for every member.')
  }

  const matchingMeeting = (payload.meetings || []).find((meeting) =>
    normalizeCommand(meeting.title) === normalizeCommand(title)
    && String(meeting.date || '').slice(0, 10) === date,
  )
  const meetingId = matchingMeeting?._id || matchingMeeting?.id
  const meetingPayload = {
    title,
    date,
    time: String(payload.time || ''),
    location: String(payload.location || ''),
    type: matchingMeeting?.type || 'meeting',
  }
  const meeting = meetingId
    ? await api(`/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'PATCH',
      body: JSON.stringify(meetingPayload),
    })
    : await api('/meetings', {
      method: 'POST',
      body: JSON.stringify(meetingPayload),
    })
  const savedMeetingId = meeting?._id || meeting?.id
  if (!savedMeetingId) throw new Error('The meeting could not be verified after it was saved.')
  let saved
  try {
    saved = await api(`/meetings/${encodeURIComponent(savedMeetingId)}/attendance`, {
      method: 'PATCH',
      body: JSON.stringify({
        attendance: members.map((member, index) => ({
          member: memberIds[index],
          present: statuses[memberIds[index]] === 'Present',
        })),
      }),
    })
  } catch (error) {
    if (!meetingId) {
      throw new Error(`The meeting was created, but attendance could not be saved: ${error.message}`, { cause: error })
    }
    throw error
  }

  const persistedAttendance = new Map((saved.attendance || []).map((entry) => [
    String(entry.member?._id || entry.member),
    Boolean(entry.present),
  ]))
  const verified = members.every((member, index) =>
    persistedAttendance.get(memberIds[index]) === (statuses[memberIds[index]] === 'Present'),
  )
  if (!verified || persistedAttendance.size !== members.length) {
    throw new Error('The saved attendance could not be verified for every member.')
  }
  return saved
}

export const approvedMutationIntents = Object.freeze(Object.keys(mutationRegistry))
