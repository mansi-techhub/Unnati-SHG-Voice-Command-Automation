import test from 'node:test'
import assert from 'node:assert/strict'
import { supportedIntents, understandCommand } from './intentEngine.js'

const members = [{ _id: 'member-1', memberId: 'MBR-001', name: 'Asha Pawar' }]

test('classifies navigation in English, Hindi, and Marathi', () => {
  assert.equal(understandCommand('open savings').intent, 'OPEN_SAVINGS')
  assert.equal(understandCommand('बचत दिखाओ').intent, 'OPEN_SAVINGS')
  assert.equal(understandCommand('हजेरी दाखवा').intent, 'OPEN_ATTENDANCE')
  assert.equal(understandCommand('Sheet kholo.').intent, 'OPEN_BALANCE_SHEET')
  assert.equal(understandCommand('Please Sheet kholo.').intent, 'OPEN_BALANCE_SHEET')
  assert.equal(understandCommand('बैलेंस शीट खोलो').intent, 'OPEN_BALANCE_SHEET')
  assert.equal(understandCommand('सदस्य शीट उघडा').intent, 'OPEN_MEMBER_BALANCE')
  assert.equal(understandCommand('पासबुक खोलें').intent, 'OPEN_PASSBOOK')
  assert.equal(understandCommand('पासबुक दिखाइए').intent, 'OPEN_PASSBOOK')
  assert.equal(understandCommand('passbook kholo').intent, 'OPEN_PASSBOOK')
  assert.equal(understandCommand('loan details खोलें').intent, 'OPEN_LOAN_DETAILS')
})

test('detects the response language from registered Hindi and Marathi phrases', () => {
  assert.equal(understandCommand('बचत दिखाओ').language, 'hi')
  assert.equal(understandCommand('कर्जाची यादी').language, 'mr')
  assert.equal(understandCommand('अहवाल उघडा').language, 'mr')
  assert.equal(understandCommand('सेटिंग उघडा', { language: 'mr' }).language, 'mr')
})

test('resolves member savings questions without returning data from another member', () => {
  const result = understandCommand('show savings for Asha Pawar', { members })
  assert.equal(result.intent, 'QUERY_MEMBER_SAVINGS')
  assert.equal(result.entities.memberId, 'member-1')
})

test('recognizes member record counts, asks for a member when missing, and starts goal creation', () => {
  assert.equal(understandCommand('how many things are stored for Asha Pawar', { members }).intent, 'QUERY_MEMBER_RECORDS')
  const unspecified = understandCommand('how many records are stored', { members })
  assert.equal(unspecified.intent, 'ASK_MEMBER')
  assert.equal(unspecified.entities.queryIntent, 'QUERY_MEMBER_RECORDS')
  assert.equal(understandCommand('add goal').intent, 'ADD_GOAL')
  assert.equal(understandCommand('ध्येय तयार करा').intent, 'ADD_GOAL')
})

test('routes member CRUD commands locally in English, Hindi, and Marathi', () => {
  assert.equal(understandCommand('I want to delete a member').intent, 'DELETE_MEMBER')
  assert.equal(understandCommand('delete Asha Pawar', { members }).intent, 'DELETE_MEMBER')
  assert.equal(understandCommand('मुझे एक सदस्य हटाना है', { language: 'hi' }).intent, 'DELETE_MEMBER')
  assert.equal(understandCommand('मला सदस्य काढायचा आहे', { language: 'mr' }).intent, 'DELETE_MEMBER')
  assert.equal(understandCommand('change member phone number', { language: 'en' }).intent, 'UPDATE_MEMBER')
  assert.equal(understandCommand('सदस्य का फोन नंबर बदलें', { language: 'hi' }).intent, 'UPDATE_MEMBER')
  assert.equal(understandCommand('सदस्याचा फोन नंबर बदला', { language: 'mr' }).intent, 'UPDATE_MEMBER')
  assert.equal(understandCommand('add a member').intent, 'ADD_MEMBER')
  assert.equal(understandCommand('नवीन सदस्य जोडा', { language: 'mr' }).intent, 'ADD_MEMBER')
})

test('answers goal-based savings progress questions from loaded goal records', () => {
  assert.equal(understandCommand('show goal progress').intent, 'QUERY_GOALS')
  assert.equal(understandCommand('लक्ष्य में कितनी बचत हुई').intent, 'QUERY_GOALS')
  assert.equal(understandCommand('ध्येयाची प्रगती दाखवा').intent, 'QUERY_GOALS')
})

test('recognizes confirmation and cancellation before general phrase matching', () => {
  assert.equal(understandCommand('confirm').intent, 'CONFIRM')
  assert.equal(understandCommand('cancel this').intent, 'CANCEL')
  assert.equal(understandCommand('No').intent, 'CANCEL')
  assert.equal(understandCommand('yesterday').intent, 'UNRECOGNIZED')
  assert.equal(understandCommand('maybe').intent, 'UNRECOGNIZED')
  assert.equal(understandCommand('ठीक है शायद').intent, 'UNRECOGNIZED')
  assert.equal(understandCommand('हाँ').intent, 'CONFIRM')
  assert.equal(understandCommand('पुष्टि करें').intent, 'CONFIRM')
  assert.equal(understandCommand('रद्द करो').intent, 'CANCEL')
  assert.equal(understandCommand('हो').intent, 'CONFIRM')
  assert.equal(understandCommand('पुष्टी करा').intent, 'CONFIRM')
  assert.equal(understandCommand('रद्द करा').intent, 'CANCEL')
  assert.equal(understandCommand('discard').intent, 'CANCEL')
  assert.equal(understandCommand('टाकून द्या').intent, 'CANCEL')
})

test('matches every registered navigation phrase in its declared language', () => {
  for (const item of supportedIntents) {
    for (const language of ['en', 'hi', 'mr']) {
      for (const phrase of item.examples[language] || []) {
        assert.equal(
          understandCommand(phrase, { language }).intent,
          item.intent,
          `${language} phrase "${phrase}" should classify as ${item.intent}`,
        )
      }
    }
  }
})

test('resolves common open/show verb variants against registered module names', () => {
  const variants = [
    ['open government scheme', 'OPEN_SCHEMES'],
    ['open government schemes', 'OPEN_SCHEMES'],
    ['open correction request', 'OPEN_CORRECTION_REQUESTS'],
    ['open monthly account', 'OPEN_MONTHLY_ACCOUNTS'],
    ['open loan', 'OPEN_LOANS'],
    ['पासबुक खोलें', 'OPEN_PASSBOOK'],
    ['बैठकें खोलें', 'OPEN_MEETINGS'],
    ['उपस्थिति खोलें', 'OPEN_ATTENDANCE'],
    ['रिपोर्ट खोलें', 'OPEN_REPORTS'],
    ['मासिक खाते खोलें', 'OPEN_MONTHLY_ACCOUNTS'],
    ['दस्तावेज़ खोलें', 'OPEN_DOCUMENTS'],
    ['सरकारी योजनाएं खोलें', 'OPEN_SCHEMES'],
    ['बैठका उघडा', 'OPEN_MEETINGS'],
    ['कागदपत्रे उघडा', 'OPEN_DOCUMENTS'],
    ['passbook kholen', 'OPEN_PASSBOOK'],
    ['open the meetings page please', 'OPEN_MEETINGS'],
  ]
  for (const [command, expectedIntent] of variants) {
    assert.equal(understandCommand(command).intent, expectedIntent, command)
  }
})

test('opens every English sidebar option when given an open command', () => {
  const commands = [
    ['open dashboard', 'OPEN_DASHBOARD'],
    ['open SHG profile', 'OPEN_PROFILE'],
    ['open notifications', 'OPEN_NOTIFICATIONS'],
    ['open savings', 'OPEN_SAVINGS'],
    ['open collect loans and interest', 'OPEN_LOAN_COLLECTION'],
    ['open loan details', 'OPEN_LOAN_DETAILS'],
    ['open loan demand and risk', 'OPEN_LOAN_DEMAND_RISK'],
    ['open loans', 'OPEN_LOANS'],
    ['open ledger', 'OPEN_TRANSACTIONS'],
    ['open other expense', 'OPEN_EXPENSES'],
    ['open other income', 'OPEN_INCOME'],
    ['open passbook', 'OPEN_PASSBOOK'],
    ['open monthly accounts', 'OPEN_MONTHLY_ACCOUNTS'],
    ["open the member's balance sheet", 'OPEN_MEMBER_BALANCE'],
    ['open balance sheet', 'OPEN_BALANCE_SHEET'],
    ['open members', 'OPEN_MEMBERS'],
    ['open remove member', 'OPEN_REMOVE_MEMBER'],
    ['open rules and notice', 'OPEN_RULES'],
    ['open meetings', 'OPEN_MEETINGS'],
    ['open attendance', 'OPEN_ATTENDANCE'],
    ['open goals', 'OPEN_GOALS'],
    ['open emergency fund', 'OPEN_EMERGENCY_FUND'],
    ['open documents', 'OPEN_DOCUMENTS'],
    ['open member loan requests', 'OPEN_MEMBER_LOAN_REQUESTS'],
    ['open correction requests', 'OPEN_CORRECTION_REQUESTS'],
    ['open calculation report', 'OPEN_CALCULATION_REPORT'],
    ['open reports', 'OPEN_REPORTS'],
    ['open insights', 'OPEN_ANALYTICS'],
    ['open government schemes', 'OPEN_SCHEMES'],
    ['open penalty settings', 'OPEN_PENALTY_SETTINGS'],
    ['open interest rates', 'OPEN_INTEREST_SETTINGS'],
    ['open share SHG app', 'OPEN_SHARE'],
  ]
  for (const [command, expectedIntent] of commands) {
    assert.equal(understandCommand(command).intent, expectedIntent, command)
  }
})

test('opens every sidebar option from its Hindi or Marathi label and command', () => {
  const commands = [
    ['डैशबोर्ड खोलो', 'डॅशबोर्ड उघडा', 'OPEN_DASHBOARD'],
    ['समूह प्रोफ़ाइल खोलो', 'गट प्रोफाइल उघडा', 'OPEN_PROFILE'],
    ['सूचनाएं खोलो', 'सूचना उघडा', 'OPEN_NOTIFICATIONS'],
    ['बचत प्रबंधन खोलो', 'बचत व्यवस्थापन उघडा', 'OPEN_SAVINGS'],
    ['कर्ज और ब्याज संग्रह खोलो', 'कर्ज व व्याज संकलन उघडा', 'OPEN_LOAN_COLLECTION'],
    ['कर्ज विवरण खोलो', 'कर्ज तपशील उघडा', 'OPEN_LOAN_DETAILS'],
    ['कर्ज मांग और जोखिम खोलो', 'कर्ज मागणी व जोखीम उघडा', 'OPEN_LOAN_DEMAND_RISK'],
    ['कर्ज प्रबंधन खोलो', 'कर्ज व्यवस्थापन उघडा', 'OPEN_LOANS'],
    ['डिजिटल लेजर खोलो', 'डिजिटल लेजर उघडा', 'OPEN_TRANSACTIONS'],
    ['अन्य खर्च खोलो', 'इतर खर्च उघडा', 'OPEN_EXPENSES'],
    ['अन्य आय खोलो', 'इतर उत्पन्न उघडा', 'OPEN_INCOME'],
    ['मेरी डिजिटल पासबुक खोलो', 'माझे डिजिटल पासबुक उघडा', 'OPEN_PASSBOOK'],
    ['मासिक खाते खोलो', 'मासिक खाते उघडा', 'OPEN_MONTHLY_ACCOUNTS'],
    ['सदस्य शीट खोलो', 'सदस्य ताळेबंद उघडा', 'OPEN_MEMBER_BALANCE'],
    ['बैलेंस शीट खोलो', 'ताळेबंद उघडा', 'OPEN_BALANCE_SHEET'],
    ['सदस्य प्रबंधन खोलो', 'सदस्य व्यवस्थापन उघडा', 'OPEN_MEMBERS'],
    ['सदस्य हटाने का पेज खोलो', 'सदस्य काढण्याचे पान उघडा', 'OPEN_REMOVE_MEMBER'],
    ['नियम और सूचना खोलो', 'नियम व सूचना उघडा', 'OPEN_RULES'],
    ['बैठके खोलो', 'बैठका उघडा', 'OPEN_MEETINGS'],
    ['उपस्थिति खोलो', 'हजेरी उघडा', 'OPEN_ATTENDANCE'],
    ['लक्ष्य आधारित बचत खोलो', 'ध्येयाधारित बचत उघडा', 'OPEN_GOALS'],
    ['आपातकालीन निधि खोलो', 'आपत्कालीन निधी उघडा', 'OPEN_EMERGENCY_FUND'],
    ['दस्तावेज़ तिजोरी खोलो', 'दस्तऐवज तिजोरी उघडा', 'OPEN_DOCUMENTS'],
    ['सदस्य कर्ज अनुरोध खोलो', 'सदस्य कर्ज विनंत्या उघडा', 'OPEN_MEMBER_LOAN_REQUESTS'],
    ['सुधार अनुरोध खोलो', 'दुरुस्ती विनंती उघडा', 'OPEN_CORRECTION_REQUESTS'],
    ['गणना रिपोर्ट खोलो', 'गणना अहवाल उघडा', 'OPEN_CALCULATION_REPORT'],
    ['रिपोर्ट केंद्र खोलो', 'अहवाल केंद्र उघडा', 'OPEN_REPORTS'],
    ['स्मार्ट वित्तीय जानकारी खोलो', 'स्मार्ट आर्थिक निरीक्षणे उघडा', 'OPEN_ANALYTICS'],
    ['सरकारी योजनाएं खोलो', 'सरकारी योजना उघडा', 'OPEN_SCHEMES'],
    ['जुर्माना सेटिंग खोलो', 'दंड सेटिंग उघडा', 'OPEN_PENALTY_SETTINGS'],
    ['ब्याज दरें खोलो', 'व्याज दर उघडा', 'OPEN_INTEREST_SETTINGS'],
    ['SHG ऐप शेयर करो', 'SHG अॅप शेअर करा', 'OPEN_SHARE'],
  ]
  for (const [hindi, marathi, expectedIntent] of commands) {
    assert.equal(understandCommand(hindi).intent, expectedIntent, `Hindi: ${hindi}`)
    assert.equal(understandCommand(marathi, { language: 'mr' }).intent, expectedIntent, `Marathi: ${marathi}`)
  }
})

test('has a registered navigation intent for every dashboard sidebar module', () => {
  const dashboardModules = [
    'dashboard', 'profile', 'notifications', 'savings', 'loanCollection', 'loanDetails',
    'loanDemandRisk', 'loans', 'ledger', 'otherExpense', 'otherIncome', 'passbook', 'monthly',
    'memberBalanceSheet', 'balance', 'members', 'removeMember', 'rulesNotice', 'meetings',
    'attendance', 'goals', 'emergency', 'documents', 'loanApplications', 'editRequests',
    'calculationReport', 'reports', 'insights', 'schemes', 'penaltySettings',
    'interestSettings', 'shareApp', 'loanApplication',
  ]
  const registeredModules = new Set(supportedIntents.map(({ module }) => module))
  for (const module of dashboardModules) {
    assert.ok(registeredModules.has(module), `sidebar module "${module}" needs a voice navigation intent`)
  }
})

test('recognizes mixed-language navigation and member-management commands', () => {
  assert.equal(understandCommand('मुझे savings दिखाओ').intent, 'OPEN_SAVINGS')
  assert.equal(understandCommand('member add करा').intent, 'ADD_MEMBER')
  assert.equal(understandCommand('loan details दाखवा').intent, 'OPEN_LOAN_DETAILS')
  assert.equal(understandCommand('Update Asha Pawar phone number', { members }).entities.field, 'phone')
  assert.equal(understandCommand('Delete Asha Pawar', { members }).intent, 'DELETE_MEMBER')
  assert.equal(understandCommand('मला member ची माहिती दाखवा').intent, 'ASK_MEMBER')
})

test('requests clarification when the member name is ambiguous', () => {
  const result = understandCommand('show savings for Asha', {
    members: [
      { _id: 'member-1', memberId: 'MBR-001', name: 'Asha Pawar' },
      { _id: 'member-2', memberId: 'MBR-002', name: 'Asha Jadhav' },
    ],
  })
  assert.equal(result.intent, 'CLARIFY_MEMBER')
  assert.equal(result.entities.candidates.length, 2)
})
