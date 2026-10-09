export function isCorrectionRequest(value) {
  const text = String(value || '').toLocaleLowerCase().normalize('NFKC')
  return /\b(edit|correction)\s+(request|req)\b|\b(send|submit|raise)\s+(an?\s+)?(edit|correction)\s+(request|req)\b|\bcorrect\s+(my|the)\s+(record|entry)\b/.test(text)
    || /सुधार अनुरोध|सुधार रिक्वेस्ट|रिकॉर्ड में सुधार|दुरुस्ती विनंती|दुरुस्ती अर्ज|नोंदीत दुरुस्ती/.test(text)
}

export function parseCorrectionCategory(value) {
  const text = String(value || '').toLocaleLowerCase().normalize('NFKC').trim()
  const categories = {
    savings: ['savings', 'saving', 'बचत'],
    loan: ['loan', 'loans', 'कर्ज', 'कर्ज़', 'ऋण', 'लोन'],
    attendance: ['attendance', 'हाजिरी', 'उपस्थिति', 'हजेरी', 'हजेरीची'],
    passbook: ['passbook', 'पासबुक', 'खातेवही', 'पास बुक'],
  }
  return Object.entries(categories)
    .find(([, aliases]) => aliases.some((alias) => text === alias || text.includes(alias)))?.[0] || null
}
