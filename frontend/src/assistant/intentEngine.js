import intentDataset from './intents.json' with { type: 'json' }

const registeredLanguagePhrases = intentDataset.flatMap((item) =>
  Object.entries(item.examples).flatMap(([language, phrases]) =>
    phrases.map((phrase) => ({ language, phrase: normalizeCommand(phrase) })),
  ),
)

const languageMarkers = {
  hi: /मुझे|मेरा|मेरी|मेरा|खोलो|दिखाओ|बताओ|करो|कहाँ|कितना|चाहिए|है/,
  mr: /मला|माझा|माझी|माझे|उघडा|दाखवा|सांगा|करा|कुठे|किती|आहे|पाहिजे/,
}

const cancelPhrases = ['cancel', 'discard', 'stop', 'never mind', 'no', "don't do it", 'रद्द', 'रद्द करो', 'बंद करो', 'मत करो', 'छोड़ दें', 'रद्द करा', 'थांबा', 'नको', 'नाही', 'टाकून द्या']
const restartPhrases = ['start again', 'restart', 'start over', 'फिर से शुरू', 'दोबारा शुरू', 'पुन्हा सुरू', 'परत सुरू']
const confirmPhrases = ['confirm', 'yes', 'proceed', 'do it', 'हाँ', 'हां', 'पुष्टि करें', 'कर दो', 'हो', 'पुष्टी करा', 'करा']
const queryMarkers = ['find', 'search', 'look up', 'show me', 'tell me about', 'कौन है', 'कितना', 'कितनी', 'ढूंढ', 'खोज', 'शोध', 'किती', 'कोण आहे']

export function normalizeCommand(value) {
  return String(value || '')
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[?!.,;:।]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectLanguage(value, fallback = 'en') {
  const text = String(value || '')
  if (!/[ऀ-ॿ]/u.test(text)) return fallback
  const normalized = normalizeCommand(text)
  const registeredMatches = registeredLanguagePhrases
    .filter(({ phrase }) => phrase && normalized.includes(phrase))
    .sort((left, right) => right.phrase.length - left.phrase.length)
  const longestMatch = registeredMatches[0]?.phrase.length
  if (longestMatch) {
    const languages = new Set(registeredMatches
      .filter(({ phrase }) => phrase.length === longestMatch)
      .map(({ language }) => language))
    if (languages.has(fallback)) return fallback
    if (languages.size === 1) return languages.values().next().value
  }
  return languageMarkers.mr.test(text) ? 'mr' : 'hi'
}

function hasPhrase(text, phrases) {
  return phrases.some((phrase) => text.includes(normalizeCommand(phrase)))
}

const navigationStopWords = new Set([
  'a', 'can', 'go', 'me', 'my', 'navigate', 'open', 'page', 'please', 'show', 'the', 'to', 'view',
  'kholo', 'khol', 'khole', 'kholen', 'kholiye', 'kholiye', 'dikhaiye', 'dikhaye', 'dikhao',
  'dikha', 'dikhana', 'dikhaen', 'dikhaaye', 'par', 'mujhe',
  'खोलो', 'खोलें', 'खोलिए', 'खोल', 'खोलना', 'दिखाओ', 'दिखाएं', 'दिखाइए', 'दिखा', 'दिखाना',
  'पेज', 'पर', 'मुझे',
  'उघडा', 'उघड', 'उघडा', 'दाखवा', 'दाखव', 'दाखवून', 'पान', 'मला',
])
const navigationVerbs = new Set([
  'go', 'navigate', 'open', 'show', 'view', 'kholo', 'khol', 'khole', 'kholen', 'kholiye',
  'dikhaiye', 'dikhaye', 'dikhao', 'dikha', 'dikhana', 'dikhaen', 'dikhaaye',
  'खोलो', 'खोलें', 'खोलिए', 'खोल', 'खोलना', 'दिखाओ', 'दिखाएं', 'दिखाइए', 'दिखा', 'दिखाना',
  'उघडा', 'उघड', 'दाखवा', 'दाखव',
])

function rawNavigationSubject(value) {
  return normalizeCommand(value).split(' ')
    .filter((word) => word && !navigationStopWords.has(word))
    .join(' ')
}

function navigationSubject(value) {
  return rawNavigationSubject(value).split(' ')
    .map((word) => {
      if (/^[a-z]+ies$/i.test(word)) return word.slice(0, -3) + 'y'
      if (/^[a-z]+(?:ches|shes|xes|zes)$/i.test(word)) return word.slice(0, -2)
      if (/^[a-z]+s$/i.test(word) && !/ss$/i.test(word)) return word.slice(0, -1)
      return word
    })
    .join(' ')
}

function resolveNavigation(text) {
  const rawSubject = rawNavigationSubject(text)
  const subject = navigationSubject(text)
  if (!subject) return null
  const hasNavigationVerb = normalizeCommand(text).split(' ').some((word) => navigationVerbs.has(word))
  const candidates = intentDataset.flatMap((item) =>
    Object.values(item.examples).flat().map((phrase) => ({
      item,
      exact: rawNavigationSubject(phrase) === rawSubject,
      subject: navigationSubject(phrase),
    })),
  ).filter(({ subject: phraseSubject }) =>
    phraseSubject && (subject === phraseSubject || (hasNavigationVerb && subject.includes(phraseSubject))),
  ).sort((left, right) => Number(right.exact) - Number(left.exact) || right.subject.length - left.subject.length)
  return candidates[0]?.item || null
}

function isWholeCommand(text, phrases) {
  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeCommand(phrase)
    if (/^[a-z]/i.test(normalizedPhrase)) {
      return new RegExp(`^(?:${normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?:\\s+(?:please|now|this))?$`, 'i').test(text)
    }
    return text === normalizedPhrase
  })
}

function resolveMembers(text, members = []) {
  const normalized = normalizeCommand(text)
  const exact = members.filter((member) => {
    const name = normalizeCommand(member.name)
    const memberId = normalizeCommand(member.memberId)
    return (name && normalized.includes(name)) || (memberId && normalized.includes(memberId))
  })
  if (exact.length) return exact
  const tokens = normalized.split(' ').filter((token) => token.length >= 3)
  return members.filter((member) => String(member.name || '').split(/\s+/).some((part) =>
    tokens.includes(normalizeCommand(part)),
  ))
}

export function understandCommand(value, { language = 'en', members = [] } = {}) {
  const text = normalizeCommand(value)
  const detectedLanguage = detectLanguage(value, language)
  if (!text) return { intent: 'UNRECOGNIZED', language: detectedLanguage, entities: {}, confidence: 0, requiresClarification: true }
  if (isWholeCommand(text, cancelPhrases)) return { intent: 'CANCEL', language: detectedLanguage, entities: {}, confidence: 1, requiresClarification: false }
  if (hasPhrase(text, restartPhrases)) return { intent: 'RESTART', language: detectedLanguage, entities: {}, confidence: 1, requiresClarification: false }
  if (isWholeCommand(text, confirmPhrases)) return { intent: 'CONFIRM', language: detectedLanguage, entities: {}, confidence: 1, requiresClarification: false }
  if (hasPhrase(text, [
    'sheet kholo', 'sheet khol do', 'open sheet', 'show sheet',
    'बैलेंस शीट खोलो', 'बैलेंस शीट दिखाओ', 'शीट खोलो', 'शीट दिखाओ',
    'ताळेबंद उघडा', 'ताळेबंद दाखवा', 'शीट उघडा', 'शीट दाखवा',
  ])) {
    const memberSheet = hasPhrase(text, ['member sheet', 'member balance sheet', 'सदस्य शीट', 'सदस्य बैलेंस शीट', 'सदस्य ताळेबंद'])
    return {
      intent: memberSheet ? 'OPEN_MEMBER_BALANCE' : 'OPEN_BALANCE_SHEET',
      language: detectedLanguage,
      entities: {},
      confidence: 0.98,
      requiresClarification: false,
    }
  }

  const candidates = resolveMembers(text, members)
  const memberActionContext = /\bmember\b|\bmembers\b|सदस्य|मेंबर|सदस्या|सभासद/.test(text)
  const deleteRequest = /\b(delete|remove|erase)\b/.test(text)
    || ['हटाएँ', 'हटाओ', 'हटाना', 'हटा दो', 'हटाने', 'निकालें', 'निकालो', 'निकालना', 'मिटाएँ', 'मिटाओ', 'काढा', 'काढून टाक', 'काढ', 'वगळा', 'हटवा']
      .some((phrase) => text.includes(phrase))
  const removeMemberPageRequest = resolveNavigation(text)?.intent === 'OPEN_REMOVE_MEMBER'
  const updateRequest = /\b(update|change|edit|correct|modify)\b/.test(text)
    || ['बदलें', 'बदलो', 'बदलना', 'बदल', 'दुरुस्त', 'अपडेट', 'सुधारें', 'सुधारना', 'बदला', 'बदलायचे', 'बदलायचा', 'बदला', 'संपादित']
      .some((phrase) => text.includes(phrase))
  const addMemberRequest = hasPhrase(text, [
    'add member', 'add a member', 'member add', 'new member', 'register member',
    'सदस्य जोड़', 'सदस्य जोडा', 'नया सदस्य', 'नवीन सदस्य', 'सदस्य नोंदवा',
    'create member', 'create a member', 'register a member', 'नया सदस्य बनाओ', 'सदस्य बनाएं',
    'सदस्य बनाओ', 'नवीन सदस्य नोंदवा', 'नवीन सदस्य तयार करा',
  ])
  const memberField = /\bphone(?: number)?\b|\bmobile(?: number)?\b|फोन|मोबाइल|मोबाईल/.test(text) ? 'phone'
    : /\baddress\b|पता|पत्ता/.test(text) ? 'address'
      : /\bjoining date\b|\bdate\b|तारीख|दिनांक|सामील तारीख|सामील होण्याची तारीख/.test(text) ? 'joinedDate'
        : /\bstatus\b|स्थिति|स्थिती/.test(text) ? 'status'
          : /\bname\b|नाम|नाव/.test(text) ? 'name'
            : null
  if (deleteRequest && !removeMemberPageRequest && (memberActionContext || !updateRequest)) {
    const matchedMember = candidates.length === 1 ? candidates[0] : null
    return {
      intent: 'DELETE_MEMBER',
      language: detectedLanguage,
      entities: matchedMember
        ? { memberId: matchedMember._id || matchedMember.id, memberName: matchedMember.name }
        : {},
      confidence: matchedMember ? 0.96 : 0.9,
      requiresClarification: !matchedMember,
    }
  }
  if (updateRequest && (memberActionContext || candidates.length > 0 || memberField)) {
    const matchedMember = candidates.length === 1 ? candidates[0] : null
    return {
      intent: 'UPDATE_MEMBER',
      language: detectedLanguage,
      entities: {
        ...(matchedMember ? { memberId: matchedMember._id || matchedMember.id, memberName: matchedMember.name } : {}),
        ...(memberField ? { field: memberField } : {}),
      },
      confidence: matchedMember && memberField ? 0.96 : 0.88,
      requiresClarification: !matchedMember || !memberField,
    }
  }
  if (addMemberRequest) {
    return { intent: 'ADD_MEMBER', language: detectedLanguage, entities: {}, confidence: 0.95, requiresClarification: false }
  }

  const member = candidates.length === 1 ? candidates[0] : null
  const savingsQuery = /savings|saving|बचत/.test(text)
  const loanQuery = /loan|loans|कर्ज|लोन|कर्ज़/.test(text)
  const allRecordsQuery = /how many (?:things|records)|all records|everything stored|how much (?:information|data)|सभी रिकॉर्ड|कितने रिकॉर्ड|सगळ्या नोंदी|किती नोंदी|किती माहिती/.test(text)
  const memberProfileQuery = hasPhrase(text, ['profile', 'details', 'who is', 'कौन है', 'जानकारी', 'प्रोफाइल', 'माहिती', 'तपशील'])
  const matches = intentDataset.flatMap((item) => Object.values(item.examples).flat()
    .map((phrase) => ({ item, phrase: normalizeCommand(phrase) })))
    .filter(({ phrase }) => phrase && (text === phrase || text.includes(phrase)))
    .sort((left, right) => right.phrase.length - left.phrase.length)
  if (candidates.length > 1 && (allRecordsQuery || savingsQuery || loanQuery || memberProfileQuery)) {
    return {
      intent: 'CLARIFY_MEMBER',
      language: detectedLanguage,
      entities: {
        queryIntent: allRecordsQuery ? 'QUERY_MEMBER_RECORDS' : savingsQuery ? 'QUERY_MEMBER_SAVINGS' : loanQuery ? 'QUERY_MEMBER_LOANS' : 'QUERY_MEMBER',
        candidates: candidates.map(({ _id, id, name, memberId }) => ({ memberId: _id || id, name, displayId: memberId })),
      },
      confidence: 0.5,
      requiresClarification: true,
    }
  }
  if (member && allRecordsQuery) {
    return { intent: 'QUERY_MEMBER_RECORDS', language: detectedLanguage, entities: { memberId: member._id || member.id, memberName: member.name }, confidence: 0.95, requiresClarification: false }
  }
  if (!member && (allRecordsQuery || savingsQuery || loanQuery || memberProfileQuery) && (/\bmember\b|सदस्य|मेंबर/.test(text) || allRecordsQuery)
    && (matches[0]?.phrase.length || 0) < 12) {
    return {
      intent: 'ASK_MEMBER',
      language: detectedLanguage,
      entities: { queryIntent: allRecordsQuery ? 'QUERY_MEMBER_RECORDS' : savingsQuery ? 'QUERY_MEMBER_SAVINGS' : loanQuery ? 'QUERY_MEMBER_LOANS' : 'QUERY_MEMBER' },
      confidence: 0.55,
      requiresClarification: true,
    }
  }
  if (!member && allRecordsQuery) {
    return {
      intent: 'ASK_MEMBER',
      language: detectedLanguage,
      entities: { queryIntent: 'QUERY_MEMBER_RECORDS' },
      confidence: 0.55,
      requiresClarification: true,
    }
  }
  if (member && savingsQuery && !/add|record|जमा करो|जोडा|नोंदवा/.test(text)) {
    return { intent: 'QUERY_MEMBER_SAVINGS', language: detectedLanguage, entities: { memberId: member._id || member.id, memberName: member.name }, confidence: 0.96, requiresClarification: false }
  }
  if (member && loanQuery && !/add|create|give|apply|जमा करो|द्या|आवेदन/.test(text)) {
    return { intent: 'QUERY_MEMBER_LOANS', language: detectedLanguage, entities: { memberId: member._id || member.id, memberName: member.name }, confidence: 0.96, requiresClarification: false }
  }
  if (member && memberProfileQuery) {
    return { intent: 'QUERY_MEMBER', language: detectedLanguage, entities: { memberId: member._id || member.id, memberName: member.name }, confidence: 0.94, requiresClarification: false }
  }

  if (/\b(goal|goals|target)\b|लक्ष्य|ध्येय/u.test(text)
    && /\b(how much|how many|progress|remaining|saved|balance|status)\b|कितनी|कितना|प्रगति|बचा|बाकी|किती|प्रगती|उरलेले/u.test(text)) {
    return { intent: 'QUERY_GOALS', language: detectedLanguage, entities: {}, confidence: 0.9, requiresClarification: false }
  }

  const navigation = resolveNavigation(text)
  if (navigation) {
    return { intent: navigation.intent, language: detectedLanguage, entities: {}, confidence: 0.92, requiresClarification: false }
  }

  if (hasPhrase(text, ['add member', 'add a member', 'member add', 'new member', 'register member', 'सदस्य जोड़', 'सदस्य जोडा', 'नया सदस्य', 'नवीन सदस्य'])) {
    return { intent: 'ADD_MEMBER', language: detectedLanguage, entities: {}, confidence: 0.95, requiresClarification: false }
  }
  if (hasPhrase(text, ['record savings', 'add savings', 'collect savings', 'बचत जमा', 'बचत दर्ज', 'बचत जमा करा', 'बचत नोंद'])) {
    return { intent: 'RECORD_SAVINGS', language: detectedLanguage, entities: {}, confidence: 0.95, requiresClarification: false }
  }
  if (hasPhrase(text, ['add goal', 'create goal', 'new goal', 'set a savings goal', 'लक्ष्य बनाओ', 'लक्ष्य जोड़ो', 'ध्येय तयार करा', 'ध्येय जोडा'])) {
    return { intent: 'ADD_GOAL', language: detectedLanguage, entities: {}, confidence: 0.95, requiresClarification: false }
  }
  if (hasPhrase(text, ['apply for loan', 'loan application', 'कर्ज के लिए आवेदन', 'लोन आवेदन', 'कर्जासाठी अर्ज', 'लोन अर्ज'])
    && !hasPhrase(text, ['loan applications', 'member loan requests'])) {
    return { intent: 'OPEN_MEMBER_LOAN_APPLICATION', language: detectedLanguage, entities: {}, confidence: 0.92, requiresClarification: false }
  }
  if (hasPhrase(text, ['how many members', 'member count', 'total members', 'कितने सदस्य', 'सदस्यों की संख्या', 'किती सदस्य', 'सदस्य संख्या'])) {
    return { intent: 'QUERY_MEMBER_COUNT', language: detectedLanguage, entities: {}, confidence: 0.95, requiresClarification: false }
  }
  if (hasPhrase(text, ['group balance', 'available balance', 'कुल बैलेंस', 'समूह का बैलेंस', 'गटाची शिल्लक', 'एकूण शिल्लक'])
    && !hasPhrase(text, ['open', 'उघडा', 'खोलो'])) {
    return { intent: 'QUERY_GROUP_BALANCE', language: detectedLanguage, entities: {}, confidence: 0.95, requiresClarification: false }
  }

  if (matches.length) {
    const { item, phrase } = matches[0]
    return { intent: item.intent, language: detectedLanguage, entities: {}, confidence: text === phrase ? 1 : Math.min(0.95, 0.75 + phrase.length / 100), requiresClarification: false }
  }

  if (hasPhrase(text, queryMarkers)) {
    return { intent: 'SEARCH_RECORDS', language: detectedLanguage, entities: {}, confidence: 0.65, requiresClarification: true }
  }

  return { intent: 'UNRECOGNIZED', language: detectedLanguage, entities: {}, confidence: 0, requiresClarification: true }
}

export const supportedIntents = intentDataset
