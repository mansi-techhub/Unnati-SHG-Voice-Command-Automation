import test from 'node:test'
import assert from 'node:assert/strict'
import { canOpenModule } from './accessPolicy.js'
import { supportedIntents, understandCommand } from './intentEngine.js'

test('members can open their existing read-only modules but not admin modules', () => {
  assert.equal(canOpenModule('passbook', 'member'), true)
  assert.equal(canOpenModule('editRequests', 'member'), true)
  assert.equal(canOpenModule('members', 'member'), false)
  assert.equal(canOpenModule('settings', 'member'), false)
})

test('every member-visible sidebar module opens from Hindi and Marathi commands', () => {
  const memberSidebarModules = [
    'dashboard', 'profile', 'notifications', 'passbook', 'savings', 'loanApplication',
    'loanDetails', 'loanDemandRisk', 'loans', 'ledger', 'monthly', 'memberBalanceSheet',
    'balance', 'meetings', 'attendance', 'documents', 'editRequests',
    'calculationReport', 'reports', 'insights', 'schemes',
  ]
  const navigationByModule = new Map(supportedIntents.map(({ intent, module }) => [module, intent]))
  const commands = [
    ['open dashboard', 'डैशबोर्ड खोलो', 'डॅशबोर्ड उघडा'],
    ['open SHG profile', 'समूह प्रोफ़ाइल खोलो', 'गट प्रोफाइल उघडा'],
    ['open notifications', 'सूचनाएं खोलो', 'सूचना उघडा'],
    ['open passbook', 'मेरी डिजिटल पासबुक खोलो', 'माझे डिजिटल पासबुक उघडा'],
    ['open savings', 'बचत प्रबंधन खोलो', 'बचत व्यवस्थापन उघडा'],
    ['open loan application', 'कर्ज के लिए आवेदन', 'कर्जासाठी अर्ज उघडा'],
    ['open loan details', 'कर्ज विवरण खोलो', 'कर्ज तपशील उघडा'],
    ['open loan demand and risk', 'कर्ज मांग और जोखिम खोलो', 'कर्ज मागणी व जोखीम उघडा'],
    ['open loans', 'कर्ज प्रबंधन खोलो', 'कर्ज व्यवस्थापन उघडा'],
    ['open ledger', 'डिजिटल लेजर खोलो', 'डिजिटल लेजर उघडा'],
    ['open monthly accounts', 'मासिक खाते खोलो', 'मासिक खाते उघडा'],
    ["open the member's balance sheet", 'सदस्य शीट खोलो', 'सदस्य ताळेबंद उघडा'],
    ['open balance sheet', 'बैलेंस शीट खोलो', 'ताळेबंद उघडा'],
    ['open meetings', 'बैठके खोलो', 'बैठका उघडा'],
    ['open attendance', 'उपस्थिति खोलो', 'हजेरी उघडा'],
    ['open documents', 'दस्तावेज़ तिजोरी खोलो', 'दस्तऐवज तिजोरी उघडा'],
    ['open correction requests', 'सुधार अनुरोध खोलो', 'दुरुस्ती विनंती उघडा'],
    ['open calculation report', 'गणना रिपोर्ट खोलो', 'गणना अहवाल उघडा'],
    ['open reports', 'रिपोर्ट केंद्र खोलो', 'अहवाल केंद्र उघडा'],
    ['open insights', 'स्मार्ट वित्तीय जानकारी खोलो', 'स्मार्ट आर्थिक निरीक्षणे उघडा'],
    ['open government schemes', 'सरकारी योजनाएं खोलो', 'सरकारी योजना उघडा'],
  ]
  assert.equal(commands.length, memberSidebarModules.length)
  for (const [module, [english, hindi, marathi]] of memberSidebarModules.map((module, index) => [module, commands[index]])) {
    const intent = navigationByModule.get(module)
    assert.ok(intent, `${module} needs a registered voice-navigation intent`)
    assert.equal(understandCommand(english).intent, intent, `English command should open ${module}`)
    assert.equal(understandCommand(hindi).intent, intent, `Hindi command should open ${module}`)
    assert.equal(understandCommand(marathi, { language: 'mr' }).intent, intent, `Marathi command should open ${module}`)
    assert.equal(canOpenModule(module, 'member'), true, `members should be allowed to open ${module}`)
  }
})

test('admins can open registered modules', () => {
  assert.equal(canOpenModule('members', 'admin'), true)
})

test('every registered navigation target exists in the admin policy', () => {
  for (const { module } of supportedIntents) {
    assert.equal(canOpenModule(module, 'admin'), true, `${module} should be reachable by an admin`)
  }
})
