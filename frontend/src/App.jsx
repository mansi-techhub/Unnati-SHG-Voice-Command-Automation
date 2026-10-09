import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { dictionary, uiText } from './locales'
import { demoData } from './data/demoData'
import { api } from './services/api'
import AssistantPanel from './assistant/AssistantPanel'
import { localizeReportValue } from './reportLocalization'
import { searchGroupRecords } from './globalSearch'

function getPeriod(shg) {
  const source = shg?.formationDate || shg?.startMonth
  const dateOnly = typeof source === 'string' && /^\d{4}-\d{2}-\d{2}/.test(source)
  const date = dateOnly
    ? new Date(Number(source.slice(0, 4)), Number(source.slice(5, 7)) - 1, Number(source.slice(8, 10)))
    : source ? new Date(source) : new Date()
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date
  const locale = displayLocale(({ hi: 'hi-IN', mr: 'mr-IN' })[localStorage.getItem('shgms-language')] || 'en-IN')
  return {
    month: validDate.toLocaleString(locale, { month: 'long' }),
    year: formatDigits(validDate.getFullYear(), locale),
    value: `${validDate.getFullYear()}-${String(validDate.getMonth() + 1).padStart(2, '0')}`,
    label: validDate.toLocaleString(locale, { month: 'long', year: 'numeric' }),
  }
}

function shiftMonth(value, offset) {
  const [year, month] = String(value || '').split('-').map(Number)
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(value, locale) {
  const [year, month] = String(value || '').split('-').map(Number)
  return new Date(year, (month || 1) - 1, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })
}

function MonthPicker({ value, onChange, t }) {
  const locale = displayLocale(t.moneyLocale)
  return (
    <div className="month-picker" aria-label={ui(t, 'month')}>
      <button type="button" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">‹</button>
      <input type="month" value={value} onChange={(event) => onChange(event.target.value)} />
      <span>{monthLabel(value, locale)}</span>
      <button type="button" onClick={() => onChange(shiftMonth(value, 1))} aria-label="Next month">›</button>
    </div>
  )
}

function recordMonth(value) {
  if (!value) return ''
  const text = String(value)
  const iso = text.match(/^(\d{4})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}`
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function localizedNotification(value, t) {
  const text = String(value || '')
  if (textLang(t) === 'en') return text
  const language = textLang(t)
  const labels = language === 'hi'
    ? { reminder: 'कर्ज किश्त स्मरणपत्र: आपका कर्ज {loan} भुगतान {date} को देय है।', member: '{name} की कर्ज किश्त {date} को देय है।' }
    : { reminder: 'कर्ज हप्ता स्मरणपत्र: तुमच्या कर्ज {loan} चे देयक {date} रोजी आहे.', member: '{name} यांचा कर्ज हप्ता {date} रोजी देय आहे.' }
  if (/EMI reminder: your loan (.+) payment is due on (.+)\./i.test(text)) {
    const [, loan, date] = text.match(/EMI reminder: your loan (.+) payment is due on (.+)\./i)
    return labels.reminder.replace('{loan}', loan).replace('{date}', date)
  }

  if (/(.+) loan EMI is due on (.+)\./i.test(text)) {
    const [, name, date] = text.match(/(.+) loan EMI is due on (.+)\./i)
    return labels.member.replace('{name}', localizedValue(name, t)).replace('{date}', date)
  }
  return localizedValue(text, t)
}

function localizedReportDescription(value, t) {
  const text = String(value || '')
  if (textLang(t) === 'en') return text
  const language = textLang(t)
  const labels = language === 'hi'
    ? { savings: 'बचत', monthlySavings: 'मासिक बचत संग्रह', repayment: 'कर्ज भुगतान', loanEmi: 'कर्ज किश्त संग्रह', expense: 'खर्च', income: 'आय', loanDistribution: 'कर्ज वितरण', goal: 'लक्ष्य में योगदान', emergency: 'आपात निधि' }
    : { savings: 'बचत', monthlySavings: 'मासिक बचत संकलन', repayment: 'कर्ज परतफेड', loanEmi: 'कर्ज हप्ता संकलन', expense: 'खर्च', income: 'उत्पन्न', loanDistribution: 'कर्ज वितरण', goal: 'ध्येयातील योगदान', emergency: 'आपत्कालीन निधी' }
  if (/^Savings for (.+)$/i.test(text)) return `${labels.savings}: ${text.match(/^Savings for (.+)$/i)[1]}`
  if (/^(Monthly savings collection|Test monthly saving .+)$/i.test(text)) return labels.monthlySavings
  if (/^Test PhonePe EMI collection$/i.test(text)) return labels.loanEmi
  if (/^Repayment for (.+)$/i.test(text)) return `${labels.repayment}: ${text.match(/^Repayment for (.+)$/i)[1]}`
  if (/^Loan EMI collection for (.+)$/i.test(text)) return `${labels.loanEmi}: ${text.match(/^Loan EMI collection for (.+)$/i)[1]}`
  if (/^Expense\b/i.test(text)) return `${labels.expense}${text.replace(/^Expense/i, '')}`
  if (/^Income\b/i.test(text)) return `${labels.income}${text.replace(/^Income/i, '')}`
  if (/^Loan distribution\b/i.test(text)) return labels.loanDistribution
  if (/^Contribution to\b/i.test(text)) return `${labels.goal}: ${text.replace(/^Contribution to\s*/i, '')}`
  if (/^Emergency fund\b/i.test(text)) return `${labels.emergency}: ${text.replace(/^Emergency fund\s*/i, '')}`
  return localizedValue(text, t)
}

function formatStoredDate(value, locale = 'en-IN') {
  if (!value) return '—'
  const source = String(value)
  const date = /^\d{4}-\d{2}-\d{2}/.test(source)
    ? new Date(Number(source.slice(0, 4)), Number(source.slice(5, 7)) - 1, Number(source.slice(8, 10)))
    : new Date(source)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(displayLocale(locale))
}

function displayLocale(locale = 'en-IN') {
  return locale === 'hi-IN' || locale === 'mr-IN' ? `${locale}-u-nu-deva` : locale
}

function readStoredJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    localStorage.removeItem(key)
    return fallback
  }
}

function formatDigits(value, locale = 'en-IN') {
  const text = String(value ?? '')
  return displayLocale(locale).includes('nu-deva') ? text.replace(/\d/g, (digit) => '०१२३४५६७८९'[Number(digit)]) : text
}

function getCurrentMember(members) {
  const user = readStoredJson('unnati_user')
  const memberId = user?.member?._id || user?.member
  return members.find((member) => String(member._id || member.id) === String(memberId)) || members[0] || { name: '—', memberId: '—', savings: 0, loanOutstanding: 0 }
}

const navGroups = [
  { key: 'overview', items: ['dashboard', 'profile', 'notifications'] },
  { key: 'finance', items: ['savings', 'loanCollection', 'loanDetails', 'loanDemandRisk', 'loans', 'ledger', 'otherExpense', 'otherIncome', 'passbook', 'monthly', 'memberBalanceSheet', 'balance'] },
  { key: 'management', items: ['members', 'removeMember', 'rulesNotice', 'meetings', 'attendance', 'goals', 'emergency', 'documents', 'loanApplications', 'editRequests'] },
  { key: 'reports', items: ['calculationReport', 'reports', 'insights', 'schemes', 'penaltySettings', 'interestSettings', 'shareApp'] },
]

const memberNavGroups = [
  { key: 'overview', items: ['dashboard', 'profile', 'notifications'] },
  { key: 'finance', items: ['passbook', 'savings', 'loanApplication', 'loanDetails', 'loanDemandRisk', 'loans', 'ledger', 'monthly', 'memberBalanceSheet', 'balance'] },
  { key: 'management', items: ['meetings', 'attendance', 'documents', 'editRequests'] },
  { key: 'reports', items: ['calculationReport', 'reports', 'insights', 'schemes'] },
]

const icons = {
  dashboard: 'chart', profile: 'profile', notifications: 'bell', savings: 'wallet', loans: 'loan',
  ledger: 'ledger', passbook: 'book', monthly: 'calendar', balance: 'scale', members: 'users',
  meetings: 'meeting', attendance: 'calendar', goals: 'target', emergency: 'shield', documents: 'folder', reports: 'file',
  insights: 'spark', calculationReport: 'chart', schemes: 'bank', settings: 'settings',
  loanCollection: 'calendar', otherExpense: 'ledger', otherIncome: 'wallet', rulesNotice: 'bell',
  penaltySettings: 'settings', interestSettings: 'settings', removeMember: 'users', shareApp: 'spark',
  editRequests: 'file', loanDetails: 'book', loanDemandRisk: 'loan', memberBalanceSheet: 'scale',
  loanApplication: 'loan', loanApplications: 'loan',
}

const pathMap = {
  chart: 'M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-9',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4',
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13m3 8h-4',
  loan: 'M12 3v18m4-14.5A4 4 0 0 0 12 5c-2.2 0-4 1-4 2.8 0 3.9 8 2.2 8 6.4C16 16 14.2 17 12 17a5 5 0 0 1-4.5-2',
  ledger: 'M5 4h14v16H5zM9 8h6M9 12h6M9 16h3',
  book: 'M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3V5Zm0 0v17',
  calendar: 'M7 3v4m10-4v4M4 8h16M5 5h14v15H5z',
  scale: 'M12 3v18M6 7h12M7 7l-4 7h8L7 7Zm10 0l-4 7h8l-4-7Z',
  users: 'M16 19a4 4 0 0 0-8 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 7a3.5 3.5 0 0 0-3-3.4M4 19a3.5 3.5 0 0 1 3-3.4',
  meeting: 'M4 5h16v11H7l-3 3V5Zm5 4h6m-6 4h4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  shield: 'M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z',
  folder: 'M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z',
  file: 'M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  spark: 'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Zm6 12 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z',
  bank: 'M3 9 12 4l9 5M5 10h14M6 10v8m4-8v8m4-8v8m4-8v8M4 20h16',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 4a8.3 8.3 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L16 3.5h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a8.3 8.3 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z',
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d={pathMap[name] || pathMap.chart} />
    </svg>
  )
}

function BrandMark({ compact = false, t }) {
  return (
    <div className={`brand ${compact ? 'compact-brand' : ''}`}>
      <img src="/unnati-logo.svg" alt="Unnati logo" />
      <b>{t?.brandFull || 'Unnati : Swayam Sahyta gat'}</b>
    </div>
  )
}

const featureIconOrder = ['wallet', 'loan', 'book', 'file', 'spark', 'meeting', 'bank', 'folder']
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function postAuth(path, payload) {
  const response = await fetch(`${API_BASE}/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Authentication request failed')
  if (data.token) localStorage.setItem('unnati_token', data.token)
  if (data.user) localStorage.setItem('unnati_user', JSON.stringify(data.user))
  return data
}

const extraText = {
  en: {
    nav: {
      loanCollection: 'Collect Loans & Interest',
      otherExpense: 'Other Expense',
      otherIncome: 'Other Income',
      rulesNotice: 'Rules & Notice',
      penaltySettings: 'Penalty Settings',
      interestSettings: 'Interest Rates',
      removeMember: 'Remove Member',
      shareApp: 'Share SHG App',
      editRequests: 'Correction Requests',
      loanDetails: 'Loan Details',
      loanDemandRisk: 'Loan Demand & Risk',
      memberBalanceSheet: "Member's Balance Sheet",
      attendance: 'Attendance',
      calculationReport: 'Calculation Report',
    },
    president: 'President',
    member: 'Member',
    loginAs: 'Login As:',
    memberDashboard: 'Member Transparency Dashboard',
    viewOnly: 'View-only access',
    requestCorrection: 'Send Correction Request',
    correctionSent: 'Correction request sent to president',
    correctionReference: 'Receipt, transaction, meeting, or record ID',
    correctionDescription: 'Describe the correction needed',
    correctionTypes: 'Savings / Loan / Attendance / Passbook',
    receiptOrTransaction: 'Receipt or transaction ID',
    pendingPresidentReview: 'Pending President Review',
    membersCanView: 'Members can view records for transparency.',
    membersCannotEdit: 'Members cannot directly edit financial entries.',
    presidentReviews: 'President reviews and approves correction requests.',
    requestHint: 'If savings, loan, attendance, or passbook entry is wrong, send a request to the president.',
    shareTitle: 'Share SHG App to All Members',
    codeGenerated: 'SHG code generated',
    codeFound: 'SHG found. Select your name and login.',
    codeMissing: 'Enter valid SHG code shared by your president.',
    shareCopied: 'Share message copied. You can paste it in WhatsApp.',
    shareOpen: 'WhatsApp share opened.',
    groupCard: 'Group Code & Member Invite',
    presidentTools: 'President workflow',
    viewInfo: 'View INFO',
    enterInfo: 'Enter INFO',
    savingMonth: 'Saving Month',
    changeStartMonth: 'Want to change Start Month?',
    addMembersFirst: 'Please Add All Members First',
    collectSavings: 'Collect Monthly Savings',
    collectLoanInterest: 'Collect Loans & Interest',
    provideLoans: 'Provide This Month Loans',
    addRules: 'Add Rules & Notice',
    addExpense: 'Add Other Expense',
    addIncome: 'Add Other Income',
    penaltySaving: 'Penalty & Saving Settings',
    interestRates: 'Interest Rates Settings',
    addModifyMember: 'Add Member / Modify Member',
    permanentRemove: 'Permanently Remove Member',
  },
  hi: {
    nav: {
      loanCollection: 'कर्ज और ब्याज संग्रह',
      otherExpense: 'अन्य खर्च',
      otherIncome: 'अन्य आय',
      rulesNotice: 'नियम और सूचना',
      penaltySettings: 'जुर्माना सेटिंग',
      interestSettings: 'ब्याज दरें',
      removeMember: 'सदस्य हटाएं',
      shareApp: 'SHG ऐप शेयर करें',
    },
    president: 'अध्यक्ष',
    member: 'सदस्य',
    loginAs: 'लॉगिन के रूप में:',
    shareTitle: 'सभी सदस्यों को SHG ऐप शेयर करें',
    codeGenerated: 'SHG कोड बन गया',
    codeFound: 'SHG मिल गया। अपना नाम चुनकर लॉगिन करें।',
    codeMissing: 'अध्यक्ष द्वारा दिया गया सही SHG कोड डालें।',
    shareCopied: 'शेयर संदेश कॉपी हो गया। इसे WhatsApp में पेस्ट करें।',
    shareOpen: 'WhatsApp शेयर खुल गया।',
    groupCard: 'समूह कोड और सदस्य निमंत्रण',
    presidentTools: 'अध्यक्ष कार्यप्रवाह',
    viewInfo: 'जानकारी देखें',
    enterInfo: 'जानकारी दर्ज करें',
    savingMonth: 'बचत महीना',
    changeStartMonth: 'शुरू महीना बदलना चाहते हैं?',
    addMembersFirst: 'कृपया पहले सभी सदस्य जोड़ें',
    collectSavings: 'मासिक बचत संग्रह',
    collectLoanInterest: 'कर्ज और ब्याज संग्रह',
    provideLoans: 'इस महीने कर्ज दें',
    addRules: 'नियम और सूचना जोड़ें',
    addExpense: 'अन्य खर्च जोड़ें',
    addIncome: 'अन्य आय जोड़ें',
    penaltySaving: 'जुर्माना और बचत सेटिंग',
    interestRates: 'ब्याज दर सेटिंग',
    addModifyMember: 'सदस्य जोड़ें / बदलें',
    permanentRemove: 'सदस्य स्थायी रूप से हटाएं',
    editRequests: 'सुधार अनुरोध',
    memberDashboard: 'सदस्य पारदर्शिता डैशबोर्ड',
    viewOnly: 'केवल देखने की सुविधा',
    requestCorrection: 'सुधार अनुरोध भेजें',
    requestHint: 'यदि बचत, कर्ज, उपस्थिति या पासबुक की प्रविष्टि गलत है, तो अध्यक्ष को अनुरोध भेजें।',
    correctionSent: 'सुधार अनुरोध अध्यक्ष को भेजा गया',
    correctionReference: 'रसीद, लेन-देन, बैठक या रिकॉर्ड आईडी',
    correctionDescription: 'आवश्यक सुधार का विवरण दें',
    correctionTypes: 'बचत / कर्ज / उपस्थिति / पासबुक',
    receiptOrTransaction: 'रसीद या लेन-देन आईडी',
    pendingPresidentReview: 'अध्यक्ष की समीक्षा लंबित',
    membersCanView: 'सदस्य पारदर्शिता के लिए रिकॉर्ड देख सकते हैं।',
    membersCannotEdit: 'सदस्य वित्तीय प्रविष्टियों को सीधे बदल नहीं सकते।',
    presidentReviews: 'अध्यक्ष सुधार अनुरोधों की समीक्षा और स्वीकृति करते हैं।',
  },
  mr: {
    nav: {
      loanCollection: 'कर्ज व व्याज संकलन',
      otherExpense: 'इतर खर्च',
      otherIncome: 'इतर उत्पन्न',
      rulesNotice: 'नियम व सूचना',
      penaltySettings: 'दंड सेटिंग',
      interestSettings: 'व्याज दर',
      removeMember: 'सदस्य काढा',
      shareApp: 'SHG अॅप शेअर करा',
    },
    president: 'अध्यक्ष',
    member: 'सदस्य',
    loginAs: 'लॉगिन म्हणून:',
    shareTitle: 'सर्व सदस्यांना SHG अॅप शेअर करा',
    codeGenerated: 'SHG कोड तयार झाला',
    codeFound: 'SHG सापडला. तुमचे नाव निवडून लॉगिन करा.',
    codeMissing: 'अध्यक्षांनी दिलेला योग्य SHG कोड टाका.',
    shareCopied: 'शेअर संदेश कॉपी झाला. WhatsApp मध्ये पेस्ट करा.',
    shareOpen: 'WhatsApp शेअर उघडले.',
    groupCard: 'गट कोड आणि सदस्य निमंत्रण',
    presidentTools: 'अध्यक्ष कार्यप्रवाह',
    viewInfo: 'माहिती पहा',
    enterInfo: 'माहिती भरा',
    savingMonth: 'बचत महिना',
    changeStartMonth: 'सुरू महिना बदलायचा आहे?',
    addMembersFirst: 'कृपया आधी सर्व सदस्य जोडा',
    collectSavings: 'मासिक बचत संकलन',
    collectLoanInterest: 'कर्ज व व्याज संकलन',
    provideLoans: 'या महिन्याचे कर्ज द्या',
    addRules: 'नियम व सूचना जोडा',
    addExpense: 'इतर खर्च जोडा',
    addIncome: 'इतर उत्पन्न जोडा',
    penaltySaving: 'दंड व बचत सेटिंग',
    interestRates: 'व्याज दर सेटिंग',
    addModifyMember: 'सदस्य जोडा / बदला',
    permanentRemove: 'सदस्य कायमचा काढा',
    editRequests: 'दुरुस्ती विनंती',
    memberDashboard: 'सदस्य पारदर्शकता डॅशबोर्ड',
    viewOnly: 'फक्त पाहण्याची सुविधा',
    requestCorrection: 'दुरुस्ती विनंती पाठवा',
    requestHint: 'बचत, कर्ज, हजेरी किंवा पासबुकची नोंद चुकीची असल्यास अध्यक्षांकडे विनंती पाठवा.',
    correctionSent: 'दुरुस्ती विनंती अध्यक्षांकडे पाठवली',
    correctionReference: 'पावती, व्यवहार, बैठक किंवा नोंदीचा आयडी',
    correctionDescription: 'आवश्यक दुरुस्तीचे वर्णन करा',
    correctionTypes: 'बचत / कर्ज / हजेरी / पासबुक',
    receiptOrTransaction: 'पावती किंवा व्यवहार आयडी',
    pendingPresidentReview: 'अध्यक्षांच्या पुनरावलोकनाची प्रतीक्षा',
    membersCanView: 'सदस्य पारदर्शकतेसाठी नोंदी पाहू शकतात.',
    membersCannotEdit: 'सदस्य आर्थिक नोंदी थेट बदलू शकत नाहीत.',
    presidentReviews: 'अध्यक्ष दुरुस्ती विनंत्यांचे पुनरावलोकन करून मंजूर करतात.',
  },
}

function textLang(t) {
  if (t.moneyLocale === 'hi-IN') return 'hi'
  if (t.moneyLocale === 'mr-IN') return 'mr'
  return 'en'
}

function ui(t, key, values = {}) {
  const language = textLang(t)
  let value = uiText[language]?.[key] || uiText.en[key] || key
  Object.entries(values).forEach(([name, replacement]) => {
    value = value.replace(`{${name}}`, formatDigits(replacement, t.moneyLocale))
  })
  return formatDigits(value, t.moneyLocale)
}

const localizedValues = {
  hi: {
    'Asha Jadhav': 'आशा जाधव', 'Meena Shinde': 'मीना शिंदे', 'Lata Pawar': 'लता पवार',
    'Kavita More': 'कविता मोरे', 'Rani Deshmukh': 'रानी देशमुख', 'Pooja Kale': 'पूजा काले',
    'Rani Jadhav': 'रानी जाधव', 'Pooja Pawar': 'पूजा पवार', 'Sunita Patil': 'सुनीता पाटिल',
    'Sakhi Bachat Gat': 'सखी महिला बचत समूह',
    'Asha Patil': 'आशा पाटिल', 'Lata Kale': 'लता काले', 'Mrs Komal Deokar': 'श्रीमती कोमल देवकर',
    'Ms Mansi Sarotee': 'सुश्री मानसी सरोटी', 'Mansi Sarotee': 'मानसी सरोटी',
    'Asha Jadhav': 'आशा जाधव', 'Meena Shinde': 'मीना शिंदे', 'Lata Pawar': 'लता पवार',
    'Kavita More': 'कविता मोरे', 'Rani Deshmukh': 'रानी देशमुख', 'Pooja Kale': 'पूजा काले',
    Secretary: 'सचिव', Treasurer: 'कोषाध्यक्ष', Member: 'सदस्य', President: 'अध्यक्ष',
    Active: 'सक्रिय', active: 'सक्रिय', Overdue: 'अतिदेय', overdue: 'अतिदेय',
    Completed: 'पूर्ण', Scheduled: 'निर्धारित', 'Partially Paid': 'आंशिक भुगतान',
    'Tailoring machine': 'सिलाई मशीन', 'Goat rearing': 'बकरी पालन', 'Education fees': 'शिक्षा शुल्क',
    'Test sewing machine goal': 'सिलाई मशीन लक्ष्य',
    Savings: 'बचत', savings: 'बचत', Repayment: 'भुगतान', repayment: 'भुगतान', Expense: 'खर्च', expense: 'खर्च', income: 'आय',
    credit: 'जमा', debit: 'खर्च', pending: 'लंबित', loan_emi: 'कर्ज किश्त', monthly_savings: 'मासिक बचत',
    cash: 'नकद', check: 'चेक', phonepe: 'PhonePe', upi: 'UPI', bank_transfer: 'बैंक ट्रांसफर',
    'Command center': 'कमांड सेंटर', 'Loan repayment review': 'कर्ज भुगतान समीक्षा',
    'No loan applications': 'कोई कर्ज आवेदन नहीं', 'Savings records': 'बचत रिकॉर्ड',
    'Add members': 'सदस्य जोड़ें', 'Next meeting': 'अगली बैठक', 'Schedule a meeting': 'बैठक तय करें',
    'No meetings scheduled': 'कोई बैठक निर्धारित नहीं', Due: 'देय', Scheduled: 'निर्धारित', Critical: 'महत्वपूर्ण',
    'Test monthly review meeting': 'मासिक समीक्षा बैठक', 'Gram Panchayat Hall': 'ग्राम पंचायत सभागार',
    'EMI payment reminder': 'कर्ज किश्त भुगतान स्मरणपत्र', 'Test EMI reminder': 'कर्ज किश्त स्मरणपत्र', Total: 'कुल',
    'No one has taken loan.': 'किसी ने कर्ज नहीं लिया है।', Unknown: 'अज्ञात',
  },
  mr: {
    'Asha Jadhav': 'आशा जाधव', 'Meena Shinde': 'मीना शिंदे', 'Lata Pawar': 'लता पवार',
    'Kavita More': 'कविता मोरे', 'Rani Deshmukh': 'राणी देशमुख', 'Pooja Kale': 'पूजा काळे',
    'Rani Jadhav': 'राणी जाधव', 'Pooja Pawar': 'पूजा पवार', 'Sunita Patil': 'सुनीता पाटील',
    'Sakhi Bachat Gat': 'सखी महिला बचत गट',
    'Asha Patil': 'आशा पाटील', 'Lata Kale': 'लता काळे', 'Mrs Komal Deokar': 'श्रीमती कोमल देवकर',
    'Ms Mansi Sarotee': 'कु. मानसी सरोटी', 'Mansi Sarotee': 'मानसी सरोटी',
    'Asha Jadhav': 'आशा जाधव', 'Meena Shinde': 'मीना शिंदे', 'Lata Pawar': 'लता पवार',
    'Kavita More': 'कविता मोरे', 'Rani Deshmukh': 'राणी देशमुख', 'Pooja Kale': 'पूजा काळे',
    Secretary: 'सचिव', Treasurer: 'खजिनदार', Member: 'सदस्य', President: 'अध्यक्ष',
    Active: 'सक्रिय', active: 'सक्रिय', Overdue: 'थकीत', overdue: 'थकीत',
    Completed: 'पूर्ण', Scheduled: 'ठरलेले', 'Partially Paid': 'अंशतः भरले',
    'Tailoring machine': 'शिलाई मशीन', 'Goat rearing': 'शेळीपालन', 'Education fees': 'शिक्षण शुल्क',
    'Test sewing machine goal': 'शिलाई मशीनचे ध्येय',
    Savings: 'बचत', savings: 'बचत', Repayment: 'परतफेड', repayment: 'परतफेड', Expense: 'खर्च', expense: 'खर्च', income: 'उत्पन्न',
    credit: 'जमा', debit: 'खर्च', pending: 'प्रलंबित', loan_emi: 'कर्ज हप्ता', monthly_savings: 'मासिक बचत',
    cash: 'रोख', check: 'धनादेश', phonepe: 'PhonePe', upi: 'UPI', bank_transfer: 'बँक हस्तांतरण',
    'Command center': 'कमांड सेंटर', 'Loan repayment review': 'कर्ज परतफेड आढावा',
    'No loan applications': 'कर्ज अर्ज नाहीत', 'Savings records': 'बचत नोंदी',
    'Add members': 'सदस्य जोडा', 'Next meeting': 'पुढील बैठक', 'Schedule a meeting': 'बैठक ठरवा',
    'No meetings scheduled': 'बैठक ठरलेल्या नाहीत', Due: 'देय', Scheduled: 'ठरलेले', Critical: 'गंभीर',
    'Test monthly review meeting': 'मासिक आढावा बैठक', 'Gram Panchayat Hall': 'ग्रामपंचायत सभागृह',
    'EMI payment reminder': 'कर्ज हप्ता देयक स्मरणपत्र', 'Test EMI reminder': 'कर्ज हप्ता स्मरणपत्र', Total: 'एकूण',
    'No one has taken loan.': 'कोणीही कर्ज घेतलेले नाही.', Unknown: 'अज्ञात',
  },
}

function localizedValue(value, t) {
  if (value === null || value === undefined) return value
  if (typeof value === 'object') return localizedValue(value.name || value.loanId || value.title || '', t)
  const translated = typeof value === 'string' ? (localizedValues[textLang(t)]?.[value] || value) : value
  return formatDigits(translated, t?.moneyLocale || 'en-IN')
}

function localizedStatus(value, t) {
  const status = String(value || '')
  const labels = {
    en: { active: 'Active', partially_paid: 'Partially paid', overdue: 'Overdue', completed: 'Completed', scheduled: 'Scheduled', pending: 'Pending', present: 'Present', absent: 'Absent', credit: 'Credit', debit: 'Debit' },
    hi: { active: 'सक्रिय', partially_paid: 'आंशिक भुगतान', overdue: 'अतिदेय', completed: 'पूर्ण', scheduled: 'निर्धारित', pending: 'लंबित', present: 'उपस्थित', absent: 'अनुपस्थित', credit: 'जमा', debit: 'खर्च' },
    mr: { active: 'सक्रिय', partially_paid: 'अंशतः भरले', overdue: 'थकीत', completed: 'पूर्ण', scheduled: 'ठरलेले', pending: 'प्रलंबित', present: 'उपस्थित', absent: 'अनुपस्थित', credit: 'जमा', debit: 'खर्च' },
  }
  const language = textLang(t)
  return labels[language]?.[status.toLowerCase().replace(/\s+/g, '_')] || localizedValue(value, t)
}

function currentUi(key, values = {}) {
  return ui(dictionary[localStorage.getItem('shgms-language') || 'en'], key, values)
}

function extra(t) {
  return extraText[textLang(t)] || extraText.en
}

function navLabel(t, item) {
  if (item === 'editRequests') {
    const labels = { en: 'Correction Requests', hi: 'सुधार अनुरोध', mr: 'दुरुस्ती विनंती' }
    return labels[textLang(t)] || labels.en
  }
  if (item === 'loanDetails') {
    const labels = { en: 'Loan Details', hi: 'कर्ज विवरण', mr: 'कर्ज तपशील' }
    return labels[textLang(t)] || labels.en
  }
  if (item === 'loanDemandRisk') {
    const labels = { en: 'Loan Demand & Risk', hi: 'कर्ज मांग और जोखिम', mr: 'कर्ज मागणी व जोखीम' }
    return labels[textLang(t)] || labels.en
  }
  if (item === 'memberBalanceSheet') {
    const labels = { en: "Member's Balance Sheet", hi: 'सदस्य बैलेंस शीट', mr: 'सदस्य ताळेबंद' }
    return labels[textLang(t)] || labels.en
  }
  if (item === 'attendance') {
    const labels = { en: 'Attendance', hi: 'उपस्थिति', mr: 'उपस्थिती' }
    return labels[textLang(t)] || labels.en
  }
  if (item === 'calculationReport') {
    const labels = { en: 'Calculation Report', hi: 'गणना रिपोर्ट', mr: 'गणना अहवाल' }
    return labels[textLang(t)] || labels.en
  }
  return t.nav[item] || extra(t).nav[item] || item
}

function makeShgCode() {
  return `SHG${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
}

function buildShareMessage(groupName, shgCode, t) {
  const memberCode = shgCode.replace('SHG', 'BG')
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  if (textLang(t) === 'hi') {
    return `स्वयं सहायता समूह का नाम: ${groupName}
स्वयं सहायता समूह कोड: ${shgCode}
हमारा स्वयं सहायता समूह पारदर्शिता और आसान रिकॉर्ड प्रबंधन के लिए Unnati वेब ऐप का उपयोग करता है।
वेब ऐप खोलें: ${appUrl}
ऐप को ब्राउज़र में खोलें, SHG कोड ${memberCode} दर्ज करें और अपना नाम चुनकर लॉगिन करें।
पासवर्ड न पता हो तो समूह के अध्यक्ष से संपर्क करें। लॉगिन के बाद प्रोफ़ाइल सेटिंग में जाकर पासवर्ड बदलें।`
  }
  if (textLang(t) === 'mr') {
    return `स्वयं सहाय्यता गटाचे नाव: ${groupName}
स्वयं सहाय्यता गट कोड: ${shgCode}
पारदर्शकता आणि नोंदींचे सोपे व्यवस्थापन करण्यासाठी आमचा गट Unnati वेब अॅप वापरतो.
वेब अॅप उघडा: ${appUrl}
ब्राउझरमध्ये अॅप उघडा, SHG कोड ${memberCode} टाका, तुमचे नाव निवडा आणि लॉगिन करा.
पासवर्ड माहीत नसल्यास गटाच्या अध्यक्षांशी संपर्क करा. लॉगिन केल्यानंतर प्रोफाइल सेटिंगमध्ये पासवर्ड बदला.`
  }
  return `Self-Help Group Name: ${groupName}
Self-Help Group Code: ${shgCode}
Our group uses the Unnati web app to keep group records accessible and transparent.
Open the web app in your browser: ${appUrl}
Enter SHG code ${memberCode}, select your name, and log in. No app-store download is needed.
If you do not know your password, contact the President of your self-help group and ask your password. After logging in please change your password by going to profile settings.`
}

const moduleWorkflowText = {
  en: {
    member: [['Add Member', 'Register new member with role and contact details', 'users'], ['View Members', 'Open member list, savings, loan and status records', 'profile'], ['Member Passbook', 'Check individual savings and loan history', 'book']],
    saving: [['Monthly Saving', 'Post regular member saving collection', 'wallet'], ['View Saving', 'Review month-wise saving entries', 'ledger'], ['Fine Entry', 'Add late saving fine when applicable', 'bell']],
    loan: [['Give Loan', 'Create member loan with purpose and guarantor', 'loan'], ['Loan Installment', 'Record repayment and interest collection', 'calendar'], ['Overdue List', 'Track pending installments and follow-up', 'bell']],
    ledger: [['Income / Expense', 'Record cash in, cash out and group expenses', 'ledger'], ['Bank Transaction', 'Track deposit, withdrawal and bank balance', 'bank'], ['Transaction Book', 'View complete bachat gat vahi history', 'book']],
    reports: [['Summary', 'Monthly financial summary for group review', 'chart'], ['Balance Sheet', 'Assets, liabilities and fund position', 'scale'], ['Export Report', 'Prepare report for bank, NGO or audit', 'file']],
    meeting: [['Schedule Meeting', 'Create meeting agenda, date and place', 'meeting'], ['Attendance', 'Mark member attendance and quorum', 'users'], ['Resolution', 'Save decisions and digital minutes', 'file']],
    settings: [['Group Rules', 'Saving amount, interest, fine and penalty settings', 'settings'], ['Language', 'Use English, Marathi or Hindi labels', 'spark'], ['Audit Trail', 'Track changes before posting financial records', 'shield']],
    schemes: [['Government Schemes', 'Browse official SHG scheme information', 'bank'], ['Eligibility', 'Check documents and eligibility requirements', 'folder'], ['Source Links', 'Open verified government source URLs', 'file']],
    documents: [['Upload Document', 'Store registration, bank and meeting documents', 'folder'], ['Document Type', 'Classify document for quick retrieval', 'file'], ['Verification', 'Keep document status ready for audit', 'shield']],
    fund: [['Emergency Fund', 'Track reserve available for urgent support', 'shield'], ['Fund Usage', 'Record approved emergency usage', 'wallet'], ['Recovery', 'Monitor remaining balance and recovery', 'scale']],
  },
  hi: {
    member: [['सदस्य जोड़ें', 'भूमिका और संपर्क के साथ नया सदस्य दर्ज करें', 'users'], ['सदस्य देखें', 'सदस्य सूची, बचत, कर्ज और स्थिति देखें', 'profile'], ['सदस्य पासबुक', 'व्यक्तिगत बचत और कर्ज इतिहास देखें', 'book']],
    saving: [['मासिक बचत', 'नियमित सदस्य बचत संग्रह पोस्ट करें', 'wallet'], ['बचत देखें', 'महीना-वार बचत प्रविष्टियां देखें', 'ledger'], ['जुर्माना प्रविष्टि', 'देरी पर बचत जुर्माना जोड़ें', 'bell']],
    loan: [['कर्ज दें', 'उद्देश्य और गारंटर के साथ सदस्य कर्ज बनाएं', 'loan'], ['कर्ज किश्त', 'भुगतान और ब्याज संग्रह दर्ज करें', 'calendar'], ['अतिदेय सूची', 'लंबित किश्तों और अनुवर्ती को ट्रैक करें', 'bell']],
    ledger: [['आय / खर्च', 'नकद आवक, जावक और समूह खर्च दर्ज करें', 'ledger'], ['बैंक व्यवहार', 'जमा, निकासी और बैंक शेष ट्रैक करें', 'bank'], ['व्यवहार वही', 'पूरी बचतगट वही का इतिहास देखें', 'book']],
    reports: [['सारांश', 'समूह समीक्षा के लिए मासिक वित्तीय सारांश', 'chart'], ['बैलेंस शीट', 'संपत्ति, देयता और निधि स्थिति', 'scale'], ['रिपोर्ट निर्यात', 'बैंक, NGO या ऑडिट के लिए रिपोर्ट तैयार करें', 'file']],
    meeting: [['बैठक तय करें', 'बैठक एजेंडा, तारीख और जगह बनाएं', 'meeting'], ['उपस्थिति', 'सदस्य उपस्थिति और कोरम चिह्नित करें', 'users'], ['ठराव', 'निर्णय और डिजिटल मिनट्स सहेजें', 'file']],
    settings: [['समूह नियम', 'बचत राशि, ब्याज, जुर्माना और दंड सेटिंग', 'settings'], ['भाषा', 'हिन्दी, मराठी या अंग्रेज़ी लेबल उपयोग करें', 'spark'], ['ऑडिट ट्रेल', 'वित्तीय रिकॉर्ड पोस्ट करने से पहले बदलाव ट्रैक करें', 'shield']],
    schemes: [['सरकारी योजनाएं', 'आधिकारिक SHG योजना जानकारी देखें', 'bank'], ['पात्रता', 'दस्तावेज और पात्रता आवश्यकताएं जांचें', 'folder'], ['स्रोत लिंक', 'सत्यापित सरकारी स्रोत URL खोलें', 'file']],
    documents: [['दस्तावेज अपलोड', 'पंजीकरण, बैंक और बैठक दस्तावेज रखें', 'folder'], ['दस्तावेज प्रकार', 'जल्दी खोज के लिए दस्तावेज वर्गीकृत करें', 'file'], ['सत्यापन', 'ऑडिट के लिए दस्तावेज स्थिति तैयार रखें', 'shield']],
    fund: [['आपात निधि', 'तत्काल सहायता के लिए आरक्षित राशि ट्रैक करें', 'shield'], ['निधि उपयोग', 'स्वीकृत आपात उपयोग दर्ज करें', 'wallet'], ['वसूली', 'शेष राशि और वसूली देखें', 'scale']],
  },
  mr: {
    member: [['सदस्य जोडा', 'भूमिका आणि संपर्कासह नवीन सदस्य नोंदवा', 'users'], ['सदस्य पहा', 'सदस्य यादी, बचत, कर्ज आणि स्थिती पहा', 'profile'], ['सदस्य पासबुक', 'वैयक्तिक बचत आणि कर्ज इतिहास तपासा', 'book']],
    saving: [['मासिक बचत', 'नियमित सदस्य बचत संकलन पोस्ट करा', 'wallet'], ['बचत पहा', 'महिना-वार बचत नोंदी पहा', 'ledger'], ['दंड नोंद', 'उशिरा बचतीवर दंड जोडा', 'bell']],
    loan: [['कर्ज द्या', 'उद्देश आणि जामीनदारासह सदस्य कर्ज तयार करा', 'loan'], ['कर्ज हप्ता', 'परतफेड आणि व्याज संकलन नोंदवा', 'calendar'], ['थकीत यादी', 'प्रलंबित हप्ते आणि पाठपुरावा ट्रॅक करा', 'bell']],
    ledger: [['आवक / जावक', 'रोख आवक, जावक आणि गट खर्च नोंदवा', 'ledger'], ['बँक व्यवहार', 'जमा, पैसे काढणे आणि बँक शिल्लक ट्रॅक करा', 'bank'], ['व्यवहार वही', 'पूर्ण बचतगट वहीचा इतिहास पहा', 'book']],
    reports: [['सारांश', 'गट आढाव्यासाठी मासिक आर्थिक सारांश', 'chart'], ['ताळेबंद', 'मालमत्ता, देयता आणि निधी स्थिती', 'scale'], ['अहवाल निर्यात', 'बँक, NGO किंवा ऑडिटसाठी अहवाल तयार करा', 'file']],
    meeting: [['बैठक ठरवा', 'बैठकीचा अजेंडा, तारीख आणि ठिकाण तयार करा', 'meeting'], ['हजेरी', 'सदस्य हजेरी आणि कोरम नोंदवा', 'users'], ['ठराव', 'निर्णय आणि डिजिटल मिनिट्स जतन करा', 'file']],
    settings: [['गट नियम', 'बचत रक्कम, व्याज, दंड आणि पेनल्टी सेटिंग', 'settings'], ['भाषा', 'मराठी, हिन्दी किंवा इंग्रजी लेबल वापरा', 'spark'], ['ऑडिट ट्रेल', 'आर्थिक नोंदी पोस्ट करण्यापूर्वी बदल ट्रॅक करा', 'shield']],
    schemes: [['सरकारी योजना', 'अधिकृत SHG योजना माहिती पहा', 'bank'], ['पात्रता', 'दस्तऐवज आणि पात्रता आवश्यकता तपासा', 'folder'], ['स्रोत लिंक', 'सत्यापित सरकारी स्रोत URL उघडा', 'file']],
    documents: [['दस्तऐवज अपलोड', 'नोंदणी, बँक आणि बैठक दस्तऐवज ठेवा', 'folder'], ['दस्तऐवज प्रकार', 'जलद शोधासाठी दस्तऐवज वर्गीकृत करा', 'file'], ['पडताळणी', 'ऑडिटसाठी दस्तऐवज स्थिती तयार ठेवा', 'shield']],
    fund: [['आपत्कालीन निधी', 'तातडीच्या मदतीसाठी राखीव निधी ट्रॅक करा', 'shield'], ['निधी वापर', 'मंजूर आपत्कालीन वापर नोंदवा', 'wallet'], ['वसुली', 'शिल्लक आणि वसुली पाहा', 'scale']],
  },
}

const officialSchemeLinks = [
  {
    name: 'myScheme: SHG scheme search',
    description: 'Search government schemes by group type, state, eligibility and benefit.',
    category: 'All schemes',
    eligibility: 'Depends on the selected scheme and state',
    benefit: 'Search and compare current government benefits',
    url: 'https://www.myscheme.gov.in/search?query=self%20help%20group',
  },
  {
    name: 'DAY-NRLM / Aajeevika',
    description: 'Official rural livelihoods and Self Help Group programme information.',
    category: 'Livelihoods',
    eligibility: 'Rural Self Help Groups and members',
    benefit: 'Livelihood training, credit linkage and enterprise support',
    url: 'https://aajeevika.gov.in/',
  },
  {
    name: 'PMFME',
    description: 'Food-processing support, credit-linked subsidy and SHG opportunities.',
    category: 'Enterprise',
    eligibility: 'Eligible food-processing applicants and SHGs',
    benefit: 'Credit-linked subsidy and food-business support',
    url: 'https://pmfme.mofpi.gov.in/',
  },
]

const dataText = {
  en: {
    shg: demoData.shg,
    memberNames: ['Asha Jadhav', 'Meena Shinde', 'Lata Pawar', 'Kavita More', 'Rani Deshmukh', 'Pooja Kale'],
    statuses: { Active: 'Active', 'Partially Paid': 'Partially Paid', Overdue: 'Overdue', Completed: 'Completed', Scheduled: 'Scheduled' },
    purposes: { 'Tailoring machine': 'Tailoring machine', 'Goat rearing': 'Goat rearing', 'Education fees': 'Education fees' },
    transactionTypes: { Savings: 'Savings', Repayment: 'Repayment', Expense: 'Expense' },
    meetings: ['Monthly savings and loan review', 'Government scheme awareness'],
    locations: ['Gram Panchayat Hall', 'Anganwadi Center'],
    notifications: [
      ['Savings reminder', 'Monthly savings collection is scheduled for 5 September.', 'Savings'],
      ['Overdue installment', 'Pooja Kale has one overdue installment. Review before sharing a reminder.', 'Loan'],
      ['Meeting reminder', 'Next meeting is scheduled at Gram Panchayat Hall.', 'Meeting'],
    ],
    schemes: [
      ['DAY-NRLM', 'Official rural livelihood mission information for SHG support.', 'As per official scheme rules.'],
      ['myScheme SHG discovery', 'Use official scheme search to verify current SHG-related benefits.', 'Depends on scheme and location.'],
    ],
    insights: demoData.insights,
    months: { Apr: 'Apr', May: 'May', Jun: 'Jun', Jul: 'Jul', Aug: 'Aug', Given: 'Given', Repaid: 'Repaid', Due: 'Due', Income: 'Income', Expense: 'Expense' },
  },
  hi: {
    shg: { ...demoData.shg, name: 'सखी महिला बचत गट', formationDate: '15 जून 2021', village: 'नांदगांव', taluka: 'श्रीगोंदा', district: 'अहमदनगर', state: 'महाराष्ट्र', president: 'सुनीता पाटिल', monthlySavings: '₹500', interestRate: '2% मासिक', penalty: '₹50 देरी शुल्क', bank: 'महाराष्ट्र ग्रामीण बैंक' },
    memberNames: ['आशा जाधव', 'मीना शिंदे', 'लता पवार', 'कविता मोरे', 'रानी देशमुख', 'पूजा काले'],
    statuses: { Active: 'सक्रिय', 'Partially Paid': 'आंशिक भुगतान', Overdue: 'अतिदेय', Completed: 'पूर्ण', Scheduled: 'निर्धारित' },
    purposes: { 'Tailoring machine': 'सिलाई मशीन', 'Goat rearing': 'बकरी पालन', 'Education fees': 'शिक्षा शुल्क' },
    transactionTypes: { Savings: 'बचत', Repayment: 'भुगतान', Expense: 'खर्च' },
    meetings: ['मासिक बचत और कर्ज समीक्षा', 'सरकारी योजना जागरूकता'],
    locations: ['ग्राम पंचायत सभागृह', 'आंगनवाड़ी केंद्र'],
    notifications: [
      ['बचत अनुस्मारक', 'मासिक बचत संग्रह 5 सितंबर को निर्धारित है।', 'बचत'],
      ['अतिदेय किश्त', 'पूजा काले की एक किश्त अतिदेय है। याद दिलाने से पहले समीक्षा करें।', 'कर्ज'],
      ['बैठक अनुस्मारक', 'अगली बैठक ग्राम पंचायत सभागृह में निर्धारित है।', 'बैठक'],
    ],
    schemes: [
      ['DAY-NRLM', 'समूह सहायता के लिए आधिकारिक ग्रामीण आजीविका मिशन जानकारी।', 'आधिकारिक योजना नियमों के अनुसार।'],
      ['myScheme समूह खोज', 'वर्तमान समूह-संबंधित लाभों की पुष्टि के लिए आधिकारिक योजना खोज का उपयोग करें।', 'योजना और स्थान पर निर्भर।'],
    ],
    insights: ['बचत पिछले महीने की तुलना में 12% बढ़ी।', 'इस सप्ताह 3 किश्तें लंबित हैं।', 'भुगतान संग्रह के बाद समूह शेष बढ़ा।', 'कर्ज भुगतान दर पिछले महीने से बेहतर हुई।'],
    months: { Apr: 'अप्रै', May: 'मई', Jun: 'जून', Jul: 'जुल', Aug: 'अग', Given: 'दिया', Repaid: 'चुकाया', Due: 'देय', Income: 'आय', Expense: 'खर्च' },
  },
  mr: {
    shg: { ...demoData.shg, name: 'सखी महिला बचत गट', formationDate: '15 जून 2021', village: 'नांदगाव', taluka: 'श्रीगोंदा', district: 'अहमदनगर', state: 'महाराष्ट्र', president: 'सुनीता पाटील', monthlySavings: '₹500', interestRate: '2% मासिक', penalty: '₹50 उशीर शुल्क', bank: 'महाराष्ट्र ग्रामीण बँक' },
    memberNames: ['आशा जाधव', 'मीना शिंदे', 'लता पवार', 'कविता मोरे', 'राणी देशमुख', 'पूजा काळे'],
    statuses: { Active: 'सक्रिय', 'Partially Paid': 'अंशतः भरले', Overdue: 'थकीत', Completed: 'पूर्ण', Scheduled: 'ठरलेली' },
    purposes: { 'Tailoring machine': 'शिलाई मशीन', 'Goat rearing': 'शेळीपालन', 'Education fees': 'शिक्षण शुल्क' },
    transactionTypes: { Savings: 'बचत', Repayment: 'परतफेड', Expense: 'खर्च' },
    meetings: ['मासिक बचत आणि कर्ज आढावा', 'सरकारी योजना जनजागृती'],
    locations: ['ग्रामपंचायत सभागृह', 'अंगणवाडी केंद्र'],
    notifications: [
      ['बचत स्मरणपत्र', 'मासिक बचत संकलन 5 सप्टेंबरला ठरले आहे।', 'बचत'],
      ['थकीत हप्ता', 'पूजा काळे यांचा एक हप्ता थकीत आहे. स्मरणपत्र पाठवण्यापूर्वी तपासा.', 'कर्ज'],
      ['बैठक स्मरणपत्र', 'पुढील बैठक ग्रामपंचायत सभागृहात ठरली आहे.', 'बैठक'],
    ],
    schemes: [
      ['DAY-NRLM', 'गट सहाय्यासाठी अधिकृत ग्रामीण आजीविका मिशन माहिती.', 'अधिकृत योजना नियमांनुसार.'],
      ['myScheme गट शोध', 'सध्याचे गट-संबंधित लाभ तपासण्यासाठी अधिकृत योजना शोध वापरा.', 'योजना आणि ठिकाणावर अवलंबून.'],
    ],
    insights: ['बचत मागील महिन्यापेक्षा 12% वाढली.', 'या आठवड्यात 3 हप्ते प्रलंबित आहेत.', 'परतफेड संकलनानंतर गट शिल्लक वाढली.', 'कर्ज परतफेड दर मागील महिन्यापेक्षा सुधारला.'],
    months: { Apr: 'एप्रि', May: 'मे', Jun: 'जून', Jul: 'जुलै', Aug: 'ऑग', Given: 'दिले', Repaid: 'परतफेड', Due: 'देय', Income: 'उत्पन्न', Expense: 'खर्च' },
  },
}

function useLocalizedData(language) {
  const text = dataText[language]
  const dates = {
    en: { savings: ['05 Aug 2026', '05 Aug 2026', '05 Aug 2026'], transactions: ['22 Aug 2026', '21 Aug 2026', '20 Aug 2026'], meetings: ['02 Sep 2026', '18 Aug 2026'], month: 'Aug 2026' },
    hi: { savings: ['05 अगस्त 2026', '05 अगस्त 2026', '05 अगस्त 2026'], transactions: ['22 अगस्त 2026', '21 अगस्त 2026', '20 अगस्त 2026'], meetings: ['02 सितंबर 2026', '18 अगस्त 2026'], month: 'अगस्त 2026' },
    mr: { savings: ['05 ऑगस्ट 2026', '05 ऑगस्ट 2026', '05 ऑगस्ट 2026'], transactions: ['22 ऑगस्ट 2026', '21 ऑगस्ट 2026', '20 ऑगस्ट 2026'], meetings: ['02 सप्टेंबर 2026', '18 ऑगस्ट 2026'], month: 'ऑगस्ट 2026' },
  }[language]
  return {
    shg: text.shg,
    summary: demoData.summary,
    members: demoData.members.map((member, index) => ({ ...member, name: text.memberNames[index] || member.name, status: text.statuses[member.status] || member.status })),
    savings: demoData.savings.map((row, index) => ({ ...row, date: dates.savings[index], month: dates.month, member: text.memberNames[index] || row.member })),
    loans: demoData.loans.map((row, index) => ({ ...row, member: text.memberNames[[1, 5, 2][index]] || row.member, purpose: text.purposes[row.purpose] || row.purpose, status: text.statuses[row.status] || row.status })),
    transactions: demoData.transactions.map((row, index) => ({ ...row, date: dates.transactions[index], type: text.transactionTypes[row.type] || row.type, member: index === 2 ? '-' : text.memberNames[index] || row.member })),
    meetings: demoData.meetings.map((row, index) => ({ ...row, date: dates.meetings[index], title: text.meetings[index], location: text.locations[index], status: text.statuses[row.status] || row.status })),
    notifications: demoData.notifications.map((row, index) => ({ ...row, title: text.notifications[index][0], message: text.notifications[index][1], type: text.notifications[index][2] })),
    schemes: demoData.schemes.map((row, index) => ({ ...row, name: text.schemes[index][0], description: text.schemes[index][1], eligibility: text.schemes[index][2] })),
    insights: text.insights,
    savingsTrend: demoData.savingsTrend.map((row) => ({ ...row, label: text.months[row.label] || row.label })),
    loanOverview: demoData.loanOverview.map((row) => ({ ...row, label: text.months[row.label] || row.label })),
    incomeExpense: demoData.incomeExpense.map((row) => ({ ...row, label: text.months[row.label] || row.label })),
  }
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

function Button({ children, variant = 'primary', onClick, type = 'button', active = false, disabled = false }) {
  return <button type={type} className={`btn ${variant}${active ? ' active' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>
}

function EmptyNotice({ text }) {
  return <Card className="statement-empty"><strong>{text}</strong></Card>
}

function StatCard({ label, value, hint, icon, tone = 'emerald' }) {
  const locale = ({ hi: 'hi-IN', mr: 'mr-IN' })[localStorage.getItem('shgms-language')] || 'en-IN'
  return (
    <Card className="stat-card">
      <div className={`stat-icon ${tone}`}>{pathMap[icon] ? <Icon name={icon} /> : icon}</div>
      <div>
        <p className="muted">{label}</p>
        <strong>{formatDigits(value, locale)}</strong>
        {hint && <span>{formatDigits(hint, locale)}</span>}
      </div>
    </Card>
  )
}

function Progress({ value }) {
  return <div className="progress"><span style={{ width: `${Math.min(value, 100)}%` }} /></div>
}

function Donut({ value, label }) {
  const locale = ({ hi: 'hi-IN', mr: 'mr-IN' })[localStorage.getItem('shgms-language')] || 'en-IN'
  return (
    <div className="donut" style={{ '--value': `${Math.min(value, 100) * 3.6}deg` }}>
      <div><strong>{formatDigits(value, locale)}%</strong><span>{label}</span></div>
    </div>
  )
}

function MetricStrip({ items }) {
  const locale = ({ hi: 'hi-IN', mr: 'mr-IN' })[localStorage.getItem('shgms-language')] || 'en-IN'
  return <div className="metric-strip">{items.map(([label, value, tone]) => <div key={label} className={tone}><span>{label}</span><strong>{formatDigits(value, locale)}</strong></div>)}</div>
}

function MiniChart({ data, color = 'var(--primary)' }) {
  if (!data?.length || data.every((item) => Number(item.value || 0) === 0)) {
    return <div className="empty-state"><strong>{currentUi('noData')}</strong><p>{currentUi('addRecordsChart')}</p></div>
  }
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <div className="bars" aria-label="chart">
      {data.map((item) => (
        <div className="bar-wrap" key={item.label}>
          <span className="bar" style={{ height: `${(item.value / max) * 100}%`, background: color }} />
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  )
}

function HorizontalBars({ data, color = 'var(--primary)' }) {
  if (!data?.length || data.every((item) => Number(item.value || 0) === 0)) return <div className="empty-state"><strong>{currentUi('noData')}</strong><p>{currentUi('addRecordsChart')}</p></div>
  const max = Math.max(...data.map((item) => Number(item.value || 0)), 1)
  return <div className="horizontal-bars">{data.map((item) => <div className="horizontal-bar-row" key={item.label}><div><span>{item.label}</span><strong>{item.display || item.value}</strong></div><div className="horizontal-track"><span style={{ width: `${Number(item.value || 0) / max * 100}%`, background: color }} /></div></div>)}</div>
}

function DonutBreakdown({ data }) {
  const locale = ({ hi: 'hi-IN', mr: 'mr-IN' })[localStorage.getItem('shgms-language')] || 'en-IN'
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0)
  if (!total) return <div className="empty-state"><strong>{currentUi('noData')}</strong><p>{currentUi('addRecordsBreakdown')}</p></div>
  const colors = ['#0f8f83', '#2561c8', '#d28b2d', '#d14d72', '#7b61a8']
  const gradient = data.reduce((segments, item, index) => {
    const start = segments.current
    const end = start + Number(item.value || 0) / total * 360
    return {
      current: end,
      values: [...segments.values, `${colors[index % colors.length]} ${start}deg ${end}deg`],
    }
  }, { current: 0, values: [] }).values.join(', ')
  return <div className="donut-breakdown"><div className="breakdown-donut" style={{ background: `conic-gradient(${gradient})` }}><div><strong>{formatDigits(total, locale)}</strong><span>{currentUi('records')}</span></div></div><div className="breakdown-legend">{data.map((item, index) => <div key={item.label}><i style={{ background: colors[index % colors.length] }} /><span>{localizedValue(item.label, dictionary[localStorage.getItem('shgms-language') || 'en'])}</span><strong>{formatDigits(item.value, locale)}</strong></div>)}</div></div>
}

function DataTable({ columns, rows, t, emptyAction, footer, footerCells }) {
  if (!rows.length) {
    return <div className="empty-state"><strong>{t.noRecords}</strong><p>{t.addFirst}</p>{emptyAction}</div>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => {
                const value = row[column.key]
                const isDateColumn = /date$/i.test(column.key) || column.key === 'date'
                return <td key={column.key} data-label={column.label}>{column.render ? column.render(row) : isDateColumn ? formatStoredDate(value, t.moneyLocale) : localizedValue(value, t)}</td>
              })}
            </tr>
          ))}
        </tbody>
        {footerCells ? <tfoot><tr>{footerCells.map((cell, index) => <td key={index}>{cell}</td>)}</tr></tfoot> : footer ? <tfoot><tr><td colSpan={columns.length}>{footer}</td></tr></tfoot> : null}
      </table>
    </div>
  )
}

function workflowLanguage(t) {
  if (t.moneyLocale === 'hi-IN') return 'hi'
  if (t.moneyLocale === 'mr-IN') return 'mr'
  return 'en'
}

function ModuleWorkflow({ type, t, onAction }) {
  const lang = workflowLanguage(t)
  const items = moduleWorkflowText[lang][type] || moduleWorkflowText.en[type] || []
  return (
    <div className="module-workflow">
      {items.map(([title, detail, icon]) => (
        <button className="workflow-tile" type="button" key={title} onClick={() => onAction?.(title)}>
          <span><Icon name={icon} /></span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </button>
      ))}
    </div>
  )
}

function ActionForm({ action, onClose, onSubmit, t }) {
  const [values, setValues] = useState(() => Object.fromEntries((action.fields || []).map((field) => [field.name, field.defaultValue || ''])))
  if (action.collection) return <CollectionForm action={action} data={action.data} t={t} onClose={onClose} onSubmit={onSubmit} />
  function change(event) {
    const value = event.target.type === 'file' ? event.target.files?.[0] || null : event.target.value
    setValues((current) => ({ ...current, [event.target.name]: value }))
  }
  return (
    <div className="modal-backdrop">
      <Card className="assistant-modal">
        <div className="module-head"><div><p className="eyebrow">{ui(t, 'saveRecord')}</p><h2>{action.title}</h2></div><Button variant="ghost" onClick={onClose}>{ui(t, 'close')}</Button></div>
        {action.confirmation && <p className="muted">{action.confirmation}</p>}
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(values) }}>
          <div className="form-grid">
            {(action.fields || []).map((field) => (
              <label className="field" key={field.name}><span>{field.label}</span>
                {field.options ? <select name={field.name} value={values[field.name]} onChange={change} required={field.required !== false}><option value="">{ui(t, 'select')}</option>{field.options.map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}</select>
                  : field.type === 'textarea' ? <textarea name={field.name} value={values[field.name]} onChange={change} placeholder={field.placeholder} required={field.required !== false} rows="5" />
                  : <input name={field.name} type={field.type || 'text'} value={field.type === 'file' ? undefined : values[field.name]} onChange={change} accept={field.accept} placeholder={field.placeholder} required={field.required !== false} />}
              </label>
            ))}
          </div>
          <Button type="submit">{ui(t, 'save')}</Button>
        </form>
      </Card>
    </div>
  )
}

function CollectionForm({ action, data, onClose, onSubmit, t }) {
  const paymentType = action.paymentType
  const today = new Date().toISOString().slice(0, 10)
  const [values, setValues] = useState({
    paymentType,
    member: '',
    loan: '',
    amount: '',
    interestAmount: '0',
    dueDate: action.defaultDueDate || today,
    receivedDate: today,
    paymentMethod: 'cash',
    reference: '',
    receipt: '',
  })
  const [error, setError] = useState('')
  const members = data.members || []
  const loans = (data.loans || []).filter((loan) => Number(loan.outstanding || 0) > 0 && (!values.member || String(loan.member?._id || loan.member) === String(values.member)))
  const selectedLoan = loans.find((loan) => String(loan._id || loan.id) === String(values.loan))
  const lateDays = Math.max(0, Math.floor((new Date(`${values.receivedDate}T00:00:00`) - new Date(`${values.dueDate}T00:00:00`)) / 86400000))
  const latePenalty = lateDays * Number(data.shg?.latePenaltyAmount || 0)
  const calculatedInterest = paymentType === 'loan_emi' && selectedLoan
    ? Math.round((Number(selectedLoan.outstanding || 0) * Number(selectedLoan.interestRate || data.shg?.loanInterestRate || 0) / 100) * 100) / 100
    : 0
  const interestAmount = paymentType === 'loan_emi' ? calculatedInterest : Number(values.interestAmount || 0)
  const totalDue = Number(values.amount || 0) + interestAmount + latePenalty
  const update = (event) => {
    const { name, value } = event.target
    const selectedLoanDate = name === 'loan'
      ? loans.find((loan) => String(loan._id || loan.id) === String(value))?.nextDueDate
      : null
    setValues((current) => ({
      ...current,
      [name]: value,
      ...(name === 'member' ? { loan: '' } : {}),
      ...(selectedLoanDate ? { dueDate: selectedLoanDate.slice(0, 10) } : {}),
    }))
    setError('')
  }
  function submit(event) {
    event.preventDefault()
    if (!values.member || !values.amount || Number(values.amount) <= 0) return setError(`${ui(t, 'selectMember')} and ${ui(t, 'amount').toLowerCase()} required.`)
    if (paymentType === 'loan_emi' && !values.loan) return setError(`${ui(t, 'selectLoan')} required.`)
    if (values.paymentMethod === 'check' && !values.reference.trim()) return setError(`${ui(t, 'cheque')} number required.`)
    onSubmit({ ...values, amount: Number(values.amount), interestAmount })
  }
  return <div className="modal-backdrop">
    <Card className="assistant-modal collection-modal">
      <div className="module-head"><div><p className="eyebrow">{ui(t, 'saveCollection')}</p><h2>{action.title}</h2><p className="muted">{ui(t, 'recordMethod')}</p></div><Button variant="ghost" onClick={onClose}>{ui(t, 'close')}</Button></div>
      <form onSubmit={submit}>
        <div className="form-grid collection-form-grid">
          <label className="field"><span>{ui(t, 'member')}</span><select name="member" value={values.member} onChange={update} required><option value="">{ui(t, 'selectMember')}</option>{members.map((member) => <option key={member._id || member.id} value={member._id || member.id}>{member.name}</option>)}</select></label>
          {paymentType === 'loan_emi' && <label className="field"><span>{ui(t, 'loan')}</span><select name="loan" value={values.loan} onChange={update} required><option value="">{ui(t, 'selectLoan')}</option>{loans.map((loan) => <option key={loan._id || loan.id} value={loan._id || loan.id}>{localizedValue(loan.loanId, t)} · {localizedValue(loan.member, t)} · ₹{Number(loan.outstanding || 0).toLocaleString(displayLocale(t.moneyLocale))} {ui(t, 'dueDate').toLowerCase()}</option>)}</select></label>}
          <label className="field"><span>{ui(t, paymentType === 'loan_emi' ? 'principalReceived' : 'savingReceived')}</span><input name="amount" type="number" min="0.01" step="0.01" value={values.amount} onChange={update} required /></label>
          {paymentType === 'loan_emi' && <label className="field"><span>{ui(t, 'interestReceived')}</span><input name="interestAmount" type="number" min="0" step="0.01" value={calculatedInterest} readOnly /></label>}
          <label className="field"><span>{ui(t, 'dueDate')}</span><input name="dueDate" type="date" value={values.dueDate} onChange={update} required /></label>
          <label className="field"><span>{ui(t, 'receivedDate')}</span><input name="receivedDate" type="date" value={values.receivedDate} onChange={update} required /></label>
          <label className="field"><span>{ui(t, 'paymentMethod')}</span><select name="paymentMethod" value={values.paymentMethod} onChange={update} required><option value="cash">{ui(t, 'cash')}</option><option value="check">{ui(t, 'cheque')}</option><option value="phonepe">PhonePe</option><option value="upi">UPI</option><option value="bank_transfer">{ui(t, 'bankTransfer')}</option></select></label>
          <label className="field"><span>{values.paymentMethod === 'check' ? ui(t, 'cheque') : values.paymentMethod === 'cash' ? ui(t, 'referenceOptional') : ui(t, 'transactionReference')}</span><input name="reference" value={values.reference} onChange={update} required={values.paymentMethod !== 'cash'} placeholder={values.paymentMethod === 'cash' ? ui(t, 'referenceOptional') : ui(t, 'transactionReference')} /></label>
          <label className="field"><span>{ui(t, 'receiptNumber')} <small>({ui(t, 'optional', {})})</small></span><input name="receipt" value={values.receipt} onChange={update} placeholder={ui(t, 'autoGenerated')} /></label>
        </div>
        <div className="collection-summary"><span>{ui(t, 'lateDays')}: <strong>{formatDigits(lateDays, t.moneyLocale)}</strong></span><span>{ui(t, 'penalty')}: <strong>₹{latePenalty.toLocaleString(displayLocale(t.moneyLocale))}</strong></span><span>{ui(t, 'totalToRecord')}: <strong>₹{totalDue.toLocaleString(displayLocale(t.moneyLocale))}</strong></span></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><Button variant="ghost" onClick={onClose}>{ui(t, 'cancel')}</Button><Button type="submit">{ui(t, 'saveCollection')}</Button></div>
      </form>
    </Card>
  </div>
}

function LanguageSelect({ language, changeLanguage, t }) {
  return (
    <select value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label={t.language}>
      <option value="en">{t.languages.en}</option>
      <option value="hi">{t.languages.hi}</option>
      <option value="mr">{t.languages.mr}</option>
    </select>
  )
}

function Landing({ onEnter, language, changeLanguage, t, data, money }) {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <BrandMark t={t} />
        <div><LanguageSelect language={language} changeLanguage={changeLanguage} t={t} /><Button variant="ghost" onClick={onEnter}>{t.login}</Button><Button onClick={onEnter}>{t.getStarted}</Button></div>
      </nav>
      <section className="hero-section">
        <div className="hero-copy">
          <Badge tone="success">{t.landingBadge}</Badge>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroText}</p>
          <div className="hero-actions"><Button onClick={onEnter}>{t.getStarted}</Button><Button variant="secondary" onClick={onEnter}>{t.login}</Button></div>
        </div>
        <div className="dashboard-preview" aria-label={t.nav.dashboard}>
          <div className="preview-top"><span>{t.previewGroup}</span><Badge tone="success">{t.previewHealthy}</Badge></div>
          <div className="preview-grid">
            <StatCard label={t.dashboard.groupBalance} value={money(278500)} hint={t.dashboard.savingsHint} icon="₹" />
            <StatCard label={t.dashboard.activeLoans} value="8" hint={t.dashboard.activeLoansHint} icon="!" tone="blue" />
          </div>
          <MiniChart data={data.savingsTrend} />
        </div>
      </section>
      <section className="landing-band">
        {t.landingProblems.map(([title, text]) => <Card key={title}><h3>{title}</h3><p>{text}</p></Card>)}
      </section>
      <section className="feature-grid">
        {t.features.map((feature, index) => (
          <Card key={feature}><div className="feature-icon"><Icon name={featureIconOrder[index]} /></div><h3>{feature}</h3><p>{t.featureText}</p></Card>
        ))}
      </section>
    </main>
  )
}

const authScreenText = {
  en: {
    title: 'Self-Help Group',
    welcome: 'Welcome to Self-Help Group App!',
    registration: 'Registration',
    login: 'Login',
    shgCode: 'SHG Code:',
    search: 'Search',
    shgName: 'SHG Name:',
    shgNameHint: 'Search SHG by entering SHG code',
    member: 'Member:',
    password: 'Password:',
    forgotCode: 'Forgot SHG code?',
    deposit: 'Deposit Amount',
    depositHint: 'Deposit per member',
    monthlySavings: 'Monthly Savings:',
    monthlyHint: 'Monthly Savings Amount',
    startMonth: 'Start Month:',
    selectMonth: 'Select Month',
    selectYear: 'Select year',
    presidentName: 'President Name:',
    presidentMob: 'President Mob:',
    presidentEmail: 'President E-mail:',
    setPassword: 'Set Password:',
    fullName: 'Full Name',
    memberMobile: 'Member Mobile:', memberEmail: 'Member E-mail:', registerMember: 'Register Member',
    registerButton: 'Register Self-Help Group',
    terms: 'By registering, you agree to our',
    privacy: 'Privacy Policies',
    and: 'and',
    conditions: 'Terms & Conditions.',
    home: 'Home',
    about: 'About Us',
    contact: 'Contact Us',
    share: 'SHARE',
    oldTitle: 'Your Self-Help Group started many months ago ??',
    oldInfo: [
      'If so, you will need to enter the information for several months. You can use the following options to avoid this.',
      'Options: Calculate total amount of Self-Help Group, which you started many months ago, and calculate share received as member.',
      "Show per member share received as a member's deposit and record the start month of your Self-Help Group on the app as the current month.",
      "This way you don't have to add all the old information.",
    ],
  },
  hi: {
    title: 'स्वयं सहायता समूह',
    welcome: 'स्वयं सहायता समूह ऐप में आपका स्वागत है!',
    registration: 'पंजीकरण',
    login: 'लॉगिन',
    shgCode: 'SHG कोड:',
    search: 'खोजें',
    shgName: 'SHG नाम:',
    shgNameHint: 'SHG कोड डालकर SHG खोजें',
    member: 'सदस्य:',
    password: 'पासवर्ड:',
    forgotCode: 'SHG कोड भूल गए?',
    deposit: 'जमा राशि',
    depositHint: 'प्रति सदस्य जमा',
    monthlySavings: 'मासिक बचत:',
    monthlyHint: 'मासिक बचत राशि',
    startMonth: 'शुरू महीना:',
    selectMonth: 'महीना चुनें',
    selectYear: 'वर्ष चुनें',
    presidentName: 'अध्यक्ष नाम:',
    presidentMob: 'अध्यक्ष मोबाइल:',
    presidentEmail: 'अध्यक्ष ई-मेल:',
    setPassword: 'पासवर्ड सेट करें:',
    fullName: 'पूरा नाम',
    memberMobile: 'सदस्य मोबाइल:', memberEmail: 'सदस्य ई-मेल:', registerMember: 'सदस्य पंजीकृत करें',
    registerButton: 'स्वयं सहायता समूह पंजीकृत करें',
    terms: 'पंजीकरण करके आप हमारी',
    privacy: 'गोपनीयता नीति',
    and: 'और',
    conditions: 'नियम व शर्तें स्वीकार करते हैं।',
    home: 'होम',
    about: 'हमारे बारे में',
    contact: 'संपर्क',
    share: 'शेयर',
    oldTitle: 'क्या आपका स्वयं सहायता समूह कई महीने पहले शुरू हुआ था ??',
    oldInfo: [
      'ऐसा है तो आपको कई महीनों की जानकारी दर्ज करनी होगी। इससे बचने के लिए नीचे दिए विकल्प उपयोग कर सकते हैं।',
      'विकल्प: समूह की अब तक की कुल राशि और प्रति सदस्य हिस्सा गणना करें।',
      'प्रति सदस्य हिस्सा सदस्य जमा के रूप में दिखाएं और ऐप में शुरू महीना वर्तमान महीना रखें।',
      'इससे आपको पुरानी सारी जानकारी अलग से जोड़ने की जरूरत नहीं होगी।',
    ],
  },
  mr: {
    title: 'स्वयं सहाय्यता गट',
    welcome: 'स्वयं सहाय्यता गट अॅपमध्ये आपले स्वागत आहे!',
    registration: 'नोंदणी',
    login: 'लॉगिन',
    shgCode: 'SHG कोड:',
    search: 'शोधा',
    shgName: 'SHG नाव:',
    shgNameHint: 'SHG कोड टाकून SHG शोधा',
    member: 'सदस्य:',
    password: 'पासवर्ड:',
    forgotCode: 'SHG कोड विसरलात?',
    deposit: 'ठेव रक्कम',
    depositHint: 'प्रति सदस्य ठेव',
    monthlySavings: 'मासिक बचत:',
    monthlyHint: 'मासिक बचत रक्कम',
    startMonth: 'सुरू महिना:',
    selectMonth: 'महिना निवडा',
    selectYear: 'वर्ष निवडा',
    presidentName: 'अध्यक्ष नाव:',
    presidentMob: 'अध्यक्ष मोबाईल:',
    presidentEmail: 'अध्यक्ष ई-मेल:',
    setPassword: 'पासवर्ड सेट करा:',
    fullName: 'पूर्ण नाव',
    memberMobile: 'सदस्य मोबाईल:', memberEmail: 'सदस्य ई-मेल:', registerMember: 'सदस्य नोंदवा',
    registerButton: 'स्वयं सहाय्यता गट नोंदवा',
    terms: 'नोंदणी करून आपण आमच्या',
    privacy: 'गोपनीयता धोरण',
    and: 'आणि',
    conditions: 'नियम व अटी मान्य करता.',
    home: 'मुख्यपृष्ठ',
    about: 'आमच्याबद्दल',
    contact: 'संपर्क',
    share: 'शेअर',
    oldTitle: 'तुमचा स्वयं सहाय्यता गट अनेक महिन्यांपूर्वी सुरू झाला आहे का ??',
    oldInfo: [
      'असे असल्यास अनेक महिन्यांची माहिती भरावी लागेल. हे टाळण्यासाठी खालील पर्याय वापरू शकता.',
      'पर्याय: गटाची आतापर्यंतची एकूण रक्कम आणि प्रति सदस्य हिस्सा गणना करा.',
      'प्रति सदस्य हिस्सा सदस्य ठेवीप्रमाणे दाखवा आणि अॅपमध्ये सुरू महिना चालू महिना ठेवा.',
      'यामुळे तुम्हाला सर्व जुनी माहिती वेगळी जोडावी लागणार नाही.',
    ],
  },
}

function AuthScreen({ onLogin, language, changeLanguage, t, setShgCode: saveShgCode }) {
  const [mode, setMode] = useState('login')
  const localizedData = useLocalizedData(language)
  const [shgCode, setShgCode] = useState('')
  const [searchedShg, setSearchedShg] = useState('')
  const [shgMembers, setShgMembers] = useState([])
  const [authHint, setAuthHint] = useState('')
  const [authToast, setAuthToast] = useState('')
  const authToastTimer = useRef(null)
  const [loginRole, setLoginRole] = useState('member')
  const [registerRole, setRegisterRole] = useState('president')
  const [selectedMember, setSelectedMember] = useState('')
  const [registeredProfile, setRegisteredProfile] = useState(() => JSON.parse(localStorage.getItem('unnati-registration') || 'null'))
  const copy = authScreenText[language] || authScreenText.en
  const x = extra(t)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const years = ['2026', '2025', '2024', '2023', '2022']

  function showAuthToast(message) {
    setAuthToast(message)
    window.clearTimeout(authToastTimer.current)
    authToastTimer.current = window.setTimeout(() => setAuthToast(''), 3200)
  }

  async function searchShg() {
    const normalized = shgCode.trim().toUpperCase()
    if (!normalized) return
    if (registeredProfile?.shgId === normalized && String(registeredProfile.shgName || '').trim()) {
      const displayName = String(registeredProfile.shgName).trim()
      setSearchedShg(displayName)
      setShgMembers([{ name: registeredProfile.name }])
      setSelectedMember('')
      setAuthHint('')
      showAuthToast(`${x.codeFound || 'SHG found.'} ${displayName}`)
      return
    }
    try {
      const response = await fetch(`${API_BASE}/auth/shg/${encodeURIComponent(normalized)}`)
      const shg = await response.json()
      if (!response.ok) throw new Error(shg.message || x.codeMissing)
      const shgName = String(shg?.name || shg?.shgName || shg?.shg?.name || '').trim()
      if (!shgName) throw new Error('SHG was found but its name is missing. Restart the backend and try again.')
      const members = shg.members || shg.shg?.members || []
      setSearchedShg(shgName)
      setShgMembers(members)
      setSelectedMember('')
      saveShgCode(normalized)
      setAuthHint('')
      showAuthToast(`${x.codeFound || 'SHG found.'} ${shgName}`)
    } catch (error) {
      setSearchedShg('')
      setShgMembers([])
      setAuthHint(error.message || x.codeMissing)
    }
  }

  async function submitAuth(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (mode === 'register') {
      if (registerRole === 'president') {
        const nextCode = makeShgCode()
        const payload = {
          shgName: form.get('shgName'),
          depositAmount: Number(form.get('depositAmount') || 0),
          monthlySavingsAmount: Number(form.get('monthlySavingsAmount') || 0),
          startMonth: `${form.get('startYear') || '2026'}-${String(months.indexOf(form.get('startMonth')) + 1).padStart(2, '0')}-01`,
          name: `${form.get('presidentTitle') || ''} ${form.get('presidentName') || ''}`.trim(),
          phone: form.get('presidentPhone'),
          email: form.get('presidentEmail') || `${form.get('presidentPhone')}@unnati-president.local`,
          password: form.get('password'),
          language,
          shgId: nextCode,
        }
        try {
          const result = await postAuth('register-president', payload)
          const profile = { name: payload.name, shgName: payload.shgName, shgId: nextCode, phone: payload.phone, email: payload.email, language: payload.language, userId: result.user?._id }
          setRegisteredProfile(profile)
          localStorage.setItem('unnati-registration', JSON.stringify(profile))
          saveShgCode(nextCode)
        } catch (error) {
          setAuthHint(error.message)
          return
        }
        setAuthHint(`${x.codeGenerated}: ${nextCode}. Registration successful — Name: ${payload.name}; SHG: ${payload.shgName}; Phone: ${payload.phone}; Email: ${payload.email}; Monthly savings: ${payload.monthlySavingsAmount}; Deposit: ${payload.depositAmount}; Start month: ${payload.startMonth}. All details were saved. Please login with this code.`)
        setMode('login')
        setLoginRole('president')
        setShgCode(nextCode)
        setSearchedShg(payload.shgName)
      } else {
        const payload = {
          name: `${form.get('memberTitle') || ''} ${form.get('memberName') || ''}`.trim(),
          phone: form.get('memberPhone'),
          email: form.get('memberEmail') || `${form.get('memberPhone')}@unnati-member.local`,
          password: form.get('password'),
          language,
          shgCode: shgCode.trim().toUpperCase() || undefined,
        }
        try {
          const result = await postAuth('register-member', payload)
          if (payload.shgCode) saveShgCode(payload.shgCode)
          const profile = { name: payload.name, phone: payload.phone, email: payload.email, shgId: payload.shgCode, userId: result.user?._id }
          setRegisteredProfile(profile)
          localStorage.setItem('unnati-registration', JSON.stringify(profile))
        } catch (error) {
          setAuthHint(error.message)
          return
        }
        setAuthHint(`${payload.name} registered successfully. Now login with the SHG code shared by the president.`)
        setMode('login')
        setLoginRole('member')
        setSelectedMember('')
      }
      return
    }
    if (!searchedShg) {
      searchShg()
      return
    }
    try {
      const result = await postAuth('login-shg', {
        shgCode: shgCode.trim().toUpperCase(),
        role: loginRole,
        name: loginRole === 'president'
          ? (registeredProfile?.shgId === shgCode.trim().toUpperCase() ? registeredProfile.name : selectedMember)
          : selectedMember,
        password: form.get('password'),
      })
      saveShgCode(shgCode.trim().toUpperCase())
      onLogin(result.accessRole || (loginRole === 'president' ? 'admin' : 'member'), result.user)
    } catch (error) {
      setAuthHint(error.message)
      return
    }
  }

  return (
    <main className="auth-page shg-auth-page">
      <section className="shg-auth-shell">
        <header className="shg-auth-hero">
          <div className="shg-light left" />
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.welcome}</p>
          </div>
          <div className="shg-light right" />
        </header>

        <div className="shg-auth-toolbar">
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>{copy.registration}</button>
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{copy.login}</button>
          <LanguageSelect language={language} changeLanguage={changeLanguage} t={t} />
        </div>

        <form className="shg-auth-form" onSubmit={submitAuth}>
          {mode === 'login' ? (
            <>
              <AuthRow label={copy.shgCode}><div className="shg-search-row"><input value={shgCode} onChange={(event) => { setShgCode(event.target.value); if (searchedShg) setSearchedShg('') }} placeholder={localizedData.shg.shgId} required /><button type="button" onClick={(event) => { event.preventDefault(); searchShg() }}>{copy.search}</button></div></AuthRow>
              <AuthRow label={copy.shgName}><input value={searchedShg} readOnly placeholder={copy.shgNameHint} /></AuthRow>
              <AuthRow label={x.loginAs || 'Login As:'}><select value={loginRole} onChange={(event) => { setLoginRole(event.target.value); setSelectedMember('') }} required><option value="member">{x.member || 'Member'}</option><option value="president">{x.president || 'President'} (Admin)</option><option value="president-member">{x.president || 'President'} (User)</option></select></AuthRow>
              {loginRole === 'member' && <AuthRow label={copy.member}><><input list="member-login-list" value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)} placeholder={copy.fullName} required /><datalist id="member-login-list">{shgMembers.map((member, index) => <option key={member._id || member.id || index} value={member.name} />)}</datalist></></AuthRow>}
              {(loginRole === 'president' || loginRole === 'president-member') && <AuthRow label={x.president || 'President'}><input value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)} placeholder={copy.fullName} required /></AuthRow>}
              <AuthRow label={copy.password}><input name="password" type="password" required /></AuthRow>
            </>
          ) : (
            <>
              <div className="shg-register-role">
                <button type="button" className={registerRole === 'president' ? 'active' : ''} onClick={() => setRegisterRole('president')}>{x.president || 'President'}</button>
                <button type="button" className={registerRole === 'member' ? 'active' : ''} onClick={() => setRegisterRole('member')}>{x.member || 'Member'}</button>
              </div>
              {registerRole === 'president' ? (
                <>
                  <AuthRow label={copy.shgName}><input name="shgName" required /></AuthRow>
                  <AuthRow label={copy.deposit}><input name="depositAmount" type="number" placeholder={copy.depositHint} required /></AuthRow>
                  <AuthRow label={copy.monthlySavings}><input name="monthlySavingsAmount" type="number" placeholder={copy.monthlyHint} required /></AuthRow>
                  <AuthRow label={copy.startMonth}><div className="shg-split-row"><select name="startMonth" required><option>{copy.selectMonth}</option>{months.map((month) => <option key={month}>{month}</option>)}</select><select name="startYear" required><option>{copy.selectYear}</option>{years.map((year) => <option key={year}>{year}</option>)}</select></div></AuthRow>
                  <AuthRow label={copy.presidentName}><div className="shg-name-row"><select name="presidentTitle"><option value="Mr">{ui(t, 'mr')}</option><option value="Mrs">{ui(t, 'mrs')}</option><option value="Ms">{ui(t, 'ms')}</option></select><input name="presidentName" placeholder={copy.fullName} required /></div></AuthRow>
                  <AuthRow label={copy.presidentMob}><input name="presidentPhone" type="tel" required /></AuthRow>
                  <AuthRow label={copy.presidentEmail}><input name="presidentEmail" type="email" /></AuthRow>
                  <AuthRow label={copy.setPassword}><input name="password" type="password" required /></AuthRow>
                </>
              ) : (
                <>
                  <AuthRow label={copy.shgCode}><input name="shgCode" value={shgCode} onChange={(event) => setShgCode(event.target.value)} placeholder={localizedData.shg.shgId} /></AuthRow>
                  <AuthRow label={copy.member}><div className="shg-name-row"><select name="memberTitle"><option value="Mrs">{ui(t, 'mrs')}</option><option value="Ms">{ui(t, 'ms')}</option><option value="Mr">{ui(t, 'mr')}</option></select><input name="memberName" placeholder={copy.fullName} required /></div></AuthRow>
                  <AuthRow label={copy.memberMobile}><input name="memberPhone" type="tel" required /></AuthRow>
                  <AuthRow label={copy.memberEmail}><input name="memberEmail" type="email" /></AuthRow>
                  <AuthRow label={copy.setPassword}><input name="password" type="password" required /></AuthRow>
                </>
              )}
            </>
          )}

          {authHint && <p className="auth-hint">{authHint}</p>}
          <div className="shg-submit-band">
            <button className="shg-submit" type="submit">{mode === 'login' ? copy.login : registerRole === 'president' ? copy.registerButton : copy.registerMember}</button>
          </div>
        </form>
        {authToast && <div className="auth-toast" role="status">{authToast}</div>}

        <p className="shg-terms">{copy.terms}<br /><strong>{copy.privacy}</strong> {copy.and} <strong>{copy.conditions}</strong></p>

      </section>
    </main>
  )
}

function AuthRow({ label, children }) {
  return <div className="shg-auth-row"><label>{label}</label><div>{children}</div></div>
}

function Field({ label, type = 'text', placeholder, defaultValue, readOnly = false }) {
  return <label className="field"><span>{label}</span><input type={type} placeholder={placeholder} defaultValue={defaultValue} readOnly={readOnly} required={!readOnly} /></label>
}

function Shell({ role, onLogout, language, changeLanguage, t, data, money, shgCode, shareShgInvite, onMutation }) {
  const [active, setActive] = useState('dashboard')
  const [zoom, setZoom] = useState(() => {
    const savedZoom = Number(localStorage.getItem('shgms-zoom'))
    return [80, 90, 100, 110, 125, 150].includes(savedZoom) ? savedZoom : 100
  })
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [action, setAction] = useState(null)

  function changeZoom(event) {
    const nextZoom = Number(event.target.value)
    if (![80, 90, 100, 110, 125, 150].includes(nextZoom)) return
    localStorage.setItem('shgms-zoom', String(nextZoom))
    setZoom(nextZoom)
  }

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  async function submitAction(values) {
    try {
      const hasFile = Object.values(values).some((value) => typeof File !== 'undefined' && value instanceof File)
      const payload = hasFile ? new FormData() : { ...values }
      if (action.startMonth) {
        if (hasFile) {
          payload.set('formationDate', `${values.startMonth}-01`)
          payload.delete('startMonth')
        } else {
          payload.formationDate = `${payload.startMonth}-01`
          delete payload.startMonth
        }
      }
      if (hasFile) {
        Object.entries(values).forEach(([key, value]) => {
          if (key !== 'startMonth' && value !== undefined && value !== '') payload.append(key, value)
        })
      } else if (action.includeShg !== false && !payload.shg) payload.shg = data.shg._id || data.shg.id
      const result = await api(action.path, { method: action.method || 'POST', body: hasFile ? payload : JSON.stringify(payload) })
      setAction(null)
      notify(ui(t, 'savedSuccessfully'))
      onMutation?.(result)
    } catch (error) {
      notify(error.message)
    }
  }

  const searchResults = useMemo(() => searchGroupRecords(data, query, role), [data, query, role])
  const visibleNavGroups = role === 'admin' ? navGroups : memberNavGroups

  return (
    <div className="app-shell" style={{ zoom: zoom / 100 }}>
      {data.backendError && <div className="backend-error" role="alert">{data.backendError}</div>}
      <NotificationWatcher />
      <aside className="sidebar">
        <BrandMark t={t} />
        <div className="sidebar-profile">
          <strong>{localizedValue(data.shg.name, t)}</strong>
          <span>{role === 'admin' ? ui(t, 'adminConsole') : ui(t, 'memberPortal')}</span>
        </div>
        {visibleNavGroups.map((group) => (
          <div className="nav-group" key={group.key}>
            <p>{t.navGroups[group.key]}</p>
            {group.items.map((item) => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}><span><Icon name={icons[item]} /></span>{navLabel(t, item)}</button>)}
          </div>
        ))}
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div><p className="eyebrow">{localizedValue(data.shg.village, t)}, {localizedValue(data.shg.district, t)}</p><h2>{navLabel(t, active)}</h2></div>
          <div className="top-actions">
            <div className="global-search">
              <input
                className="search"
                type="search"
                placeholder={t.search}
                aria-label={t.search}
                aria-expanded={Boolean(query.trim())}
                aria-controls="global-search-results"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setQuery('')
                }}
              />
              {query.trim() && (
                <div className="global-search-results" id="global-search-results" role="region" aria-label={t.search} aria-live="polite">
                  {searchResults.length ? searchResults.map((result) => (
                    <button
                      key={result.key}
                      type="button"
                      onClick={() => {
                        setActive(result.target)
                        setQuery('')
                      }}
                    >
                      <span className="global-search-result-heading">
                        <strong>{localizedValue(result.title, t)}</strong>
                        <small>{navLabel(t, result.target)}</small>
                      </span>
                      {result.summary && <span className="global-search-result-summary">{localizedValue(result.summary, t)}</span>}
                    </button>
                  )) : <p role="status">{t.noSearchResults}</p>}
                </div>
              )}
            </div>
            <LanguageSelect language={language} changeLanguage={changeLanguage} t={t} />
            <label className="zoom-control">{t.zoom}
              <select value={zoom} onChange={changeZoom} aria-label={t.zoom}>
                {[80, 90, 100, 110, 125, 150].map((value) => <option key={value} value={value}>{value}%</option>)}
              </select>
            </label>
            <Button variant="ghost" onClick={onLogout}>{t.logout}</Button>
          </div>
        </header>
        <main className="content"><View active={active} role={role} setActive={setActive} notify={notify} members={data.members} t={t} data={data} money={money} shgCode={shgCode} shareShgInvite={() => { shareShgInvite(); notify(extra(t).shareOpen) }} openAction={setAction} onMutation={onMutation} /></main>
      </div>
      <nav className="mobile-nav" aria-label={ui(t, 'modules')}><div className="mobile-nav-track">{visibleNavGroups.flatMap((group) => group.items).map((item) => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}><span><Icon name={icons[item]} /></span>{navLabel(t, item)}</button>)}</div></nav>
      <button className="assistant-fab" onClick={() => setAssistantOpen(true)} aria-label={t.voice.open}><Icon name="spark" /></button>
      {assistantOpen && <AssistantPanel language={language} role={role} data={data} setActive={setActive} onMutation={onMutation} close={() => setAssistantOpen(false)} />}
      {action && <ActionForm action={action} data={data} t={t} onClose={() => setAction(null)} onSubmit={submitAction} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function View({ active, role, setActive, notify, members, t, data, money, shgCode, shareShgInvite, openAction, onMutation }) {
  const shared = { role, setActive, notify, members, t, data, money, shgCode, shareShgInvite, openAction, onMutation }
  const allowedMemberViews = new Set(memberNavGroups.flatMap((group) => group.items).concat('loanApplication'))
  const views = {
    dashboard: role === 'admin' ? <Dashboard {...shared} /> : <MemberDashboard {...shared} />, members: <Members {...shared} />, savings: <Savings {...shared} />,
    loans: <Loans {...shared} />, ledger: <Ledger {...shared} />, passbook: <Passbook {...shared} />, monthly: <MonthlyAccounts {...shared} />,
    balance: <BalanceSheet {...shared} />, profile: <ProfileInfoScreen {...shared} />, meetings: <Meetings {...shared} />, reports: <Reports {...shared} />,
    notifications: <Notifications {...shared} />, schemes: <Schemes {...shared} />, goals: <Goals {...shared} />, emergency: <EmergencyFund {...shared} />,
    documents: <Documents {...shared} />, insights: <Insights {...shared} />, settings: <ProfileSettingsScreen {...shared} />,
    loanCollection: <LoanCollection {...shared} />, otherExpense: <OtherExpense {...shared} />, otherIncome: <OtherIncome {...shared} />,
    rulesNotice: <RulesNotice {...shared} />, penaltySettings: <PenaltySettings {...shared} />, interestSettings: <InterestSettings {...shared} />,
    removeMember: <RemoveMember {...shared} />, shareApp: <ShareApp {...shared} />, editRequests: <EditRequests {...shared} />, attendance: <Attendance {...shared} />,
    loanDetails: <LoanDetails {...shared} />, loanDemandRisk: <LoanDemandRisk {...shared} />, memberBalanceSheet: <MemberBalanceSheet {...shared} />, calculationReport: <CalculationReport {...shared} />,
    loanApplication: <LoanApplication {...shared} />, loanApplications: <LoanApplications {...shared} />,
  }
  if (role !== 'admin' && !allowedMemberViews.has(active)) return <MemberDashboard {...shared} />
  return views[active] || (role === 'admin' ? <Dashboard {...shared} /> : <MemberDashboard {...shared} />)
}

function MemberDashboard({ setActive, t, data, money }) {
  const member = getCurrentMember(data.members)
  const loanTaken = data.loans.filter((loan) => String(loan.member?._id || loan.member) === String(member._id || member.id)).reduce((total, loan) => total + Number(loan.amount || 0), 0)
  const amountRepaid = Math.max(loanTaken - Number(member.loanOutstanding || 0), 0)
  const x = extra(t)
  return (
    <div className="stack">
      <section className="welcome member-welcome">
        <div>
          <p className="eyebrow">{x.viewOnly || 'View-only access'}</p>
          <h1>{x.memberDashboard || 'Member Transparency Dashboard'}</h1>
          <p>{member.name} • {data.shg.name}</p>
        </div>
        <Badge tone="success">{data.shg.shgId}</Badge>
      </section>
      <div className="stats-grid compact">
        <StatCard label={t.dashboard.totalSavings} value={money(member.savings)} hint={t.dashboard.savingsHint} icon="wallet" />
        <StatCard label={t.labels.loanTaken} value={money(loanTaken)} hint={t.dashboard.activeLoansHint} icon="loan" tone="blue" />
        <StatCard label={t.labels.amountRepaid} value={money(amountRepaid)} hint={t.dashboard.repaymentHint} icon="scale" />
        <StatCard label={t.fields.outstanding} value={money(member.loanOutstanding)} hint={t.dashboard.pendingHint} icon="bell" tone="amber" />
      </div>
      <Card className="member-request-card">
        <div>
          <p className="eyebrow">{x.requestCorrection || 'Send Correction Request'}</p>
          <h3>{x.requestHint || 'If any entry is wrong, send a request to the president.'}</h3>
        </div>
        <Button onClick={() => setActive('editRequests')}>{x.requestCorrection || 'Send Correction Request'}</Button>
      </Card>
      <NotificationPreview t={t} data={data} setActive={setActive} />
      <div className="analytics-grid">
        <Card><h3>{t.modules.passbook}</h3><p className="muted">{t.labels.memberName}: {member.name}</p><Progress value={82} /></Card>
        <Card><h3>{t.modules.savings}</h3><MiniChart data={data.savingsTrend} /></Card>
        <Card><h3>{t.modules.loans}</h3><MiniChart data={data.loanOverview} color="var(--info)" /></Card>
      </div>
      <Ledger t={t} data={data} money={money} />
    </div>
  )
}

function Dashboard({ role, setActive, t, notify, data, money, shgCode, shareShgInvite, openAction }) {
  const [currentTime] = useState(() => Date.now())
  const summary = data.summary
  const period = getPeriod(data.shg)
  const x = extra(t)
  const pendingLoans = data.loans.filter((loan) => Number(loan.outstanding || 0) > 0)
  const today = new Date(currentTime)
  today.setHours(0, 0, 0, 0)
  const nextWeekStart = new Date(today)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextWeekEnd = new Date(nextWeekStart)
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7)
  const dueDateInRange = (loan, start, end) => {
    if (!loan.nextDueDate || loan.status === 'overdue') return false
    const dueDate = new Date(loan.nextDueDate)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate >= start && dueDate < end
  }
  const overdue = pendingLoans.filter((loan) => loan.status === 'overdue' || (loan.nextDueDate && new Date(loan.nextDueDate) < today)).length
  const dueSoon = pendingLoans.filter((loan) => dueDateInRange(loan, today, nextWeekStart)).length
  const dueNextWeek = pendingLoans.filter((loan) => dueDateInRange(loan, nextWeekStart, nextWeekEnd)).length
  const activeMembers = data.members.filter((member) => String(member.status || '').toLowerCase() === 'active').length
  const totalDistributed = Number(summary.totalDistributed || data.loans.reduce((total, loan) => total + Number(loan.amount || 0), 0))
  const repaymentRate = totalDistributed
    ? Math.min(100, Math.max(0, Math.round((totalDistributed - summary.outstandingLoans) / totalDistributed * 100)))
    : 0
  const repaymentCalendar = [[ui(t, 'thisWeek'), dueSoon, ui(t, 'due')], [ui(t, 'nextWeek'), dueNextWeek, ui(t, 'scheduled')], [ui(t, 'overdue'), overdue, ui(t, 'critical')]]
  const workflowQueue = [
    [localizedValue(pendingLoans.length ? 'Loan repayment review' : 'No loan applications', t), `${pendingLoans.length} ${t.fields.outstanding.toLowerCase()} ${ui(t, 'loan').toLowerCase()}`, pendingLoans.length ? ui(t, 'high') : ui(t, 'low')],
    [localizedValue(data.members.length ? 'Savings records' : 'Add members', t), `${data.savings.length} ${ui(t, 'savings').toLowerCase()} ${ui(t, 'records').toLowerCase()}`, data.savings.length ? ui(t, 'medium') : ui(t, 'low')],
    [localizedValue(data.meetings.length ? 'Next meeting' : 'Schedule a meeting', t), localizedValue(data.meetings[0]?.title || 'No meetings scheduled', t), data.meetings.length ? ui(t, 'low') : ui(t, 'medium')],
  ]
  return (
    <div className="stack">
      <section className="welcome">
        <div>
          <p className="eyebrow">{localizedValue('Command center', t)}</p>
          <h1>{t.dashboard.greeting}, {localizedValue(data.shg.president, t)}</h1>
          <p>{localizedValue(data.shg.name, t)} • {data.shg.shgId}</p>
        </div>
        <div className="welcome-score">
          <Donut value={summary.financialHealth} label={t.healthy} />
          <Badge tone="success">{summary.financialHealth}% {t.healthy}</Badge>
        </div>
      </section>
      <MetricStrip items={[
        [ui(t, 'collectionEfficiency'), `${summary.totalSavings || summary.outstandingLoans ? Math.max(0, Math.round((summary.totalSavings - summary.outstandingLoans) / Math.max(summary.totalSavings, 1) * 100)) : 0}%`, 'good'],
        [ui(t, 'auditReadiness'), `${summary.totalSavings || summary.outstandingLoans || data.transactions.length ? 100 : 0}%`, 'good'],
        [ui(t, 'repaymentRate'), `${repaymentRate}%`, 'warn'],
        [ui(t, 'digitalCoverage'), `${data.members.length ? Math.round(data.members.filter((member) => member.phone || member.email).length / data.members.length * 100) : 0}%`, 'info'],
      ]} />
      <div className="stats-grid">
        <StatCard label={t.dashboard.totalMembers} value={summary.totalMembers} hint={`${activeMembers} ${ui(t, 'active').toLowerCase()}`} icon="users" />
        <StatCard label={t.dashboard.totalSavings} value={money(summary.totalSavings)} icon="wallet" />
        <StatCard label={t.dashboard.activeLoans} value={summary.activeLoans} hint={`${overdue} ${localizedValue('overdue', t)}`} icon="loan" tone="blue" />
        <StatCard label={t.dashboard.outstandingLoans} value={money(summary.outstandingLoans)} hint={`${repaymentRate}% ${ui(t, 'repaid')}`} icon="bell" tone="amber" />
        <StatCard label={t.dashboard.groupBalance} value={money(summary.groupBalance)} hint={t.dashboard.balanceHint} icon="scale" />
        <StatCard label={t.dashboard.pendingInstallments} value={pendingLoans.length} hint={`${dueSoon} ${ui(t, 'dueThisWeek')}`} icon="calendar" tone="red" />
      </div>
      <div className="quick-actions">{t.dashboard.quick.map(([label, target, message]) => <Button key={label} variant="secondary" onClick={() => { setActive(target); notify(message) }}>{label}</Button>)}</div>
      <NotificationPreview t={t} data={data} setActive={setActive} />
      {role === 'admin' && (
        <Card className="president-panel">
          <div className="module-head">
            <div>
              <p className="eyebrow">{x.groupCard}</p>
              <h3>{data.shg.name} [ SHG Code: {shgCode} ]</h3>
              <p className="muted">{localizedValue(data.shg.president, t)} ({ui(t, 'president')})</p>
            </div>
            <Button onClick={shareShgInvite}>{x.shareTitle}</Button>
          </div>
          <div className="president-meta">
            <span>{x.savingMonth}: {period.label}</span>
            <button
              type="button"
              className="start-month-button"
              onClick={() => openAction({
                title: x.changeStartMonth,
                startMonth: true,
                path: `/shgs/${data.shg._id || data.shg.id}`,
                method: 'PATCH',
                fields: [{ name: 'startMonth', label: ui(t, 'startMonth'), type: 'month', defaultValue: period.value }],
              })}
            >
              {x.changeStartMonth}
            </button>
          </div>
          <div className="president-actions">
            {[
              [x.collectSavings, 'savings'],
              [x.collectLoanInterest, 'loanCollection'],
              [x.provideLoans, 'loans'],
              [x.addRules, 'rulesNotice'],
              [x.addExpense, 'otherExpense'],
              [x.addIncome, 'otherIncome'],
              [x.penaltySaving, 'penaltySettings'],
              [x.interestRates, 'interestSettings'],
              [x.addModifyMember, 'members'],
              [x.permanentRemove, 'removeMember'],
            ].map(([label, target]) => <button type="button" key={label} onClick={() => setActive(target)}>{label}</button>)}
          </div>
        </Card>
      )}
      <div className="ops-grid">
        <Card className="ops-card">
          <div className="module-head"><div><p className="eyebrow">{ui(t, 'priorityQueue')}</p><h3>{ui(t, 'operationalApprovals')}</h3></div>          <Badge tone="warning">{pendingLoans.length + data.meetings.filter((meeting) => meeting.status === 'pending').length} {ui(t, 'pending').toLowerCase()}</Badge></div>
          <div className="queue-list">{workflowQueue.map(([title, detail, tone]) => <div key={title}><Badge tone={tone === ui(t, 'high') ? 'danger' : tone === ui(t, 'medium') ? 'warning' : 'success'}>{tone}</Badge><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
        </Card>
        <Card className="ops-card">
          <div className="module-head"><div><p className="eyebrow">{ui(t, 'repaymentMonitor')}</p><h3>{ui(t, 'installmentCalendar')}</h3></div><button type="button" className="icon-button" onClick={() => setActive('loanCollection')} aria-label={ui(t, 'installmentCalendar')} title={ui(t, 'installmentCalendar')}><Icon name="calendar" /></button></div>
          <div className="calendar-strip">{repaymentCalendar.map(([label, count, state]) => <div key={label}><strong>{count}</strong><span>{label}</span><small>{state}</small></div>)}</div>
        </Card>
      </div>
      <div className="analytics-grid">
        <Card><h3>{t.dashboard.savingsGrowth}</h3><MiniChart data={data.savingsTrend} /></Card>
        <Card><h3>{t.dashboard.loanOverview}</h3><MiniChart data={data.loanOverview} color="var(--info)" /></Card>
        <Card><h3>{t.dashboard.incomeExpense}</h3><MiniChart data={data.incomeExpense} color="var(--warning)" /></Card>
        <Card><h3>{t.dashboard.financialHealth}</h3><div className="health-score"><strong>{summary.financialHealth}%</strong><span>{t.healthy}</span></div><Progress value={summary.financialHealth} /><p className="muted">{t.dashboard.healthText}</p></Card>
      </div>
    </div>
  )
}

function Members({ members, t, money, openAction }) {
  const averageSavings = Math.round(members.reduce((total, member) => total + member.savings, 0) / Math.max(members.length, 1))
  const memberAction = (member) => openAction({ title: member ? 'Edit member' : t.modules.addMember, path: member ? `/members/${member._id || member.id}` : '/members', method: member ? 'PATCH' : 'POST', fields: [{ name: 'name', label: 'Name', defaultValue: member?.name }, { name: 'phone', label: 'Phone', defaultValue: member?.phone }, { name: 'email', label: 'Email', required: false, defaultValue: member?.email }, { name: 'memberId', label: 'Member ID', required: false, defaultValue: member?.memberId }] })
  const activeMembers = members.filter((member) => String(member.status || '').toLowerCase() === 'active').length
  return <Module title={t.modules.members} t={t} action={<Button onClick={() => memberAction()}>{t.modules.addMember}</Button>}><ModuleWorkflow type="member" t={t} onAction={(title) => title === 'Add Member' || title.includes('सदस्य') ? memberAction() : null} /><MetricStrip items={[[ui(t, 'activeMemberCount'), `${activeMembers}/${members.length}`, 'good'], [ui(t, 'averageSavings'), money(averageSavings), 'info'], [ui(t, 'membersWithDues'), members.filter((member) => member.loanOutstanding > 0).length, 'warn']]} /><DataTable t={t} columns={[{ key: 'memberId', label: t.fields.memberId }, { key: 'name', label: t.fields.name }, { key: 'phone', label: t.fields.phone }, { key: 'savings', label: t.fields.savings, render: (row) => money(row.savings) }, { key: 'loanOutstanding', label: t.fields.outstanding, render: (row) => money(row.loanOutstanding) }, { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>{localizedValue(row.status, t)}</Badge> }, { key: 'edit', label: ui(t, 'edit'), render: (row) => <Button variant="ghost" onClick={() => memberAction(row)}>{ui(t, 'edit')}</Button> }]} rows={members} /></Module>
}

function Savings({ role, t, data, money, openAction, notify, onMutation }) {
  const defaultPeriod = getPeriod(data.shg)
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.value)
  const period = { ...defaultPeriod, value: selectedMonth, label: monthLabel(selectedMonth, displayLocale(t.moneyLocale)) }
  const savingsPerMonth = Number(data.shg.monthlySavingsAmount || 0)
  const dueDay = Number(data.shg.monthlySavingsDueDay || 1)
  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number)
  const lastDayOfMonth = new Date(selectedYear, selectedMonthNumber, 0).getDate()
  const dueDateDay = Math.min(Math.max(dueDay, 1), Math.min(lastDayOfMonth, 28))
  const dueDate = `${selectedMonth}-${String(dueDateDay).padStart(2, '0')}`
  const today = new Date()
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const monthSavingsRecords = data.savings.filter((row) => recordMonth(row.month || row.date) === selectedMonth)
  const monthSavings = monthSavingsRecords.map((row, index) => ({
    ...row,
    id: row.id || row._id,
    index: index + 1,
    member: row.member?.name || row.member,
    saving: Number(row.amount || 0),
    dueDate: row.dueDate,
    actualDate: row.actualDate || row.date,
    lateDays: Number(row.lateDays || 0),
    penalty: Number(row.penaltyAmount ?? row.penalty ?? 0),
  }))
  const paidMemberIds = new Set(monthSavingsRecords.map((row) => {
    const member = row.member
    return String(member?._id || member?.id || member)
  }))
  const paidMemberNames = new Set(monthSavingsRecords.map((row) => String(row.member?.name || row.member || '')))
  const overdueDays = Math.floor((Date.parse(`${todayDate}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86400000)
  const overdueSavings = overdueDays > 0
    ? data.members
      .filter((member) => localizedValue(member.status, t) === ui(t, 'active'))
      .filter((member) => !paidMemberIds.has(String(member._id || member.id)) && !paidMemberNames.has(String(member.name || '')))
      .map((member, index) => ({
        id: member._id || member.id,
        index: index + 1,
        member: member.name,
        amount: savingsPerMonth,
        dueDate,
        lateDays: overdueDays,
      }))
    : []
  const totalPenalty = monthSavings.reduce((total, row) => total + row.penalty, 0)
  async function updateMonthlyDueDate(event) {
    const nextDueDate = event.currentTarget.value
    const input = event.currentTarget
    if (!nextDueDate) return
    try {
      await api(`/shgs/${data.shg._id || data.shg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ monthlySavingsDueDay: Number(nextDueDate.slice(-2)) }),
      })
      notify(ui(t, 'savedSuccessfully'))
      await onMutation?.()
    } catch (error) {
      input.value = dueDate
      notify(error.message)
    }
  }
  return (
    <Module title={t.modules.savings} t={t} action={role === 'admin' ? <Button onClick={() => openAction({ title: t.modules.recordSavings, path: '/savings', fields: [{ name: 'member', label: ui(t, 'member'), options: data.members.map((member) => ({ value: member._id || member.id, label: member.name })) }, { name: 'month', label: ui(t, 'month'), defaultValue: period.value }, { name: 'amount', label: ui(t, 'amount'), type: 'number', defaultValue: savingsPerMonth }, { name: 'dueDate', label: ui(t, 'dueDate'), type: 'date', defaultValue: dueDate }, { name: 'actualDate', label: ui(t, 'receivedDate'), type: 'date', defaultValue: today.toISOString().slice(0, 10) }] })}>{t.modules.recordSavings}</Button> : null}>
      <div className="app-like-header centered-header">
        <div>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} t={t} />
          <h3>{ui(t, 'thisMonthSavingRemains')} ({monthSavings.length})</h3>
          <p>{ui(t, 'savingsPerMonth', { amount: money(savingsPerMonth) })}</p>
          <p>{ui(t, 'penalty')}: {money(totalPenalty)}</p>
          <label className="savings-due-date">
            <span>{ui(t, 'savingsDueDate')}:</span>
            {role === 'admin'
              ? <input key={`${selectedMonth}-${dueDay}`} type="date" defaultValue={dueDate} min={`${selectedMonth}-01`} max={`${selectedMonth}-28`} onChange={updateMonthlyDueDate} aria-label={ui(t, 'savingsDueDate')} />
              : <strong>{formatStoredDate(dueDate, displayLocale(t.moneyLocale))}</strong>}
          </label>
          {role === 'admin' && <small className="savings-due-date-hint">{ui(t, 'recurringSavingsDueDateHint')}</small>}
          <p className="month-pill">{ui(t, 'savingMonth')}: {period.label}</p>
        </div>
      </div>
      <Card className="statement-card">
        <h2>{ui(t, 'thisMonthSavingRemains')}</h2>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'member', label: ui(t, 'member') }, { key: 'saving', label: t.fields.savings, render: (row) => money(row.saving) }, { key: 'dueDate', label: ui(t, 'dueDate'), render: (row) => formatStoredDate(row.dueDate, displayLocale(t.moneyLocale)) }, { key: 'actualDate', label: ui(t, 'receivedDate'), render: (row) => formatStoredDate(row.actualDate, displayLocale(t.moneyLocale)) }, { key: 'lateDays', label: ui(t, 'lateDays') }, { key: 'penalty', label: ui(t, 'penalty'), render: (row) => money(row.penalty) }]} rows={monthSavings} />
      </Card>
      <Card className="statement-card">
        <h2>{ui(t, 'unpaidSavingsAfterDueDate')} ({overdueSavings.length})</h2>
        {overdueSavings.length
          ? <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'member', label: ui(t, 'member') }, { key: 'amount', label: t.fields.savings, render: (row) => money(row.amount) }, { key: 'dueDate', label: ui(t, 'dueDate'), render: (row) => formatStoredDate(row.dueDate, displayLocale(t.moneyLocale)) }, { key: 'lateDays', label: ui(t, 'lateDays') }]} rows={overdueSavings} />
          : <p className="muted">{ui(t, 'noOverdueSavings')}</p>}
      </Card>
    </Module>
  )
}

function Loans({ role, t, data, money, openAction }) {
  const defaultPeriod = getPeriod(data.shg)
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.value)
  const period = { ...defaultPeriod, value: selectedMonth, label: monthLabel(selectedMonth, displayLocale(t.moneyLocale)) }
  const monthLoans = data.loans
    .filter((loan) => recordMonth(loan.createdAt || loan.disbursedDate || loan.approvedDate || loan.requestedDate || loan.date) === selectedMonth)
    .slice(0, 5)
    .map((loan) => ({ ...loan, amount: loan.amount || loan.outstanding }))
  const activeLoans = monthLoans.filter((loan) => Number(loan.outstanding || 0) > 0)
  const currentAllLoans = activeLoans.reduce((total, loan) => total + Number(loan.outstanding || 0), 0)
  return (
    <Module title={t.modules.loans} t={t} action={role === 'admin' ? <Button onClick={() => openAction({ title: t.modules.giveLoan, path: '/loans', fields: [{ name: 'member', label: ui(t, 'member'), options: data.members.map((member) => ({ value: member._id || member.id, label: member.name })) }, { name: 'amount', label: ui(t, 'amount'), type: 'number' }, { name: 'purpose', label: t.fields.purpose }, { name: 'interestRate', label: ui(t, 'interestRate'), type: 'number', defaultValue: 2 }, { name: 'durationMonths', label: ui(t, 'durationMonths'), type: 'number' }] })}>{t.modules.giveLoan}</Button> : null}>
      <div className="app-like-header centered-header">
        <div>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} t={t} />
          <h3>{ui(t, 'currentLoans')}</h3>
          <p>{ui(t, 'currentBalance')}: {money(data.summary.groupBalance || 0)}</p>
          <p>{ui(t, 'currentLoans')}: {money(currentAllLoans)} ({activeLoans.length})</p>
          <p className="month-pill">{ui(t, 'savingMonth')}: {period.label}</p>
        </div>
      </div>
      {activeLoans.length ? (
        <Card className="statement-card">
          <h2>{ui(t, 'currentLoans')}</h2>
          <DataTable t={t} columns={[{ key: 'loanId', label: ui(t, 'loan') }, { key: 'member', label: ui(t, 'member') }, { key: 'outstanding', label: ui(t, 'amount'), render: (row) => money(row.outstanding) }, { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.status === 'Overdue' ? 'danger' : 'warning'}>{localizedValue(row.status, t)}</Badge> }, ...(role === 'admin' ? [{ key: 'repay', label: ui(t, 'repay'), render: (row) => row._id ? <Button variant="ghost" onClick={() => openAction({ title: ui(t, 'repayLoan'), path: `/loans/${row._id}/repay`, fields: [{ name: 'principal', label: ui(t, 'principal'), type: 'number' }, { name: 'interest', label: t.fields.type, type: 'number', defaultValue: 0 }, { name: 'penalty', label: ui(t, 'penalty'), type: 'number', defaultValue: 0 }, { name: 'date', label: ui(t, 'date'), type: 'date', required: false }] })}>{ui(t, 'repay')}</Button> : null }] : [])]} rows={activeLoans} />
        </Card>
      ) : <EmptyNotice text={ui(t, 'noLoansTaken')} />}
      <Card className="statement-card">
        <h2>{ui(t, 'monthlyLoansProvided')}</h2>
        {monthLoans.length ? <DataTable t={t} columns={[{ key: 'loanId', label: ui(t, 'loan') }, { key: 'member', label: ui(t, 'member') }, { key: 'purpose', label: t.fields.purpose }, { key: 'amount', label: ui(t, 'amount'), render: (row) => money(row.amount) }]} rows={monthLoans} footer={<span className="table-total"><strong>{ui(t, 'totalLoanProvided')}</strong><strong>{money(monthLoans.reduce((total, loan) => total + Number(loan.amount || 0), 0))} ({monthLoans.length})</strong></span>} /> : <EmptyNotice text={ui(t, 'noLoansTaken')} />}
      </Card>
    </Module>
  )
}

function localizedLoanPurpose(value, t) {
  const language = textLang(t)
  const labels = {
    agriculture: { en: 'Agriculture / farming', hi: 'कृषि / खेती', mr: 'शेती / कृषी' },
    livestock: { en: 'Livestock rearing', hi: 'पशुपालन', mr: 'पशुपालन' },
    business: { en: 'Start or expand a business', hi: 'व्यवसाय शुरू या बढ़ाना', mr: 'व्यवसाय सुरू किंवा वाढवणे' },
    education: { en: 'Education', hi: 'शिक्षा', mr: 'शिक्षण' },
    medical: { en: 'Medical treatment', hi: 'चिकित्सा', mr: 'वैद्यकीय उपचार' },
    home: { en: 'Home repair', hi: 'घर की मरम्मत', mr: 'घराची दुरुस्ती' },
    other: { en: 'Other', hi: 'अन्य', mr: 'इतर' },
  }
  return labels[value]?.[language] || localizedValue(value, t)
}

function localizedRepaymentPlan(value, t) {
  const language = textLang(t)
  const labels = {
    weekly: { en: 'Weekly instalments', hi: 'साप्ताहिक किश्त', mr: 'साप्ताहिक हप्ता' },
    fortnightly: { en: 'Fortnightly instalments', hi: 'हर दो सप्ताह किश्त', mr: 'दर दोन आठवड्यांनी हप्ता' },
    monthly: { en: 'Monthly EMI', hi: 'मासिक EMI', mr: 'मासिक हप्ता' },
    quarterly: { en: 'Quarterly repayment', hi: 'त्रैमासिक भुगतान', mr: 'त्रैमासिक परतफेड' },
    bullet: { en: 'One-time repayment at end of term', hi: 'अवधि के अंत में एकमुश्त भुगतान', mr: 'मुदत संपल्यावर एकरकमी परतफेड' },
  }
  return labels[value]?.[language] || localizedValue(value, t)
}

function LoanApplication({ t, data, money, notify, onMutation }) {
  const member = getCurrentMember(data.members)
  const language = textLang(t)
  const purposeOptions = language === 'hi'
    ? [['agriculture', 'कृषि / खेती'], ['livestock', 'पशुपालन'], ['business', 'व्यवसाय शुरू या बढ़ाना'], ['education', 'शिक्षा'], ['medical', 'चिकित्सा'], ['home', 'घर की मरम्मत'], ['other', 'अन्य']]
    : language === 'mr'
      ? [['agriculture', 'शेती / कृषी'], ['livestock', 'पशुपालन'], ['business', 'व्यवसाय सुरू किंवा वाढवणे'], ['education', 'शिक्षण'], ['medical', 'वैद्यकीय उपचार'], ['home', 'घराची दुरुस्ती'], ['other', 'इतर']]
      : [['agriculture', 'Agriculture / farming'], ['livestock', 'Livestock rearing'], ['business', 'Start or expand a business'], ['education', 'Education'], ['medical', 'Medical treatment'], ['home', 'Home repair'], ['other', 'Other']]
  const repaymentOptions = language === 'hi'
    ? [['weekly', 'साप्ताहिक किश्त'], ['fortnightly', 'हर दो सप्ताह किश्त'], ['monthly', 'मासिक EMI'], ['quarterly', 'त्रैमासिक भुगतान'], ['bullet', 'अवधि के अंत में एकमुश्त भुगतान']]
    : language === 'mr'
      ? [['weekly', 'साप्ताहिक हप्ता'], ['fortnightly', 'दर दोन आठवड्यांनी हप्ता'], ['monthly', 'मासिक हप्ता'], ['quarterly', 'त्रैमासिक परतफेड'], ['bullet', 'मुदत संपल्यावर एकरकमी परतफेड']]
      : [['weekly', 'Weekly instalments'], ['fortnightly', 'Fortnightly instalments'], ['monthly', 'Monthly EMI'], ['quarterly', 'Quarterly repayment'], ['bullet', 'One-time repayment at end of term']]
  const [values, setValues] = useState({ amount: '', purpose: '', purposeDetails: '', durationMonths: '', repaymentPlan: '', monthlyIncome: '', existingLoanDetails: '' })
  const [saving, setSaving] = useState(false)
  const update = (name, value) => setValues((current) => ({ ...current, [name]: value }))
  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api('/loan-applications', {
        method: 'POST',
        body: JSON.stringify({ ...values, member: member._id || member.id, amount: Number(values.amount), durationMonths: Number(values.durationMonths), monthlyIncome: Number(values.monthlyIncome) }),
      })
      notify(ui(t, 'loanApplicationSubmitted'))
      setValues({ amount: '', purpose: '', purposeDetails: '', durationMonths: '', repaymentPlan: '', monthlyIncome: '', existingLoanDetails: '' })
      await onMutation?.()
    } catch (error) {
      notify(error.message)
    } finally {
      setSaving(false)
    }
  }
  const mine = (data.loanApplications || []).filter((application) => String(application.member?._id || application.member) === String(member._id || member.id))
  return (
    <Module title={ui(t, 'loanApplication')} t={t}>
      <Card className="statement-card loan-application-card">
        <div className="loan-form-heading"><div><p className="eyebrow">{ui(t, 'loanApplication')}</p><h2>{ui(t, 'applyForLoan')}</h2><p className="muted">{ui(t, 'loanApplicationHint')}</p></div><span className="loan-form-badge">{ui(t, 'adminReviewRequired')}</span></div>
        <form onSubmit={submit}>
          <fieldset className="loan-form-section"><legend>{ui(t, 'loanRequestDetails')}</legend><div className="form-grid">
            <label className="field"><span>{ui(t, 'amount')} (₹)</span><input type="number" min="1" step="1" value={values.amount} onChange={(event) => update('amount', event.target.value)} required /></label>
            <label className="field"><span>{ui(t, 'purpose')}</span><select value={values.purpose} onChange={(event) => update('purpose', event.target.value)} required><option value="">{ui(t, 'selectPurpose')}</option>{purposeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>{ui(t, 'durationMonths')}</span><input type="number" min="1" max="120" value={values.durationMonths} onChange={(event) => update('durationMonths', event.target.value)} required /></label>
            <label className="field"><span>{ui(t, 'repaymentPlan')}</span><select value={values.repaymentPlan} onChange={(event) => update('repaymentPlan', event.target.value)} required><option value="">{ui(t, 'selectRepaymentPlan')}</option>{repaymentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field field-wide"><span>{ui(t, 'purposeDetails')}</span><textarea rows="3" value={values.purposeDetails} onChange={(event) => update('purposeDetails', event.target.value)} placeholder={ui(t, 'purposeDetailsPlaceholder')} required /></label>
          </div></fieldset>
          <fieldset className="loan-form-section"><legend>{ui(t, 'financialDetails')}</legend><div className="form-grid">
            <label className="field"><span>{ui(t, 'monthlyIncome')} (₹)</span><input type="number" min="0" step="1" value={values.monthlyIncome} onChange={(event) => update('monthlyIncome', event.target.value)} required /></label>
            <label className="field field-wide"><span>{ui(t, 'existingLoanDetails')}</span><textarea rows="3" value={values.existingLoanDetails} onChange={(event) => update('existingLoanDetails', event.target.value)} placeholder={ui(t, 'existingLoanDetailsPlaceholder')} /></label>
          </div></fieldset>
          <div className="loan-form-note">{ui(t, 'loanApplicationConsent')}</div>
          <Button type="submit" disabled={saving}>{saving ? ui(t, 'submitting') : ui(t, 'submitApplication')}</Button>
        </form>
      </Card>
      <Card className="statement-card">
        <h2>{ui(t, 'myLoanApplications')}</h2>
        <DataTable t={t} columns={[
          { key: 'applicationId', label: ui(t, 'applicationId') },
          { key: 'amount', label: ui(t, 'amount'), render: (row) => money(row.amount) },
          { key: 'purpose', label: ui(t, 'purpose'), render: (row) => localizedLoanPurpose(row.purpose, t) },
          { key: 'purposeDetails', label: ui(t, 'purposeDetails') },
          { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{localizedValue(row.status, t)}</Badge> },
          { key: 'decisionNote', label: ui(t, 'decisionNote') },
        ]} rows={mine} />
      </Card>
    </Module>
  )
}

function LoanApplications({ t, data, money, openAction }) {
  return (
    <Module title={ui(t, 'memberLoanRequests')} t={t}>
      <Card className="statement-card">
        <h2>{ui(t, 'memberLoanRequests')}</h2>
        <DataTable t={t} columns={[
          { key: 'applicationId', label: ui(t, 'applicationId') },
          { key: 'member', label: ui(t, 'member'), render: (row) => row.member?.name || row.member },
          { key: 'amount', label: ui(t, 'amount'), render: (row) => money(row.amount) },
          { key: 'purpose', label: ui(t, 'purpose'), render: (row) => localizedLoanPurpose(row.purpose, t) },
          { key: 'purposeDetails', label: ui(t, 'purposeDetails') },
          { key: 'repaymentPlan', label: ui(t, 'repaymentPlan'), render: (row) => localizedRepaymentPlan(row.repaymentPlan, t) },
          { key: 'durationMonths', label: ui(t, 'durationMonths') },
          { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{localizedValue(row.status, t)}</Badge> },
          { key: 'actions', label: ui(t, 'actions'), render: (row) => row.status === 'pending' ? <span className="button-row"><Button variant="ghost" onClick={() => openAction({ title: ui(t, 'approveLoanApplication'), path: `/loan-applications/${row._id}/approve`, fields: [{ name: 'interestRate', label: ui(t, 'interestRate'), type: 'number', defaultValue: data.shg.loanInterestRate || 0 }, { name: 'decisionNote', label: ui(t, 'decisionNote'), required: false }] })}>{ui(t, 'approve')}</Button><Button variant="ghost" onClick={() => openAction({ title: ui(t, 'rejectLoanApplication'), path: `/loan-applications/${row._id}/reject`, fields: [{ name: 'decisionNote', label: ui(t, 'decisionNote'), required: false }] })}>{ui(t, 'reject')}</Button></span> : null },
        ]} rows={data.loanApplications || []} />
      </Card>
    </Module>
  )
}

function Ledger({ t, data, money, memberId, selectedMonth, onMonthChange }) {
  const defaultPeriod = getPeriod(data.shg)
  const [internalMonth, setInternalMonth] = useState(defaultPeriod.value)
  const activeMonth = selectedMonth || internalMonth
  const changeMonth = onMonthChange || setInternalMonth
  const transactions = data.transactions.filter((row) => recordMonth(row.date) === activeMonth && (!memberId || String(row.member?._id || row.member?.id || row.member) === String(memberId)))
  return <Module title={t.modules.ledger} t={t}><ModuleWorkflow type="ledger" t={t} /><MonthPicker value={activeMonth} onChange={changeMonth} t={t} /><DataTable t={t} columns={[{ key: 'transactionId', label: t.fields.transactionId }, { key: 'date', label: t.fields.date }, { key: 'type', label: t.fields.type }, { key: 'member', label: t.fields.member }, { key: 'amount', label: t.fields.amount, render: (row) => money(row.amount) }, { key: 'balance', label: t.fields.runningBalance, render: (row) => money(row.balance) }]} rows={transactions} /></Module>
}

function Passbook({ t, data, money, notify }) {
  const defaultMember = getCurrentMember(data.members)
  const [selectedMemberId, setSelectedMemberId] = useState(defaultMember?._id || defaultMember?.id)
  const [selectedMonth, setSelectedMonth] = useState(getPeriod(data.shg).value)
  const member = data.members.find((row) => String(row._id || row.id) === String(selectedMemberId)) || defaultMember
  const loanTaken = data.loans.filter((loan) => String(loan.member?._id || loan.member) === String(member._id || member.id)).reduce((total, loan) => total + Number(loan.amount || 0), 0)
  const amountRepaid = Math.max(loanTaken - Number(member.loanOutstanding || 0), 0)
  function downloadPassbook() {
    const popup = window.open('', '_blank', 'noopener,noreferrer')
    if (!popup) return
    const rows = data.transactions.filter((row) => recordMonth(row.date) === selectedMonth && String(row.member?._id || row.member?.id || row.member) === String(member._id || member.id))
    const table = rows.map((row) => `<tr><td>${row.date || ''}</td><td>${row.type || ''}</td><td>${row.description || ''}</td><td>${money(row.amount)}</td></tr>`).join('')
    popup.document.write(`<html><head><title>Passbook - ${member.name}</title><style>body{font-family:Arial;padding:28px;color:#17251f}h1{color:#0a6b63}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #cbd8d2;padding:10px;text-align:left}td:last-child,th:last-child{text-align:right}</style></head><body><h1>${data.shg.name || 'SHG'} Digital Passbook</h1><p><strong>Member:</strong> ${member.name} &nbsp; <strong>Month:</strong> ${monthLabel(selectedMonth, displayLocale(t.moneyLocale))}</p><p>Total savings: ${money(member.savings)} | Loan taken: ${money(loanTaken)} | Repaid: ${money(amountRepaid)} | Outstanding: ${money(member.loanOutstanding)}</p><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th></tr></thead><tbody>${table || '<tr><td colspan="4">No transactions for this month.</td></tr>'}</tbody></table><script>window.print()</script></body></html>`)
    popup.document.close()
  }
  return <Module title={t.modules.passbook} t={t} action={<Button variant="secondary" onClick={downloadPassbook}>{t.downloadPdf}</Button>}><ModuleWorkflow type="member" t={t} onAction={(title) => notify?.(`${title} is available below.`)} /><Card className="passbook"><div><p className="muted">{t.labels.memberName}</p><h2>{member.name}</h2><span>{member.memberId} • {data.shg.name}</span></div><div className="stats-grid compact"><StatCard label={t.dashboard.totalSavings} value={money(member.savings)} icon="+" /><StatCard label={t.labels.loanTaken} value={money(loanTaken)} icon="₹" tone="blue" /><StatCard label={t.labels.amountRepaid} value={money(amountRepaid)} icon="✓" /><StatCard label={t.fields.outstanding} value={money(member.loanOutstanding)} icon="!" tone="amber" /></div></Card><Card className="statement-card passbook-filter-card"><div className="balance-period-header"><div><span className="eyebrow">PASSBOOK FILTER</span><h2>Choose member and month</h2><p>Select a member and calendar month to view the correct transactions.</p></div><span className="balance-period-preview">{monthLabel(selectedMonth, displayLocale(t.moneyLocale))}</span></div><div className="report-filter-grid two"><label className="field"><span>{t.labels.memberName}</span><select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>{data.members.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.name}</option>)}</select></label><label className="field"><span>Report date</span><input type="date" value={`${selectedMonth}-01`} onChange={(event) => setSelectedMonth(recordMonth(event.target.value))} aria-label="Passbook report date" /></label></div></Card><Ledger t={t} data={data} money={money} memberId={member._id || member.id} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} /></Module>
}

function MonthlyAccounts({ t, money, data }) {
  const defaultPeriod = getPeriod(data.shg)
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.value)
  const [selectedDate, setSelectedDate] = useState(`${defaultPeriod.value}-01`)
  const period = { ...defaultPeriod, value: selectedMonth, label: monthLabel(selectedMonth, displayLocale(t.moneyLocale)) }
  const breakupRows = []
  const monthTransactions = data.transactions.filter((row) => recordMonth(row.date) === selectedMonth)
  const incomeRows = monthTransactions.filter((row) => row.type === 'income').map((row, index) => ({
    ...row,
    id: row.id || row._id,
    index: index + 1,
    description: row.description || row.type,
    month: row.date,
  }))
  const summaryRows = [
    [`A) ${ui(t, 'previousMonthBalance')}`, 0],
    [`B) ${ui(t, 'monthlyDeposit')}`, data.savings.filter((row) => recordMonth(row.month || row.date) === selectedMonth).reduce((total, row) => total + Number(row.amount || 0), 0)],
    [`C) ${ui(t, 'totalDeposit')} (A+B)`, data.savings.filter((row) => recordMonth(row.month || row.date) === selectedMonth).reduce((total, row) => total + Number(row.amount || 0), 0)],
    [`D) ${ui(t, 'loanProvided')}`, data.loans.filter((loan) => recordMonth(loan.createdAt || loan.disbursedDate || loan.approvedDate || loan.requestedDate || loan.date) === selectedMonth).reduce((total, loan) => total + Number(loan.amount || 0), 0)],
    [`E) ${ui(t, 'totalOtherExpenses')}`, monthTransactions.filter((row) => row.type === 'expense').reduce((total, row) => total + Number(row.amount || 0), 0)],
    [`F) ${ui(t, 'totalExpenses')} (D+E)`, monthTransactions.filter((row) => row.direction === 'debit').reduce((total, row) => total + Number(row.amount || 0), 0)],
    [`${ui(t, 'thisMonthBalance')} (C-F)`, monthTransactions.reduce((total, row) => total + (row.direction === 'credit' ? Number(row.amount || 0) : -Number(row.amount || 0)), 0)],
  ]
  const totalSavings = data.savings.filter((row) => recordMonth(row.month || row.date) === selectedMonth).reduce((total, row) => total + Number(row.amount || 0), 0)
  const monthLoans = data.loans.filter((loan) => recordMonth(loan.createdAt || loan.disbursedDate || loan.approvedDate || loan.requestedDate || loan.date) === selectedMonth)
  const totalLoans = monthLoans.reduce((total, loan) => total + Number(loan.amount || 0), 0)
  const totalExpenses = monthTransactions.filter((row) => row.type === 'expense').reduce((total, row) => total + Number(row.amount || 0), 0)
  const monthBalance = summaryRows[summaryRows.length - 1][1]
  function downloadMonthlyReport() {
    const popup = window.open('', '_blank', 'noopener,noreferrer')
    if (!popup) return
    const rows = summaryRows.map(([label, value]) => `<tr><td>${label}</td><td>${money(value)}</td></tr>`).join('')
    popup.document.write(`<html><head><title>Monthly Accounts - ${period.label}</title><style>body{font-family:Arial;padding:28px;color:#17251f}h1{color:#0a6b63}p{color:#53655f}table{width:100%;border-collapse:collapse;margin-top:20px}td{border:1px solid #cbd8d2;padding:11px}td:last-child{text-align:right;font-weight:bold}</style></head><body><h1>${data.shg.name || 'SHG'} Monthly Accounts</h1><p>Report period: ${period.label}</p><table>${rows}</table><script>window.print()</script></body></html>`)
    popup.document.close()
  }
  return (
    <Module title={t.modules.monthly} t={t} action={<Button variant="secondary" onClick={downloadMonthlyReport}>{ui(t, 'download')} {t.modules.monthly}</Button>}>
      <div className="finance-summary-grid">
        <StatCard label={ui(t, 'monthlyDeposit')} value={money(totalSavings)} hint={ui(t, 'currentMonth')} icon="wallet" />
        <StatCard label={ui(t, 'loanProvided')} value={money(totalLoans)} hint={`${monthLoans.length} ${ui(t, 'records')}`} icon="loan" tone="blue" />
        <StatCard label={ui(t, 'totalOtherExpenses')} value={money(totalExpenses)} hint={ui(t, 'dateOnlyEntry')} icon="ledger" tone="red" />
        <StatCard label={ui(t, 'thisMonthBalance')} value={money(monthBalance)} hint={ui(t, 'balance')} icon="chart" tone="emerald" />
      </div>
      <Card className="statement-card report-selector finance-filter-card finance-report-card balance-period-card monthly-accounts-period-card">
        <div className="balance-period-header"><div><span className="eyebrow">MONTHLY REPORT PERIOD</span><h2>{ui(t, 'selectSavingMonthYear')}</h2><p>Use the calendar to select the day, month and year for this monthly report.</p></div><span className="balance-period-preview">{period.label}</span></div>
        <div className="report-filter-grid">
          <label className="field"><span>Report date</span><input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedMonth(recordMonth(event.target.value)) }} aria-label="Monthly report date" /></label>
        </div>
        <div className="balance-period-actions"><span>Showing: <strong>{period.label}</strong></span><Button onClick={() => setSelectedMonth(recordMonth(selectedDate))}>{ui(t, 'getMonthlyReport')}</Button></div>
      </Card>
      <Card className="statement-card finance-report-card">
        <h2>{ui(t, 'savingMonth')}: {period.label}</h2>
        <div className="statement-lines">
          {summaryRows.map(([label, value]) => <div key={label} className={label.includes('Total') || label.includes('Balance') ? 'total' : ''}><span>{label}</span><strong>{money(value)}</strong></div>)}
        </div>
        <DataTable t={t} columns={[{ key: 'savings', label: ui(t, 'savings'), render: (row) => money(row.savings) }, { key: 'installment', label: ui(t, 'installment'), render: (row) => money(row.installment) }, { key: 'interest', label: ui(t, 'interest'), render: (row) => money(row.interest) }, { key: 'penalty', label: ui(t, 'penalty'), render: (row) => money(row.penalty) }, { key: 'otherIncome', label: ui(t, 'otherIncome'), render: (row) => money(row.otherIncome) }]} rows={breakupRows} />
      </Card>
      <Card className="statement-card finance-report-card">
        <h2>{ui(t, 'currentMonthOtherIncome')}</h2>
        <div className="module-head"><div><p className="eyebrow">{ui(t, 'incomeRegister')}</p></div><Badge tone={incomeRows.length ? 'success' : 'warning'}>{incomeRows.length ? ui(t, 'recordsAvailable') : ui(t, 'noRecords')}</Badge></div>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'description', label: ui(t, 'description') }, { key: 'amount', label: ui(t, 'amount'), render: (row) => money(row.amount) }]} rows={incomeRows} />
      </Card>
    </Module>
  )
}

function CalculationReport({ t, data, money }) {
  const lang = textLang(t)
  const period = getPeriod(data.shg)
  const copy = {
    en: {
      title: 'Complete SHG Calculation Report',
      month: `Month: ${period.label}`,
      year: 'Year: 5',
      week: 'Week: 10',
      account: 'Account No: 082810002000054',
      ifsc: 'IFSC Code: DEOB0000025',
      columns: ['No.', 'Member Name', 'Deposit Share', 'Previous Loan', 'New Loan', 'Total Loan Balance', 'Current Month Savings', 'Principal', 'Interest', 'Current Total', 'Extra Deposit', 'Remaining Loan'],
      notes: ['Deposit savings into the group bank account before the decided date.', 'After the decided date, late fee can be applied as per group rule.', 'Every member should verify the account statement.'],
    },
    hi: {
      title: 'पूर्ण SHG गणना रिपोर्ट',
      month: `महीना: ${period.label}`,
      year: 'वर्ष: 5',
      week: 'सप्ताह: 10',
      account: 'खाता क्रमांक: 082810002000054',
      ifsc: 'IFSC कोड: DEOB0000025',
      columns: ['क्र.', 'सदस्य का नाम', 'जमा शेयर', 'पिछला ऋण', 'नया ऋण', 'कुल ऋण बाकी', 'चालू माह बचत', 'मूलधन', 'ब्याज', 'चालू कुल', 'अतिरिक्त जमा', 'बाकी ऋण'],
      notes: ['निर्धारित तारीख से पहले समूह की बचत बैंक खाते में जमा करें।', 'निर्धारित तारीख के बाद समूह नियम के अनुसार विलंब शुल्क लगाया जा सकता है।', 'हर सदस्य को खाता विवरण जांचना चाहिए।'],
    },
    mr: {
      title: 'पूर्ण SHG गणना अहवाल',
      month: `महिना: ${period.label}`,
      year: 'वर्ष: 5',
      week: 'हप्ता: 10',
      account: 'खाते क्रमांक: 082810002000054',
      ifsc: 'IFSC कोड: DEOB0000025',
      columns: ['अ.क्र.', 'सभासदाचे नाव', 'जमा शेअर्स', 'पूर्वीचे कर्ज', 'नवीन कर्ज', 'एकूण बाकी कर्ज', 'चालू महिन्यातील बचत', 'मुद्दल', 'व्याज', 'एकूण', 'अतिरिक्त जमा', 'बाकी कर्ज'],
      notes: ['ठरलेल्या तारखेपूर्वी बचत गटाची रक्कम बँक खात्यात जमा करा.', 'ठरलेल्या तारखेनंतर गट नियमानुसार विलंब शुल्क लागू होऊ शकते.', 'प्रत्येक सभासदाने हिशोब तपासून खात्री करावी.'],
    },
  }[lang]

  const rows = data.members.map((member, index) => {
    const memberLoans = data.loans.filter((loan) => String(loan.member?._id || loan.member) === String(member._id || member.id))
    const newLoan = memberLoans.reduce((total, loan) => total + Number(loan.amount || 0), 0)
    const previousLoan = Math.max(newLoan - Number(member.loanOutstanding || 0), 0)
    const savings = Number(member.savings || 0)
    const depositShare = savings
    const principal = previousLoan
    const interest = memberLoans.reduce((total, loan) => total + Number(loan.interestAmount || 0), 0)
    const currentTotal = savings + principal + interest
    const extraDeposit = 0
    const remainingLoan = Math.max(previousLoan + newLoan - principal, 0)
    return {
      id: `calc-${member.id}`,
      index: index + 1,
      name: member.name,
      depositShare,
      previousLoan,
      newLoan,
      loanBalance: previousLoan + newLoan,
      savings,
      principal,
      interest,
      currentTotal,
      extraDeposit,
      remainingLoan,
    }
  })

  const totals = rows.reduce((acc, row) => {
    Object.keys(acc).forEach((key) => { acc[key] += row[key] })
    return acc
  }, { depositShare: 0, previousLoan: 0, newLoan: 0, loanBalance: 0, savings: 0, principal: 0, interest: 0, currentTotal: 0, extraDeposit: 0, remainingLoan: 0 })

  const columns = [
    { key: 'index', label: copy.columns[0] },
    { key: 'name', label: copy.columns[1] },
    { key: 'depositShare', label: copy.columns[2], render: (row) => money(row.depositShare) },
    { key: 'previousLoan', label: copy.columns[3], render: (row) => money(row.previousLoan) },
    { key: 'newLoan', label: copy.columns[4], render: (row) => money(row.newLoan) },
    { key: 'loanBalance', label: copy.columns[5], render: (row) => money(row.loanBalance) },
    { key: 'savings', label: copy.columns[6], render: (row) => money(row.savings) },
    { key: 'principal', label: copy.columns[7], render: (row) => money(row.principal) },
    { key: 'interest', label: copy.columns[8], render: (row) => money(row.interest) },
    { key: 'currentTotal', label: copy.columns[9], render: (row) => money(row.currentTotal) },
    { key: 'extraDeposit', label: copy.columns[10], render: (row) => money(row.extraDeposit) },
    { key: 'remainingLoan', label: copy.columns[11], render: (row) => money(row.remainingLoan) },
  ]

  return (
    <Module title={navLabel(t, 'calculationReport')} t={t} action={<Button variant="secondary">{t.downloadPdf}</Button>}>
      <Card className="statement-card calculation-report">
        <div className="calculation-report-head">
          <h2>{copy.title}</h2>
          <p>{data.shg.name}</p>
          <div>
            <span>{copy.month}</span>
            <span>{copy.year}</span>
            <span>{copy.week}</span>
            <span>{copy.account}</span>
            <span>{copy.ifsc}</span>
          </div>
        </div>
        <DataTable t={t} columns={columns} rows={rows} footerCells={[
          localizedValue('Total', t),
          '',
          money(totals.depositShare),
          money(totals.previousLoan),
          money(totals.newLoan),
          money(totals.loanBalance),
          money(totals.savings),
          money(totals.principal),
          money(totals.interest),
          money(totals.currentTotal),
          money(totals.extraDeposit),
          money(totals.remainingLoan),
        ]} />
      </Card>
      <Card className="calculation-notes">
        {copy.notes.map((note, index) => <p key={note}>{index + 1}. {note}</p>)}
      </Card>
    </Module>
  )
}

function BalanceSheet({ t, money, data }) {
  const period = getPeriod(data.shg)
  const initialDate = `${period.value}-01`
  const [fromDate, setFromDate] = useState(initialDate)
  const [toDate, setToDate] = useState(initialDate)
  const rangeStart = recordMonth(fromDate) <= recordMonth(toDate) ? recordMonth(fromDate) : recordMonth(toDate)
  const rangeEnd = recordMonth(fromDate) <= recordMonth(toDate) ? recordMonth(toDate) : recordMonth(fromDate)
  const inRange = (value) => {
    const month = recordMonth(value)
    return month && month >= rangeStart && month <= rangeEnd
  }
  const beforeRange = (value) => {
    const month = recordMonth(value)
    return month && month < rangeStart
  }
  const savingsRows = (data.savings || [])
  const totalSavings = savingsRows.filter((row) => inRange(row.month || row.date)).reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const previousSavings = savingsRows.filter((row) => beforeRange(row.month || row.date)).reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const incomeRows = data.transactions.filter((row) => row.type === 'income' && inRange(row.date))
  const expenseRows = data.transactions.filter((row) => row.type === 'expense' && inRange(row.date))
  const totalIncome = incomeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const totalExpenses = expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const previousTransactions = data.transactions.filter((row) => beforeRange(row.date)).reduce((sum, row) => sum + (row.direction === 'debit' || row.type === 'expense' ? -Number(row.amount || 0) : Number(row.amount || 0)), 0)
  const outstandingLoans = Number(data.loans.filter((loan) => {
    const date = loan.createdAt || loan.disbursedDate || loan.approvedDate || loan.requestedDate
    return recordMonth(date) <= rangeEnd
  }).reduce((sum, loan) => sum + Number(loan.outstanding || 0), 0))
  const previousBalance = previousSavings + previousTransactions
  const total = previousBalance + totalSavings + totalIncome - totalExpenses
  const totalMembers = data.members.length
  const locale = displayLocale(t.moneyLocale)
  const selectedPeriodLabel = rangeStart === rangeEnd
    ? monthLabel(rangeStart, locale)
    : `${monthLabel(rangeStart, locale)} – ${monthLabel(rangeEnd, locale)}`
  function downloadBalanceSheet() {
    const popup = window.open('', '_blank', 'noopener,noreferrer')
    if (!popup) return
    popup.document.write(`<html><head><title>Balance Sheet</title><style>body{font-family:Arial;padding:28px;color:#17251f}h1{color:#0a6b63}table{width:100%;border-collapse:collapse}td{border:1px solid #cbd8d2;padding:10px}td:last-child{text-align:right;font-weight:bold}</style></head><body><h1>${data.shg.name || 'SHG'} Balance Sheet</h1><p>${selectedPeriodLabel}</p><table>${[
      ['Previous balance', previousBalance],
      ['Savings / deposits', totalSavings],
      ['Other income', totalIncome],
      ['Other expenses', totalExpenses],
      ['Loan outstanding', outstandingLoans],
      ['Balance', total],
    ].map(([label, value]) => `<tr><td>${label}</td><td>${money(value)}</td></tr>`).join('')}</table><script>window.print()</script></body></html>`)
    popup.document.close()
  }
  return (
    <Module title={t.modules.balance} t={t} action={<Button variant="secondary" onClick={downloadBalanceSheet}>{ui(t, 'balanceSheetDownload')}</Button>}>
      <div className="finance-summary-grid">
        <StatCard label={t.dashboard.totalSavings} value={money(totalSavings)} hint={`${totalMembers} ${ui(t, 'members')}`} icon="wallet" />
        <StatCard label={ui(t, 'totalOtherIncome')} value={money(totalIncome)} hint={ui(t, 'incomeRegister')} icon="plus" tone="blue" />
        <StatCard label={ui(t, 'totalOtherExpenses')} value={money(totalExpenses)} hint={ui(t, 'expenseRegister')} icon="ledger" tone="red" />
        <StatCard label={ui(t, 'balance')} value={money(total)} hint={ui(t, 'currentMonth')} icon="chart" tone="emerald" />
      </div>
      <Card className="statement-card report-selector finance-filter-card finance-report-card balance-period-card">
        <div className="balance-period-header"><div><span className="eyebrow">REPORT PERIOD</span><h2>Choose the dates to include</h2><p>Use the calendar to select a start and end date. All records in those months are included.</p></div><span className="balance-period-preview">{selectedPeriodLabel}</span></div>
        <div className="report-filter-grid two">
          <label className="field"><span>Start date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Balance sheet start date" /></label>
          <label className="field"><span>End date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Balance sheet end date" /></label>
        </div>
        <div className="balance-period-actions"><span>Showing: <strong>{selectedPeriodLabel}</strong></span><Button onClick={() => { if (fromDate > toDate) { setFromDate(toDate); setToDate(fromDate) } }}>{ui(t, 'getBalanceSheet')}</Button></div>
      </Card>
      <Card className="statement-card balance-summary-card finance-report-card">
        <div className="balance-report-heading"><div><span className="eyebrow">FINANCIAL SUMMARY</span><h2>{ui(t, 'myBalanceSheet')}</h2><p>Income, savings and expenses recorded during <strong>{selectedPeriodLabel}</strong>.</p></div><div className="balance-report-total"><small>Calculated balance</small><strong>{money(total)}</strong></div></div>
        <div className="statement-lines">
          <div><span>Opening balance <small>Before selected period</small></span><strong>{money(previousBalance)}</strong></div>
          <div><span>Savings / deposits <small>Added during selected period</small></span><strong>{money(totalSavings)}</strong></div>
          <div><span>Other income <small>Income register</small></span><strong>{money(totalIncome)}</strong></div>
          <div><span>Other expenses <small>Expense register</small></span><strong>{money(totalExpenses)}</strong></div>
          <div><span>Loan outstanding <small>Up to end month</small></span><strong>{money(outstandingLoans)}</strong></div>
          <div className="total"><span>Available balance <small>Opening + savings + income − expenses</small></span><strong>{money(total)}</strong></div>
        </div>
      </Card>
    </Module>
  )
}

function ProfileInfoScreen({ t, data, money, shgCode }) {
  const activeMembers = data.members.slice(0, 5).map((member, index) => ({ ...member, index: index + 1, role: member.roleInGroup || (member.user?.role === 'admin' ? 'President' : 'Member'), deposit: Number(member.savings || 0) }))
  const president = localizedValue(data.shg.president || data.shg.presidentName || '—', t)
  return (
    <Module title={ui(t, 'groupInfo')} t={t}>
      <Card className="statement-card">
        <div className="info-table">
          <div><span>{ui(t, 'shgName')}:</span><strong>{localizedValue(data.shg.name, t)}</strong></div>
          <div><span>{ui(t, 'shgCode')}:</span><strong>{shgCode || data.shg.shgId || '—'}</strong></div>
          <div><span>{ui(t, 'members')}:</span><strong>{ui(t, 'membersCount', { count: activeMembers.length })}:</strong></div>
          <div><span>{ui(t, 'startMonth')}:</span><strong>{formatStoredDate(data.shg.formationDate, t.moneyLocale)}</strong></div>
          <div><span>{ui(t, 'president')}:</span><strong>{president}<br /><em>{data.shg.contact || data.shg.contactPhone || '—'}</em></strong></div>
        </div>
      </Card>
      <Card className="statement-card">
        <h2>{ui(t, 'activeMembers')}</h2>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'name', label: ui(t, 'member') }, { key: 'role', label: ui(t, 'role') }, { key: 'deposit', label: ui(t, 'deposit'), render: (row) => money(row.deposit) }]} rows={activeMembers} />
      </Card>
    </Module>
  )
}

function ProfileSettingsScreen({ t, data, openAction }) {
  const user = readStoredJson('unnati_user')
  const president = user?.name || data.shg.president || data.shg.presidentName || ''
  return (
    <Module title={ui(t, 'profileSettings')} t={t}>
      <div className="app-like-header centered-header">
        <div><h3>{localizedValue(president, t)} ({ui(t, 'president')})</h3></div>
      </div>
      <Card className="statement-card profile-settings-card">
        <div className="profile-form-table">
          <label><span>{ui(t, 'shgName')}:</span><input defaultValue={data.shg.name} /></label>
          <label><span>{ui(t, 'yourName')}:</span><div className="split-input"><select defaultValue="Mrs"><option value="Mr">{ui(t, 'mr')}</option><option value="Mrs">{ui(t, 'mrs')}</option><option value="Ms">{ui(t, 'ms')}</option></select><input defaultValue={president} /></div></label>
          <label><span>{ui(t, 'yourMobile')}:</span><input defaultValue={user?.phone || data.shg.contactPhone || ''} /></label>
          <label><span>{ui(t, 'yourEmail')}:</span><input defaultValue={user?.email || data.shg.contactEmail || ''} /></label>
          <label><span>{ui(t, 'setPassword')}:</span><input type="password" /></label>
        </div>
        <Button onClick={() => openAction({ title: ui(t, 'saveChanges'), path: `/shgs/${data.shg._id || data.shg.id}`, method: 'PATCH',         fields: [{ name: 'name', label: ui(t, 'shgName'), defaultValue: data.shg.name }, { name: 'monthlySavingsAmount', label: t.form.savingsInterest, type: 'number', defaultValue: data.shg.monthlySavingsAmount }, { name: 'monthlySavingsDueDay', label: ui(t, 'dueDate'), type: 'number', defaultValue: data.shg.monthlySavingsDueDay || 1 }, { name: 'loanInterestRate', label: t.form.loanInterest, type: 'number', defaultValue: data.shg.loanInterestRate }, { name: 'savingsInterestRate', label: t.form.savingsInterest, type: 'number', defaultValue: data.shg.savingsInterestRate }, { name: 'latePenaltyAmount', label: t.form.latePenalty, type: 'number', defaultValue: data.shg.latePenaltyAmount }] })}>{ui(t, 'saveChanges')}</Button>
      </Card>
    </Module>
  )
}

// eslint-disable-next-line no-unused-vars
function SHGProfile({ t, data }) {
  const labels = {
    en: { formationDate: 'Formation Date', village: 'Village', taluka: 'Taluka', district: 'District', state: 'State', president: 'President', contact: 'Contact', monthlySavings: 'Monthly Savings', interestRate: 'Interest Rate', penalty: 'Penalty', bank: 'Bank' },
    hi: { formationDate: 'गठन तारीख', village: 'गांव', taluka: 'तालुका', district: 'जिला', state: 'राज्य', president: 'अध्यक्ष', contact: 'संपर्क', monthlySavings: 'मासिक बचत', interestRate: 'ब्याज दर', penalty: 'जुर्माना', bank: 'बैंक' },
    mr: { formationDate: 'स्थापना तारीख', village: 'गाव', taluka: 'तालुका', district: 'जिल्हा', state: 'राज्य', president: 'अध्यक्ष', contact: 'संपर्क', monthlySavings: 'मासिक बचत', interestRate: 'व्याज दर', penalty: 'दंड', bank: 'बँक' },
  }[t.moneyLocale === 'hi-IN' ? 'hi' : t.moneyLocale === 'mr-IN' ? 'mr' : 'en']
  return <Module title={t.modules.profile} t={t}><ModuleWorkflow type="settings" t={t} /><Card className="profile-card"><div><h2>{data.shg.name}</h2><p>{data.shg.shgId}</p></div><div className="detail-grid">{Object.entries(data.shg).filter(([key]) => key !== 'name' && key !== 'shgId').map(([key, value]) => <div key={key}><span>{labels[key]}</span><strong>{value}</strong></div>)}</div></Card></Module>
}

function Meetings({ role, t, data, openAction }) {
  const meetingFields = (meeting) => [
    { name: 'type', label: ui(t, 'meetingType'), options: [{ value: 'meeting', label: ui(t, 'meeting') }, { value: 'event', label: ui(t, 'event') }], defaultValue: meeting?.type || 'meeting' },
    { name: 'title', label: t.fields.title, defaultValue: meeting?.title || '' },
    { name: 'date', label: t.fields.date, type: 'date', defaultValue: meeting?.date ? String(meeting.date).slice(0, 10) : '' },
    { name: 'time', label: t.fields.time, required: false, defaultValue: meeting?.time || '' },
    { name: 'location', label: t.fields.location, required: false, defaultValue: meeting?.location || '' },
  ]
  const editMeeting = (meeting) => openAction({ title: ui(t, 'editMeetingEvent'), path: `/meetings/${meeting._id || meeting.id}`, method: 'PATCH', fields: meetingFields(meeting) })
  return <Module title={t.modules.meetings} t={t} action={role === 'admin' ? <Button onClick={() => openAction({ title: t.modules.scheduleMeeting, path: '/meetings', fields: meetingFields() })}>{t.modules.scheduleMeeting}</Button> : null}><ModuleWorkflow type="meeting" t={t} /><DataTable t={t} columns={[{ key: 'type', label: ui(t, 'meetingType'), render: (row) => row.type === 'event' ? ui(t, 'event') : ui(t, 'meeting') }, { key: 'title', label: t.fields.meeting }, { key: 'date', label: t.fields.date }, { key: 'time', label: t.fields.time }, { key: 'location', label: t.fields.location }, { key: 'status', label: t.fields.status, render: (row) => <Badge tone="success">{localizedStatus(row.status, t)}</Badge> }, ...(role === 'admin' ? [{ key: 'edit', label: ui(t, 'edit'), render: (row) => <Button variant="secondary" onClick={() => editMeeting(row)}>{ui(t, 'edit')}</Button> }] : [])]} rows={data.meetings} /></Module>
}

function Attendance({ role, notify, t, data, onMutation }) {
  const [selectedMeetingId, setSelectedMeetingId] = useState('')
  const [attendance, setAttendance] = useState({})
  const [attendanceNotes, setAttendanceNotes] = useState({})
  const [sessionDate, setSessionDate] = useState('')
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionTime, setSessionTime] = useState('')
  const [sessionLocation, setSessionLocation] = useState('')
  const selectedMeeting = selectedMeetingId ? data.meetings.find((item) => String(item._id || item.id) === String(selectedMeetingId)) : null
  const meeting = selectedMeeting || { _id: null, title: '', date: sessionDate, attendance: [] }
  const formatMeetingDate = (value) => {
    if (!value || value === '—') return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(displayLocale(t.moneyLocale))
  }
  useEffect(() => {
    setSessionDate(meeting.date && meeting.date !== '—' ? String(meeting.date).slice(0, 10) : new Date().toISOString().slice(0, 10))
    setSessionTitle(meeting._id ? meeting.title : '')
    setSessionTime(meeting.time || '')
    setSessionLocation(meeting.location || '')
    setAttendance(Object.fromEntries((meeting.attendance || []).map((entry) => [
      String(entry.member?._id || entry.member),
      entry.present ? 'Present' : 'Absent',
    ])))
    setAttendanceNotes(Object.fromEntries((meeting.attendance || []).map((entry) => [
      String(entry.member?._id || entry.member),
      entry.note || '',
    ])))
  }, [selectedMeetingId, selectedMeeting?.attendance])
  const rows = data.members.map((member, index) => {
    const saved = (meeting.attendance || []).find((entry) => String(entry.member?._id || entry.member) === String(member._id || member.id))
    return {
      id: String(member._id || member.id),
    index: index + 1,
      member: member.name,
      status: saved ? (saved.present ? 'Present' : 'Absent') : (attendance[String(member._id || member.id)] || 'Absent'),
      note: attendanceNotes[String(member._id || member.id)] || saved?.note || '',
    }
  })
  const currentMember = getCurrentMember(data.members)
  const memberRows = data.meetings.flatMap((item) => (item.attendance || []).filter((entry) => String(entry.member?._id || entry.member) === String(currentMember._id || currentMember.id)).map((entry, index) => ({
    id: `${item._id || item.id}-${index}`,
    index: index + 1,
    meeting: item.title,
    date: item.date,
    time: item.time || '—',
    location: item.location || '—',
    status: entry.present ? 'Present' : 'Absent',
    note: entry.note || '',
  })))
  const period = getPeriod(data.shg)
  const presentCount = rows.filter((row) => (attendance[row.id] || row.status) === 'Present').length
  const absentCount = rows.length - presentCount
  const historyRows = data.meetings.map((item, index) => {
    const records = item.attendance || []
    const present = records.filter((entry) => entry.present).length
    return {
      id: item._id || item.id || index,
      index: index + 1,
      meeting: item.title || ui(t, 'newAttendance'),
      date: item.date,
      attendance: `${present}/${records.length || data.members.length}`,
      action: item._id || item.id,
    }
  })

  if (role !== 'admin') {
    return (
      <Module title={navLabel(t, 'attendance')} t={t}>
        <div className="app-like-header centered-header">
          <div>
            <h3>{ui(t, 'myAttendance')}</h3>
            <p>{localizedValue(currentMember.name, t)}</p>
            <p className="month-pill">{ui(t, 'meetingMonth')}: {period.label}</p>
          </div>
        </div>
        <Card className="statement-card">
          <h2>{ui(t, 'myMeetingAttendance')}</h2>
          <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'meeting', label: t.fields.meeting }, { key: 'date', label: t.fields.date }, { key: 'time', label: t.fields.time }, { key: 'location', label: t.fields.location }, { key: 'status', label: ui(t, 'attendance'), render: (row) => <Badge tone={row.status === 'Present' ? 'success' : 'danger'}>{localizedValue(row.status, t)}</Badge> }, { key: 'note', label: ui(t, 'note') }]} rows={memberRows} />
        </Card>
      </Module>
    )
  }

  async function saveAttendance() {
    if (!sessionDate || !sessionTitle.trim()) {
      notify(ui(t, 'attendanceDetailsRequired'))
      return
    }
    try {
      let savedMeeting = selectedMeeting
      const meetingPayload = { title: sessionTitle.trim(), date: sessionDate, time: sessionTime.trim(), location: sessionLocation.trim(), type: selectedMeeting?.type || 'event' }
      if (savedMeeting?._id || savedMeeting?.id) {
        savedMeeting = await api(`/meetings/${savedMeeting._id || savedMeeting.id}`, { method: 'PATCH', body: JSON.stringify(meetingPayload) })
      } else {
        savedMeeting = await api('/meetings', { method: 'POST', body: JSON.stringify(meetingPayload) })
        setSelectedMeetingId(savedMeeting._id || savedMeeting.id)
      }
      await api(`/meetings/${savedMeeting._id || savedMeeting.id}/attendance`, {
        method: 'PATCH',
        body: JSON.stringify({ attendance: rows.map((row) => ({ member: row.id, present: (attendance[row.id] || row.status) === 'Present', note: attendanceNotes[row.id] || '' })) }),
      })
      notify(ui(t, 'attendanceSaved'))
      onMutation?.()
    } catch (error) {
      notify(error.message)
    }
  }

  function startNewAttendance() {
    setSelectedMeetingId('')
    setSessionDate(new Date().toISOString().slice(0, 10))
    setSessionTitle('')
    setSessionTime('')
    setSessionLocation('')
    setAttendance({})
    setAttendanceNotes({})
  }

  function editSavedMeeting(meetingId) {
    if (!meetingId) return
    const savedMeeting = data.meetings.find((item) => String(item._id || item.id) === String(meetingId))
    if (!savedMeeting) {
      notify('Saved attendance could not be found. Please refresh the page.')
      return
    }
    setSelectedMeetingId(String(meetingId))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Module title={navLabel(t, 'attendance')} t={t} action={<Button onClick={saveAttendance}>{ui(t, 'saveAttendance')}</Button>}>
      <section className="attendance-setup-card">
        <div className="attendance-setup-heading">
          <div>
            <span className="attendance-kicker">{selectedMeeting ? 'EDITING SAVED RECORD' : 'NEW ATTENDANCE SESSION'}</span>
            <h2>{selectedMeeting ? ui(t, 'editSavedAttendance') : ui(t, 'markAttendance')}</h2>
            <p>{selectedMeeting ? ui(t, 'editSavedAttendance') : ui(t, 'adminAttendanceHint')}</p>
          </div>
          <div className="attendance-setup-actions">
            {selectedMeeting && <span className="attendance-edit-badge">Saved record</span>}
            <Button variant="secondary" onClick={startNewAttendance}>{ui(t, 'newAttendance')}</Button>
          </div>
        </div>
        <div className="attendance-session-fields">
          <label className="attendance-event-picker"><span>{ui(t, 'attendanceDate')}</span><input type="date" value={sessionDate} onChange={(event) => { setSelectedMeetingId(''); setSessionDate(event.target.value) }} /></label>
          <label className="attendance-event-picker"><span>{ui(t, 'eventName')}</span><input value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} placeholder={ui(t, 'eventNamePlaceholder')} /></label>
          <label className="attendance-event-picker"><span>{t.fields.time}</span><input type="time" value={sessionTime} onChange={(event) => setSessionTime(event.target.value)} /></label>
          <label className="attendance-event-picker"><span>{t.fields.location}</span><input value={sessionLocation} onChange={(event) => setSessionLocation(event.target.value)} placeholder={ui(t, 'locationPlaceholder')} /></label>
        </div>
        {data.meetings.length > 0 && <label className="attendance-event-picker attendance-history-picker"><span>{ui(t, 'editSavedAttendance')}</span><select value={selectedMeetingId} onChange={(event) => event.target.value ? editSavedMeeting(event.target.value) : startNewAttendance()}><option value="">{ui(t, 'newAttendance')}</option>{data.meetings.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.title} • {formatMeetingDate(item.date)}</option>)}</select></label>}
      </section>
      <div className="attendance-register-heading">
        <div><span className="attendance-kicker">MEMBER ROSTER</span><h2>{ui(t, 'attendanceRegister')}</h2><p>{sessionTitle || ui(t, 'newAttendance')} {sessionDate ? `• ${formatMeetingDate(sessionDate)}` : ''}</p></div>
        <div className="attendance-counts"><span className="attendance-count present"><strong>{presentCount}</strong> {ui(t, 'present')}</span><span className="attendance-count absent"><strong>{absentCount}</strong> {ui(t, 'absent')}</span></div>
      </div>
      <Card className="statement-card attendance-register-card">
        <div className="attendance-toolbar"><span><strong>{data.members.length}</strong> members to mark</span><div><Button variant="secondary" onClick={() => setAttendance(Object.fromEntries(data.members.map((member) => [String(member._id || member.id), 'Present'])))}>{ui(t, 'present')}</Button><Button variant="secondary" onClick={() => setAttendance(Object.fromEntries(data.members.map((member) => [String(member._id || member.id), 'Absent'])))}>{ui(t, 'absent')}</Button></div></div>
        <div className="attendance-member-list">
          {rows.map((row) => {
            const status = attendance[row.id] || row.status
            return (
              <div className={`attendance-member-row ${status === 'Present' ? 'is-present' : 'is-absent'}`} key={row.id}>
                <span className="attendance-member-number">{String(row.index).padStart(2, '0')}</span>
                <div className="attendance-member-name"><strong>{row.member}</strong><small>{status === 'Present' ? 'Marked present' : 'Not marked present'}</small></div>
                <div className="attendance-status-toggle">
                  <button type="button" className={status === 'Present' ? 'active-present' : ''} onClick={() => setAttendance((current) => ({ ...current, [row.id]: 'Present' }))}>{ui(t, 'present')}</button>
                  <button type="button" className={status === 'Absent' ? 'active-absent' : ''} onClick={() => setAttendance((current) => ({ ...current, [row.id]: 'Absent' }))}>{ui(t, 'absent')}</button>
                </div>
                <input className="table-input attendance-note-input" value={attendanceNotes[row.id] || ''} onChange={(event) => setAttendanceNotes((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="Add note" />
              </div>
            )
          })}
        </div>
      </Card>
      <Card className="statement-card attendance-history-card">
        <div className="attendance-history-heading"><div><h2>{ui(t, 'attendanceHistory')}</h2><p>{ui(t, 'editSavedAttendance')}</p></div></div>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'meeting', label: t.fields.meeting }, { key: 'date', label: t.fields.date }, { key: 'attendance', label: ui(t, 'attendance') }, { key: 'action', label: ui(t, 'edit'), render: (row) => <Button variant="secondary" onClick={() => editSavedMeeting(row.action)}>{ui(t, 'edit')}</Button> }]} rows={historyRows} />
      </Card>
    </Module>
  )
}

function Reports({ t, data, money }) {
  const formatMoney = money || ((value) => new Intl.NumberFormat(displayLocale(t.moneyLocale || 'en-IN'), { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0)))
  const locale = displayLocale(t.moneyLocale)
  const reports = [
    {
      title: 'Monthly savings',
      headers: [ui(t, 'member'), t.fields.month, ui(t, 'dueDate'), ui(t, 'receivedDate'), ui(t, 'penalty'), t.fields.amount, ui(t, 'receiptNumber')],
      rows: (data.savings || []).map((row) => [localizedValue(row.member?.name || row.member || '', t), row.month || '', formatStoredDate(row.dueDate, locale), formatStoredDate(row.actualDate || row.date, locale), formatMoney(row.penaltyAmount || 0), formatMoney(row.amount), row.receiptNumber || row.receipt || '']),
    },
    {
      title: 'Member contribution',
      headers: [ui(t, 'member'), ui(t, 'totalSavings'), ui(t, 'records')],
      rows: Object.values((data.savings || []).reduce((groups, row) => {
        const member = localizedValue(row.member?.name || row.member || 'Unknown', t)
        groups[member] = groups[member] || { member, total: 0, count: 0 }
        groups[member].total += Number(row.amount || 0)
        groups[member].count += 1
        return groups
      }, {})).map((row) => [row.member, formatMoney(row.total), row.count]),
    },
    {
      title: 'Loan report',
      headers: [ui(t, 'loan'), ui(t, 'member'), t.fields.purpose, t.fields.amount, ui(t, 'outstanding'), t.fields.status],
      rows: (data.loans || []).map((row) => [row.loanId || row.id || '', localizedValue(row.member?.name || row.member || '', t), localizedValue(row.purpose || '', t), formatMoney(row.amount), formatMoney(row.outstanding), localizedValue(row.status, t)]),
    },
    {
      title: 'Repayment report',
      headers: [ui(t, 'loan'), ui(t, 'member'), t.fields.date, ui(t, 'amount'), ui(t, 'principal')],
      rows: (data.paymentCollections || []).map((row) => [row.loan?.loanId || row.loan || '', localizedValue(row.member?.name || row.member || '', t), row.receivedDate ? formatStoredDate(row.receivedDate, locale) : '', formatMoney(row.amount || row.principal), formatMoney(row.principal || row.amount)]),
    },
    {
      title: 'Interest report',
      headers: [ui(t, 'loan'), ui(t, 'member'), t.fields.date, ui(t, 'interest')],
      rows: (data.paymentCollections || []).map((row) => [row.loan?.loanId || row.loan || '', localizedValue(row.member?.name || row.member || '', t), row.receivedDate ? formatStoredDate(row.receivedDate, locale) : '', formatMoney(row.interestAmount || row.interest || 0)]),
    },
    {
      title: 'Penalty report',
      headers: [ui(t, 'loan'), ui(t, 'member'), t.fields.date, ui(t, 'penalty')],
      rows: (data.paymentCollections || []).map((row) => [row.loan?.loanId || row.loan || '', localizedValue(row.member?.name || row.member || '', t), row.receivedDate ? formatStoredDate(row.receivedDate, locale) : '', formatMoney(row.penaltyAmount || row.penalty || 0)]),
    },
    {
      title: 'Transaction statement',
      headers: [ui(t, 'transactionId'), t.fields.date, t.fields.type, ui(t, 'direction'), t.fields.amount, ui(t, 'balance'), ui(t, 'member'), ui(t, 'description')],
      rows: (data.transactions || []).map((row) => [row.transactionId || row.id || '', row.date ? formatStoredDate(row.date, locale) : '', localizedValue(row.type, t), localizedStatus(row.direction, t), formatMoney(row.amount || 0), formatMoney(row.balanceAfter ?? row.balance ?? 0), localizedValue(row.member?.name || row.member || '', t), localizedReportDescription(row.description || '', t)]),
    },
    {
      title: 'Balance sheet',
      headers: [ui(t, 'category'), ui(t, 'amount')],
      rows: [['Total savings', formatMoney(data.summary?.totalSavings)], ['Outstanding loans', formatMoney(data.summary?.outstandingLoans)], ['Group balance', formatMoney(data.summary?.groupBalance)], ['Total members', data.summary?.totalMembers || 0]].map(([label, value]) => [localizeReportValue(label, textLang(t)), value]),
    },
    {
      title: 'Financial summary',
      headers: [ui(t, 'category'), ui(t, 'amount')],
      rows: [['Income', formatMoney((data.transactions || []).filter((row) => row.direction === 'credit' || row.type === 'income').reduce((total, row) => total + Number(row.amount || 0), 0))], ['Expenses', formatMoney((data.transactions || []).filter((row) => row.direction === 'debit' || row.type === 'expense').reduce((total, row) => total + Number(row.amount || 0), 0))], ['Savings', formatMoney(data.summary?.totalSavings)], ['Loans outstanding', formatMoney(data.summary?.outstandingLoans)]].map(([label, value]) => [localizeReportValue(label, textLang(t)), value]),
    },
    {
      title: 'Attendance report',
      headers: [ui(t, 'meeting'), ui(t, 'member'), t.fields.date, ui(t, 'attendance'), ui(t, 'note')],
      rows: (data.meetings || []).flatMap((meeting) => (meeting.attendance || []).map((entry) => [localizedValue(meeting.title || '', t), localizedValue(entry.member?.name || entry.member || '', t), meeting.date ? formatStoredDate(meeting.date, locale) : '', entry.present ? ui(t, 'present') : ui(t, 'absent'), localizedValue(entry.note || '', t)])),
    },
    {
      title: 'Goals report',
      headers: [ui(t, 'title'), ui(t, 'targetAmount'), ui(t, 'savedAmount'), ui(t, 'dueDate')],
      rows: (data.goals || []).map((goal) => [goal.title || '', formatMoney(goal.targetAmount), formatMoney(goal.savedAmount), goal.dueDate ? formatStoredDate(goal.dueDate, locale) : '']),
    },
    {
      title: 'Emergency fund report',
      headers: [ui(t, 'category'), ui(t, 'amount')],
      rows: [['Available', formatMoney(data.emergencyFund?.available)], ['Used', formatMoney(data.emergencyFund?.used)], ['Remaining', formatMoney(data.emergencyFund?.available)]],
    },
    {
      title: 'Meetings report',
      headers: [ui(t, 'title'), t.fields.date, t.fields.time, t.fields.location, t.fields.status],
      rows: (data.meetings || []).map((row) => [localizedValue(row.title || '', t), row.date ? formatStoredDate(row.date, locale) : '', row.time || '', localizedValue(row.location || '', t), localizedValue(row.status, t)]),
    },
    {
      title: 'Documents report',
      headers: [ui(t, 'title'), ui(t, 'category'), ui(t, 'description'), t.fields.status],
      rows: (data.documents || []).map((row) => [localizedValue(row.name || '', t), localizedValue(row.category || '', t), localizedValue(row.notes || '', t), localizedValue(row.status || 'Available', t)]),
    },
    {
      title: 'Members report',
      headers: [ui(t, 'memberId'), ui(t, 'member'), t.fields.phone, ui(t, 'totalSavings'), ui(t, 'outstanding'), t.fields.status],
      rows: (data.members || []).map((row) => [row.memberId || '', localizedValue(row.name || '', t), row.phone || '', formatMoney(row.savings), formatMoney(row.loanOutstanding), localizedValue(row.status, t)]),
    },
  ]

  function downloadCsv(report) {
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const lines = report.rows.map((row) => row.map(escape).join(','))
    const blob = new Blob([['\ufeff', report.headers.map(escape).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(data.shg?.shgId || 'shg').toLowerCase()}-${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  function downloadPdf(report) {
    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) return
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
    const rows = report.rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(localizeReportValue(value, textLang(t)))}</td>`).join('')}</tr>`).join('')
    const localizedShgName = localizedValue(data.shg?.name || ui(t, 'shgName'), t)
    const reportTitle = t.reportItems[reports.indexOf(report)] || localizeReportValue(report.title, textLang(t))
    popup.document.write(`<html lang="${textLang(t)}"><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)} - ${escapeHtml(localizedShgName)}</title><style>body{font-family:Arial;color:#17251f;padding:28px}h1{color:#0a6b63}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #cbd8d2;padding:8px;text-align:left;font-size:12px}th{background:#e1f6f2}@media print{button{display:none}}</style></head><body><h1>${escapeHtml(localizedShgName)} - ${escapeHtml(reportTitle)}</h1><p>${escapeHtml(ui(t, 'shgCode'))}: ${escapeHtml(data.shg?.shgId || '')}</p><p>${escapeHtml(ui(t, 'generated'))}: ${escapeHtml(formatStoredDate(new Date(), locale))}</p><table><thead><tr>${report.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${report.headers.length}">${escapeHtml(ui(t, 'noTransactions'))}</td></tr>`}</tbody></table><button onclick="window.print()">${escapeHtml(ui(t, 'printSavePdf'))}</button></body></html>`)
    popup.document.close()
    popup.focus()
    window.setTimeout(() => popup.print(), 250)
  }
  return <Module title={t.modules.reports} t={t} action={<><Button variant="secondary" onClick={() => downloadCsv(reports[8])}>{t.exportCsv}</Button><Button onClick={() => downloadPdf(reports[8])}>{t.exportPdf}</Button></>}><ModuleWorkflow type="reports" t={t} /><div className="feature-grid small">{t.reportItems.map((item, index) => { const report = reports[index]; return <button className="report-card-button" type="button" key={item} onClick={() => downloadPdf(report)}><Card><h3>{item}</h3><p className="muted">{t.reportText}</p><small>{ui(t, 'clickExport')} · PDF</small></Card></button> })}</div></Module>
}

function NotificationPreview({ t, data, setActive }) {
  const recent = Array.from(new Map((data.notifications || []).map((note) => [`${note.title}|${note.message}|${note.type}`, note])).values()).slice(0, 3)
  return <Card className="notification-preview"><div className="module-head"><div><p className="eyebrow">{t.modules.notifications}</p><h3>{ui(t, 'latestNotifications')}</h3></div><Button variant="secondary" onClick={() => setActive('notifications')}>{ui(t, 'viewAllNotifications')}</Button></div>{recent.length ? recent.map((note) => <div className={`notification-preview-row ${note.read ? '' : 'unread-notice'}`} key={note.id}><span className="notification-dot" /><div><strong>{localizedNotification(note.title, t)}</strong><p>{localizedNotification(note.message, t)}</p></div></div>) : <p className="muted">{t.noRecords}</p>}</Card>
}

function Notifications({ role, t, data, openAction }) {
  const uniqueNotifications = (items) => Array.from(new Map((items || []).map((note) => [`${note.title}|${note.message}|${note.type}|${note.member || 'group'}`, note])).values())
  const [notifications, setNotifications] = useState(uniqueNotifications(data.notifications))
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  useEffect(() => {
    setNotifications(uniqueNotifications(data.notifications))
  }, [data.notifications])
  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const latest = await api('/notifications')
        if (!active) return
        setNotifications(uniqueNotifications(latest.map((note) => ({ ...note, id: note._id || note.id }))))
      } catch {
        // The already-loaded dashboard data remains visible if polling is unavailable.
      }
    }
    window.addEventListener('shgms-notifications-updated', refresh)
    window.addEventListener('focus', refresh)
    refresh()
    const timer = window.setInterval(refresh, 15000)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('shgms-notifications-updated', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [permission])
  async function enableBrowserNotifications() {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }
  async function markRead(note) {
    try {
      await api(`/notifications/${note._id || note.id}/read`, { method: 'PATCH' })
      setNotifications((current) => current.map((item) => item.id === (note._id || note.id) ? { ...item, read: true } : item))
    } catch {
      // Keep the notification visible when the server cannot be reached.
    }
  }
  const unread = notifications.filter((note) => !note.read).length
  const notificationTypeOptions = [
    { value: 'announcement', label: ui(t, 'announcement') },
    { value: 'meeting', label: ui(t, 'meeting') },
    { value: 'loan', label: ui(t, 'loan') },
    { value: 'savings', label: ui(t, 'savings') },
    { value: 'group', label: ui(t, 'group') },
  ]
  return <Module title={`${t.modules.notifications}${unread ? ` (${unread})` : ''}`} t={t} action={<><Button variant="secondary" onClick={enableBrowserNotifications} disabled={permission === 'granted'}>{permission === 'granted' ? ui(t, 'browserNotificationsOn') : ui(t, 'enableBrowserNotifications')}</Button>{role === 'admin' && openAction && <Button onClick={() => openAction({ title: ui(t, 'createNotification'), path: '/notifications', fields: [{ name: 'title', label: ui(t, 'title') }, { name: 'message', label: ui(t, 'message') }, { name: 'type', label: ui(t, 'type'), options: notificationTypeOptions }] })}>{ui(t, 'createNotification')}</Button>}</>}><ModuleWorkflow type="meeting" t={t} /><div className="stack">{notifications.length ? notifications.map((note) => <Card key={note.id} className={`notice ${note.read ? '' : 'unread-notice'}`}><Badge tone="warning">{localizedValue(note.type, t)}</Badge><div><h3>{localizedNotification(note.title, t)}</h3><p>{localizedNotification(note.message, t)}</p></div>{!note.read && <Button variant="ghost" onClick={() => markRead(note)}>{ui(t, 'markRead')}</Button>}</Card>) : <EmptyNotice text={t.noRecords} />}</div></Module>
}

function NotificationWatcher() {
  useEffect(() => {
    let active = true
    const user = readStoredJson('unnati_user')
    const storageKey = `shgms-browser-notifications-${user?._id || user?.id || 'anonymous'}`
    async function check() {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      try {
        const latest = await api('/notifications')
        if (!active) return
        const storedSeen = readStoredJson(storageKey, [])
        const seen = Array.isArray(storedSeen) ? storedSeen : []
        const unseen = latest.filter((note) => !note.read && !seen.includes(note._id || note.id))
        unseen.forEach((note) => new Notification(note.title, { body: note.message, tag: note._id || note.id }))
        if (unseen.length) localStorage.setItem(storageKey, JSON.stringify([...seen, ...unseen.map((note) => note._id || note.id)].slice(-100)))
      } catch {
        // Notification polling is best effort; in-app data remains available.
      }
    }
    window.addEventListener('shgms-notifications-updated', check)
    window.addEventListener('focus', check)
    check()
    const timer = window.setInterval(check, 15000)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('shgms-notifications-updated', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return null
}

function Schemes({ role, t, data, openAction }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const schemeFields = (scheme) => [
    { name: 'name', label: ui(t, 'title'), defaultValue: scheme?.name || '' },
    { name: 'description', label: ui(t, 'description'), defaultValue: scheme?.description || '' },
    { name: 'eligibility', label: t.eligibility, required: false, defaultValue: scheme?.eligibility || '' },
    { name: 'source', label: t.officialSource, required: false, defaultValue: scheme?.source || '' },
  ]
  const openSchemePortal = (url) => window.open(url, '_blank', 'noopener,noreferrer')
  const categories = ['All', ...new Set(officialSchemeLinks.map((scheme) => scheme.category))]
  const searchTerm = search.trim().toLowerCase()
  const visibleOfficialLinks = officialSchemeLinks.filter((scheme) => {
    const matchesCategory = category === 'All' || scheme.category === category
    const searchable = `${scheme.name} ${scheme.description} ${scheme.category} ${scheme.eligibility} ${scheme.benefit}`.toLowerCase()
    return matchesCategory && (!searchTerm || searchable.includes(searchTerm))
  })
  const visibleSavedSchemes = (data.schemes || []).filter((scheme) => {
    if (!searchTerm) return true
    return `${scheme.name} ${scheme.description} ${scheme.eligibility}`.toLowerCase().includes(searchTerm)
  })
  return (
    <Module title={t.modules.schemes} t={t} action={role === 'admin' && openAction ? <Button onClick={() => openAction({ title: ui(t, 'createScheme'), path: '/government-schemes', fields: schemeFields() })}>{ui(t, 'createScheme')}</Button> : null}>
      <ModuleWorkflow type="schemes" t={t} onAction={(title) => {
        if (title === 'Government Schemes' || title === 'सरकारी योजनाएं' || title === 'सरकारी योजना') openSchemePortal(officialSchemeLinks[0].url)
        if (title === 'Source Links' || title === 'स्रोत लिंक' || title === 'स्रोत दुवे') openSchemePortal('https://www.myscheme.gov.in/search?query=self%20help%20group')
      }} />
      <Card className="scheme-portal-hero">
        <div>
          <p className="eyebrow">{t.modules.schemes}</p>
          <h2>Find schemes for your Self Help Group</h2>
          <p className="muted">Open the official government directory to compare schemes, eligibility, benefits and state-specific requirements.</p>
        </div>
        <Button onClick={() => openSchemePortal(officialSchemeLinks[0].url)}>{ui(t, 'open')} myScheme</Button>
      </Card>
      <div className="scheme-directory-tools">
        <label className="scheme-search">
          <span>Search schemes</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by scheme, benefit or eligibility" />
        </label>
        <div className="scheme-category-list" aria-label="Scheme categories">
          {categories.map((item) => <Button key={item} variant={category === item ? 'secondary' : 'ghost'} onClick={() => setCategory(item)}>{item}</Button>)}
        </div>
      </div>
      <div className="scheme-results-head">
        <div><h2>Official scheme directory</h2><p className="muted">{visibleOfficialLinks.length} official source{visibleOfficialLinks.length === 1 ? '' : 's'} match your search.</p></div>
        <span className="verified-badge"><Icon name="shield" /> Official source links</span>
      </div>
      {visibleOfficialLinks.length ? <div className="feature-grid small scheme-link-grid">
        {visibleOfficialLinks.map((scheme) => (
          <Card key={scheme.url} className="scheme-link-card">
            <div className="scheme-card-top"><span className="scheme-link-icon"><Icon name="bank" /></span><span className="scheme-category">{scheme.category}</span></div>
            <h3>{scheme.name}</h3>
            <p>{scheme.description}</p>
            <div className="scheme-detail"><span>Eligibility</span><strong>{scheme.eligibility}</strong></div>
            <div className="scheme-detail"><span>Potential support</span><strong>{scheme.benefit}</strong></div>
            <Button variant="ghost" onClick={() => openSchemePortal(scheme.url)}>{ui(t, 'open')} ↗</Button>
          </Card>
        ))}
      </div> : <EmptyNotice text="No official schemes match your search." />}
      <div className="scheme-results-head saved-scheme-heading"><div><h2>Saved scheme references</h2><p className="muted">References saved by your group administrator.</p></div><span className="record-count">{visibleSavedSchemes.length} saved</span></div>
      {visibleSavedSchemes.length ? <div className="feature-grid small">{visibleSavedSchemes.map((scheme) => <Card key={scheme.id || scheme._id || scheme.name}><div className="scheme-card-top"><span className="scheme-link-icon"><Icon name="file" /></span><span className="saved-badge">Saved</span></div><h3>{scheme.name}</h3><p>{scheme.description}</p><p><strong>{t.eligibility}:</strong> {scheme.eligibility || 'Check the official source for current requirements.'}</p>{scheme.source ? <a className="scheme-source-link" href={scheme.source} target="_blank" rel="noreferrer">{t.officialSource} ↗</a> : <span className="muted">No source link saved</span>}</Card>)}</div> : <EmptyNotice text={searchTerm ? 'No saved schemes match your search.' : t.noRecords} />}
      <p className="muted">{t.schemesNote}</p>
    </Module>
  )
}

function Goals({ t, money, data, openAction }) {
  const goals = data.goals || []
  const goalFields = [{ name: 'title', label: ui(t, 'title') }, { name: 'targetAmount', label: ui(t, 'targetAmount'), type: 'number' }, { name: 'dueDate', label: ui(t, 'dueDate'), type: 'date', required: false }]
  return <Module title={t.modules.goals} t={t} action={<Button onClick={() => openAction({ title: ui(t, 'createGoal'), path: '/goals', fields: goalFields })}>{ui(t, 'createGoal')}</Button>}><ModuleWorkflow type="saving" t={t} />{goals.length ? <div className="stack">{goals.map((goal) => <Card key={goal.id || goal._id}><h3>{localizedValue(goal.title, t)}</h3><div className="goal-row"><strong>{money(goal.savedAmount || 0)}</strong><span>{t.labels.savedOf} {money(goal.targetAmount || 0)}</span></div><Progress value={goal.targetAmount ? Math.min(100, ((goal.savedAmount || 0) / goal.targetAmount) * 100) : 0} /><p>{money(Math.max(0, (goal.targetAmount || 0) - (goal.savedAmount || 0)))} {t.labels.remaining}</p><Button variant="secondary" onClick={() => openAction({ title: ui(t, 'contributeGoal'), path: `/goals/${goal._id || goal.id}/contributions`, fields: [{ name: 'amount', label: ui(t, 'amount'), type: 'number' }, { name: 'note', label: ui(t, 'note'), required: false }] })}>{ui(t, 'addContribution')}</Button></Card>)}</div> : <EmptyNotice text={ui(t, 'noGoals')} />}</Module>
}

function EmergencyFund({ t, money, openAction, data }) {
  const fund = data.emergencyFund || {}
  const transactions = [...(fund.transactions || [])].sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0))
  const openTransaction = (type = '') => openAction({
    title: ui(t, 'emergencyTransaction'),
    path: '/emergency-fund/transactions',
    fields: [
      { name: 'type', label: ui(t, 'type'), options: [{ value: 'contribution', label: 'Contribution' }, { value: 'usage', label: 'Usage' }, { value: 'return', label: 'Return' }], defaultValue: type },
      { name: 'amount', label: ui(t, 'amount'), type: 'number' },
      { name: 'date', label: ui(t, 'date'), type: 'date', required: false },
      { name: 'purpose', label: ui(t, 'purpose'), required: false, placeholder: 'Reason or approved use' },
    ],
  })
  const currentAvailable = Number(fund.available || 0)
  const used = Number(fund.used || 0)
  const totalContributed = transactions.filter((row) => row.type === 'contribution').reduce((total, row) => total + Number(row.amount || 0), 0)
  const totalReturned = transactions.filter((row) => row.type === 'return').reduce((total, row) => total + Number(row.amount || 0), 0)
  const totalUsed = transactions.filter((row) => row.type === 'usage').reduce((total, row) => total + Number(row.amount || 0), 0)
  const usedAmount = Math.max(totalUsed, used)
  const totalFund = totalContributed + totalReturned || currentAvailable + usedAmount
  const remaining = Math.max(0, totalFund - usedAmount)
  const typeLabel = { contribution: 'Contribution', usage: 'Usage', return: 'Return' }
  return (
    <Module title={t.modules.emergency} t={t} action={<Button onClick={() => openTransaction()}>{ui(t, 'addTransaction')}</Button>}>
      <ModuleWorkflow type="fund" t={t} onAction={(title) => {
        if (['Emergency Fund', 'आपात निधि', 'आपत्कालीन निधी'].includes(title)) openTransaction('contribution')
        if (['Fund Usage', 'निधि उपयोग', 'निधी वापर'].includes(title)) openTransaction('usage')
        if (['Recovery', 'वसूली', 'वसुली'].includes(title)) openTransaction('return')
      }} />
      <div className="stats-grid compact">
        <StatCard label="Total fund" value={money(totalFund)} hint="Contributions and recovered amounts" icon="✓" />
        <StatCard label={t.labels.used} value={money(usedAmount)} hint={`${transactions.filter((row) => row.type === 'usage').length} usage record${transactions.filter((row) => row.type === 'usage').length === 1 ? '' : 's'}`} icon="-" tone="amber" />
        <StatCard label={t.labels.remainingLabel} value={money(remaining)} hint="Total fund minus used amount" icon="=" />
      </div>
      <div className="fund-metrics">
        <div><span>Total contributed</span><strong>{money(totalContributed)}</strong></div>
        <div><span>Total used</span><strong>{money(totalUsed)}</strong></div>
        <div><span>Total returned</span><strong>{money(totalReturned)}</strong></div>
      </div>
      <Card className="statement-card">
        <div className="module-head"><div><h2>Emergency fund ledger</h2><p className="muted">Every contribution, approved use and recovery is stored in the group record.</p></div><Button variant="secondary" onClick={() => openTransaction()}>{ui(t, 'addTransaction')}</Button></div>
        {transactions.length ? <DataTable t={t} columns={[
          { key: 'date', label: ui(t, 'date') },
          { key: 'type', label: ui(t, 'type'), render: (row) => <Badge tone={row.type === 'usage' ? 'danger' : row.type === 'return' ? 'warning' : 'success'}>{typeLabel[row.type] || row.type}</Badge> },
          { key: 'amount', label: ui(t, 'amount'), render: (row) => money(row.amount) },
          { key: 'purpose', label: ui(t, 'purpose'), render: (row) => row.purpose || '—' },
        ]} rows={transactions.map((row, index) => ({ ...row, id: row._id || `${row.type}-${row.date}-${index}` }))} /> : <EmptyNotice text="No emergency fund transactions recorded yet." />}
      </Card>
    </Module>
  )
}

function Documents({ role, t, data, openAction }) {
  const documents = data.documents || []
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const categories = [
    ['all', 'All documents'],
    ['registration', 'Registration'],
    ['bank', 'Bank'],
    ['meeting', 'Meetings'],
    ['loan', 'Loans'],
    ['government', 'Government'],
    ['other', 'Other'],
  ]
  const documentFields = (document) => [
    { name: 'name', label: 'Document name', defaultValue: document?.name || '' },
    { name: 'category', label: 'Document type', options: categories.slice(1).map(([value, label]) => ({ value, label })), defaultValue: document?.category || 'other' },
    ...(!document ? [{ name: 'file', label: 'Upload PDF or CSV', type: 'file', accept: '.pdf,.csv,application/pdf,text/csv' }] : []),
    { name: 'fileUrl', label: 'File URL', required: false, defaultValue: document?.fileUrl || '' },
    { name: 'notes', label: 'Notes', required: false, defaultValue: document?.notes || '' },
  ]
  const openDocument = (document) => {
    if (document.fileUrl) {
      const apiOrigin = API_BASE.replace(/\/api\/?$/, '')
      const url = document.fileUrl.startsWith('http') ? document.fileUrl : `${apiOrigin}${document.fileUrl}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }
  const term = search.trim().toLowerCase()
  const visibleDocuments = documents.filter((document) => {
    const matchesCategory = category === 'all' || document.category === category
    const searchable = `${document.name} ${document.category} ${document.notes} ${document.mimeType}`.toLowerCase()
    return matchesCategory && (!term || searchable.includes(term))
  })
  const categoryLabel = (value) => categories.find(([key]) => key === value)?.[1] || 'Other'
  const upload = (document) => openAction({ title: document ? 'Edit document' : t.uploadDocument, path: document ? `/documents/${document._id || document.id}` : '/documents/upload', method: document ? 'PATCH' : 'POST', fields: documentFields(document) })
  return (
    <Module title={t.modules.documents} t={t} action={role === 'admin' ? <Button onClick={() => upload()}>{t.uploadDocument}</Button> : null}>
      <ModuleWorkflow type="documents" t={t} onAction={(title) => {
        if (role === 'admin' && (title === 'Upload Document' || title === 'दस्तावेज अपलोड' || title === 'दस्तऐवज अपलोड')) upload()
        if (title === 'Document Type' || title === 'दस्तावेज प्रकार' || title === 'दस्तऐवज प्रकार') setCategory('all')
      }} />
      <div className="document-summary">
        <div><strong>{documents.length}</strong><span>Total documents</span></div>
        <div><strong>{documents.filter((document) => document.fileUrl).length}</strong><span>With file link</span></div>
        <div><strong>{new Set(documents.map((document) => document.category || 'other')).size}</strong><span>Document types</span></div>
      </div>
      <Card className="document-tools">
        <label className="document-search"><span>Search documents</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, type or notes" /></label>
        <div className="document-filters" aria-label="Document type filters">
          {categories.map(([value, label]) => <Button key={value} variant={category === value ? 'secondary' : 'ghost'} onClick={() => setCategory(value)}>{label}</Button>)}
        </div>
      </Card>
      <div className="document-results-head"><div><h2>Group document vault</h2><p className="muted">{visibleDocuments.length} document{visibleDocuments.length === 1 ? '' : 's'} shown</p></div><span className="verified-badge"><Icon name="shield" /> Stored in group records</span></div>
      {visibleDocuments.length ? <div className="feature-grid small document-grid">{visibleDocuments.map((document) => <Card key={document.id || document._id || document.name} className="document-card">
        <div className="document-card-top"><span className="document-icon"><Icon name="file" /></span><span className="document-category">{categoryLabel(document.category)}</span></div>
        <h3>{document.name}</h3>
        <p>{document.notes || 'No notes added for this document.'}</p>
        <div className="document-meta"><span>Added {document.createdAt ? formatStoredDate(document.createdAt, t.moneyLocale) : 'date not available'}</span><span>{document.mimeType || 'Document record'}</span></div>
        <div className="button-row"><Button variant="ghost" onClick={() => openDocument(document)} disabled={!document.fileUrl}>{document.fileUrl ? `${ui(t, 'open')} ↗` : 'No file link'}</Button>{role === 'admin' && <Button variant="secondary" onClick={() => upload(document)}>Edit</Button>}</div>
      </Card>)}</div> : <EmptyNotice text={term || category !== 'all' ? 'No documents match your filter.' : t.noRecords} />}
    </Module>
  )
}

function Insights({ t, data, money }) {
  const [memberFilter, setMemberFilter] = useState('all')
  const transactions = (data.transactions || []).filter((row) => memberFilter === 'all' || String(row.member?._id || row.member) === memberFilter)
  const savings = (data.savings || []).filter((row) => memberFilter === 'all' || String(row.member?._id || row.member) === memberFilter)
  const loans = (data.loans || []).filter((row) => memberFilter === 'all' || String(row.member?._id || row.member) === memberFilter)
  const totalSavings = savings.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const totalCollected = transactions.filter((row) => row.direction === 'credit').reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const totalExpenses = transactions.filter((row) => row.direction === 'debit').reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const outstanding = loans.reduce((sum, row) => sum + Number(row.outstanding || 0), 0)
  const monthTotals = {}
  savings.forEach((row) => {
    const month = String(row.month || row.date || '').slice(0, 7) || 'Unknown'
    monthTotals[month] = (monthTotals[month] || 0) + Number(row.amount || 0)
  })
  const savingsTrend = Object.entries(monthTotals).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([label, value]) => ({ label: label.slice(5) ? `${label.slice(5)}/${label.slice(2, 4)}` : label, value }))
  const loanStatuses = ['active', 'partially_paid', 'overdue', 'completed'].map((status) => ({ label: localizedStatus(status, t), value: loans.filter((loan) => loan.status === status).length }))
  const memberTotals = {}
  savings.forEach((row) => {
    const member = row.member?.name || (typeof row.member === 'string' && !/^[a-f\d]{24}$/i.test(row.member) ? row.member : '') || data.members.find((item) => String(item._id || item.id) === String(row.member))?.name || 'Unknown'
    memberTotals[member] = (memberTotals[member] || 0) + Number(row.amount || 0)
  })
  const topMembers = Object.entries(memberTotals).sort(([, a], [, b]) => b - a).slice(0, 6).map(([label, value]) => ({ label: localizedValue(label.split(' ')[0], t), value }))
  const flowTotals = {}
  transactions.forEach((row) => {
    const month = String(row.date || '').slice(0, 7) || 'Unknown'
    if (!flowTotals[month]) flowTotals[month] = { credit: 0, debit: 0 }
    flowTotals[month][row.direction] = (flowTotals[month][row.direction] || 0) + Number(row.amount || 0)
  })
  const cashFlow = Object.entries(flowTotals).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([label, values]) => ({ label: label.slice(5) ? `${label.slice(5)}/${label.slice(2, 4)}` : label, credit: values.credit, debit: values.debit }))
  const collectionMethods = {}
  ;(data.paymentCollections || []).filter((row) => memberFilter === 'all' || String(row.member?._id || row.member) === memberFilter).forEach((row) => { collectionMethods[row.paymentMethod || 'unknown'] = (collectionMethods[row.paymentMethod || 'unknown'] || 0) + 1 })
  const methods = Object.entries(collectionMethods).map(([label, value]) => ({ label: label.replace('_', ' '), value }))
  const participation = data.members.map((member) => ({ label: member.name.split(' ')[0], value: savings.filter((row) => String(row.member?._id || row.member) === String(member._id || member.id)).length })).sort((a, b) => b.value - a.value).slice(0, 6)
  const riskLoans = loans.filter((loan) => Number(loan.outstanding || 0) > 0).sort((a, b) => Number(b.outstanding || 0) - Number(a.outstanding || 0)).slice(0, 5).map((loan) => ({ label: loan.loanId, value: Number(loan.outstanding || 0), display: money(loan.outstanding || 0) }))
  const cashPosition = [
    { label: ui(t, 'credit'), value: totalCollected, display: money(totalCollected) },
    { label: ui(t, 'debit'), value: totalExpenses, display: money(totalExpenses) },
    { label: ui(t, 'balance'), value: Math.max(0, totalCollected - totalExpenses), display: money(totalCollected - totalExpenses) },
  ]
  return <Module title={t.modules.insights} t={t}>
    <section className="analytics-hero"><div><p className="eyebrow">{ui(t, 'powerBiOverview')}</p><h1>{ui(t, 'analyticsDashboard')}</h1><p>{ui(t, 'analyticsDescription')} {data.shg.name}.</p></div><label className="analytics-filter"><span>{ui(t, 'filterMember')}</span><select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}><option value="all">{ui(t, 'allMembers')}</option>{data.members.map((member) => <option key={member._id || member.id} value={member._id || member.id}>{member.name}</option>)}</select></label></section>
    <div className="analytics-kpis"><StatCard label={t.dashboard.totalSavings} value={money(totalSavings)} hint={`${savings.length} ${ui(t, 'records')}`} icon="wallet" /><StatCard label={ui(t, 'totalReceived')} value={money(totalCollected)} hint={`${transactions.length} ${ui(t, 'records')}`} icon="scale" tone="blue" /><StatCard label={t.dashboard.outstandingLoans} value={money(outstanding)} hint={`${loans.length} ${ui(t, 'loan')}`} icon="loan" tone="amber" /><StatCard label={ui(t, 'balance')} value={money(totalCollected - totalExpenses)} hint={`${ui(t, 'totalExpenses')} ${money(totalExpenses)}`} icon="chart" tone="emerald" /></div>
    <div className="analytics-dashboard-grid">
      <Card className="analytics-panel wide"><div className="analytics-panel-head"><div><h2>{ui(t, 'savingParticipation')}</h2><p className="muted">{ui(t, 'savingEntries')}</p></div><Badge tone="success">{savings.length ? ui(t, 'generated') : ui(t, 'noDataYet')}</Badge></div><MiniChart data={savingsTrend} color="var(--primary)" /></Card>
      <Card className="analytics-panel cash-position-panel"><div className="analytics-panel-head"><div><h2>{ui(t, 'balance')}</h2><p className="muted">{ui(t, 'flow')}</p></div><Badge tone={totalCollected >= totalExpenses ? 'success' : 'danger'}>{totalCollected >= totalExpenses ? ui(t, 'active') : ui(t, 'pending')}</Badge></div><HorizontalBars data={cashPosition} color="#0f8f83" /></Card>
      <div className="analytics-side-stack">
        <Card className="analytics-panel"><div className="analytics-panel-head"><div><h2>{ui(t, 'loan')}</h2><p className="muted">{t.fields.status}</p></div></div><MiniChart data={loanStatuses} color="#2561c8" /></Card>
        <Card className="analytics-panel"><div className="analytics-panel-head"><div><h2>{ui(t, 'memberContribution')}</h2><p className="muted">{ui(t, 'topContributors')}</p></div></div><MiniChart data={topMembers} color="#d28b2d" /></Card>
      </div>
    </div>
    <div className="analytics-chart-grid">
      <Card className="analytics-panel"><div className="analytics-panel-head"><div><h2>{ui(t, 'cashFlowMonth')}</h2><p className="muted">{ui(t, 'creditsDebits')}</p></div></div><div className="dual-bars">{cashFlow.length ? cashFlow.map((item) => <div className="dual-bar-group" key={item.label}><div className="dual-bar-pair"><span title={`${ui(t, 'credit')} ${money(item.credit)}`} style={{ height: `${Math.max(4, item.credit / Math.max(...cashFlow.map((row) => row.credit), 1) * 100)}%`, background: '#0f8f83' }} /><span title={`${ui(t, 'debit')} ${money(item.debit)}`} style={{ height: `${Math.max(4, item.debit / Math.max(...cashFlow.map((row) => row.debit), 1) * 100)}%`, background: '#d14d72' }} /></div><small>{item.label}</small></div>) : <div className="empty-state"><strong>{ui(t, 'noDataYet')}</strong><p>{ui(t, 'addTransactionsCashFlow')}</p></div>}</div><div className="chart-legend"><span><i className="legend-credit" /> {ui(t, 'credit')}</span><span><i className="legend-debit" /> {ui(t, 'debit')}</span></div></Card>
      <Card className="analytics-panel"><div className="analytics-panel-head"><div><h2>{ui(t, 'collectionMethods')}</h2><p className="muted">{ui(t, 'paymentsReceived')}</p></div></div><DonutBreakdown data={methods} /></Card>
      <Card className="analytics-panel"><div className="analytics-panel-head"><div><h2>{ui(t, 'loanRisk')}</h2><p className="muted">{ui(t, 'largestBalances')}</p></div></div><HorizontalBars data={riskLoans} color="#d14d72" /></Card>
      <Card className="analytics-panel"><div className="analytics-panel-head"><div><h2>{ui(t, 'savingParticipation')}</h2><p className="muted">{ui(t, 'savingEntries')}</p></div></div><HorizontalBars data={participation} color="#2561c8" /></Card>
    </div>
    <Card className="analytics-panel"><div className="analytics-panel-head"><div><h2>{ui(t, 'recentActivity')}</h2><p className="muted">{ui(t, 'latestTransactions')}</p></div></div><DataTable t={t} columns={[{ key: 'transactionId', label: ui(t, 'transactionId') }, { key: 'date', label: ui(t, 'date') }, { key: 'type', label: ui(t, 'type') }, { key: 'member', label: ui(t, 'member'), render: (row) => row.member?.name || row.member || t.navGroups.overview }, { key: 'amount', label: ui(t, 'amount'), render: (row) => money(row.amount) }, { key: 'direction', label: ui(t, 'flow'), render: (row) => <Badge tone={row.direction === 'credit' ? 'success' : 'danger'}>{row.direction === 'credit' ? ui(t, 'credit') : ui(t, 'debit')}</Badge> }]} rows={transactions.slice(0, 10)} /></Card>
  </Module>
}

// eslint-disable-next-line no-unused-vars
function Settings({ notify, t }) {
  return <Module title={t.modules.settings} t={t} action={<Button onClick={() => notify(t.toasts.settingsSaved)}>{t.saveSettings}</Button>}><ModuleWorkflow type="settings" t={t} /><div className="form-grid"><Field label={t.form.loanInterest} type="number" placeholder="2" /><Field label={t.form.savingsInterest} type="number" placeholder="0" /><Field label={t.form.latePenalty} type="number" placeholder="50" /></div><p className="muted">{t.settingsNote}</p></Module>
}

function LoanCollection({ t, data, money, openAction, role }) {
  const [selectedPayment, setSelectedPayment] = useState('')
  const x = extra(t)
  const defaultPeriod = getPeriod(data.shg)
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.value)
  const period = { ...defaultPeriod, value: selectedMonth, label: monthLabel(selectedMonth, displayLocale(t.moneyLocale)) }
  const loanCollections = (data.paymentCollections || []).filter((row) => row.paymentType === 'loan_emi')
  const paidLoanIds = new Set(loanCollections
    .filter((row) => recordMonth(row.dueDate) === selectedMonth)
    .map((row) => String(row.loan?._id || row.loan?.id || row.loanId || row.loan)))
  const rows = data.loans
    .filter((loan) => Number(loan.outstanding || 0) > 0 && recordMonth(loan.nextDueDate) === selectedMonth && !paidLoanIds.has(String(loan._id || loan.id)))
    .map((loan) => ({
      ...loan,
      member: loan.memberName || loan.member?.name || data.members.find((member) => String(member._id || member.id) === String(loan.memberId || loan.member))?.name || '—',
      dueDate: loan.nextDueDate,
      status: recordMonth(loan.nextDueDate) < defaultPeriod.value ? 'overdue' : loan.status,
    }))
  const collectionRows = loanCollections
    .filter((row) => row.paymentType === 'loan_emi' && recordMonth(row.receivedDate || row.date) === selectedMonth)
    .map((row) => ({
      ...row,
      member: row.member?.name || row.memberName || data.members.find((member) => String(member._id || member.id) === String(row.member))?.name || '—',
      loanId: row.loan?.loanId || row.loanId || '—',
      dueDate: row.dueDate || row.nextDueDate,
    }))
  const collectionFields = [
    { name: 'paymentType', label: ui(t, 'paymentType'), defaultValue: 'loan_emi', options: [{ value: 'loan_emi', label: ui(t, 'loanEmi') }] },
    { name: 'member', label: ui(t, 'member'), options: data.members.map((member) => ({ value: member._id || member.id, label: member.name })) },
    { name: 'loan', label: ui(t, 'loan'), options: data.loans.filter((loan) => Number(loan.outstanding || 0) > 0).map((loan) => ({ value: loan._id || loan.id, label: `${loan.loanId} - ${loan.memberName || loan.member?.name || '—'}` })) },
    { name: 'amount', label: ui(t, 'amountReceived'), type: 'number' },
    { name: 'interestAmount', label: ui(t, 'interestCollected'), type: 'number', defaultValue: 0 },
    { name: 'dueDate', label: ui(t, 'dueDate'), type: 'date' },
    { name: 'receivedDate', label: ui(t, 'receivedDate'), type: 'date' },
    { name: 'paymentMethod', label: ui(t, 'paymentMethod'), options: ['cash', 'check', 'phonepe', 'upi', 'bank_transfer'] },
    { name: 'reference', label: ui(t, 'referenceCheque'), required: false },
    { name: 'receipt', label: ui(t, 'receiptNumber'), required: false },
  ]
  const openCollection = () => {
    setSelectedPayment('loan_emi')
    openAction({ collection: true, data, paymentType: 'loan_emi', month: period.value, defaultDueDate: rows[0]?.nextDueDate?.slice?.(0, 10), title: ui(t, 'recordLoanEmi'), path: '/payment-collections', fields: collectionFields })
  }
  const collectionActions = role === 'admin' && openAction
    ? <Button variant={selectedPayment === 'loan_emi' ? 'primary' : 'secondary'} active={selectedPayment === 'loan_emi'} onClick={openCollection}>{ui(t, 'collectLoanEmi')}</Button>
    : null
  return <Module title={x.nav.loanCollection} t={t} action={collectionActions}>
    <div className="app-like-header centered-header"><div><MonthPicker value={selectedMonth} onChange={setSelectedMonth} t={t} /><h3>{ui(t, 'monthlyCollections')}</h3><p className="month-pill">{ui(t, 'collectionPeriod')}: {period.label}</p><p>{ui(t, 'latePenaltyAfterDue').replace('{amount}', money(Number(data.shg.latePenaltyAmount || 0)))}</p></div></div>
    <Card className="statement-card"><h2>{ui(t, 'outstandingLoanEmis')}</h2><p className="muted">Loan EMIs due in {period.label} and not yet collected: {rows.length}</p><DataTable t={t} columns={[{ key: 'loanId', label: t.fields.loanId }, { key: 'member', label: t.fields.member }, { key: 'outstanding', label: t.fields.outstanding, render: (row) => money(row.outstanding) }, { key: 'dueDate', label: ui(t, 'dueDateLabel'), render: (row) => formatStoredDate(row.dueDate, displayLocale(t.moneyLocale)) }, { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.status === 'overdue' ? 'danger' : 'warning'}>{localizedValue(row.status, t)}</Badge> }]} rows={rows} /></Card>
    <Card className="statement-card"><h2>{ui(t, 'collectionRegister')}</h2><p className="muted">Loan EMI payments collected in {period.label}: {collectionRows.length}</p><DataTable t={t} columns={[{ key: 'loanId', label: t.fields.loanId }, { key: 'member', label: t.fields.member }, { key: 'dueDate', label: ui(t, 'dueDateLabel'), render: (row) => formatStoredDate(row.dueDate, displayLocale(t.moneyLocale)) }, { key: 'amount', label: ui(t, 'principalReceived'), render: (row) => money(row.amount) }, { key: 'interestAmount', label: ui(t, 'interestLabel'), render: (row) => money(row.interestAmount) }, { key: 'lateDays', label: ui(t, 'lateDays') }, { key: 'penaltyAmount', label: ui(t, 'latePenaltyLabel'), render: (row) => money(row.penaltyAmount) }, { key: 'totalAmount', label: ui(t, 'totalReceived'), render: (row) => money(row.totalAmount) }, { key: 'paymentMethod', label: ui(t, 'methodLabel') }, { key: 'receivedDate', label: ui(t, 'receivedDateLabel'), render: (row) => formatStoredDate(row.receivedDate, displayLocale(t.moneyLocale)) }]} rows={collectionRows} /></Card>
  </Module>
}

function LoanDetails({ t, data, money, role }) {
  const period = getPeriod(data.shg)
  const member = getCurrentMember(data.members)
  const visibleLoans = role === 'admin'
    ? data.loans
    : data.loans.filter((loan) => String(loan.member?._id || loan.member?.id || loan.member) === String(member._id || member.id))
  const collections = data.paymentCollections || []
  const loanRows = visibleLoans.map((loan) => {
    const loanPayments = collections.filter((row) => String(row.loan?.loanId || row.loanId || row.loan) === String(loan.loanId || loan._id || loan.id))
    const principalPaid = Number(loan.principalRepaid || loanPayments.reduce((sum, row) => sum + Number(row.amount || row.principal || 0), 0))
    const interestPaid = Number(loan.interestPaid || loanPayments.reduce((sum, row) => sum + Number(row.interestAmount || row.interest || 0), 0))
    const penaltyPaid = Number(loan.penaltyPaid || loanPayments.reduce((sum, row) => sum + Number(row.penaltyAmount || row.penalty || 0), 0))
    const remaining = Math.max(0, Number(loan.amount || 0) - principalPaid)
    return { ...loan, memberName: loan.memberName || loan.member?.name || data.members.find((item) => String(item._id || item.id) === String(loan.memberId || loan.member))?.name || (role === 'admin' ? '—' : member.name), principalPaid, interestPaid, penaltyPaid, remaining, totalPaid: principalPaid + interestPaid + penaltyPaid, dueDate: loan.nextDueDate || '—' }
  })
  const paidRows = collections.filter((row) => visibleLoans.some((loan) => String(row.loan?.loanId || row.loanId || row.loan) === String(loan.loanId || loan._id || loan.id)))
  return (
    <Module title={navLabel(t, 'loanDetails')} t={t}>
      <div className="app-like-header">
        <div><h3>{role === 'admin' ? `${localizedValue(data.shg.name, t)} — All member loans` : `${localizedValue(member.name, t)} (${ui(t, 'loan')}: ${money(member.loanOutstanding)})`}</h3><p>{ui(t, 'savingMonth')}: {period.label}</p></div>
        <Badge tone={loanRows.some((loan) => loan.remaining > 0) ? 'warning' : 'success'}>{loanRows.length} loan{loanRows.length === 1 ? '' : 's'}</Badge>
      </div>
      <div className="finance-summary-grid">
        <StatCard label="Total sanctioned" value={money(loanRows.reduce((sum, row) => sum + Number(row.amount || 0), 0))} hint={`${loanRows.length} loans`} icon="loan" tone="blue" />
        <StatCard label="Principal paid" value={money(loanRows.reduce((sum, row) => sum + row.principalPaid, 0))} hint="Repayments received" icon="check" />
        <StatCard label="Interest + penalty" value={money(loanRows.reduce((sum, row) => sum + row.interestPaid + row.penaltyPaid, 0))} hint="Additional charges" icon="ledger" tone="amber" />
        <StatCard label="Principal remaining" value={money(loanRows.reduce((sum, row) => sum + row.remaining, 0))} hint="Still to be paid" icon="chart" tone="red" />
      </div>
      <Card className="statement-card">
        <h2>{role === 'admin' ? 'All member loan breakdown' : ui(t, 'loanDetailsTitle')}</h2>
        <DataTable t={t} columns={[
          ...(role === 'admin' ? [{ key: 'memberName', label: t.fields.member }] : []),
          { key: 'loanId', label: ui(t, 'loan') },
          { key: 'amount', label: 'Sanctioned', render: (row) => money(row.amount) },
          { key: 'principalPaid', label: 'Principal paid', render: (row) => money(row.principalPaid) },
          { key: 'interestPaid', label: 'Interest paid', render: (row) => money(row.interestPaid) },
          { key: 'penaltyPaid', label: 'Penalty paid', render: (row) => money(row.penaltyPaid) },
          { key: 'totalPaid', label: 'Total paid', render: (row) => money(row.totalPaid) },
          { key: 'remaining', label: 'Remaining', render: (row) => money(row.remaining) },
          { key: 'dueDate', label: 'Next due date' },
          { key: 'status', label: t.fields.status },
        ]} rows={loanRows} />
      </Card>
      <Card className="statement-card">
        <h2>{role === 'admin' ? 'Repayment and penalty register' : ui(t, 'lastPaidInstallments')}</h2>
        <DataTable t={t} columns={[
          { key: 'receivedDate', label: 'Payment date' },
          { key: 'loan', label: ui(t, 'loan'), render: (row) => row.loan?.loanId || row.loan || '—' },
          ...(role === 'admin' ? [{ key: 'member', label: t.fields.member, render: (row) => row.memberName || row.member?.name || row.member || '—' }] : []),
          { key: 'amount', label: 'Principal paid', render: (row) => money(row.amount || row.principal) },
          { key: 'interestAmount', label: 'Interest', render: (row) => money(row.interestAmount || row.interest) },
          { key: 'penaltyAmount', label: 'Penalty', render: (row) => money(row.penaltyAmount || row.penalty) },
          { key: 'totalAmount', label: 'Total received', render: (row) => money(row.totalAmount || Number(row.amount || row.principal || 0) + Number(row.interestAmount || row.interest || 0) + Number(row.penaltyAmount || row.penalty || 0)) },
        ]} rows={paidRows} />
      </Card>
    </Module>
  )
}

function LoanDemandRisk({ notify, setActive, t, data, money, role }) {
  const totalSavings = (data.savings || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const totalCredits = (data.transactions || []).filter((row) => row.direction === 'credit' || row.type === 'income').reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const totalDebits = (data.transactions || []).filter((row) => row.direction === 'debit' || row.type === 'expense').reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const availableFunds = Math.max(0, totalSavings + totalCredits - totalDebits)
  const riskRows = data.members.slice(0, 5).map((item, index) => {
    const outstanding = Number(item.loanOutstanding || 0)
    const savings = Number(item.savings || 0)
    const ratio = outstanding + savings ? Math.round((outstanding / (outstanding + savings)) * 100) : 0
    return { ...item, index: index + 1, risk: ratio > 50 ? 'YES' : 'NO', ratio: `${ratio}%` }
  })
  const requestRows = (data.loanApplications || []).map((row, index) => ({
    ...row,
    index: index + 1,
    member: row.member?.name || row.member || '—',
    loan: row.amount,
    percent: row.interestRate ? `${row.interestRate}%` : '—',
    date: row.createdAt || row.requestedDate || '—',
    action: row.status || 'pending',
  }))
  return (
    <Module title={navLabel(t, 'loanDemandRisk')} t={t}>
      <div className="app-like-header">
        <div><h3>{ui(t, 'shgName')}: {localizedValue(data.shg.name, t)}</h3><p>{ui(t, 'available')}: <strong>{money(availableFunds)}</strong></p><p>{ui(t, 'askPresidentInterest')}</p></div>
      </div>
      {role !== 'admin' && <Card className="statement-card">
        <h2>{ui(t, 'applyNewLoan')}</h2>
        <p className="muted">{ui(t, 'loanRequestHint')}</p>
        <Button onClick={() => setActive?.('loanApplication')}>{ui(t, 'submitLoanRequest')}</Button>
      </Card>}
      <Card className="statement-card">
        <h2>{ui(t, 'loanRequestList')}</h2>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'member', label: t.fields.member }, { key: 'loan', label: ui(t, 'loan'), render: (row) => money(row.loan) }, { key: 'percent', label: '%' }, { key: 'date', label: t.fields.date }, { key: 'action', label: ui(t, 'actions') }]} rows={requestRows} />
      </Card>
      <Card className="statement-card">
        <h2>{ui(t, 'currentLoanRisk')}</h2>
        <p className="center-text">{ui(t, 'available')}: <strong>{money(availableFunds)}</strong></p>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'name', label: t.fields.member }, { key: 'loanOutstanding', label: ui(t, 'loan'), render: (row) => money(row.loanOutstanding) }, { key: 'ratio', label: '%' }, { key: 'risk', label: ui(t, 'riskExposure'), render: (row) => <Badge tone={row.risk === 'YES' ? 'warning' : 'success'}>{row.risk}</Badge> }]} rows={riskRows} />
      </Card>
    </Module>
  )
}

function MemberBalanceSheet({ notify, t, data, money }) {
  const member = getCurrentMember(data.members)
  const periodValue = getPeriod(data.shg).value
  const [fromDate, setFromDate] = useState(`${periodValue}-01`)
  const [toDate, setToDate] = useState(`${periodValue}-01`)
  const locale = displayLocale(t.moneyLocale)
  const rangeStart = recordMonth(fromDate) <= recordMonth(toDate) ? recordMonth(fromDate) : recordMonth(toDate)
  const rangeEnd = recordMonth(fromDate) <= recordMonth(toDate) ? recordMonth(toDate) : recordMonth(fromDate)
  const selectedPeriodLabel = rangeStart === rangeEnd
    ? monthLabel(rangeStart, locale)
    : `${monthLabel(rangeStart, locale)} – ${monthLabel(rangeEnd, locale)}`
  const totals = {
    savings: member.savings,
    interest: 0,
    penalty: 0,
    deposit: Number(data.shg.depositAmount || 0),
    repayment: 0,
    remainingLoan: member.loanOutstanding,
  }
  const totalCredit = totals.savings + totals.interest + totals.penalty + totals.deposit

  return (
    <Module title={navLabel(t, 'memberBalanceSheet')} t={t} action={<Button variant="secondary">{ui(t, 'downloadBalanceSheet')}</Button>}>
      <div className="finance-summary-grid">
        <StatCard label={ui(t, 'totalSavings')} value={money(totals.savings)} hint={localizedValue(member.name, t)} icon="wallet" />
        <StatCard label={ui(t, 'deposit')} value={money(totals.deposit)} hint={ui(t, 'currentMonth')} icon="plus" tone="blue" />
        <StatCard label={ui(t, 'totalRepaymentLoan')} value={money(totals.repayment)} hint={ui(t, 'records')} icon="loan" tone="amber" />
        <StatCard label={ui(t, 'totalLoanRemains')} value={money(totals.remainingLoan)} hint={ui(t, 'balance')} icon="chart" tone="red" />
      </div>
      <Card className="statement-card balance-sheet-selector finance-filter-card finance-report-card">
        <div className="balance-period-header"><div><span className="eyebrow">MEMBER REPORT PERIOD</span><h2>{ui(t, 'selectMemberDuration')}</h2><p>Choose the member and use the calendars to select the day, month and year.</p></div><span className="balance-period-preview">{selectedPeriodLabel}</span></div>
        <div className="balance-filter-grid">
          <label className="field"><span>{ui(t, 'member')}</span><select defaultValue={member.name}>{data.members.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
          <label className="field"><span>Start date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Member balance sheet start date" /></label>
          <label className="field"><span>End date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Member balance sheet end date" /></label>
        </div>
        <div className="balance-period-actions"><span>Showing: <strong>{selectedPeriodLabel}</strong></span><Button onClick={() => { if (fromDate > toDate) { setFromDate(toDate); setToDate(fromDate) } notify(ui(t, 'balanceSheetGenerated')) }}>{ui(t, 'getBalanceSheet')}</Button></div>
      </Card>

      <Card className="statement-card balance-summary-card finance-report-card">
        <h2>{ui(t, 'memberBalanceSheetTitle')}</h2>
        <p className="center-text">{ui(t, 'member')}: <strong>{localizedValue(member.name, t)}</strong></p>
        <p className="center-text">{ui(t, 'duration')} <strong>{selectedPeriodLabel}</strong></p>
        <div className="statement-lines">
          <div><span>(A) {ui(t, 'totalSavings')}</span><strong>{money(totals.savings)}</strong></div>
          <div><span>(B) {ui(t, 'totalInterest')}</span><strong>{money(totals.interest)}</strong></div>
          <div><span>(C) {ui(t, 'totalPenalty')}</span><strong>{money(totals.penalty)}</strong></div>
          <div><span>(E) {ui(t, 'deposit')}</span><strong>{money(totals.deposit)}</strong></div>
          <div className="total"><span>{ui(t, 'credit')} ({ui(t, 'totalDeposit')}+{ui(t, 'interest')}+{ui(t, 'penalty')}+{ui(t, 'deposit')})</span><strong>{money(totalCredit)}</strong></div>
          <div><span>{ui(t, 'totalRepaymentLoan')}</span><strong>{money(totals.repayment)}</strong></div>
          <div className="total"><span>{ui(t, 'totalLoanRemains')}</span><strong>{money(totals.remainingLoan)}</strong></div>
        </div>
      </Card>

    </Module>
  )
}

function OtherExpense({ t, money, openAction, data }) {
  const x = extra(t)
  const defaultPeriod = getPeriod(data.shg)
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.value)
  const period = { ...defaultPeriod, value: selectedMonth, label: monthLabel(selectedMonth, displayLocale(t.moneyLocale)) }
  const expenseRows = data.transactions.filter((row) => row.type === 'expense' && recordMonth(row.date) === selectedMonth).map((row, index) => ({
    ...row,
    id: row.id || row._id,
    index: index + 1,
    description: row.description || x.nav.otherExpense,
  }))
  const totalExpense = expenseRows.reduce((total, row) => total + Number(row.amount || 0), 0)
  const transactionFields = [
    { name: 'type', label: t.fields.type, defaultValue: 'expense', options: [{ value: 'expense', label: x.nav.otherExpense }] },
    { name: 'direction', label: ui(t, 'direction'), defaultValue: 'debit', options: [{ value: 'debit', label: ui(t, 'debit') }] },
    { name: 'amount', label: ui(t, 'amount'), type: 'number' },
    { name: 'date', label: t.fields.date, type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
    { name: 'description', label: ui(t, 'description'), placeholder: ui(t, 'expenseDescriptionPlaceholder') },
  ]
  return (
    <Module title={x.nav.otherExpense} t={t} action={<Button onClick={() => openAction({ title: ui(t, 'addExpense'), path: '/transactions', fields: transactionFields })}>{ui(t, 'addExpense')}</Button>}>
      <div className="finance-summary-grid"><StatCard label={ui(t, 'totalExpenses')} value={money(totalExpense)} hint={`${expenseRows.length} ${ui(t, 'records')}`} icon="ledger" tone="red" /><StatCard label={ui(t, 'currentMonth')} value={period.label} hint={ui(t, 'dateOnlyEntry')} icon="calendar" /></div><MonthPicker value={selectedMonth} onChange={setSelectedMonth} t={t} />
      <Card className="statement-card finance-filter-card"><div className="module-head"><div><p className="eyebrow">{ui(t, 'expenseRegister')}</p><h2>{ui(t, 'otherExpensePeriod')}</h2></div><Badge tone={expenseRows.length ? 'success' : 'warning'}>{expenseRows.length ? ui(t, 'recordsAvailable') : ui(t, 'noRecords')}</Badge></div><DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'date', label: t.fields.date }, { key: 'description', label: ui(t, 'description') }, { key: 'amount', label: ui(t, 'amount'), render: (row) => money(row.amount) }]} rows={expenseRows} /></Card>
    </Module>
  )
}

function OtherIncome({ t, money, openAction, data }) {
  const x = extra(t)
  const defaultPeriod = getPeriod(data.shg)
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.value)
  const period = { ...defaultPeriod, value: selectedMonth, label: monthLabel(selectedMonth, displayLocale(t.moneyLocale)) }
  const incomeRows = data.transactions.filter((row) => row.type === 'income' && recordMonth(row.date) === selectedMonth).map((row, index) => ({
    ...row,
    id: row.id || row._id,
    index: index + 1,
    description: row.description || 'Income',
    month: row.date || period.label,
  }))
  const totalIncome = incomeRows.reduce((total, row) => total + Number(row.amount || 0), 0)
  const transactionFields = [
    { name: 'type', label: t.fields.type, defaultValue: 'income', options: [{ value: 'income', label: x.nav.otherIncome }] },
    { name: 'direction', label: ui(t, 'direction'), defaultValue: 'credit', options: [{ value: 'credit', label: ui(t, 'credit') }] },
    { name: 'amount', label: ui(t, 'amount'), type: 'number' },
    { name: 'date', label: t.fields.date, type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
    { name: 'description', label: ui(t, 'description'), placeholder: ui(t, 'incomeDescriptionPlaceholder') },
  ]
  return (
    <Module title={x.nav.otherIncome} t={t} action={<Button onClick={() => openAction({ title: ui(t, 'addIncome'), path: '/transactions', fields: transactionFields })}>{ui(t, 'addIncome')}</Button>}>
      <div className="finance-summary-grid"><StatCard label={ui(t, 'totalIncome')} value={money(totalIncome)} hint={`${incomeRows.length} ${ui(t, 'records')}`} icon="wallet" tone="blue" /><StatCard label={ui(t, 'currentMonth')} value={period.label} hint={ui(t, 'dateOnlyEntry')} icon="calendar" /></div><MonthPicker value={selectedMonth} onChange={setSelectedMonth} t={t} />
      <Card className="statement-card finance-filter-card"><div className="module-head"><div><p className="eyebrow">{ui(t, 'incomeRegister')}</p><h2>{ui(t, 'otherIncomePeriod')}</h2></div><Badge tone={incomeRows.length ? 'success' : 'warning'}>{incomeRows.length ? ui(t, 'recordsAvailable') : ui(t, 'noRecords')}</Badge></div><DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'date', label: t.fields.date }, { key: 'description', label: ui(t, 'description') }, { key: 'amount', label: ui(t, 'amount'), render: (row) => money(row.amount) }]} rows={incomeRows} /></Card>
    </Module>
  )
}

function RulesNotice({ t, role, data, openAction, onMutation }) {
  const [activeAction, setActiveAction] = useState('')
  const x = extra(t)
  const content = {
    en: {
      rulesTitle: 'My Self-help Group Rules', noticesTitle: 'My Self-Help Group Notice', rule: 'Rule', notice: 'Notice',
      rules: [
    'Self-help groups are based on democratic principles, so every member of the group will have equal rights.',
    'All members of the group should come together after a fixed period of time and deposit a certain amount in the group as savings. This period will be once a month.',
    'This deposit will be available to the members of the self help group as a loan at a fixed interest rate.',
    'The loan taken by the member will have to be repaid in installments to the self-help group with interest.',
    'The amount of monthly savings, loan decisions, interest rate, repayment rules and related matters will be decided by majority.',
    'In case of delay in monthly savings or loan installment, penalty amount per day will be decided by majority of all members.',
      ],
      notices: [
    'Savings group is a socio-economic activity and is also referred to as a self-help group because members organize and understand each other.',
    'Savings groups do not need to be registered everywhere. Bank account operations should follow member decisions and official bank rules.',
    'Financial provision has been made in government budgets for self-help groups to avail loans from banks.',
    'There is no cost involved in setting up a savings group. This service is completely free.',
    'State and central governments provide financial assistance to such groups at low interest rates.',
    'Government schemes and development support can facilitate easier loan supply for eligible women self-help groups.',
    'Loans given through women self-help groups support social and economic development.',
    'Organized strength and transparent cooperation can create entrepreneurship and contribute to society.',
    'Organizations and NGOs working on self-help groups can support training, records, and market linkage.',
    'Most savings groups charge interest monthly on loans as decided by members.',
    'Digital tools and information technology help self-help groups keep transparent records.',
      ],
    },
    hi: {
      rulesTitle: 'मेरे स्वयं सहायता समूह के नियम', noticesTitle: 'मेरे स्वयं सहायता समूह की सूचना', rule: 'नियम', notice: 'सूचना',
      rules: ['स्वयं सहायता समूह लोकतांत्रिक सिद्धांतों पर आधारित होते हैं, इसलिए हर सदस्य को समान अधिकार मिलते हैं।', 'सभी सदस्य निश्चित अवधि के बाद मिलकर समूह में बचत की राशि जमा करें। यह अवधि महीने में एक बार होगी।', 'यह जमा राशि सदस्यों को निश्चित ब्याज दर पर ऋण के रूप में उपलब्ध होगी।', 'सदस्य द्वारा लिया गया ऋण ब्याज सहित किश्तों में समूह को चुकाना होगा।', 'मासिक बचत, ऋण निर्णय, ब्याज दर और भुगतान नियम बहुमत से तय किए जाएंगे।', 'मासिक बचत या ऋण किश्त में देरी होने पर दैनिक जुर्माना सभी सदस्यों के बहुमत से तय होगा।'],
      notices: ['बचत समूह सामाजिक-आर्थिक गतिविधि है, जिसमें सदस्य एक-दूसरे को समझकर संगठित होते हैं।', 'बचत समूहों को हर जगह पंजीकृत करना आवश्यक नहीं है। बैंक खाते के संचालन में सदस्य निर्णय और बैंक नियमों का पालन करें।', 'सरकारी बजट में स्वयं सहायता समूहों को बैंक ऋण लेने के लिए वित्तीय प्रावधान किए जाते हैं।', 'बचत समूह शुरू करने में कोई शुल्क नहीं है। यह सेवा पूरी तरह निःशुल्क है।', 'राज्य और केंद्र सरकारें ऐसे समूहों को कम ब्याज दर पर वित्तीय सहायता देती हैं।', 'सरकारी योजनाएं पात्र महिला स्वयं सहायता समूहों को ऋण प्राप्त करने में मदद कर सकती हैं।', 'महिला स्वयं सहायता समूहों के ऋण सामाजिक और आर्थिक विकास में सहायक हैं।', 'संगठित शक्ति और पारदर्शी सहयोग से उद्यमिता बढ़ सकती है।', 'स्वयं सहायता समूहों पर काम करने वाले संगठन प्रशिक्षण और बाजार संपर्क में सहायता कर सकते हैं।', 'अधिकांश बचत समूह सदस्यों के निर्णय के अनुसार ऋण पर मासिक ब्याज लेते हैं।', 'डिजिटल उपकरण पारदर्शी रिकॉर्ड रखने में सहायता करते हैं।'],
    },
    mr: {
      rulesTitle: 'माझ्या स्वयं सहाय्यता गटाचे नियम', noticesTitle: 'माझ्या स्वयं सहाय्यता गटाची सूचना', rule: 'नियम', notice: 'सूचना',
      rules: ['स्वयं सहाय्यता गट लोकशाही तत्त्वांवर आधारित असतात, त्यामुळे प्रत्येक सदस्याला समान अधिकार असतात.', 'सर्व सदस्यांनी ठराविक कालावधीनंतर एकत्र येऊन गटात बचत जमा करावी. हा कालावधी महिन्यातून एकदा असेल.', 'ही जमा रक्कम सदस्यांना ठराविक व्याजदराने कर्ज म्हणून उपलब्ध असेल.', 'सदस्याने घेतलेले कर्ज व्याजासह हप्त्यांमध्ये गटाला परत करावे.', 'मासिक बचत, कर्ज निर्णय, व्याजदर आणि परतफेडीचे नियम बहुमताने ठरवले जातील.', 'मासिक बचत किंवा कर्ज हप्ता उशिरा भरल्यास दररोजचा दंड सर्व सदस्यांच्या बहुमताने ठरवला जाईल.'],
      notices: ['बचत गट हा सामाजिक-आर्थिक उपक्रम असून सदस्य एकमेकांना समजून संघटित होतात.', 'बचत गटाची सर्वत्र नोंदणी आवश्यक नाही. बँक खाते चालवताना सदस्यांचे निर्णय आणि बँकेचे नियम पाळावेत.', 'स्वयं सहाय्यता गटांना बँक कर्ज मिळण्यासाठी सरकारी अर्थसंकल्पात आर्थिक तरतूद केली जाते.', 'बचत गट सुरू करण्यासाठी कोणताही खर्च नाही. ही सेवा पूर्णपणे मोफत आहे.', 'राज्य आणि केंद्र सरकार अशा गटांना कमी व्याजदराने आर्थिक मदत करतात.', 'पात्र महिला स्वयं सहाय्यता गटांना सरकारी योजना कर्ज मिळवण्यास मदत करू शकतात.', 'महिला स्वयं सहाय्यता गटांची कर्जे सामाजिक आणि आर्थिक विकासाला मदत करतात.', 'संघटित शक्ती आणि पारदर्शक सहकार्यामुळे उद्योजकता वाढू शकते.', 'स्वयं सहाय्यता गटांवर काम करणाऱ्या संस्था प्रशिक्षण व बाजारपेठ जोडणीस मदत करू शकतात.', 'सदस्यांच्या निर्णयानुसार बहुतेक बचत गट कर्जावर मासिक व्याज आकारतात.', 'डिजिटल साधने पारदर्शक नोंदी ठेवण्यास मदत करतात.'],
    },
  }[textLang(t)]
  const savedRules = (data.ruleNotices || []).filter((item) => item.kind === 'rule' && item.isPublished !== false)
  const savedNotices = (data.ruleNotices || []).filter((item) => item.kind === 'notice' && item.isPublished !== false)
  const ruleRows = [...savedRules, ...content.rules.map((item, index) => ({ id: `default-rule-${index}`, title: `${content.rule} ${index + 1}`, content: item, isDefault: true }))]
  const noticeRows = [...savedNotices, ...content.notices.map((item, index) => ({ id: `default-notice-${index}`, title: `${content.notice} ${index + 1}`, content: item, isDefault: true }))]
  const addEntry = (kind) => {
    setActiveAction(kind)
    openAction({
    title: kind === 'rule' ? 'Add group rule' : 'Add group notice',
    path: '/rule-notices',
    fields: [
      { name: 'kind', label: 'Type', options: [{ value: kind, label: kind === 'rule' ? 'Rule' : 'Notice' }], defaultValue: kind },
      { name: 'title', label: 'Title', placeholder: kind === 'rule' ? 'Rule title' : 'Notice title' },
      { name: 'content', label: 'Details', type: 'textarea', placeholder: 'Write the rule or notice for members' },
    ],
    afterSubmit: onMutation,
    })
  }
  const renderEntries = (items) => <div className="rules-list">{items.map((item, index) => <article key={item.id} className={`rule-item ${item.isDefault ? 'default-rule' : 'custom-rule'}`}><div className="rule-item-head"><strong>{item.title || `${content.rule} ${index + 1}`}</strong>{item.isDefault ? <Badge tone="info">Default</Badge> : <Badge tone="success">Added</Badge>}</div><p>{item.content}</p></article>)}</div>
  return (
    <Module title={x.nav.rulesNotice} t={t} action={role === 'admin' ? <div className="rules-actions"><Button variant="rule-action" active={activeAction === 'rule'} onClick={() => addEntry('rule')}>Add Rule</Button><Button variant="notice-action" active={activeAction === 'notice'} onClick={() => addEntry('notice')}>Add Notice</Button></div> : null}>
      <div className="app-like-header centered-header"><div><h3>{content.rulesTitle}</h3></div></div>
      {renderEntries(ruleRows)}
      <div className="app-like-header centered-header"><div><h3>{content.noticesTitle}</h3></div></div>
      {renderEntries(noticeRows)}
    </Module>
  )
}

function PenaltySettings({ t, data, openAction, setActive }) {
  const x = extra(t)
  function openWorkflow(title) {
    if (title.toLowerCase().includes('language') || title.includes('भाषा')) setActive('settings')
    else if (title.toLowerCase().includes('audit') || title.includes('ऑडिट')) setActive('reports')
    else setActive('rulesNotice')
  }
  const save = () => openAction({
    title: ui(t, 'saveLatePaymentPenalty'),
    path: `/shgs/${data.shg._id || data.shg.id}`,
    method: 'PATCH',
    fields: [{ name: 'latePenaltyAmount', label: ui(t, 'penaltyPerLateDay'), type: 'number', defaultValue: data.shg.latePenaltyAmount ?? 0 }],
  })
  return <Module title={x.nav.penaltySettings} t={t} action={<Button onClick={save}>{t.saveSettings}</Button>}>
    <ModuleWorkflow type="settings" t={t} onAction={openWorkflow} />
    <Card className="settings-explainer"><h3>{ui(t, 'latePaymentPolicy')}</h3><p>{ui(t, 'latePaymentPolicyText')}</p><p className="muted">{ui(t, 'latePaymentExample')}</p></Card>
    <div className="form-grid settings-fields"><Field label={ui(t, 'penaltyPerLateDayCurrency')} type="number" defaultValue={data.shg.latePenaltyAmount ?? 0} readOnly /><label className="field"><span>{ui(t, 'status')}</span><input value={ui(t, 'active')} readOnly /></label></div>
  </Module>
}

function InterestSettings({ t, data, openAction, setActive }) {
  const x = extra(t)
  function openWorkflow(title) {
    if (title.toLowerCase().includes('language') || title.includes('भाषा')) setActive('settings')
    else if (title.toLowerCase().includes('audit') || title.includes('ऑडिट')) setActive('reports')
    else setActive('rulesNotice')
  }
  const save = () => openAction({
    title: ui(t, 'saveLoanInterestRate'),
    path: `/shgs/${data.shg._id || data.shg.id}`,
    method: 'PATCH',
    fields: [{ name: 'loanInterestRate', label: ui(t, 'loanInterestRatePercent'), type: 'number', defaultValue: data.shg.loanInterestRate ?? 0 }],
  })
  return <Module title={x.nav.interestSettings} t={t} action={<Button onClick={save}>{t.saveSettings}</Button>}>
    <ModuleWorkflow type="settings" t={t} onAction={openWorkflow} />
    <Card className="settings-explainer"><h3>{ui(t, 'loanInterestPolicy')}</h3><p>{ui(t, 'loanInterestPolicyText')}</p><p className="muted">{ui(t, 'loanInterestExample')}</p></Card>
    <div className="form-grid settings-fields"><Field label={ui(t, 'loanInterestRatePercent')} type="number" defaultValue={data.shg.loanInterestRate ?? 0} readOnly /><label className="field"><span>{ui(t, 'calculationCycle')}</span><input value={ui(t, 'monthly')} readOnly /></label><label className="field"><span>{ui(t, 'status')}</span><input value={ui(t, 'active')} readOnly /></label></div>
  </Module>
}

function RemoveMember({ members, t, money, openAction }) {
  const x = extra(t)
  function requestRemoval(member) {
    if (!member?._id && !member?.id) return
    openAction({
      title: `${ui(t, 'remove')} ${localizedValue(member.name, t)}`,
      path: `/members/${member._id || member.id}`,
      method: 'DELETE',
      fields: [],
      confirmation: `${ui(t, 'permanentRemove')}: ${localizedValue(member.name, t)}. ${ui(t, 'confirm')}`,
    })
  }
  return <Module title={x.nav.removeMember} t={t}><ModuleWorkflow type="member" t={t} /><DataTable t={t} columns={[{ key: 'memberId', label: t.fields.memberId }, { key: 'name', label: t.fields.name }, { key: 'savings', label: t.fields.savings, render: (row) => money(row.savings) }, { key: 'loanOutstanding', label: t.fields.outstanding, render: (row) => money(row.loanOutstanding) }, { key: 'status', label: t.fields.status, render: (row) => Number(row.loanOutstanding || 0) > 0 ? <Badge tone="warning">{ui(t, 'settleBeforeRemoval')}</Badge> : <Button variant="ghost" onClick={() => requestRemoval(row)}>{ui(t, 'remove')}</Button> }]} rows={members} /></Module>
}

function ShareApp({ t, data, shgCode, shareShgInvite }) {
  const x = extra(t)
  return <Module title={x.nav.shareApp} t={t} action={<Button onClick={shareShgInvite}>{x.shareTitle}</Button>}><Card><h3>{data.shg.name}</h3><p className="muted">{ui(t, 'groupInfo')}: {shgCode}</p><p>{buildShareMessage(data.shg.name, shgCode, t)}</p></Card></Module>
}

function EditRequests({ role, notify, t, data, openAction, onMutation }) {
  const x = extra(t)
  const member = getCurrentMember(data.members)
  const [category, setCategory] = useState('savings')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const categories = [
    { value: 'savings', label: t.fields.savings },
    { value: 'loan', label: ui(t, 'loan') },
    { value: 'attendance', label: ui(t, 'attendance') },
    { value: 'passbook', label: t.modules.passbook },
  ]
  const statusOptions = [
    { value: 'pending', label: ui(t, 'pending') },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' },
  ]
  async function submitRequest(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api('/edit-requests', {
        method: 'POST',
        body: JSON.stringify({ category, reference, description }),
      })
      setReference('')
      setDescription('')
      notify(x.correctionSent)
      await onMutation?.()
    } catch (error) {
      notify(error.message)
    } finally {
      setSaving(false)
    }
  }
  const requests = data.editRequests || []
  return (
    <Module title={x.nav.editRequests || ui(t, 'editRequests')} t={t}>
      <Card className="member-request-card">
        <div>
          <p className="eyebrow">{x.viewOnly || ui(t, 'viewOnly')}</p>
          <h3>{x.requestHint}</h3>
        </div>
      </Card>
      {role === 'admin'
        ? <Card className="statement-card">
          <h2>{x.nav.editRequests}</h2>
          <DataTable t={t} columns={[
            { key: 'memberName', label: ui(t, 'member') },
            { key: 'category', label: t.fields.type, render: (row) => categories.find((item) => item.value === row.category)?.label || row.category },
            { key: 'reference', label: x.receiptOrTransaction },
            { key: 'description', label: ui(t, 'description') },
            { key: 'createdAt', label: t.fields.date, render: (row) => formatStoredDate(row.createdAt, t.moneyLocale) },
            { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.status === 'resolved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{localizedValue(row.status, t)}</Badge> },
            { key: 'adminResponse', label: ui(t, 'decisionNote') },
            { key: 'action', label: ui(t, 'actions'), render: (row) => <Button variant="secondary" onClick={() => openAction({
              title: x.nav.editRequests,
              path: `/edit-requests/${row._id || row.id}`,
              method: 'PATCH',
              fields: [
                { name: 'status', label: t.fields.status, options: statusOptions, defaultValue: row.status || 'pending' },
                { name: 'adminResponse', label: ui(t, 'decisionNote'), required: false, defaultValue: row.adminResponse || '' },
              ],
            })}>Review</Button> },
          ]} rows={requests.map((request) => ({ ...request, id: request._id, memberName: request.member?.name || request.memberName }))} />
        </Card>
        : <>
          <Card className="statement-card">
            <h2>{x.requestCorrection}</h2>
            <form className="form-grid" onSubmit={submitRequest}>
              <label className="field"><span>{t.fields.member}</span><input value={member.name} readOnly /></label>
              <label className="field"><span>{t.fields.type}</span><select value={category} onChange={(event) => setCategory(event.target.value)} required>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="field field-wide"><span>{x.correctionReference}</span><input value={reference} onChange={(event) => setReference(event.target.value)} /></label>
              <label className="field field-wide"><span>{x.correctionDescription}</span><textarea rows="4" value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
              <Button type="submit" disabled={saving}>{saving ? ui(t, 'submitting') : x.requestCorrection}</Button>
            </form>
          </Card>
          <Card className="statement-card">
            <h2>{x.nav.editRequests}</h2>
            <DataTable t={t} columns={[
              { key: 'category', label: t.fields.type, render: (row) => categories.find((item) => item.value === row.category)?.label || row.category },
              { key: 'reference', label: x.receiptOrTransaction },
              { key: 'description', label: ui(t, 'description') },
              { key: 'createdAt', label: t.fields.date, render: (row) => formatStoredDate(row.createdAt, t.moneyLocale) },
              { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.status === 'resolved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{localizedValue(row.status, t)}</Badge> },
              { key: 'adminResponse', label: ui(t, 'decisionNote') },
            ]} rows={requests.map((request) => ({ ...request, id: request._id }))} />
          </Card>
        </>}
    </Module>
  )
}

function Module({ title, action, children, t }) {
  return <div className="stack"><div className="module-head"><div><p className="eyebrow">{t.module}</p><h1>{title}</h1></div><div className="module-actions">{action}</div></div>{children}</div>
}

function App() {
  const storedUser = useMemo(() => readStoredJson('unnati_user'), [])
  const hasStoredSession = Boolean(localStorage.getItem('unnati_token') && storedUser)
  const [screen, setScreen] = useState(hasStoredSession ? 'app' : 'landing')
  const [role, setRole] = useState(storedUser?.role === 'member' ? 'member' : 'admin')
  const [language, setLanguage] = useState(localStorage.getItem('shgms-language') || 'en')
  const [shgCode, setShgCodeState] = useState(localStorage.getItem('shgms-code') || '')
  const [backendData, setBackendData] = useState(null)
  const [backendError, setBackendError] = useState('')
  const t = dictionary[language]
  const data = useLocalizedData(language)
  // Never expose the localized demo rows after authentication while the
  // backend request is still loading (or unavailable).
  const authenticatedFallback = useMemo(() => {
    const user = readStoredJson('unnati_user')
    const userShg = user?.shg && typeof user.shg === 'object' ? user.shg : {}
    return {
      shg: { ...data.shg, ...userShg, name: userShg.name || userShg.shgName || 'Self-Help Group' },
      summary: { totalMembers: 0, totalSavings: 0, activeLoans: 0, outstandingLoans: 0, groupBalance: 0, financialHealth: 0 },
      members: [], savings: [], loans: [], transactions: [], meetings: [], notifications: [],
      goals: [], emergencyFund: null, documents: [], schemes: [], editRequests: [], insights: [],
      ruleNotices: [],
      savingsTrend: [], loanOverview: [], incomeExpense: [], paymentCollections: [], loanApplications: [],
    }
  }, [data])
  const money = useMemo(() => new Intl.NumberFormat(displayLocale(t.moneyLocale), { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format, [t.moneyLocale])

  function changeLanguage(next) {
    setLanguage(next)
    localStorage.setItem('shgms-language', next)
  }

  function setShgCode(nextCode) {
    setShgCodeState(nextCode)
    localStorage.setItem('shgms-code', nextCode)
  }

  function shareShgInvite() {
    const message = buildShareMessage(data.shg.name, shgCode, t)
    navigator.clipboard?.writeText(message)
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  async function loadBackendData(user) {
    if (!user?.shg) return
    try {
      const shgId = user.shg._id || user.shg
      const responses = await Promise.allSettled([
        api(`/shgs/${shgId}`),
        api(`/members?shg=${shgId}`),
        api(`/savings?shg=${shgId}`),
        api(`/loans?shg=${shgId}`),
        api(`/transactions?shg=${shgId}`),
        api(`/meetings?shg=${shgId}`),
        api(`/notifications?shg=${shgId}`),
        api(`/goals?shg=${shgId}`),
        api(`/emergency-fund?shg=${shgId}`),
        api(`/documents?shg=${shgId}`),
        api(`/government-schemes?shg=${shgId}`),
        api(`/reports/summary?shg=${shgId}`),
        api(`/payment-collections?shg=${shgId}`),
        api(`/loan-applications?shg=${shgId}`),
        api(`/rule-notices?shg=${shgId}`),
        api(`/edit-requests?shg=${shgId}`),
      ])
      const failedResponse = responses.find((response) => response.status === 'rejected')
      const unauthorizedResponse = responses.find((response) => response.status === 'rejected' && response.reason?.status === 401)
      setBackendError(
        unauthorizedResponse
          ? unauthorizedResponse.reason.message === 'Session expired. Please log in again.'
            ? unauthorizedResponse.reason.message
            : `Authentication failed: ${unauthorizedResponse.reason.message}. Please log out and log in again.`
          : failedResponse
            ? 'Some records could not be loaded. Check the database connection before entering new data.'
            : '',
      )
      const valueOr = (index, fallback) => responses[index].status === 'fulfilled' ? responses[index].value : fallback
      const shg = valueOr(0, user.shg)
      // Once an authenticated SHG is loaded, missing optional resources must
      // remain empty rather than silently reintroducing demo rows.
      const members = valueOr(1, [])
      const savings = valueOr(2, [])
      const loans = valueOr(3, [])
      const transactions = valueOr(4, [])
      const meetings = valueOr(5, [])
      const notifications = valueOr(6, [])
      const goals = valueOr(7, [])
      const emergencyFund = valueOr(8, null)
      const documents = valueOr(9, [])
      const schemes = valueOr(10, [])
      const paymentCollections = valueOr(12, [])
      const loanApplications = valueOr(13, [])
      const ruleNotices = valueOr(14, [])
      const editRequests = valueOr(15, [])
      const savingsByMonth = savings.reduce((groups, row) => {
        const key = row.month || row.date?.slice?.(0, 7) || 'Unknown'
        groups[key] = (groups[key] || 0) + Number(row.amount || 0)
        return groups
      }, {})
      const income = transactions.filter((row) => row.direction === 'credit' || row.type === 'income').reduce((total, row) => total + Number(row.amount || 0), 0)
      const expense = transactions.filter((row) => row.direction === 'debit' || row.type === 'expense').reduce((total, row) => total + Number(row.amount || 0), 0)
      const totalDistributed = loans.reduce((total, loan) => total + Number(loan.amount || 0), 0)
      const totalOutstanding = loans.reduce((total, loan) => total + Number(loan.outstanding || 0), 0)
      const totalSavings = savings.reduce((total, row) => total + Number(row.amount || 0), 0)
      const groupBalance = transactions.reduce((total, row) => total + (row.direction === 'credit' ? Number(row.amount || 0) : -Number(row.amount || 0)), 0)
      const hasFinancialRecords = savings.length > 0 || loans.length > 0 || transactions.length > 0
      const financialHealth = hasFinancialRecords
        ? Math.max(0, Math.min(100, Math.round(100 - (totalOutstanding / Math.max(totalSavings + income, 1)) * 35)))
        : 0
      setBackendData({
        isBackendData: true,
        backendError: failedResponse ? 'Some records could not be loaded. Check the database connection before entering new data.' : '',
        insights: [],
        summary: {
          totalMembers: members.length,
          totalSavings,
          activeLoans: loans.filter((loan) => ['active', 'approved', 'partially_paid', 'overdue'].includes(loan.status)).length,
          outstandingLoans: totalOutstanding,
          groupBalance,
          financialHealth,
        },
        savingsTrend: Object.entries(savingsByMonth).sort(([left], [right]) => left.localeCompare(right)).map(([label, value]) => ({ label, value })),
        loanOverview: [{ label: 'Given', value: totalDistributed }, { label: 'Repaid', value: Math.max(totalDistributed - totalOutstanding, 0) }, { label: 'Due', value: totalOutstanding }],
        incomeExpense: [{ label: 'Income', value: income }, { label: 'Expense', value: expense }],
        paymentCollections: paymentCollections.map((row) => ({ ...row, id: row._id, memberName: row.member?.name || row.memberName || row.member, loanId: row.loan?.loanId || row.loanId || row.loan })),
        loanApplications: loanApplications.map((row) => ({ ...row, id: row._id })),
        editRequests: editRequests.map((row) => ({ ...row, id: row._id })),
        shg: {
          ...shg,
          president: shg.presidentName || '',
          monthlySavings: shg.monthlySavingsAmount || 0,
          interestRate: shg.loanInterestRate || 0,
          penalty: shg.latePenaltyAmount || 0,
          contact: shg.contactPhone || '',
          village: shg.village || '',
          taluka: shg.taluka || '',
          district: shg.district || '',
          state: shg.state || '',
          bank: shg.bank?.name || '',
        },
        members: members.map((member) => ({
          ...member,
          id: member._id,
          savings: savings.filter((row) => String(row.member?._id || row.member) === String(member._id)).reduce((total, row) => total + Number(row.amount || 0), 0),
          loanOutstanding: loans.filter((loan) => String(loan.member?._id || loan.member) === String(member._id)).reduce((total, loan) => total + Number(loan.outstanding || 0), 0),
        })),
        savings: savings.map((row) => ({ ...row, id: row._id, memberId: row.member?._id || row.memberId, member: row.member?.name || row.member })),
        loans: loans.map((loan) => ({ ...loan, id: loan._id, memberId: loan.member?._id || loan.memberId || loan.member, memberName: loan.member?.name || loan.memberName || (members.find((item) => String(item._id) === String(loan.member?._id || loan.member))?.name) || '—' })),
        transactions: transactions.map((row) => ({ ...row, id: row._id, balance: row.balanceAfter, member: row.member?.name || row.member })),
        meetings: meetings.map((row) => ({ ...row, id: row._id })),
        notifications: notifications.map((row) => ({ ...row, id: row._id })),
        ruleNotices: ruleNotices.map((row) => ({ ...row, id: row._id })),
        goals: goals.map((row) => ({ ...row, id: row._id })),
        emergencyFund,
        documents: documents.map((row) => ({ ...row, id: row._id })),
        schemes: schemes.map((row) => ({
          ...row,
          id: row._id,
          eligibility: row.eligibility || row.eligibilityCriteria || '',
        })),
      })
    } catch (error) {
      console.error('Unable to load backend records:', error)
      setBackendError('Unable to load SHG records. Check that the backend and database are running.')
    }

  }

  function refreshBackendData() {
    const user = JSON.parse(localStorage.getItem('unnati_user') || 'null')
    return loadBackendData(user)
  }

  useEffect(() => {
    if (!hasStoredSession) return
    loadBackendData(storedUser)
  }, [hasStoredSession, storedUser])

  if (screen === 'landing') return <Landing onEnter={() => setScreen('auth')} language={language} changeLanguage={changeLanguage} t={t} data={data} money={money} />
  if (screen === 'auth') return <AuthScreen onLogin={(nextRole, user) => { setRole(nextRole); setScreen('app'); loadBackendData(user) }} language={language} changeLanguage={changeLanguage} t={t} setShgCode={setShgCode} />
  return <Shell role={role} onLogout={() => { localStorage.removeItem('unnati_token'); localStorage.removeItem('unnati_user'); setBackendData(null); setBackendError(''); setScreen('landing') }} onMutation={refreshBackendData} language={language} changeLanguage={changeLanguage} t={t} data={backendData ? { ...backendData, backendError } : { ...authenticatedFallback, backendError }} money={money} shgCode={shgCode} shareShgInvite={shareShgInvite} />
}

export default App
