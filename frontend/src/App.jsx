import { useMemo, useState } from 'react'
import './App.css'
import { dictionary } from './locales'
import { demoData } from './data/demoData'

const navGroups = [
  { key: 'overview', items: ['dashboard', 'profile', 'notifications'] },
  { key: 'finance', items: ['savings', 'loanCollection', 'loanDetails', 'loanDemandRisk', 'loans', 'ledger', 'otherExpense', 'otherIncome', 'passbook', 'monthly', 'memberBalanceSheet', 'balance'] },
  { key: 'management', items: ['members', 'removeMember', 'rulesNotice', 'meetings', 'attendance', 'goals', 'emergency', 'documents'] },
  { key: 'reports', items: ['calculationReport', 'reports', 'insights', 'schemes', 'penaltySettings', 'interestSettings', 'shareApp', 'settings'] },
]

const memberNavGroups = [
  { key: 'overview', items: ['dashboard', 'profile', 'notifications'] },
  { key: 'finance', items: ['passbook', 'savings', 'loanDetails', 'loanDemandRisk', 'loans', 'ledger', 'monthly', 'memberBalanceSheet', 'balance'] },
  { key: 'management', items: ['meetings', 'attendance', 'documents', 'editRequests'] },
  { key: 'reports', items: ['calculationReport', 'reports', 'insights', 'schemes', 'settings'] },
]

const icons = {
  dashboard: 'chart', profile: 'profile', notifications: 'bell', savings: 'wallet', loans: 'loan',
  ledger: 'ledger', passbook: 'book', monthly: 'calendar', balance: 'scale', members: 'users',
  meetings: 'meeting', attendance: 'calendar', goals: 'target', emergency: 'shield', documents: 'folder', reports: 'file',
  insights: 'spark', calculationReport: 'chart', schemes: 'bank', settings: 'settings',
  loanCollection: 'calendar', otherExpense: 'ledger', otherIncome: 'wallet', rulesNotice: 'bell',
  penaltySettings: 'settings', interestSettings: 'settings', removeMember: 'users', shareApp: 'spark',
  editRequests: 'file', loanDetails: 'book', loanDemandRisk: 'loan', memberBalanceSheet: 'scale',
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

function BrandMark({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'compact-brand' : ''}`}>
      <img src="/unnati-logo.svg" alt="Unnati logo" />
      <b>Unnati : Swayam Sahyta gat</b>
    </div>
  )
}

const advancedMetrics = {
  repaymentRate: 74,
  collectionEfficiency: 91,
  auditReadiness: 88,
  memberRetention: 96,
  riskExposure: 18,
  digitalCoverage: 84,
}

const workflowQueue = [
  ['Loan verification', '2 applications need guarantor validation', 'high'],
  ['Savings posting', '12 member entries ready for batch confirmation', 'medium'],
  ['Meeting minutes', 'August resolution pending digital signature', 'low'],
]

const repaymentCalendar = [
  ['This week', 3, 'Due'],
  ['Next week', 5, 'Scheduled'],
  ['Overdue', 1, 'Critical'],
]

const featureIconOrder = ['wallet', 'loan', 'book', 'file', 'spark', 'meeting', 'bank', 'folder']
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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
  },
}

function textLang(t) {
  if (t.moneyLocale === 'hi-IN') return 'hi'
  if (t.moneyLocale === 'mr-IN') return 'mr'
  return 'en'
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

function buildShareMessage(groupName, shgCode) {
  const memberCode = shgCode.replace('SHG', 'BG')
  return `Self-Help Group Name: ${groupName}
Self-Help Group Code: ${shgCode}
Our Self-Help Group is registered on the Self-Help Group App to bring good governance and transparency in all financial transactions of our Self-Help Group.
Self-Help Group Download Link: https://play.google.com/store/apps/details?id=com.BachatGat.SelfHelpGroup
Please download Self-Help Group App by clicking on the link above, then find our self-help group by entering SHG code: ${memberCode} and Login by selecting your name.
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
    settings: [['समूह नियम', 'बचत राशि, ब्याज, जुर्माना और दंड सेटिंग', 'settings'], ['भाषा', 'English, Marathi या Hindi लेबल उपयोग करें', 'spark'], ['ऑडिट ट्रेल', 'वित्तीय रिकॉर्ड पोस्ट करने से पहले बदलाव ट्रैक करें', 'shield']],
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
    settings: [['गट नियम', 'बचत रक्कम, व्याज, दंड आणि पेनल्टी सेटिंग', 'settings'], ['भाषा', 'English, Marathi किंवा Hindi लेबल वापरा', 'spark'], ['ऑडिट ट्रेल', 'आर्थिक नोंदी पोस्ट करण्यापूर्वी बदल ट्रॅक करा', 'shield']],
    schemes: [['सरकारी योजना', 'अधिकृत SHG योजना माहिती पहा', 'bank'], ['पात्रता', 'दस्तऐवज आणि पात्रता आवश्यकता तपासा', 'folder'], ['स्रोत लिंक', 'सत्यापित सरकारी स्रोत URL उघडा', 'file']],
    documents: [['दस्तऐवज अपलोड', 'नोंदणी, बँक आणि बैठक दस्तऐवज ठेवा', 'folder'], ['दस्तऐवज प्रकार', 'जलद शोधासाठी दस्तऐवज वर्गीकृत करा', 'file'], ['पडताळणी', 'ऑडिटसाठी दस्तऐवज स्थिती तयार ठेवा', 'shield']],
    fund: [['आपत्कालीन निधी', 'तातडीच्या मदतीसाठी राखीव निधी ट्रॅक करा', 'shield'], ['निधी वापर', 'मंजूर आपत्कालीन वापर नोंदवा', 'wallet'], ['वसुली', 'शिल्लक आणि वसुली पाहा', 'scale']],
  },
}

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

function Button({ children, variant = 'primary', onClick, type = 'button' }) {
  return <button type={type} className={`btn ${variant}`} onClick={onClick}>{children}</button>
}

function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>
}

function EmptyNotice({ text }) {
  return <Card className="statement-empty"><strong>{text}</strong></Card>
}

function StatCard({ label, value, hint, icon, tone = 'emerald' }) {
  return (
    <Card className="stat-card">
      <div className={`stat-icon ${tone}`}>{pathMap[icon] ? <Icon name={icon} /> : icon}</div>
      <div>
        <p className="muted">{label}</p>
        <strong>{value}</strong>
        {hint && <span>{hint}</span>}
      </div>
    </Card>
  )
}

function Progress({ value }) {
  return <div className="progress"><span style={{ width: `${Math.min(value, 100)}%` }} /></div>
}

function Donut({ value, label }) {
  return (
    <div className="donut" style={{ '--value': `${Math.min(value, 100) * 3.6}deg` }}>
      <div><strong>{value}%</strong><span>{label}</span></div>
    </div>
  )
}

function MetricStrip({ items }) {
  return <div className="metric-strip">{items.map(([label, value, tone]) => <div key={label} className={tone}><span>{label}</span><strong>{value}</strong></div>)}</div>
}

function MiniChart({ data, color = 'var(--primary)' }) {
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

function DataTable({ columns, rows, t, emptyAction }) {
  if (!rows.length) {
    return <div className="empty-state"><strong>{t.noRecords}</strong><p>{t.addFirst}</p>{emptyAction}</div>
  }

  const visibleRows = rows.length >= 5
    ? rows
    : [
      ...rows,
      ...Array.from({ length: 5 - rows.length }, (_, index) => ({
        id: `blank-${index}`,
        __blank: true,
      })),
    ]

  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => <td key={column.key} data-label={column.label}>{row.__blank ? '-' : column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function workflowLanguage(t) {
  if (t.moneyLocale === 'hi-IN') return 'hi'
  if (t.moneyLocale === 'mr-IN') return 'mr'
  return 'en'
}

function ModuleWorkflow({ type, t }) {
  const lang = workflowLanguage(t)
  const items = moduleWorkflowText[lang][type] || moduleWorkflowText.en[type] || []
  return (
    <div className="module-workflow">
      {items.map(([title, detail, icon]) => (
        <button className="workflow-tile" type="button" key={title}>
          <span><Icon name={icon} /></span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </button>
      ))}
    </div>
  )
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
        <BrandMark />
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

function AuthScreen({ onLogin, language, changeLanguage, t, shgCode: activeShgCode, setShgCode: saveShgCode }) {
  const [mode, setMode] = useState('login')
  const localizedData = useLocalizedData(language)
  const [shgCode, setShgCode] = useState('')
  const [searchedShg, setSearchedShg] = useState('')
  const [authHint, setAuthHint] = useState('')
  const [loginRole, setLoginRole] = useState('member')
  const [registerRole, setRegisterRole] = useState('president')
  const [selectedMember, setSelectedMember] = useState(localizedData.members[0]?.name || '')
  const copy = authScreenText[language] || authScreenText.en
  const x = extra(t)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const years = ['2026', '2025', '2024', '2023', '2022']

  function searchShg() {
    const normalized = shgCode.trim().toUpperCase()
    if (normalized && (normalized === activeShgCode || normalized === activeShgCode.replace('SHG', 'BG'))) {
      setSearchedShg(localizedData.shg.name)
      setAuthHint(x.codeFound)
    } else {
      setSearchedShg('')
      setAuthHint(x.codeMissing)
    }
  }

  async function submitAuth(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (mode === 'register') {
      if (registerRole === 'president') {
        const nextCode = activeShgCode || makeShgCode()
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
          await postAuth('register-president', payload)
          saveShgCode(nextCode)
        } catch (error) {
          saveShgCode(nextCode)
          setAuthHint(`${error.message}. Demo login opened with code: ${nextCode}`)
        }
        setAuthHint(`${x.codeGenerated}: ${nextCode}. Please login with this SHG code.`)
        setMode('login')
        setLoginRole('president')
        setShgCode(nextCode)
      } else {
        const payload = {
          name: `${form.get('memberTitle') || ''} ${form.get('memberName') || ''}`.trim(),
          phone: form.get('memberPhone'),
          email: form.get('memberEmail') || `${form.get('memberPhone')}@unnati-member.local`,
          password: form.get('password'),
          language,
        }
        try {
          await postAuth('register-member', payload)
        } catch (error) {
          setAuthHint(`${error.message}. Demo member registration completed.`)
        }
        setAuthHint('Member registered successfully. Now login with SHG code shared by president.')
        setMode('login')
        setLoginRole('member')
        setSelectedMember(payload.name)
      }
      return
    }
    if (!searchedShg) {
      searchShg()
      return
    }
    try {
      await postAuth('login-shg', {
        shgCode: shgCode.trim().toUpperCase(),
        role: loginRole,
        name: loginRole === 'president' ? localizedData.shg.president : selectedMember,
        password: form.get('password'),
      })
    } catch (error) {
      setAuthHint(`${error.message}. Demo login opened.`)
    }
    onLogin(loginRole === 'president' ? 'admin' : 'member')
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
              <AuthRow label={copy.shgCode}><div className="shg-search-row"><input value={shgCode} onChange={(event) => setShgCode(event.target.value)} placeholder={localizedData.shg.shgId} required /><button type="button" onClick={searchShg}>{copy.search}</button></div></AuthRow>
              <AuthRow label={copy.shgName}><input value={searchedShg} onChange={(event) => setSearchedShg(event.target.value)} placeholder={copy.shgNameHint} /></AuthRow>
              <AuthRow label={x.loginAs || 'Login As:'}><select value={loginRole} onChange={(event) => setLoginRole(event.target.value)} required><option value="member">{x.member || 'Member'}</option><option value="president">{x.president || 'President'}</option></select></AuthRow>
              {loginRole === 'member' && <AuthRow label={copy.member}><><input list="member-login-list" value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)} placeholder={copy.fullName} required /><datalist id="member-login-list">{localizedData.members.map((member) => <option key={member.id} value={member.name} />)}</datalist></></AuthRow>}
              {loginRole === 'president' && <AuthRow label={x.president || 'President'}><input value={localizedData.shg.president} readOnly /></AuthRow>}
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
                  <AuthRow label={copy.presidentName}><div className="shg-name-row"><select name="presidentTitle"><option>Mr</option><option>Mrs</option><option>Ms</option></select><input name="presidentName" placeholder={copy.fullName} required /></div></AuthRow>
                  <AuthRow label={copy.presidentMob}><input name="presidentPhone" type="tel" required /></AuthRow>
                  <AuthRow label={copy.presidentEmail}><input name="presidentEmail" type="email" /></AuthRow>
                  <AuthRow label={copy.setPassword}><input name="password" type="password" required /></AuthRow>
                </>
              ) : (
                <>
                  <AuthRow label={copy.member}><div className="shg-name-row"><select name="memberTitle"><option>Mrs</option><option>Ms</option><option>Mr</option></select><input name="memberName" placeholder={copy.fullName} required /></div></AuthRow>
                  <AuthRow label="Member Mobile:"><input name="memberPhone" type="tel" required /></AuthRow>
                  <AuthRow label="Member E-mail:"><input name="memberEmail" type="email" /></AuthRow>
                  <AuthRow label={copy.setPassword}><input name="password" type="password" required /></AuthRow>
                </>
              )}
            </>
          )}

          {mode === 'login' && <button className="forgot-code" type="button">{copy.forgotCode}</button>}
          {authHint && <p className="auth-hint">{authHint}</p>}
          <div className="shg-submit-band">
            <button className="shg-submit" type="submit">{mode === 'login' ? copy.login : registerRole === 'president' ? copy.registerButton : 'Register Member'}</button>
          </div>
        </form>

        <p className="shg-terms">{copy.terms}<br /><strong>{copy.privacy}</strong> {copy.and} <strong>{copy.conditions}</strong></p>

        {mode === 'register' && (
          <ul className="shg-old-note">
            <li><strong>{copy.oldTitle}</strong></li>
            {copy.oldInfo.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}

        <nav className="shg-auth-bottom">
          <button type="button" className="active">{copy.home}</button>
          <button type="button">{copy.about}</button>
          <button type="button">{copy.contact}</button>
          <button type="button" className="share">{copy.share}</button>
        </nav>
      </section>
    </main>
  )
}

function AuthRow({ label, children }) {
  return <div className="shg-auth-row"><label>{label}</label><div>{children}</div></div>
}

function Field({ label, type = 'text', placeholder }) {
  return <label className="field"><span>{label}</span><input type={type} placeholder={placeholder} required /></label>
}

function Shell({ role, onLogout, language, changeLanguage, t, data, money, shgCode, shareShgInvite }) {
  const [active, setActive] = useState('dashboard')
  const [easyMode, setEasyMode] = useState(localStorage.getItem('shgms-easy') === 'true')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(false)

  function toggleEasyMode() {
    setEasyMode((current) => {
      localStorage.setItem('shgms-easy', String(!current))
      return !current
    })
  }

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const filteredMembers = useMemo(() => data.members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase()) || member.memberId.toLowerCase().includes(query.toLowerCase())), [data.members, query])
  const visibleNavGroups = role === 'admin' ? navGroups : memberNavGroups

  return (
    <div className={`app-shell ${easyMode ? 'easy-mode' : ''}`}>
      <aside className="sidebar">
        <BrandMark />
        <div className="sidebar-profile">
          <strong>{data.shg.name}</strong>
          <span>{role === 'admin' ? 'Admin Console' : 'Member Portal'}</span>
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
          <div><p className="eyebrow">{data.shg.village}, {data.shg.district}</p><h2>{navLabel(t, active)}</h2></div>
          <div className="top-actions">
            <input className="search" placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} />
            <LanguageSelect language={language} changeLanguage={changeLanguage} t={t} />
            <label className="switch"><input type="checkbox" checked={easyMode} onChange={toggleEasyMode} />{t.easy}</label>
            <Button variant="ghost" onClick={onLogout}>{t.logout}</Button>
          </div>
        </header>
        <main className="content"><View active={active} role={role} setActive={setActive} notify={notify} members={filteredMembers} t={t} data={data} money={money} shgCode={shgCode} shareShgInvite={() => { shareShgInvite(); notify(extra(t).shareOpen) }} /></main>
      </div>
      <nav className="mobile-nav">{['dashboard', 'savings', 'members', 'reports', 'profile'].map((item) => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}><span><Icon name={icons[item]} /></span>{navLabel(t, item)}</button>)}</nav>
      <button className="assistant-fab" onClick={() => setAssistantOpen(true)} aria-label={t.voice.open}><Icon name="spark" /></button>
      {assistantOpen && <VoiceAssistant language={language} setActive={setActive} close={() => setAssistantOpen(false)} notify={notify} t={t} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function View({ active, role, setActive, notify, members, t, data, money, shgCode, shareShgInvite }) {
  const shared = { role, setActive, notify, members, t, data, money, shgCode, shareShgInvite }
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
  }
  return views[active] || (role === 'admin' ? <Dashboard {...shared} /> : <MemberDashboard {...shared} />)
}

function MemberDashboard({ setActive, t, data, money }) {
  const member = data.members[0]
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
        <StatCard label={t.labels.loanTaken} value={money(20000)} hint={t.dashboard.activeLoansHint} icon="loan" tone="blue" />
        <StatCard label={t.labels.amountRepaid} value={money(9200)} hint={t.dashboard.repaymentHint} icon="scale" />
        <StatCard label={t.fields.outstanding} value={money(member.loanOutstanding)} hint={t.dashboard.pendingHint} icon="bell" tone="amber" />
      </div>
      <Card className="member-request-card">
        <div>
          <p className="eyebrow">{x.requestCorrection || 'Send Correction Request'}</p>
          <h3>{x.requestHint || 'If any entry is wrong, send a request to the president.'}</h3>
        </div>
        <Button onClick={() => setActive('editRequests')}>{x.requestCorrection || 'Send Correction Request'}</Button>
      </Card>
      <div className="analytics-grid">
        <Card><h3>{t.modules.passbook}</h3><p className="muted">{t.labels.memberName}: {member.name}</p><Progress value={82} /></Card>
        <Card><h3>{t.modules.savings}</h3><MiniChart data={data.savingsTrend} /></Card>
        <Card><h3>{t.modules.loans}</h3><MiniChart data={data.loanOverview} color="var(--info)" /></Card>
      </div>
      <Ledger t={t} data={data} money={money} />
    </div>
  )
}

function Dashboard({ role, setActive, t, notify, data, money, shgCode, shareShgInvite }) {
  const summary = data.summary
  const x = extra(t)
  return (
    <div className="stack">
      <section className="welcome">
        <div>
          <p className="eyebrow">Command center</p>
          <h1>{t.dashboard.greeting}, {data.shg.president}</h1>
          <p>{data.shg.name} • {data.shg.shgId}</p>
        </div>
        <div className="welcome-score">
          <Donut value={summary.financialHealth} label={t.healthy} />
          <Badge tone="success">{t.dashboard.healthBadge}</Badge>
        </div>
      </section>
      <MetricStrip items={[
        ['Collection efficiency', `${advancedMetrics.collectionEfficiency}%`, 'good'],
        ['Audit readiness', `${advancedMetrics.auditReadiness}%`, 'good'],
        ['Risk exposure', `${advancedMetrics.riskExposure}%`, 'warn'],
        ['Digital coverage', `${advancedMetrics.digitalCoverage}%`, 'info'],
      ]} />
      <div className="stats-grid">
        <StatCard label={t.dashboard.totalMembers} value={summary.totalMembers} hint={t.dashboard.activeMembers} icon="users" />
        <StatCard label={t.dashboard.totalSavings} value={money(summary.totalSavings)} hint={t.dashboard.savingsHint} icon="wallet" />
        <StatCard label={t.dashboard.activeLoans} value={summary.activeLoans} hint={t.dashboard.activeLoansHint} icon="loan" tone="blue" />
        <StatCard label={t.dashboard.outstandingLoans} value={money(summary.outstandingLoans)} hint={t.dashboard.repaymentHint} icon="bell" tone="amber" />
        <StatCard label={t.dashboard.groupBalance} value={money(summary.groupBalance)} hint={t.dashboard.balanceHint} icon="scale" />
        <StatCard label={t.dashboard.pendingInstallments} value="3" hint={t.dashboard.pendingHint} icon="calendar" tone="red" />
      </div>
      <div className="quick-actions">{t.dashboard.quick.map(([label, target, message]) => <Button key={label} variant="secondary" onClick={() => { setActive(target); notify(message) }}>{label}</Button>)}</div>
      {role === 'admin' && (
        <Card className="president-panel">
          <div className="module-head">
            <div>
              <p className="eyebrow">{x.groupCard}</p>
              <h3>{data.shg.name} [ SHG Code: {shgCode} ]</h3>
              <p className="muted">{data.shg.president} (President)</p>
            </div>
            <Button onClick={shareShgInvite}>{x.shareTitle}</Button>
          </div>
          <div className="president-meta">
            <button type="button">{x.viewInfo}</button>
            <button type="button">{x.enterInfo}</button>
            <span>{x.savingMonth}: Aug 2026</span>
            <strong>{x.changeStartMonth}</strong>
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
          <div className="module-head"><div><p className="eyebrow">Priority queue</p><h3>Operational approvals</h3></div><Badge tone="warning">6 pending</Badge></div>
          <div className="queue-list">{workflowQueue.map(([title, detail, tone]) => <div key={title}><Badge tone={tone === 'high' ? 'danger' : tone === 'medium' ? 'warning' : 'success'}>{tone}</Badge><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
        </Card>
        <Card className="ops-card">
          <div className="module-head"><div><p className="eyebrow">Repayment monitor</p><h3>Installment calendar</h3></div><Icon name="calendar" /></div>
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

function Members({ members, notify, t, money }) {
  const averageSavings = Math.round(members.reduce((total, member) => total + member.savings, 0) / Math.max(members.length, 1))
  return <Module title={t.modules.members} t={t} action={<Button onClick={() => notify(t.toasts.memberForm)}>{t.modules.addMember}</Button>}><ModuleWorkflow type="member" t={t} /><MetricStrip items={[['KYC completion', '93%', 'good'], ['Avg savings/member', money(averageSavings), 'info'], ['Members with dues', members.filter((member) => member.loanOutstanding > 0).length, 'warn']]} /><DataTable t={t} columns={[{ key: 'memberId', label: t.fields.memberId }, { key: 'name', label: t.fields.name }, { key: 'phone', label: t.fields.phone }, { key: 'savings', label: t.fields.savings, render: (row) => money(row.savings) }, { key: 'loanOutstanding', label: t.fields.outstanding, render: (row) => money(row.loanOutstanding) }, { key: 'status', label: t.fields.status, render: (row) => <Badge tone="success">{row.status}</Badge> }]} rows={members} /></Module>
}

function Savings({ notify, t, data, money }) {
  const savingsPerMonth = 2000
  const pendingRows = data.members.slice(0, 5).map((member, index) => ({
    id: `sr-${member.id}`,
    index: index + 1,
    member: member.name,
    saving: savingsPerMonth,
    penalty: index === 2 ? 50 : 0,
  }))
  return (
    <Module title={t.modules.savings} t={t} action={<Button onClick={() => notify(t.toasts.savingsConfirm)}>{t.modules.recordSavings}</Button>}>
      <div className="app-like-header centered-header">
        <div>
          <h3>This Month Saving Remains ({pendingRows.length})</h3>
          <p>Savings: {money(savingsPerMonth)} per Month</p>
          <p>Penalty: Not Set</p>
          <p>Payment Date: Not Set</p>
          <p className="month-pill">Saving Month: August 2026</p>
        </div>
      </div>
      <Card className="statement-card">
        <h2>This Month Saving Remains</h2>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'member', label: 'Member' }, { key: 'saving', label: 'Saving', render: (row) => money(row.saving) }, { key: 'penalty', label: 'Penalty', render: (row) => money(row.penalty) }]} rows={pendingRows} />
      </Card>
    </Module>
  )
}

function Loans({ notify, t, data, money }) {
  const activeLoans = [
    ...data.loans.filter((loan) => loan.outstanding > 0),
    { id: 'l4', loanId: 'LOAN004', member: 'Lata Pawar', purpose: 'Vegetable stall', amount: 12000, outstanding: 9000, status: 'Partially Paid' },
    { id: 'l5', loanId: 'LOAN005', member: 'Kavita More', purpose: 'Dairy support', amount: 18000, outstanding: 18000, status: 'Active' },
    { id: 'l6', loanId: 'LOAN006', member: 'Rani Deshmukh', purpose: 'Education fees', amount: 8000, outstanding: 3500, status: 'Partially Paid' },
  ].slice(0, 5)
  const currentAllLoans = activeLoans.reduce((total, loan) => total + loan.outstanding, 0)
  const monthLoans = activeLoans.map((loan) => ({ ...loan, amount: loan.amount || loan.outstanding }))
  return (
    <Module title={t.modules.loans} t={t} action={<Button onClick={() => notify(t.toasts.loanOpen)}>{t.modules.giveLoan}</Button>}>
      <div className="app-like-header centered-header">
        <div>
          <h3>Current All Loans</h3>
          <p>Current Balance: {money(20000)}</p>
          <p>Current All Loans: {money(currentAllLoans)} ({activeLoans.length})</p>
          <p className="month-pill">Saving Month: August 2026</p>
        </div>
      </div>
      {activeLoans.length ? (
        <Card className="statement-card">
          <h2>Current All Loans</h2>
          <DataTable t={t} columns={[{ key: 'loanId', label: 'Loan' }, { key: 'member', label: 'Member' }, { key: 'outstanding', label: 'Amount', render: (row) => money(row.outstanding) }, { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'Overdue' ? 'danger' : 'warning'}>{row.status}</Badge> }]} rows={activeLoans} />
        </Card>
      ) : <EmptyNotice text="No one has taken loan." />}
      <Card className="statement-card">
        <h2>This Month Loans Provided</h2>
        <p className="center-text">Total Loan Provided: {money(monthLoans.reduce((total, loan) => total + loan.amount, 0))} ({monthLoans.length})</p>
        {monthLoans.length ? <DataTable t={t} columns={[{ key: 'loanId', label: 'Loan' }, { key: 'member', label: 'Member' }, { key: 'purpose', label: 'Purpose' }, { key: 'amount', label: 'Amount', render: (row) => money(row.amount) }]} rows={monthLoans} /> : <EmptyNotice text="No Loans Taken." />}
      </Card>
    </Module>
  )
}

function Ledger({ t, data, money }) {
  return <Module title={t.modules.ledger} t={t}><ModuleWorkflow type="ledger" t={t} /><DataTable t={t} columns={[{ key: 'transactionId', label: t.fields.transactionId }, { key: 'date', label: t.fields.date }, { key: 'type', label: t.fields.type }, { key: 'member', label: t.fields.member }, { key: 'amount', label: t.fields.amount, render: (row) => money(row.amount) }, { key: 'balance', label: t.fields.runningBalance, render: (row) => money(row.balance) }]} rows={data.transactions} /></Module>
}

function Passbook({ t, data, money }) {
  const member = data.members[1]
  return <Module title={t.modules.passbook} t={t} action={<Button variant="secondary">{t.downloadPdf}</Button>}><ModuleWorkflow type="member" t={t} /><Card className="passbook"><div><p className="muted">{t.labels.memberName}</p><h2>{member.name}</h2><span>{member.memberId} • {data.shg.name}</span></div><div className="stats-grid compact"><StatCard label={t.dashboard.totalSavings} value={money(member.savings)} icon="+" /><StatCard label={t.labels.loanTaken} value={money(20000)} icon="₹" tone="blue" /><StatCard label={t.labels.amountRepaid} value={money(9200)} icon="✓" /><StatCard label={t.fields.outstanding} value={money(member.loanOutstanding)} icon="!" tone="amber" /></div></Card><Ledger t={t} data={data} money={money} /></Module>
}

function MonthlyAccounts({ t, money }) {
  const breakupRows = [
    { id: 'mb1', savings: 2000, installment: 2500, interest: 200, penalty: 0, otherIncome: 20000 },
    { id: 'mb2', savings: 2000, installment: 1800, interest: 160, penalty: 50, otherIncome: 0 },
    { id: 'mb3', savings: 2000, installment: 0, interest: 0, penalty: 0, otherIncome: 1200 },
    { id: 'mb4', savings: 2000, installment: 2200, interest: 180, penalty: 0, otherIncome: 0 },
    { id: 'mb5', savings: 2000, installment: 1500, interest: 140, penalty: 0, otherIncome: 500 },
  ]
  const incomeRows = [
    { id: 'moi1', index: 1, description: 'Deposit amount of member at the time of joining the SHG. (Asha Jadhav)', amount: 20000 },
    { id: 'moi2', index: 2, description: 'Bank interest credited for August 2026', amount: 850 },
    { id: 'moi3', index: 3, description: 'Training support contribution', amount: 1200 },
    { id: 'moi4', index: 4, description: 'Document copy fees collected', amount: 300 },
    { id: 'moi5', index: 5, description: 'Community program donation', amount: 2500 },
  ]
  const summaryRows = [
    ['A) Previous Month Balance', 0],
    ['B) Monthly Deposit', 20000],
    ['C) Total Deposit (A+B)', 20000],
    ['D) Loan Provided', 0],
    ['E) Other Expenses', 0],
    ['F) Total Expenses (D+E)', 0],
    ['This Month Balance (C-F)', 20000],
  ]
  return (
    <Module title={t.modules.monthly} t={t} action={<Button variant="secondary">Download Monthly Report</Button>}>
      <Card className="statement-card report-selector">
        <h2>Select Saving Month & Year</h2>
        <div className="report-filter-grid">
          <label className="field"><span>Month</span><select defaultValue="August"><option>August</option><option>July</option><option>June</option></select></label>
          <label className="field"><span>Year</span><select defaultValue="2026"><option>2026</option><option>2025</option></select></label>
        </div>
        <Button>Get Monthly Report</Button>
      </Card>
      <Card className="statement-card">
        <h2>Saving Month: August 2026</h2>
        <div className="statement-lines">
          {summaryRows.map(([label, value]) => <div key={label} className={label.includes('Total') || label.includes('Balance') ? 'total' : ''}><span>{label}</span><strong>{money(value)}</strong></div>)}
        </div>
        <DataTable t={t} columns={[{ key: 'savings', label: 'Savings', render: (row) => money(row.savings) }, { key: 'installment', label: 'INSTL', render: (row) => money(row.installment) }, { key: 'interest', label: 'Int', render: (row) => money(row.interest) }, { key: 'penalty', label: 'Penalty', render: (row) => money(row.penalty) }, { key: 'otherIncome', label: 'Other Income', render: (row) => money(row.otherIncome) }]} rows={breakupRows} />
      </Card>
      <Card className="statement-card">
        <h2>Current Month Other Income</h2>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', render: (row) => money(row.amount) }]} rows={incomeRows} />
      </Card>
    </Module>
  )
}

function CalculationReport({ t, data, money }) {
  const lang = textLang(t)
  const copy = {
    en: {
      title: 'Complete SHG Calculation Report',
      month: 'Month: August 2026',
      year: 'Year: 5',
      week: 'Week: 10',
      account: 'Account No: 082810002000054',
      ifsc: 'IFSC Code: DEOB0000025',
      columns: ['No.', 'Member Name', 'Deposit Share', 'Previous Loan', 'New Loan', 'Total Loan Balance', 'Current Month Savings', 'Principal', 'Interest', 'Current Total', 'Extra Deposit', 'Remaining Loan'],
      notes: ['Deposit savings into the group bank account before the decided date.', 'After the decided date, late fee can be applied as per group rule.', 'Every member should verify the account statement.'],
    },
    hi: {
      title: 'पूर्ण SHG गणना रिपोर्ट',
      month: 'महीना: अगस्त 2026',
      year: 'वर्ष: 5',
      week: 'सप्ताह: 10',
      account: 'खाता क्रमांक: 082810002000054',
      ifsc: 'IFSC कोड: DEOB0000025',
      columns: ['क्र.', 'सदस्य का नाम', 'जमा शेयर', 'पिछला ऋण', 'नया ऋण', 'कुल ऋण बाकी', 'चालू माह बचत', 'मूलधन', 'ब्याज', 'चालू कुल', 'अतिरिक्त जमा', 'बाकी ऋण'],
      notes: ['निर्धारित तारीख से पहले समूह की बचत बैंक खाते में जमा करें।', 'निर्धारित तारीख के बाद समूह नियम के अनुसार विलंब शुल्क लगाया जा सकता है।', 'हर सदस्य को खाता विवरण जांचना चाहिए।'],
    },
    mr: {
      title: 'पूर्ण SHG गणना अहवाल',
      month: 'महिना: ऑगस्ट 2026',
      year: 'वर्ष: 5',
      week: 'हप्ता: 10',
      account: 'खाते क्रमांक: 082810002000054',
      ifsc: 'IFSC कोड: DEOB0000025',
      columns: ['अ.क्र.', 'सभासदाचे नाव', 'जमा शेअर्स', 'पूर्वीचे कर्ज', 'नवीन कर्ज', 'एकूण बाकी कर्ज', 'चालू महिन्यातील बचत', 'मुद्दल', 'व्याज', 'एकूण', 'अतिरिक्त जमा', 'बाकी कर्ज'],
      notes: ['ठरलेल्या तारखेपूर्वी बचत गटाची रक्कम बँक खात्यात जमा करा.', 'ठरलेल्या तारखेनंतर गट नियमानुसार विलंब शुल्क लागू होऊ शकते.', 'प्रत्येक सभासदाने हिशोब तपासून खात्री करावी.'],
    },
  }[lang]

  const rows = data.members.slice(0, 5).map((member, index) => {
    const depositShare = member.savings + (index * 1200)
    const previousLoan = index % 2 === 0 ? member.loanOutstanding : member.loanOutstanding + 4000
    const newLoan = index === 0 ? 140000 : index === 3 ? 30000 : 0
    const savings = 3000
    const principal = index % 2 === 0 ? 2000 : 4000
    const interest = Math.round((previousLoan + newLoan) * 0.01)
    const currentTotal = savings + principal + interest
    const extraDeposit = index === 4 ? 1000 : 0
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
        <DataTable t={t} columns={columns} rows={rows} />
        <div className="calculation-totals">
          <strong>Total</strong>
          <span>{money(totals.depositShare)}</span>
          <span>{money(totals.previousLoan)}</span>
          <span>{money(totals.newLoan)}</span>
          <span>{money(totals.loanBalance)}</span>
          <span>{money(totals.savings)}</span>
          <span>{money(totals.principal)}</span>
          <span>{money(totals.interest)}</span>
          <span>{money(totals.currentTotal)}</span>
          <span>{money(totals.extraDeposit)}</span>
          <span>{money(totals.remainingLoan)}</span>
        </div>
      </Card>
      <Card className="calculation-notes">
        {copy.notes.map((note, index) => <p key={note}>{index + 1}. {note}</p>)}
      </Card>
    </Module>
  )
}

function BalanceSheet({ t, money }) {
  const total = 20000
  return (
    <Module title={t.modules.balance} t={t} action={<Button variant="secondary">Download Balance Sheet</Button>}>
      <Card className="statement-card report-selector">
        <h2>Select the Duration</h2>
        <div className="report-filter-grid two">
          <label className="field"><span>From</span><select defaultValue="August 2026"><option>August 2026</option><option>July 2026</option></select></label>
          <label className="field"><span>To</span><select defaultValue="August 2026"><option>August 2026</option><option>July 2026</option></select></label>
        </div>
        <Button>Get Balance Sheet</Button>
      </Card>
      <Card className="statement-card balance-summary-card">
        <h2>My SHG Balance Sheet</h2>
        <p className="center-text">Duration:<strong>August 2026 TO August 2026</strong></p>
        <div className="statement-lines">
          <div><span>(A) Previous Balance</span><strong>{money(0)}</strong></div>
          <div><span>(B) Total Deposit</span><strong>{money(total)}</strong></div>
          <div><span>(C) Total Savings</span><strong>{money(0)}</strong></div>
          <div><span>(D) Total Interest</span><strong>{money(0)}</strong></div>
          <div><span>(E) Total Penalty</span><strong>{money(0)}</strong></div>
          <div><span>(F) Total Other Income</span><strong>{money(0)}</strong></div>
          <div className="total"><span>Total (A+B+C+D+E+F)</span><strong>{money(total)}</strong></div>
          <div><span>(X) Total Other Expenses</span><strong>{money(0)}</strong></div>
          <div><span>(Y) Total Loan Remains</span><strong>{money(0)}</strong></div>
          <div><span>(Z) Balance</span><strong>{money(total)}</strong></div>
          <div className="total"><span>Total Expenses + Balance (X+Y+Z)</span><strong>{money(total)}</strong></div>
        </div>
      </Card>
    </Module>
  )
}

function ProfileInfoScreen({ t, data, money }) {
  const activeMembers = data.members.slice(0, 5).map((member, index) => ({ ...member, index: index + 1, role: index === 0 ? 'President' : 'Member', deposit: 20000 + (index * 500) }))
  return (
    <Module title="My Self-Help Group Info" t={t}>
      <Card className="statement-card">
        <div className="info-table">
          <div><span>SHG Name:</span><strong>Women self help group</strong></div>
          <div><span>SHG Code:</span><strong>SHG3856C</strong></div>
          <div><span>Members:</span><strong>{activeMembers.length} members:</strong></div>
          <div><span>Start Month:</span><strong>August 2026</strong></div>
          <div><span>President:</span><strong>Mrs. Mansi Sarote<br /><em>8793867257</em></strong></div>
        </div>
      </Card>
      <Card className="statement-card">
        <h2>List of Active Members</h2>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'name', label: 'Member' }, { key: 'role', label: 'Role' }, { key: 'deposit', label: 'Deposit', render: (row) => money(row.deposit) }]} rows={activeMembers} />
      </Card>
    </Module>
  )
}

function ProfileSettingsScreen({ notify, t }) {
  return (
    <Module title="Profile Settings" t={t}>
      <div className="app-like-header centered-header">
        <div><h3>Mrs. Mansi Sarote (President)</h3></div>
      </div>
      <Card className="statement-card profile-settings-card">
        <div className="profile-form-table">
          <label><span>SHG Name:</span><input defaultValue="Women self help group" /></label>
          <label><span>Your Name:</span><div className="split-input"><select defaultValue="Mrs"><option>Mrs</option><option>Ms</option><option>Mr</option></select><input defaultValue="Mansi Sarote" /></div></label>
          <label><span>Your Mobile:</span><input defaultValue="8793867257" /></label>
          <label><span>Your E-mail:</span><input defaultValue="mansisarote05@gmail.com" /></label>
          <label><span>Set Password:</span><input type="password" defaultValue="password12" /></label>
        </div>
        <Button onClick={() => notify(t.toasts.settingsSaved)}>Save Changes</Button>
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

function Meetings({ notify, t, data }) {
  return <Module title={t.modules.meetings} t={t} action={<Button onClick={() => notify(t.toasts.meetingScheduled)}>{t.modules.scheduleMeeting}</Button>}><ModuleWorkflow type="meeting" t={t} /><DataTable t={t} columns={[{ key: 'title', label: t.fields.meeting }, { key: 'date', label: t.fields.date }, { key: 'time', label: t.fields.time }, { key: 'location', label: t.fields.location }, { key: 'status', label: t.fields.status, render: (row) => <Badge tone="success">{row.status}</Badge> }]} rows={data.meetings} /></Module>
}

function Attendance({ role, notify, t, data }) {
  const meeting = data.meetings[0]
  const rows = data.members.slice(0, 5).map((member, index) => ({
    id: `att-${member.id}`,
    index: index + 1,
    meeting: meeting.title,
    date: meeting.date,
    member: member.name,
    status: index === 1 ? 'Absent' : 'Present',
    note: index === 1 ? 'Reason pending' : 'Marked by president',
  }))
  const memberRows = rows.filter((row) => row.member === data.members[0].name)

  if (role !== 'admin') {
    return (
      <Module title={navLabel(t, 'attendance')} t={t}>
        <div className="app-like-header centered-header">
          <div>
            <h3>My Attendance</h3>
            <p>{data.members[0].name}</p>
            <p className="month-pill">Meeting Month: August 2026</p>
          </div>
        </div>
        <Card className="statement-card">
          <h2>My Meeting Attendance</h2>
          <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'meeting', label: 'Meeting' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Attendance', render: (row) => <Badge tone={row.status === 'Present' ? 'success' : 'danger'}>{row.status}</Badge> }, { key: 'note', label: 'Note' }]} rows={memberRows} />
        </Card>
      </Module>
    )
  }

  return (
    <Module title={navLabel(t, 'attendance')} t={t} action={<Button onClick={() => notify('Attendance saved')}>Save Attendance</Button>}>
      <div className="app-like-header centered-header">
        <div>
          <h3>Mark Meeting Attendance</h3>
          <p>{meeting.title} • {meeting.date}</p>
          <p className="month-pill">Admin can mark each member Present or Absent</p>
        </div>
      </div>
      <Card className="statement-card">
        <h2>Attendance Register</h2>
        <DataTable
          t={t}
          columns={[
            { key: 'index', label: '#' },
            { key: 'member', label: 'Member' },
            { key: 'meeting', label: 'Meeting' },
            { key: 'date', label: 'Date' },
            {
              key: 'status',
              label: 'Attendance',
              render: (row) => (
                <select className="table-select" defaultValue={row.status}>
                  <option>Present</option>
                  <option>Absent</option>
                </select>
              ),
            },
            { key: 'note', label: 'Note' },
          ]}
          rows={rows}
        />
      </Card>
    </Module>
  )
}

function Reports({ t }) {
  return <Module title={t.modules.reports} t={t} action={<><Button variant="secondary">{t.exportCsv}</Button><Button>{t.exportPdf}</Button></>}><ModuleWorkflow type="reports" t={t} /><div className="feature-grid small">{t.reportItems.map((item) => <Card key={item}><h3>{item}</h3><p className="muted">{t.reportText}</p></Card>)}</div></Module>
}

function Notifications({ t, data }) {
  return <Module title={t.modules.notifications} t={t}><ModuleWorkflow type="meeting" t={t} /><div className="stack">{data.notifications.map((note) => <Card key={note.id} className="notice"><Badge tone="warning">{note.type}</Badge><div><h3>{note.title}</h3><p>{note.message}</p></div><Button variant="ghost">{t.share}</Button></Card>)}</div></Module>
}

function Schemes({ t, data }) {
  return <Module title={t.modules.schemes} t={t}><ModuleWorkflow type="schemes" t={t} /><div className="feature-grid small">{data.schemes.map((scheme) => <Card key={scheme.name}><h3>{scheme.name}</h3><p>{scheme.description}</p><p><strong>{t.eligibility}:</strong> {scheme.eligibility}</p><a href={scheme.source} target="_blank">{t.officialSource}</a></Card>)}</div><p className="muted">{t.schemesNote}</p></Module>
}

function Goals({ t, money }) {
  const title = t.moneyLocale === 'hi-IN' ? 'सिलाई मशीन खरीदना' : t.moneyLocale === 'mr-IN' ? 'शिलाई मशीन खरेदी' : 'Purchase Sewing Machines'
  return <Module title={t.modules.goals} t={t}><ModuleWorkflow type="saving" t={t} /><Card><h3>{title}</h3><div className="goal-row"><strong>{money(32500)}</strong><span>{t.labels.savedOf} {money(50000)}</span></div><Progress value={65} /><p>{money(17500)} {t.labels.remaining}</p></Card></Module>
}

function EmergencyFund({ t, money }) {
  return <Module title={t.modules.emergency} t={t}><ModuleWorkflow type="fund" t={t} /><div className="stats-grid compact"><StatCard label={t.labels.available} value={money(18500)} icon="✓" /><StatCard label={t.labels.used} value={money(4000)} icon="-" tone="amber" /><StatCard label={t.labels.remainingLabel} value={money(18500)} icon="=" /></div></Module>
}

function Documents({ t }) {
  return <Module title={t.modules.documents} t={t} action={<Button>{t.uploadDocument}</Button>}><ModuleWorkflow type="documents" t={t} /><div className="feature-grid small">{t.documentItems.map((item) => <Card key={item}><h3>{item}</h3><p className="muted">{t.documentText}</p></Card>)}</div></Module>
}

function Insights({ t, data }) {
  return <Module title={t.modules.insights} t={t}><ModuleWorkflow type="reports" t={t} /><div className="stack">{data.insights.map((item) => <Card key={item}><p>{item}</p></Card>)}</div></Module>
}

// eslint-disable-next-line no-unused-vars
function Settings({ notify, t }) {
  return <Module title={t.modules.settings} t={t} action={<Button onClick={() => notify(t.toasts.settingsSaved)}>{t.saveSettings}</Button>}><ModuleWorkflow type="settings" t={t} /><div className="form-grid"><Field label={t.form.loanInterest} type="number" placeholder="2" /><Field label={t.form.savingsInterest} type="number" placeholder="0" /><Field label={t.form.latePenalty} type="number" placeholder="50" /></div><p className="muted">{t.settingsNote}</p></Module>
}

function LoanCollection({ t, data, money }) {
  const x = extra(t)
  const rows = [
    ...data.loans.filter((loan) => loan.outstanding > 0),
    { id: 'lc4', loanId: 'LOAN004', member: 'Lata Pawar', outstanding: 9000, status: 'Partially Paid' },
    { id: 'lc5', loanId: 'LOAN005', member: 'Kavita More', outstanding: 18000, status: 'Active' },
    { id: 'lc6', loanId: 'LOAN006', member: 'Rani Deshmukh', outstanding: 3500, status: 'Partially Paid' },
  ].slice(0, 5)
  return <Module title={x.nav.loanCollection} t={t}><div className="app-like-header centered-header"><div><h3>Collect Loans & Interest</h3><p className="month-pill">Saving Month: August 2026</p></div></div><Card className="statement-card"><h2>Loan Installment Collection</h2><div className="form-grid compact-form"><Field label={t.fields.member} placeholder={data.members[1]?.name} /><Field label={t.fields.amount} type="number" placeholder="2200" /><Field label={t.form.loanInterest} type="number" placeholder="2" /><Field label={t.fields.receipt} placeholder="AUTO" /></div><DataTable t={t} columns={[{ key: 'loanId', label: t.fields.loanId }, { key: 'member', label: t.fields.member }, { key: 'outstanding', label: t.fields.outstanding, render: (row) => money(row.outstanding) }, { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.status === 'Overdue' ? 'danger' : 'warning'}>{row.status}</Badge> }]} rows={rows} /></Card></Module>
}

function LoanDetails({ t, data, money }) {
  const member = data.members[0]
  const loans = [
    { id: 'ld1', loanId: 'LOAN001', amount: 0, interest: '0%', penalty: 0, paymentDate: '05 Aug 2026' },
    { id: 'ld2', loanId: 'LOAN002', amount: 0, interest: '0%', penalty: 0, paymentDate: '12 Aug 2026' },
    { id: 'ld3', loanId: 'LOAN003', amount: 0, interest: '0%', penalty: 0, paymentDate: '19 Aug 2026' },
    { id: 'ld4', loanId: 'LOAN004', amount: 0, interest: '0%', penalty: 0, paymentDate: '26 Aug 2026' },
    { id: 'ld5', loanId: 'LOAN005', amount: 0, interest: '0%', penalty: 0, paymentDate: '31 Aug 2026' },
  ]
  const rows = loans.length ? loans : [{ id: 'empty', loanId: '-', amount: 0, interest: '-', penalty: '-', paymentDate: '-' }]
  const paidRows = [
    { id: 'p1', month: 'Apr 2026', loan: 0, installment: 0, percent: '0%', interest: 0, penalty: 0 },
    { id: 'p2', month: 'May 2026', loan: 0, installment: 0, percent: '0%', interest: 0, penalty: 0 },
    { id: 'p3', month: 'Jun 2026', loan: 0, installment: 0, percent: '0%', interest: 0, penalty: 0 },
    { id: 'p4', month: 'Jul 2026', loan: 0, installment: 0, percent: '0%', interest: 0, penalty: 0 },
    { id: 'p5', month: 'Aug 2026', loan: 0, installment: 0, percent: '0%', interest: 0, penalty: 0 },
  ]
  return (
    <Module title={navLabel(t, 'loanDetails')} t={t}>
      <div className="app-like-header">
        <div><h3>{member.name} (Loan: {money(member.loanOutstanding)})</h3><p>Saving Month: August 2026</p></div>
        <Badge tone={member.loanOutstanding > 0 ? 'warning' : 'success'}>{member.loanOutstanding > 0 ? 'Active Loan' : 'No Dues'}</Badge>
      </div>
      <Card className="statement-card">
        <h2>Your Loans Details</h2>
        <DataTable t={t} columns={[{ key: 'loanId', label: 'Loan' }, { key: 'interest', label: '%' }, { key: 'amount', label: 'INT', render: (row) => row.amount ? money(row.amount) : '-' }, { key: 'penalty', label: 'Penalty' }, { key: 'paymentDate', label: 'Payment Date' }]} rows={rows} />
      </Card>
      <Card className="statement-card">
        <h2>Last 10 Paid Installments</h2>
        <DataTable t={t} columns={[{ key: 'month', label: 'Month' }, { key: 'loan', label: 'Loan', render: (row) => money(row.loan) }, { key: 'installment', label: 'INSTL', render: (row) => money(row.installment) }, { key: 'percent', label: '%' }, { key: 'interest', label: 'INT', render: (row) => money(row.interest) }, { key: 'penalty', label: 'Penalty', render: (row) => money(row.penalty) }]} rows={paidRows} />
      </Card>
    </Module>
  )
}

function LoanDemandRisk({ notify, t, data, money }) {
  const member = data.members[0]
  const riskRows = data.members.slice(0, 5).map((item, index) => ({ ...item, index: index + 1, risk: item.loanOutstanding > 0 ? 'YES' : 'NO', ratio: `${Math.round((item.loanOutstanding / Math.max(item.savings, 1)) * 100)}%` }))
  const requestRows = [
    { id: 'rq1', index: 1, member: 'Asha Jadhav', loan: 5000, percent: '2%', date: '31 Aug 2026 10:15 AM', action: 'Pending' },
    { id: 'rq2', index: 2, member: 'Meena Shinde', loan: 8000, percent: '2%', date: '30 Aug 2026 04:20 PM', action: 'Review' },
    { id: 'rq3', index: 3, member: 'Lata Pawar', loan: 12000, percent: '1.5%', date: '29 Aug 2026 01:45 PM', action: 'Review' },
    { id: 'rq4', index: 4, member: 'Kavita More', loan: 6000, percent: '2%', date: '28 Aug 2026 11:05 AM', action: 'Pending' },
    { id: 'rq5', index: 5, member: 'Rani Deshmukh', loan: 7000, percent: '2%', date: '27 Aug 2026 05:30 PM', action: 'Pending' },
  ]
  return (
    <Module title={navLabel(t, 'loanDemandRisk')} t={t}>
      <div className="app-like-header">
        <div><h3>SHG Balance: {money(20000)}</h3><p>Ask the president to set the interest rate.</p></div>
      </div>
      <Card className="statement-card">
        <h2>Apply for a new loan</h2>
        <div className="loan-request-grid">
          <Field label="Your Name" placeholder={member.name} />
          <Field label="Loan" type="number" placeholder="0" />
          <label className="field"><span>%</span><select defaultValue=""><option value="" disabled>Select</option><option>1%</option><option>2%</option><option>3%</option></select></label>
        </div>
        <Button onClick={() => notify('Loan request submitted to president')}>Submit a Loan Request</Button>
        <p className="muted"><strong>Tip:</strong> Members can request a loan from here. Final approval remains with the president and secretary.</p>
      </Card>
      <Card className="statement-card">
        <h2>List of members requesting loan</h2>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'member', label: 'Member' }, { key: 'loan', label: 'Loan', render: (row) => money(row.loan) }, { key: 'percent', label: '%' }, { key: 'date', label: 'Date & Time' }, { key: 'action', label: 'Action' }]} rows={requestRows} />
      </Card>
      <Card className="statement-card">
        <h2>Current Loan Risk Ratio</h2>
        <p className="center-text">Per Member Share in SHG: {money(20000)}</p>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'name', label: 'Member' }, { key: 'loanOutstanding', label: 'Loan', render: (row) => money(row.loanOutstanding) }, { key: 'ratio', label: '%' }, { key: 'risk', label: 'Risk', render: (row) => <Badge tone={row.risk === 'YES' ? 'warning' : 'success'}>{row.risk}</Badge> }]} rows={riskRows} />
      </Card>
    </Module>
  )
}

function MemberBalanceSheet({ notify, t, data, money }) {
  const member = data.members[0]
  const period = 'August 2026'
  const totals = {
    savings: member.savings,
    interest: 0,
    penalty: 0,
    deposit: 20000,
    repayment: 0,
    remainingLoan: member.loanOutstanding,
  }
  const totalCredit = totals.savings + totals.interest + totals.penalty + totals.deposit

  return (
    <Module title={navLabel(t, 'memberBalanceSheet')} t={t} action={<Button variant="secondary">Download Balance Sheet</Button>}>
      <Card className="statement-card balance-sheet-selector">
        <h2>Select Member & Duration</h2>
        <div className="balance-filter-grid">
          <label className="field"><span>Member</span><select defaultValue={member.name}>{data.members.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
          <label className="field"><span>From</span><select defaultValue={period}><option>{period}</option><option>July 2026</option><option>June 2026</option></select></label>
          <label className="field"><span>To</span><select defaultValue={period}><option>{period}</option><option>July 2026</option><option>June 2026</option></select></label>
        </div>
        <Button onClick={() => notify('Balance sheet generated')}>Get Balance Sheet</Button>
      </Card>

      <Card className="statement-card balance-summary-card">
        <h2>Member's Balance Sheet</h2>
        <p className="center-text">Member: <strong>{member.name}</strong></p>
        <p className="center-text">Duration: <strong>{period} TO {period}</strong></p>
        <div className="statement-lines">
          <div><span>(A) Total Savings</span><strong>{money(totals.savings)}</strong></div>
          <div><span>(B) Total Interest</span><strong>{money(totals.interest)}</strong></div>
          <div><span>(C) Total Penalty</span><strong>{money(totals.penalty)}</strong></div>
          <div><span>(E) Deposit Amount</span><strong>{money(totals.deposit)}</strong></div>
          <div className="total"><span>Total Credit (A+B+C+D)</span><strong>{money(totalCredit)}</strong></div>
          <div><span>Total repayment of loan</span><strong>{money(totals.repayment)}</strong></div>
          <div className="total"><span>Total Loan Remains</span><strong>{money(totals.remainingLoan)}</strong></div>
        </div>
      </Card>

    </Module>
  )
}

function OtherExpense({ t }) {
  const x = extra(t)
  return (
    <Module title={x.nav.otherExpense} t={t}>
      <Card className="statement-card report-selector">
        <h2>Select Period</h2>
        <div className="report-filter-grid two">
          <label className="field"><span>From</span><select defaultValue="August 2026"><option>August 2026</option><option>July 2026</option></select></label>
          <label className="field"><span>To</span><select defaultValue="August 2026"><option>August 2026</option><option>July 2026</option></select></label>
        </div>
        <Button>Get Balance Sheet</Button>
      </Card>
      <Card className="statement-card report-download"><Button>Download Balance Sheet</Button></Card>
      <EmptyNotice text="No other expenses during above period." />
    </Module>
  )
}

function OtherIncome({ t, money }) {
  const x = extra(t)
  const incomeRows = [
    { id: 'oi1', index: 1, description: 'Deposit amount of member at the time of joining the SHG. (Mrs Mansi Sarote)', month: 'August 2026', amount: 20000 },
    { id: 'oi2', index: 2, description: 'Bank interest credited', month: 'August 2026', amount: 850 },
    { id: 'oi3', index: 3, description: 'Training program support', month: 'August 2026', amount: 1200 },
    { id: 'oi4', index: 4, description: 'Document copy fees', month: 'August 2026', amount: 300 },
    { id: 'oi5', index: 5, description: 'Community donation', month: 'August 2026', amount: 2500 },
  ]
  return (
    <Module title={x.nav.otherIncome} t={t}>
      <Card className="statement-card report-selector">
        <h2>Select Period</h2>
        <div className="report-filter-grid two">
          <label className="field"><span>From</span><select defaultValue="August 2026"><option>August 2026</option><option>July 2026</option></select></label>
          <label className="field"><span>To</span><select defaultValue="August 2026"><option>August 2026</option><option>July 2026</option></select></label>
        </div>
        <Button>Get Balance Sheet</Button>
      </Card>
      <Card className="statement-card report-download"><Button>Download Balance Sheet</Button></Card>
      <Card className="statement-card">
        <h2>Other Income in Above Period</h2>
        <DataTable t={t} columns={[{ key: 'index', label: '#' }, { key: 'description', label: 'Description' }, { key: 'month', label: 'Month' }, { key: 'amount', label: 'Amount', render: (row) => money(row.amount) }]} rows={incomeRows} />
      </Card>
    </Module>
  )
}

function RulesNotice({ t }) {
  const x = extra(t)
  const rules = [
    'Self-help groups are based on democratic principles, so every member of the group will have equal rights.',
    'All members of the group should come together after a fixed period of time and deposit a certain amount in the group as savings. This period will be once a month.',
    'This deposit will be available to the members of the self help group as a loan at a fixed interest rate.',
    'The loan taken by the member will have to be repaid in installments to the self-help group with interest.',
    'The amount of monthly savings, loan decisions, interest rate, repayment rules and related matters will be decided by majority.',
    'In case of delay in monthly savings or loan installment, penalty amount per day will be decided by majority of all members.',
  ]
  const notices = [
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
  ]
  return (
    <Module title={x.nav.rulesNotice} t={t}>
      <div className="app-like-header centered-header"><div><h3>My Self-help Group Rules</h3></div></div>
      <div className="rules-list">{rules.map((rule, index) => <div key={rule} className="rule-item"><strong>Rule: {index + 1}</strong><p>{rule}</p></div>)}</div>
      <div className="app-like-header centered-header"><div><h3>My Self-Help Group Notice</h3></div></div>
      <div className="rules-list">{notices.map((notice, index) => <div key={notice} className="rule-item"><strong>Notice: {index + 1}</strong><p>{notice}</p></div>)}</div>
    </Module>
  )
}

function PenaltySettings({ notify, t }) {
  const x = extra(t)
  return <Module title={x.nav.penaltySettings} t={t} action={<Button onClick={() => notify(t.toasts.settingsSaved)}>{t.saveSettings}</Button>}><ModuleWorkflow type="settings" t={t} /><div className="form-grid"><Field label={t.form.latePenalty} type="number" placeholder="50" /><Field label={t.form.savingsInterest} type="number" placeholder="0" /><Field label={t.fields.status} placeholder="Active" /><Field label={t.fields.date} type="date" /></div></Module>
}

function InterestSettings({ notify, t }) {
  const x = extra(t)
  return <Module title={x.nav.interestSettings} t={t} action={<Button onClick={() => notify(t.toasts.settingsSaved)}>{t.saveSettings}</Button>}><ModuleWorkflow type="settings" t={t} /><div className="form-grid"><Field label={t.form.loanInterest} type="number" placeholder="2" /><Field label={t.form.savingsInterest} type="number" placeholder="0" /><Field label={t.fields.type} placeholder="Monthly" /><Field label={t.fields.status} placeholder="Active" /></div></Module>
}

function RemoveMember({ members, t, money }) {
  const x = extra(t)
  return <Module title={x.nav.removeMember} t={t}><ModuleWorkflow type="member" t={t} /><DataTable t={t} columns={[{ key: 'memberId', label: t.fields.memberId }, { key: 'name', label: t.fields.name }, { key: 'savings', label: t.fields.savings, render: (row) => money(row.savings) }, { key: 'loanOutstanding', label: t.fields.outstanding, render: (row) => money(row.loanOutstanding) }, { key: 'status', label: t.fields.status, render: (row) => <Badge tone={row.loanOutstanding > 0 ? 'warning' : 'success'}>{row.loanOutstanding > 0 ? 'Settle before removal' : 'Eligible'}</Badge> }]} rows={members} /></Module>
}

function ShareApp({ t, data, shgCode, shareShgInvite }) {
  const x = extra(t)
  return <Module title={x.nav.shareApp} t={t} action={<Button onClick={shareShgInvite}>{x.shareTitle}</Button>}><Card><h3>{data.shg.name}</h3><p className="muted">SHG Code: {shgCode}</p><p>{buildShareMessage(data.shg.name, shgCode)}</p></Card></Module>
}

function EditRequests({ notify, t, data }) {
  const x = extra(t)
  return (
    <Module title={x.nav.editRequests || 'Correction Requests'} t={t} action={<Button onClick={() => notify('Correction request sent to president')}>{x.requestCorrection || 'Send Correction Request'}</Button>}>
      <Card className="member-request-card">
        <div>
          <p className="eyebrow">{x.viewOnly || 'View-only access'}</p>
          <h3>{x.requestHint || 'If any entry is wrong, send a request to the president.'}</h3>
        </div>
      </Card>
      <div className="form-grid">
        <Field label={t.fields.member} placeholder={data.members[0]?.name} />
        <Field label={t.fields.type} placeholder="Savings / Loan / Attendance / Passbook" />
        <Field label={t.fields.transactionId} placeholder="Receipt or transaction ID" />
        <Field label={t.fields.status} placeholder="Pending President Review" />
      </div>
      <div className="check-list">
        <span>Members can view records for transparency.</span>
        <span>Members cannot directly edit financial entries.</span>
        <span>President reviews and approves correction requests.</span>
      </div>
    </Module>
  )
}

function Module({ title, action, children, t }) {
  return <div className="stack"><div className="module-head"><div><p className="eyebrow">{t.module}</p><h1>{title}</h1></div><div className="module-actions">{action}</div></div>{children}</div>
}

function VoiceAssistant({ language, setActive, close, notify, t }) {
  const [text, setText] = useState('')

  function runCommand(value) {
    const normalized = value.toLowerCase()
    const match = t.voice.commands.find(([keys]) => keys.split(' ').some((key) => normalized.includes(key)))
    if (normalized.includes('add') || normalized.includes('जोड़') || normalized.includes('जोड') || normalized.includes('दाखल')) {
      notify(t.toasts.actionConfirm)
      setActive(normalized.includes('member') || normalized.includes('सदस्य') ? 'members' : 'savings')
    } else if (match) {
      setActive(match[1])
      notify(match[2])
    } else {
      notify(t.toasts.repeat)
    }
    close()
  }

  function listen() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      notify(t.toasts.noSpeech)
      return
    }
    const recognition = new Recognition()
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setText(transcript)
      runCommand(transcript)
    }
    recognition.start()
  }

  return <div className="modal-backdrop"><Card className="assistant-modal"><div className="module-head"><div><p className="eyebrow">{t.voice.title}</p><h2>{t.voice.ask}</h2></div><Button variant="ghost" onClick={close}>{t.close}</Button></div><p>{t.voice.try}</p><div className="assistant-input"><input value={text} onChange={(event) => setText(event.target.value)} placeholder={t.voice.placeholder} /><Button onClick={listen}>{t.listen}</Button><Button variant="secondary" onClick={() => runCommand(text)}>{t.run}</Button></div></Card></div>
}

function App() {
  const [screen, setScreen] = useState('landing')
  const [role, setRole] = useState('admin')
  const [language, setLanguage] = useState(localStorage.getItem('shgms-language') || 'en')
  const [shgCode, setShgCodeState] = useState(localStorage.getItem('shgms-code') || 'SHG3856C')
  const t = dictionary[language]
  const data = useLocalizedData(language)
  const money = useMemo(() => new Intl.NumberFormat(t.moneyLocale, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format, [t.moneyLocale])

  function changeLanguage(next) {
    setLanguage(next)
    localStorage.setItem('shgms-language', next)
  }

  function setShgCode(nextCode) {
    setShgCodeState(nextCode)
    localStorage.setItem('shgms-code', nextCode)
  }

  function shareShgInvite() {
    const message = buildShareMessage(data.shg.name, shgCode)
    navigator.clipboard?.writeText(message)
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  if (screen === 'landing') return <Landing onEnter={() => setScreen('auth')} language={language} changeLanguage={changeLanguage} t={t} data={data} money={money} />
  if (screen === 'auth') return <AuthScreen onLogin={(nextRole) => { setRole(nextRole); setScreen('app') }} language={language} changeLanguage={changeLanguage} t={t} shgCode={shgCode} setShgCode={setShgCode} />
  return <Shell role={role} onLogout={() => setScreen('landing')} language={language} changeLanguage={changeLanguage} t={t} data={data} money={money} shgCode={shgCode} shareShgInvite={shareShgInvite} />
}

export default App
