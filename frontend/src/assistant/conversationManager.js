const flowFields = {
  ADD_MEMBER: ['name', 'phone', 'address', 'joinedDate'],
  ADD_GOAL: ['title', 'targetAmount', 'dueDate'],
  ADD_GOAL_CONTRIBUTION: ['goal', 'amount', 'note'],
  RECORD_SAVINGS: ['member', 'amount', 'month', 'actualDate'],
  UPDATE_MEMBER: ['member', 'field', 'value'],
  DELETE_MEMBER: ['member'],
  UPDATE_SHG_SETTING: ['field', 'value'],
  SEND_MEMBER_MESSAGE: ['member', 'message'],
  SUBMIT_EDIT_REQUEST: ['category', 'reference', 'description'],
}

export function startConversation(intent, initialValues = {}) {
  const fields = flowFields[intent]
  if (!fields) return null
  const values = { ...initialValues }
  const fieldIndex = fields.findIndex((field) => values[field] === undefined || values[field] === '')
  return {
    intent,
    values,
    fieldIndex: fieldIndex < 0 ? fields.length : fieldIndex,
    status: fieldIndex < 0 ? 'AWAITING_CONFIRMATION' : 'COLLECTING_DATA',
  }
}

export function getCurrentField(conversation) {
  return flowFields[conversation?.intent]?.[conversation.fieldIndex] || null
}

export function advanceConversation(conversation, value) {
  const field = getCurrentField(conversation)
  if (!field) return conversation
  const values = { ...conversation.values, [field]: value }
  const fields = flowFields[conversation.intent]
  let nextIndex = conversation.fieldIndex + 1
  while (nextIndex < fields.length && values[fields[nextIndex]] !== undefined && values[fields[nextIndex]] !== '') {
    nextIndex += 1
  }
  return {
    ...conversation,
    values,
    fieldIndex: nextIndex,
    status: nextIndex >= fields.length ? 'AWAITING_CONFIRMATION' : 'COLLECTING_DATA',
  }
}

export function cancelConversation() {
  return null
}

export function requiredFlowFields(intent) {
  return [...(flowFields[intent] || [])]
}
