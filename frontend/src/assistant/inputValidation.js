const skipPhrases = ['skip', 'none', 'not available', 'छोड़ें', 'छोड़ दो', 'वगळा', 'नाही']

export function isSkipPhrase(value) {
  const normalized = String(value).trim().toLocaleLowerCase().replace(/[.!?।]+$/u, '')
  return skipPhrases.includes(normalized)
}

export function isValidPhone(value) {
  const digits = String(value).replace(/\D/g, '')
  return digits.length === 10
}

export function parseCorrection(value) {
  const statement = String(value).trim()
  const start = /^(?:(?:actually|in fact|correction|change|correct|update|दरअसल|असल में|वास्तव में|खरं तर|खरं म्हणजे)\s*[,，]?\s*(?:(?:his|her|their|the member's|उसका|उसकी|उसके|त्याचा|त्याची|त्याचे|त्याचं|तिचं)\s+)?)/iu
  const field = '(name|नाम|नाव|phone(?: number)?|मोबाइल|फोन|address|पता|पत्ता|joining date|due date|actual date|received date|collection date|तारीख|दिनांक|amount|राशि|रक्कम|target amount|title|goal|note|नोंद|टिप्पणी|month|status|स्थिति|स्थिती|value|penalty(?: per day)?|जुर्माना|दंड)'
  const directMatch = statement.match(new RegExp(`${start.source}${field}\\s+(?:to|is|as|है|होना चाहिए|आहे|असावे|करा|में|के रूप में)\\s+(.+)$`, 'iu'))
  const trailingVerbMatch = statement.match(new RegExp(`${start.source}${field}\\s+(.+?)\\s+(?:है|हैं|होता है|आहे|आहेत|असावे)[.!?।]*$`, 'iu'))
  const match = directMatch || trailingVerbMatch
  if (!match) return null
  return {
    field: match[1],
    value: match[match.length - 1].trim().replace(/[.!?।]+$/u, ''),
  }
}
