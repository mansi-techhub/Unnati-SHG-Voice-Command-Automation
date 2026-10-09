export function isMemberMessageRequest(value) {
  const text = String(value || '').toLocaleLowerCase().normalize('NFKC')
  if (/\b(reminder|reminders|remind|unpaid|not paid)\b/.test(text)
    || /रिमाइंडर|स्मरणपत्र|स्मरण|आठवण|याद दिल|थकबाकी|भरणा नोंदलेला नाही/.test(text)) return false

  const asksToSend = /\b(send|text|notify|message)\b/.test(text)
    || /भेज|संदेश|सूचना भेज|पाठव|निरोप|कळव/.test(text)
  const mentionsMessage = /\b(message|notification|msg)\b/.test(text)
    || /संदेश|सूचना|निरोप/.test(text)
  return asksToSend && mentionsMessage
}
