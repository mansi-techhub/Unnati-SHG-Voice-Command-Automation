const copy = {
  en: {
    savings: 'Savings',
    loan_emi: 'Loan EMI',
    paid: (count, names) => `${count} recorded a payment (${names}).`,
    unpaid: (count, names) => `${count} have no payment recorded (${names}).`,
    empty: 'none',
    report: (label, year, total, paid, unpaid) => `${label} in ${year}: ${total} member${total === 1 ? '' : 's'} considered. ${paid} ${unpaid}`,
    sent: (count, names) => `In-app reminder notifications were created for ${count} member${count === 1 ? '' : 's'}: ${names}.`,
    noRecipients: 'There are no unpaid members to remind for that year and payment type.',
    noMatchingRecipient: 'I could not match those names to the unpaid members in the last payment report. No notifications were created.',
    notUnpaid: (names) => `These selected members are not listed as unpaid for that period: ${names}. No notifications were created.`,
    unpaidList: (names) => `Members with no recorded payment: ${names}.`,
    noUnpaid: 'There are no members without a recorded payment in that report.',
  },
  hi: {
    savings: 'बचत',
    loan_emi: 'ऋण की किस्त',
    paid: (count, names) => `${count} सदस्यों का भुगतान दर्ज है (${names})।`,
    unpaid: (count, names) => `${count} सदस्यों का कोई भुगतान दर्ज नहीं है (${names})।`,
    empty: 'कोई नहीं',
    report: (label, year, total, paid, unpaid) => `${year} में ${label}: कुल ${total} सदस्य। ${paid} ${unpaid}`,
    sent: (count, names) => `${count} सदस्यों के लिए ऐप में रिमाइंडर सूचनाएँ बनाई गईं: ${names}।`,
    noRecipients: 'इस वर्ष और भुगतान प्रकार के लिए कोई बकाया सदस्य नहीं है।',
    noMatchingRecipient: 'दिए गए नाम पिछली भुगतान रिपोर्ट के बकाया सदस्यों से मेल नहीं खाते। कोई सूचना नहीं बनाई गई।',
    notUnpaid: (names) => `चुने गए सदस्य उस अवधि की बकाया सूची में नहीं हैं: ${names}। कोई सूचना नहीं बनाई गई।`,
    unpaidList: (names) => `जिन सदस्यों का भुगतान दर्ज नहीं है: ${names}।`,
    noUnpaid: 'उस रिपोर्ट में कोई भी सदस्य बिना दर्ज भुगतान के नहीं है।',
  },
  mr: {
    savings: 'बचत',
    loan_emi: 'कर्जाचा हप्ता',
    paid: (count, names) => `${count} सदस्यांचे भरणे नोंदले आहे (${names}).`,
    unpaid: (count, names) => `${count} सदस्यांचे भरणे नोंदलेले नाही (${names}).`,
    empty: 'कोणीही नाही',
    report: (label, year, total, paid, unpaid) => `${year} मधील ${label}: एकूण ${total} सदस्य. ${paid} ${unpaid}`,
    sent: (count, names) => `${count} सदस्यांसाठी अॅपमध्ये स्मरणपत्र सूचना तयार केल्या: ${names}.`,
    noRecipients: 'त्या वर्षासाठी आणि भरणा प्रकारासाठी कोणतेही थकबाकीदार सदस्य नाहीत.',
    noMatchingRecipient: 'दिलेली नावे मागील भरणा अहवालातील थकबाकीदार सदस्यांशी जुळत नाहीत. कोणतीही सूचना तयार केली नाही.',
    notUnpaid: (names) => `निवडलेले सदस्य त्या कालावधीच्या थकबाकी यादीत नाहीत: ${names}. कोणतीही सूचना तयार केली नाही.`,
    unpaidList: (names) => `ज्या सदस्यांचे भरणे नोंदलेले नाही: ${names}.`,
    noUnpaid: 'त्या अहवालात नोंद नसलेले भरणे असलेला कोणताही सदस्य नाही.',
  },
}

const englishMonths = {
  january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
  april: '04', apr: '04', may: '05', june: '06', jun: '06', july: '07', jul: '07',
  august: '08', aug: '08', september: '09', sep: '09', sept: '09',
  october: '10', oct: '10', november: '11', nov: '11', december: '12', dec: '12',
}
const hindiMonths = {
  जनवरी: '01', फरवरी: '02', मार्च: '03', अप्रैल: '04', मई: '05', जून: '06',
  जुलाई: '07', अगस्त: '08', सितंबर: '09', सितम्बर: '09', अक्टूबर: '10',
  नवंबर: '11', नवम्बर: '11', दिसंबर: '12', दिसम्बर: '12',
}
const marathiMonths = {
  जानेवारी: '01', फेब्रुवारी: '02', मार्च: '03', एप्रिल: '04', मे: '05', जून: '06',
  जुलै: '07', ऑगस्ट: '08', सप्टेंबर: '09', ऑक्टोबर: '10', नोव्हेंबर: '11', डिसेंबर: '12',
}

function displayPeriod(period, language) {
  if (!/^\d{4}-\d{2}$/.test(period)) return period
  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
  return new Date(`${period}-01T00:00:00`).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })
}

function memberPaymentDetails(members, language, isPaid = false) {
  const labels = {
    en: { paid: 'paid', overdue: 'overdue', notDue: 'not yet due', due: 'due', on: 'on' },
    hi: { paid: 'भुगतान किया', overdue: 'देय तिथि निकल गई', notDue: 'अभी देय नहीं', due: 'देय', on: 'को' },
    mr: { paid: 'भरले', overdue: 'मुदत संपली', notDue: 'अजून देय नाही', due: 'देय', on: 'रोजी' },
  }[language] || {
    paid: 'paid', overdue: 'overdue', notDue: 'not yet due', due: 'due', on: 'on',
  }
  return members.length
    ? members.map((member) => {
      if (isPaid && member.paidDate) return `${member.name} (${labels.paid} ${labels.on} ${member.paidDate})`
      if (!isPaid && member.paymentStatus) {
        const state = member.paymentStatus === 'overdue' ? labels.overdue : labels.notDue
        return `${member.name} (${state}${member.dueDate ? `; ${labels.due} ${member.dueDate}` : ''})`
      }
      return member.name
    }).join(', ')
    : (copy[language] || copy.en).empty
}

export function formatPaymentCompliance(report, language = 'en') {
  const labels = copy[language] || copy.en
  return ['savings', 'loan_emi']
    .filter((type) => report[type])
    .map((type) => {
      const summary = report[type]
      const paid = labels.paid(summary.paidCount, memberPaymentDetails(summary.paid, language, true))
      const unpaid = labels.unpaid(summary.unpaidCount, memberPaymentDetails(summary.unpaid, language))
      return labels.report(labels[type], displayPeriod(report.period || String(report.year), language), summary.totalMembers, paid, unpaid)
    })
    .join('\n')
}

export function parsePaymentStatusRequest(value, currentYear = new Date().getFullYear()) {
  const text = String(value || '')
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966))
  const asksAboutPayment = /\b(paid|pay|payment|payments|emi|installment|instalment|contribution|savings|saving)\b/.test(text)
    || /भुगतान|जमा|किस्त|बचत|भरणा|हप्ता|भरले|दिले/.test(text)
  const asksForStatus = /\b(who|which|whose|how many|members|member|not|have not|has not|didn.t|paid|status)\b/.test(text)
    || /किसने|कौन|कितने|कितनी|सदस्य|नहीं|नाही|कोण|किती/.test(text)
  if (!asksAboutPayment || !asksForStatus) return null

  const explicitMonth = text.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/)
  const explicitYear = text.match(/\b(20\d{2})\b/)
  let month
  if (explicitMonth) {
    month = explicitMonth[2].padStart(2, '0')
  } else {
    const monthName = text.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/)
    const localizedMonth = Object.entries({ ...hindiMonths, ...marathiMonths })
      .find(([name]) => text.includes(name))
    month = monthName
      ? englishMonths[monthName[1]]
      : localizedMonth?.[1]
  }
  const refersToCurrentMonth = /\b(this month|current month|of this month)\b/.test(text)
    || /या महिन्यात|या महिन्याची|या महिन्याचे|इस महीने|इस माह/.test(text)
  const year = explicitYear ? Number(explicitYear[1]) : currentYear
  if (!month && refersToCurrentMonth) {
    const now = new Date()
    return {
      period: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      paymentType: paymentTypeFromText(text),
    }
  }
  return {
    period: month ? `${year}-${month}` : String(year),
    paymentType: paymentTypeFromText(text),
  }
}

function paymentTypeFromText(text) {
  const paymentType = /\bsavings?\b|बचत/.test(text)
    ? (/\b(?:loan|loans|emi|installment|instalment)\b|कर्ज|लोन|किस्त|हप्ता/.test(text) ? 'both' : 'savings')
    : /\b(?:loan|loans|emi|installment|instalment)\b|कर्ज|लोन|किस्त|हप्ता/.test(text)
      ? 'loan_emi'
      : 'both'
  return paymentType
}

export function getMentionedMemberIds(value, members = []) {
  const text = String(value || '').toLocaleLowerCase().normalize('NFKC')
  return members
    .filter((member) => {
      const name = String(member.name || '').toLocaleLowerCase().normalize('NFKC')
      const memberId = String(member.memberId || '').toLocaleLowerCase().normalize('NFKC')
      return (name.length > 1 && text.includes(name)) || (memberId && text.includes(memberId))
    })
    .map((member) => member._id || member.id)
    .filter(Boolean)
}

export function isExplicitRecipientRequest(value) {
  const text = String(value || '').toLocaleLowerCase()
  if (/\b(them|those|everyone|all of them|all members|all the members|members who|member who)\b/.test(text)
    || /उन्हें|उनको|त्यांना|सर्वांना|सर्व सदस्य|जिन सदस्य|जो सदस्य/.test(text)) {
    return false
  }
  return /\b(to|for)\b/.test(text) || /के लिए|को |साठी|ला /.test(text)
}

export function isAllUnpaidMembersRequest(value) {
  const text = String(value || '').toLocaleLowerCase().normalize('NFKC')
  return /\b(all|every|everyone|all members|all the members)\b/.test(text)
    || /सर्व|सभी|हर सदस्य|जिन सदस्यों|जो सदस्य/.test(text)
}

export function isPaymentStatusFollowUp(value) {
  const text = String(value || '').toLocaleLowerCase().normalize('NFKC').trim()
  return /^(which are they|who are they|which members|who are those|tell me their names|which ones|who didn.t pay|show unpaid members)[?.! ]*$/i.test(text)
    || /^(कौन हैं वे|वे कौन हैं|कौन हैं ये|ये कौन हैं|कौन कौन|कौन-कौन|कौन से सदस्य|कौन से लोग|उनके नाम|उनके नाम बताओ|कोण आहेत|ते कोण आहेत|कोणते सदस्य|त्यांची नावे|त्यांची नावे काय|कोण कोण)[?!. ]*$/.test(text)
}

export function formatUnpaidMembers(report, language = 'en') {
  const labels = copy[language] || copy.en
  const unpaid = ['savings', 'loan_emi']
    .filter((type) => report[type])
    .flatMap((type) => report[type].unpaid)
  const uniqueMembers = [...new Map(unpaid.map((member) => [member.id || member.memberId, member])).values()]
  if (!uniqueMembers.length) return labels.noUnpaid
  return labels.unpaidList(memberPaymentDetails(uniqueMembers, language))
}

export function isPaymentReminderRequest(value) {
  const text = String(value || '').toLocaleLowerCase().normalize('NFKC')
  const asksToSend = /\b(send|text|message|notify|remind)\b/.test(text)
    || /भेज|दिलाओ|दिलाने|पाठव|सांगा|आठवण|संदेश/.test(text)
  const mentionsReminder = /\b(reminder|reminders|remind)\b/.test(text)
    || /अनुस्मारक|स्मरणपत्र|रिमाइंडर|स्मरण|आठवण|याद दिल/.test(text)
  const refersToPreviousRecipients = /\bthem\b/.test(text) || /उन्हें|उनको|त्यांना/.test(text)
  const refersToUnpaidMembers = /\b(all members|all the members|members who|member who|anyone who)\b/.test(text)
    || /सभी सदस्य|सर्व सदस्य|जिन सदस्यों|जिन सदस्यों ने|जो सदस्य|ज्या सदस्य/.test(text)
  return asksToSend && (mentionsReminder || refersToPreviousRecipients || refersToUnpaidMembers)
}

export function formatPaymentReminderResult(result, language = 'en') {
  const labels = copy[language] || copy.en
  if (result.inAppCreated === 0) return labels.noRecipients
  const names = (result.recipients || []).map((recipient) => recipient.name).filter(Boolean).join(', ')
  return labels.sent(result.inAppCreated, names || labels.empty)
}

export function paymentReminderCopy(language = 'en') {
  return (copy[language] || copy.en)
}
