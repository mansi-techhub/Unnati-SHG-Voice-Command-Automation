import { useEffect, useRef, useState } from 'react'
import { advanceConversation, getCurrentField, startConversation } from './conversationManager'
import { normalizeCommand, supportedIntents, understandCommand } from './intentEngine'
import { executeAttendanceAction, executeRegisteredAction } from './actionRouter'
import { canOpenModule } from './accessPolicy'
import { isSkipPhrase, isValidPhone, parseCorrection } from './inputValidation'
import { countMemberRecords } from './memberRecords'
import { createSpeechRecognition } from './speechService'
import { cancelSpokenResponse, prepareSpokenResponse, speakResponse } from './ttsService'
import { api } from '../services/api'
import { approvedMutationIntents } from './actionRouter'
import { getLocalDateKey, isAttendanceMarkRequest, parseAttendanceStatuses } from './attendanceCommands'
import { isMemberMessageRequest } from './messageCommands'
import { isCorrectionRequest, parseCorrectionCategory } from './correctionRequestCommands'
import {
  formatPaymentCompliance,
  formatPaymentReminderResult,
  formatUnpaidMembers,
  getMentionedMemberIds,
  isExplicitRecipientRequest,
  isPaymentReminderRequest,
  isPaymentStatusFollowUp,
  parsePaymentStatusRequest,
  paymentReminderCopy,
} from './paymentCompliance'

const copy = {
  en: {
    title: 'SHG Assistant', ask: 'How can I help?', close: 'Close', clearChat: 'New chat', placeholder: 'Ask a question or give a command',
    send: 'Send', listen: 'Speak', listening: 'Listening…', readAloud: 'Read responses aloud',
    processing: 'Processing…', speaking: 'Speaking…', ready: 'Ready', speechOutputError: 'I could not play the spoken response. You can still read it above.',
    stop: 'Stop',
    speechUnavailable: 'Gemini voice processing is unavailable or not configured. You can still use typed messages.',
    chatUnavailable: 'I could not reach the assistant service. Please try again in a moment.',
    welcome: 'Ask about your group, open a module, or say “add member” or “record savings”.',
    unrecognized: 'What would you like to know or do? You can describe it in your own words.',
    unsupportedAction: 'I cannot perform that task through the assistant yet. No data was changed. You can ask me to open a module, ask an SHG question, or use a supported confirmed action.',
    denied: 'This view or action is not available for your account. You can send a correction request to an admin.',
    noActiveGoals: 'There are no active goals available to receive a contribution.',
    goalNotFound: (name) => `I could not find a goal titled “${name}” in this SHG’s loaded records.`,
    memberCount: (count) => `There are ${count} members in this SHG.`,
    groupBalance: (amount) => `The group balance is ${amount}.`,
    groupHealth: (score) => `The current SHG financial health score is ${score}%.`,
    groupSavings: (amount) => `The total recorded savings for this SHG are ${amount}.`,
    goalProgress: (goals, money) => goals.length
      ? goals.map((goal) => `${goal.title}: saved ${money(goal.savedAmount)} of ${money(goal.targetAmount)}, ${money(Math.max(0, Number(goal.targetAmount || 0) - Number(goal.savedAmount || 0)))} remaining (${goal.status}).`).join('\n')
      : 'There are no goal-based savings records for this SHG yet.',
    memberList: (names) => names.length ? `Members: ${names.join(', ')}.` : 'There are no member records to show.',
    pendingLoanSummary: (count, amount) => `There are ${count} loans with outstanding balances totaling ${amount}.`,
    pendingApplicationSummary: (count) => `There are ${count} pending loan applications.`,
    todayTransactions: (count, amount) => `There are ${count} transactions dated today, totaling ${amount}.`,
    noMemberMatch: (name) => `I could not find a member matching “${name}” in the current SHG records.`,
    member: (name, id) => `${name}${id ? ` (ID: ${id})` : ''}.`,
    memberSavings: (name, amount, count) => `${name} has ${count} savings record(s), totaling ${amount}.`,
    memberLoans: (name, amount, count) => `${name} has ${count} loan record(s), with ${amount} outstanding.`,
    memberRecords: (name, counts) => `${name} has ${counts.savings} savings, ${counts.loans} loans, ${counts.applications} loan applications, ${counts.payments} payment collections, ${counts.transactions} transactions, and ${counts.attendance} attendance records (${counts.total} records total).`,
    moduleOpened: (name) => `Opening ${name}.`,
    unsupportedSearch: 'Please include a member name or ask a specific question, such as “How many members?”',
    whichMember: 'Which member do you mean? Please tell me their name or member ID.',
    confirmFirst: 'Please answer the current question, or say “cancel” to stop this action.',
    cancel: 'The action was cancelled. No changes were made.',
    restarted: 'The conversation was reset. What would you like to do?',
    attendanceAskMeeting: (date) => `I’ll mark attendance for ${date}. What should I call this meeting or event?`,
    attendanceAskTime: 'What time was it? Say “skip” if you do not want to add a time.',
    attendanceAskLocation: 'Where was it held? Say “skip” if you do not want to add a location.',
    attendanceAskRoster: 'Tell me who was present or absent. For example, “all present except Komal”.',
    attendanceInvalidTime: 'Enter the time as HH:MM (24-hour time), or say “skip”.',
    attendanceUnmatchedMember: 'I could not match that name to a member. Please say a listed member’s name, or use full names.',
    attendanceAmbiguousMember: 'That name matches multiple members. Please say their full names so I mark the right people.',
    attendanceNoStatuses: 'I could not identify attendance statuses. Try “all present except Komal” or name who was present and absent.',
    attendancePreview: (date, title, present, absent) => `Review attendance\nMeeting: ${title}\nDate: ${date}\nPresent (${present.length}): ${present.join(', ') || 'None'}\nAbsent (${absent.length}): ${absent.join(', ') || 'None'}`,
    attendanceAskConfirm: 'Say “confirm” to save this attendance, or “discard” to cancel without saving.',
    attendanceSaving: 'Saving attendance…',
    attendanceSaved: 'Attendance was saved and verified.',
    attendanceRefreshFailed: 'Attendance was saved and verified, but the screen could not refresh. Please reload the page.',
    attendanceSaveFailed: (message) => `I could not verify that attendance was saved. ${message}`,
    permission: 'Only an admin can make this change. Members can submit a correction request instead.',
    askMemberForDelete: 'Which member should I delete? Tell me their full name or member ID.',
    askMemberForUpdate: 'Which member should I update? Tell me their full name or member ID.',
    askField: {
      name: 'What is the new member’s full name?',
      phone: 'What is the member’s phone number? Say “skip” if you do not have it.',
      address: 'What is the member’s address? Say “skip” if you do not have it.',
      joinedDate: 'What is the joining date (YYYY-MM-DD)? Say “skip” to use today.',
      member: 'Which member is this savings for? Enter their name or member ID.',
      messageMember: 'Which member should receive the in-app message? Tell me their name or member ID.',
      messageText: 'What message should I send to this member?',
      correctionCategory: 'What type of record needs correction: savings, loan, attendance, or passbook?',
      correctionReference: 'What is the receipt, transaction, meeting, or record ID? Say “skip” if you do not know it.',
      correctionDescription: 'Please describe what is wrong and what correction is needed.',
      amount: 'What savings amount should be recorded?',
      month: 'For which month? Use YYYY-MM, for example 2025-06.',
      actualDate: 'What was the received date (YYYY-MM-DD)? Say “skip” to use today.',
      title: 'What should the new goal be called?',
      targetAmount: 'What is the target amount for this goal?',
      dueDate: 'What is the goal due date (YYYY-MM-DD)? Say “skip” if there is no due date.',
      goalContribution: 'Which active goal should receive the contribution? Tell me its title.',
      note: 'Would you like to add a note for this contribution? Say “skip” if not.',
      field: 'Which member detail should I update: name, phone, address, joining date, or status?',
      setting: 'Which setting should I change: late penalty, loan interest, savings interest, monthly savings amount, or due day?',
      value: (field) => `What should the new ${field} be?`,
    },
    invalid: {
      name: 'Please enter a name with at least two characters.',
      phone: 'Enter a 10-digit phone number, or say “skip”.',
      date: 'Enter a valid date as YYYY-MM-DD, or say “skip”.',
      member: 'I could not find a unique member. Please enter their full name or member ID.',
      ambiguous: 'More than one member matches. Please use the exact member ID.',
      amount: 'Enter a positive amount using numbers.',
      month: 'Enter the month as YYYY-MM, for example 2025-06.',
      goal: 'Enter a goal title with at least two characters.',
      goalAmount: 'Enter a positive target amount using numbers.',
      message: 'Enter a message between 1 and 1000 characters.',
      correctionCategory: 'Choose savings, loan, attendance, or passbook.',
      correctionDescription: 'Describe the correction in 1 to 1000 characters.',
    },
    previewMember: (values) => `Add member\nName: ${values.name}\nPhone: ${values.phone || '—'}\nAddress: ${values.address || '—'}\nJoining date: ${values.joinedDate || 'Today'}`,
    previewSavings: (values) => `Record monthly savings\nMember: ${values.memberName}\nAmount: ${values.amount}\nMonth: ${values.month}\nReceived date: ${values.actualDate || 'Today'}\nAny late penalty is calculated by the existing savings workflow.`,
    previewGoal: (values, formatCurrency) => `Add goal\nGoal: ${values.title}\nTarget: ${formatCurrency(values.targetAmount)}\nDue date: ${values.dueDate || 'Not set'}`,
    previewGoalContribution: (values, formatCurrency) => `Contribute to goal\nGoal: ${values.goalName}\nContribution: ${formatCurrency(values.amount)}\nSaved after contribution: ${formatCurrency(Number(values.savedAmount || 0) + Number(values.amount))} of ${formatCurrency(values.targetAmount)}\nRemaining: ${formatCurrency(Math.max(0, Number(values.targetAmount || 0) - Number(values.savedAmount || 0) - Number(values.amount)))}\nNote: ${values.note || '—'}`,
    previewUpdate: (member, field, label, value) => `Update member\n${member.name} (${member.memberId})\n${label}: ${member[field] || '—'} → ${value}`,
    previewShgSetting: (label, value) => `Change SHG setting\n${label}: ${value}`,
    previewDelete: (member) => `Delete member\n${member.name} (${member.memberId})\nThis also deletes the member’s savings records. Any outstanding loan will block deletion.`,
    previewMemberMessage: (member, message) => `Send in-app message\nTo: ${member.name} (${member.memberId})\nMessage: ${message}`,
    memberMessageSent: (name) => `The in-app message was sent to ${name}.`,
    previewCorrectionRequest: (member, values) => `Correction request\nMember: ${member.name} (${member.memberId})\nType: ${values.category}\nRecord ID: ${values.reference || 'Not provided'}\nCorrection needed: ${values.description}`,
    correctionRequestSent: 'Your correction request was submitted to the admin for review.',
    correctionProfileMissing: 'I could not find your linked member profile. Please contact the admin before submitting a correction request.',
    correctionCategoryNames: { savings: 'Savings', loan: 'Loan', attendance: 'Attendance', passbook: 'Passbook' },
    ambiguousMembers: (rows) => `I found more than one matching member. Please specify an ID: ${rows.map((row) => `${row.name} (${row.displayId || row.memberId})`).join(', ')}.`,
    updateField: { name: 'name', phone: 'phone number', address: 'address', joinedDate: 'joining date', status: 'status' },
    updateFieldOptions: { name: ['name', 'नाम', 'नाव'], phone: ['phone', 'phone number', 'mobile', 'number', 'फोन', 'मोबाइल'], address: ['address', 'पता', 'पत्ता'], joinedDate: ['joining date', 'date', 'तारीख', 'दिनांक', 'सामील तारीख', 'सामील होण्याची तारीख'], status: ['status', 'स्थिति', 'स्थिती'] },
    corrected: 'Updated the information. Please continue.',
    askConfirm: 'Review the details above. Say “confirm” to save, or “cancel” to discard.',
    saving: 'Saving…',
    success: (intent) => ({ ADD_MEMBER: 'The member was added and verified.', ADD_GOAL: 'The goal was added and verified.', ADD_GOAL_CONTRIBUTION: 'The goal contribution was saved and verified.', RECORD_SAVINGS: 'The savings record was saved and verified.', UPDATE_MEMBER: 'The member details were updated and verified.', DELETE_MEMBER: 'The member was deleted and verified.', UPDATE_SHG_SETTING: 'The SHG setting was changed and verified.', SEND_MEMBER_MESSAGE: 'The in-app message was sent to the member.' })[intent],
    failed: () => 'I could not complete or verify that change. No success was recorded. Please check the records and try again.',
    speakingUnavailable: 'Speech recognition is not supported in this browser.',
    speechError: 'I could not hear that clearly. Please try again or type your request.',
    back: 'Returned to the previous question.',
    skipRequired: 'This field is required. Please provide a value.',
  },
  hi: {
    title: 'एसएचजी सहायक', ask: 'मैं आपकी क्या मदद करूँ?', close: 'बंद करें', clearChat: 'नई चैट', placeholder: 'प्रश्न या निर्देश लिखें',
    send: 'भेजें', listen: 'बोलें', listening: 'सुन रहा है…', readAloud: 'जवाब बोलकर सुनाएँ',
    processing: 'प्रक्रिया जारी है…', speaking: 'बोल रहा है…', ready: 'तैयार', speechOutputError: 'आवाज़ नहीं चल सकी। जवाब ऊपर पढ़ सकते हैं।',
    stop: 'रोकें',
    speechUnavailable: 'Gemini वॉइस प्रोसेसिंग उपलब्ध नहीं है या सेट नहीं की गई है। आप संदेश लिख सकते हैं।',
    chatUnavailable: 'सहायक सेवा से संपर्क नहीं हो सका। कृपया थोड़ी देर बाद फिर कोशिश करें।',
    welcome: 'समूह के बारे में पूछें, कोई मॉड्यूल खोलें, या “सदस्य जोड़ें” / “बचत दर्ज करें” कहें।',
    unrecognized: 'आप क्या जानना या करना चाहते हैं? अपनी बात अपने शब्दों में बताएं।',
    unsupportedAction: 'मैं अभी सहायक के ज़रिए यह काम नहीं कर सकता। कोई डेटा नहीं बदला गया। आप मॉड्यूल खोलने, एसएचजी के बारे में पूछने या उपलब्ध पुष्टि वाली कार्रवाई का अनुरोध कर सकते हैं।',
    denied: 'यह पेज या कार्रवाई आपके खाते के लिए उपलब्ध नहीं है। आप व्यवस्थापक को सुधार अनुरोध भेज सकते हैं।',
    noActiveGoals: 'योगदान प्राप्त करने के लिए कोई सक्रिय लक्ष्य उपलब्ध नहीं है।',
    goalNotFound: (name) => `इस समूह के रिकॉर्ड में “${name}” नाम का लक्ष्य नहीं मिला।`,
    memberCount: (count) => `इस समूह में ${count} सदस्य हैं।`,
    groupBalance: (amount) => `समूह का बैलेंस ${amount} है.`,
    groupHealth: (score) => `वर्तमान एसएचजी वित्तीय स्वास्थ्य स्कोर ${score}% है।`,
    groupSavings: (amount) => `इस एसएचजी की कुल दर्ज बचत ${amount} है।`,
    goalProgress: (goals, money) => goals.length
      ? goals.map((goal) => `${goal.title}: लक्ष्य ${money(goal.targetAmount)} में से ${money(goal.savedAmount)} बचाए गए, ${money(Math.max(0, Number(goal.targetAmount || 0) - Number(goal.savedAmount || 0)))} बाकी (${({ active: 'सक्रिय', completed: 'पूर्ण', paused: 'रुका हुआ' })[goal.status] || goal.status})।`).join('\n')
      : 'इस समूह में अभी कोई लक्ष्य-आधारित बचत दर्ज नहीं है।',
    memberList: (names) => names.length ? `सदस्य: ${names.join(', ')}।` : 'दिखाने के लिए कोई सदस्य रिकॉर्ड नहीं है।',
    pendingLoanSummary: (count, amount) => `${count} ऋणों पर कुल ${amount} बकाया है।`,
    pendingApplicationSummary: (count) => `${count} ऋण आवेदन लंबित हैं।`,
    todayTransactions: (count, amount) => `आज की तारीख वाले ${count} लेन-देन हैं, कुल ${amount}।`,
    noMemberMatch: (name) => `वर्तमान समूह के रिकॉर्ड में “${name}” नाम का सदस्य नहीं मिला।`,
    member: (name, id) => `${name}${id ? ` (आईडी: ${id})` : ''}।`,
    memberSavings: (name, amount, count) => `${name} के ${count} बचत रिकॉर्ड हैं, कुल ${amount}।`,
    memberLoans: (name, amount, count) => `${name} के ${count} कर्ज़ रिकॉर्ड हैं और बकाया ${amount} है।`,
    memberRecords: (name, counts) => `${name} के ${counts.savings} बचत, ${counts.loans} कर्ज़, ${counts.applications} कर्ज़ आवेदन, ${counts.payments} भुगतान संग्रह, ${counts.transactions} लेन-देन और ${counts.attendance} उपस्थिति रिकॉर्ड हैं (कुल ${counts.total})।`,
    moduleOpened: (name) => `${name} खोल रहा हूँ।`,
    unsupportedSearch: 'कृपया सदस्य का नाम शामिल करें या स्पष्ट प्रश्न पूछें, जैसे “कितने सदस्य हैं?”',
    whichMember: 'आप किस सदस्य के बारे में पूछ रहे हैं? उनका नाम या सदस्य आईडी बताएं।',
    confirmFirst: 'मौजूदा प्रश्न का उत्तर दें या कार्रवाई रोकने के लिए “रद्द” कहें।',
    cancel: 'कार्रवाई रद्द कर दी गई। कोई बदलाव नहीं हुआ।',
    restarted: 'बातचीत रीसेट हो गई। आप क्या करना चाहेंगे?',
    attendanceAskMeeting: (date) => `मैं ${date} की उपस्थिति दर्ज करूँगा। इस बैठक या कार्यक्रम का नाम क्या रखें?`,
    attendanceAskTime: 'बैठक का समय क्या था? समय नहीं जोड़ना हो तो “छोड़ें” कहें।',
    attendanceAskLocation: 'बैठक कहाँ हुई? स्थान नहीं जोड़ना हो तो “छोड़ें” कहें।',
    attendanceAskRoster: 'कौन उपस्थित या अनुपस्थित था? उदाहरण: “सब उपस्थित, कोमल को छोड़कर”।',
    attendanceInvalidTime: 'समय HH:MM (24 घंटे) में बताएं या “छोड़ें” कहें।',
    attendanceUnmatchedMember: 'यह नाम किसी सदस्य से मेल नहीं खा रहा। कृपया सूची में दिया गया नाम या पूरा नाम बोलें।',
    attendanceAmbiguousMember: 'यह नाम एक से अधिक सदस्यों से मेल खाता है। सही सदस्य चुनने के लिए पूरे नाम बोलें।',
    attendanceNoStatuses: 'उपस्थिति की स्थिति समझ नहीं आई। “सब उपस्थित, कोमल को छोड़कर” या सदस्यों के नाम और स्थिति बताएं।',
    attendancePreview: (date, title, present, absent) => `उपस्थिति जाँचें\nबैठक: ${title}\nतारीख: ${date}\nउपस्थित (${present.length}): ${present.join(', ') || 'कोई नहीं'}\nअनुपस्थित (${absent.length}): ${absent.join(', ') || 'कोई नहीं'}`,
    attendanceAskConfirm: 'उपस्थिति सहेजने के लिए “पुष्टि करें” कहें, या बिना सहेजे रद्द करने के लिए “रद्द” कहें।',
    attendanceSaving: 'उपस्थिति सहेजी जा रही है…',
    attendanceSaved: 'उपस्थिति सहेजी और सत्यापित की गई।',
    attendanceRefreshFailed: 'उपस्थिति सहेजी और सत्यापित की गई, लेकिन स्क्रीन रीफ़्रेश नहीं हो सकी। कृपया पेज दोबारा लोड करें।',
    attendanceSaveFailed: (message) => `उपस्थिति सहेजी गई है, यह सत्यापित नहीं हो सका। ${message}`,
    permission: 'यह बदलाव केवल व्यवस्थापक कर सकता है। सदस्य सुधार अनुरोध भेज सकते हैं।',
    askMemberForDelete: 'किस सदस्य को हटाना है? उनका पूरा नाम या सदस्य आईडी बताएं।',
    askMemberForUpdate: 'किस सदस्य की जानकारी बदलनी है? उनका पूरा नाम या सदस्य आईडी बताएं।',
    askField: {
      name: 'नए सदस्य का पूरा नाम क्या है?',
      phone: 'सदस्य का फोन नंबर क्या है? उपलब्ध न हो तो “छोड़ें” कहें।',
      address: 'सदस्य का पता क्या है? उपलब्ध न हो तो “छोड़ें” कहें।',
      joinedDate: 'जुड़ने की तारीख YYYY-MM-DD में बताएं। आज की तारीख के लिए “छोड़ें” कहें।',
      member: 'यह बचत किस सदस्य की है? नाम या सदस्य आईडी लिखें।',
      messageMember: 'ऐप में संदेश किस सदस्य को भेजना है? उनका नाम या सदस्य आईडी बताएं।',
      messageText: 'इस सदस्य को क्या संदेश भेजना है?',
      correctionCategory: 'किस प्रकार के रिकॉर्ड में सुधार चाहिए: बचत, ऋण, उपस्थिति या पासबुक?',
      correctionReference: 'रसीद, लेन-देन, बैठक या रिकॉर्ड आईडी क्या है? पता न हो तो “छोड़ें” कहें।',
      correctionDescription: 'कृपया बताएं कि क्या गलत है और क्या सुधार चाहिए।',
      amount: 'कितनी बचत दर्ज करनी है?',
      month: 'किस महीने के लिए? YYYY-MM लिखें, जैसे 2025-06।',
      actualDate: 'बचत किस तारीख को मिली (YYYY-MM-DD)? आज की तारीख के लिए “छोड़ें” कहें।',
      title: 'नए लक्ष्य का नाम क्या रखें?',
      targetAmount: 'इस लक्ष्य की कितनी राशि चाहिए?',
      dueDate: 'लक्ष्य की तारीख YYYY-MM-DD में बताएं। तारीख न हो तो “छोड़ें” कहें।',
      goalContribution: 'किस सक्रिय लक्ष्य में योगदान जोड़ना है? लक्ष्य का नाम बताएं।',
      note: 'क्या योगदान के लिए कोई नोट जोड़ना है? नहीं हो तो “छोड़ें” कहें।',
      field: 'कौन-सी जानकारी बदलनी है: नाम, फोन, पता, जुड़ने की तारीख या स्थिति?',
      setting: 'कौन-सी सेटिंग बदलनी है: देर से भुगतान का जुर्माना, कर्ज़ ब्याज, बचत ब्याज, मासिक बचत राशि या जमा करने का दिन?',
      value: (field) => `नया ${field} क्या होना चाहिए?`,
    },
    invalid: {
      name: 'कम से कम दो अक्षरों वाला नाम दर्ज करें।',
      phone: '10 अंकों का फोन नंबर दें या “छोड़ें” कहें।',
      date: 'तारीख YYYY-MM-DD में दें या “छोड़ें” कहें।',
      member: 'एक स्पष्ट सदस्य नहीं मिला। पूरा नाम या सदस्य आईडी दें।',
      ambiguous: 'एक से अधिक सदस्य मिले। कृपया सही सदस्य आईडी दें।',
      amount: 'अंकों में सकारात्मक राशि दर्ज करें।',
      month: 'महीना YYYY-MM में दर्ज करें, जैसे 2025-06।',
      goal: 'कम से कम दो अक्षरों वाला लक्ष्य नाम दें।',
      goalAmount: 'अंकों में सकारात्मक लक्ष्य राशि दर्ज करें।',
      message: '1 से 1000 अक्षरों के बीच संदेश दर्ज करें।',
      correctionCategory: 'बचत, ऋण, उपस्थिति या पासबुक में से चुनें।',
      correctionDescription: '1 से 1000 अक्षरों में सुधार का विवरण दें।',
    },
    previewMember: (values) => `सदस्य जोड़ें\nनाम: ${values.name}\nफोन: ${values.phone || '—'}\nपता: ${values.address || '—'}\nजुड़ने की तारीख: ${values.joinedDate || 'आज'}`,
    previewSavings: (values) => `मासिक बचत दर्ज करें\nसदस्य: ${values.memberName}\nराशि: ${values.amount}\nमहीना: ${values.month}\nप्राप्ति तारीख: ${values.actualDate || 'आज'}\nदेरी का जुर्माना मौजूदा बचत प्रक्रिया से तय होगा।`,
    previewGoal: (values, formatCurrency) => `लक्ष्य जोड़ें\nलक्ष्य: ${values.title}\nराशि: ${formatCurrency(values.targetAmount)}\nतारीख: ${values.dueDate || 'तय नहीं'}`,
    previewGoalContribution: (values, formatCurrency) => `लक्ष्य में योगदान\nलक्ष्य: ${values.goalName}\nयोगदान: ${formatCurrency(values.amount)}\nयोगदान के बाद बचत: ${formatCurrency(Number(values.savedAmount || 0) + Number(values.amount))} / ${formatCurrency(values.targetAmount)}\nबाकी: ${formatCurrency(Math.max(0, Number(values.targetAmount || 0) - Number(values.savedAmount || 0) - Number(values.amount)))}\nनोट: ${values.note || '—'}`,
    previewUpdate: (member, field, label, value) => `सदस्य की जानकारी बदलें\n${member.name} (${member.memberId})\n${label}: ${member[field] || '—'} → ${value}`,
    previewShgSetting: (label, value) => `समूह की सेटिंग बदलें\n${label}: ${value}`,
    previewDelete: (member) => `सदस्य हटाएँ\n${member.name} (${member.memberId})\nइससे सदस्य के बचत रिकॉर्ड भी हटेंगे। बकाया कर्ज़ होने पर हटाना रोका जाएगा।`,
    previewMemberMessage: (member, message) => `ऐप में संदेश भेजें\nकिसे: ${member.name} (${member.memberId})\nसंदेश: ${message}`,
    memberMessageSent: (name) => `सदस्य ${name} को ऐप में संदेश भेजा गया।`,
    previewCorrectionRequest: (member, values) => `सुधार अनुरोध\nसदस्य: ${member.name} (${member.memberId})\nप्रकार: ${values.category}\nरिकॉर्ड आईडी: ${values.reference || 'नहीं दिया'}\nआवश्यक सुधार: ${values.description}`,
    correctionRequestSent: 'आपका सुधार अनुरोध समीक्षा के लिए व्यवस्थापक को भेज दिया गया है।',
    correctionProfileMissing: 'आपका सदस्य प्रोफ़ाइल लिंक नहीं मिला। सुधार अनुरोध भेजने से पहले व्यवस्थापक से संपर्क करें।',
    correctionCategoryNames: { savings: 'बचत', loan: 'ऋण', attendance: 'उपस्थिति', passbook: 'पासबुक' },
    ambiguousMembers: (rows) => `एक से अधिक सदस्य मिले। कृपया आईडी बताएं: ${rows.map((row) => `${row.name} (${row.displayId || row.memberId})`).join(', ')}।`,
    updateField: { name: 'नाम', phone: 'फोन नंबर', address: 'पता', joinedDate: 'जुड़ने की तारीख', status: 'स्थिति' },
    updateFieldOptions: { name: ['name', 'नाम', 'नाव'], phone: ['phone', 'phone number', 'mobile', 'number', 'फोन', 'मोबाइल'], address: ['address', 'पता', 'पत्ता'], joinedDate: ['joining date', 'date', 'तारीख', 'दिनांक', 'सामील तारीख', 'सामील होण्याची तारीख'], status: ['status', 'स्थिति', 'स्थिती'] },
    corrected: 'जानकारी बदल दी गई है। कृपया आगे जारी रखें।',
    askConfirm: 'ऊपर की जानकारी जाँचें। सेव करने के लिए “पुष्टि करें” या रद्द करने के लिए “रद्द” कहें।',
    saving: 'सेव हो रहा है…',
    success: (intent) => ({ ADD_MEMBER: 'सदस्य जोड़ा गया और सत्यापित हुआ।', ADD_GOAL: 'लक्ष्य जोड़ा गया और सत्यापित हुआ।', ADD_GOAL_CONTRIBUTION: 'लक्ष्य का योगदान दर्ज और सत्यापित हुआ।', RECORD_SAVINGS: 'बचत दर्ज हुई और सत्यापित हुई।', UPDATE_MEMBER: 'सदस्य की जानकारी बदली और सत्यापित हुई।', DELETE_MEMBER: 'सदस्य हटाया गया और सत्यापित हुआ।', UPDATE_SHG_SETTING: 'समूह की सेटिंग बदली और सत्यापित हुई।', SEND_MEMBER_MESSAGE: 'सदस्य को ऐप में संदेश भेजा गया।' })[intent],
    failed: () => 'बदलाव पूरा या सत्यापित नहीं हो सका। सफलता की पुष्टि नहीं हुई। कृपया रिकॉर्ड जाँचकर फिर कोशिश करें।',
    speakingUnavailable: 'इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है।',
    speechError: 'आवाज़ स्पष्ट नहीं सुनाई दी। फिर कोशिश करें या लिखें।',
    back: 'पिछले प्रश्न पर लौट गए।',
    skipRequired: 'यह जानकारी आवश्यक है। कृपया इसका उत्तर दें।',
  },
  mr: {
    title: 'एसएचजी सहाय्यक', ask: 'मी तुम्हाला कशी मदत करू?', close: 'बंद करा', clearChat: 'नवीन चॅट', placeholder: 'प्रश्न किंवा सूचना लिहा',
    send: 'पाठवा', listen: 'बोला', listening: 'ऐकत आहे…', readAloud: 'उत्तरे मोठ्याने वाचा',
    processing: 'प्रक्रिया सुरू आहे…', speaking: 'बोलत आहे…', ready: 'तयार', speechOutputError: 'आवाज ऐकवता आला नाही. उत्तर वर वाचू शकता.',
    stop: 'थांबवा',
    speechUnavailable: 'Gemini व्हॉइस प्रक्रिया उपलब्ध नाही किंवा सेट केलेली नाही. तुम्ही संदेश टाइप करू शकता.',
    chatUnavailable: 'सहाय्यक सेवेशी संपर्क होऊ शकला नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
    welcome: 'गटाबद्दल विचारा, विभाग उघडा, किंवा “सदस्य जोडा” / “बचत नोंदवा” म्हणा.',
    unrecognized: 'तुम्हाला काय जाणून घ्यायचे किंवा करायचे आहे? तुमच्या शब्दांत सांगा.',
    unsupportedAction: 'मी सध्या सहाय्यकाद्वारे हे काम करू शकत नाही. कोणताही डेटा बदललेला नाही. विभाग उघडण्यास सांगा, एसएचजीबद्दल विचारा किंवा उपलब्ध पुष्टी केलेली कृती वापरा.',
    denied: 'हे पान किंवा कृती तुमच्या खात्यासाठी उपलब्ध नाही. तुम्ही प्रशासकाला दुरुस्तीची विनंती पाठवू शकता.',
    noActiveGoals: 'योगदान स्वीकारण्यासाठी कोणतेही सक्रिय ध्येय उपलब्ध नाही.',
    goalNotFound: (name) => `या गटाच्या नोंदीत “${name}” नावाचे ध्येय सापडले नाही.`,
    memberCount: (count) => `या गटात ${count} सदस्य आहेत.`,
    groupBalance: (amount) => `गटाची शिल्लक ${amount} आहे.`,
    groupHealth: (score) => `सध्याचा एसएचजी आर्थिक आरोग्य गुण ${score}% आहे.`,
    groupSavings: (amount) => `या एसएचजीची एकूण नोंदवलेली बचत ${amount} आहे.`,
    goalProgress: (goals, money) => goals.length
      ? goals.map((goal) => `${goal.title}: ${money(goal.targetAmount)} पैकी ${money(goal.savedAmount)} जमा; ${money(Math.max(0, Number(goal.targetAmount || 0) - Number(goal.savedAmount || 0)))} बाकी (${({ active: 'सुरू', completed: 'पूर्ण', paused: 'थांबलेले' })[goal.status] || goal.status}).`).join('\n')
      : 'या गटात अजून ध्येय-आधारित बचतीची नोंद नाही.',
    memberList: (names) => names.length ? `सदस्य: ${names.join(', ')}.` : 'दाखवण्यासाठी सदस्यांची नोंद नाही.',
    pendingLoanSummary: (count, amount) => `${count} कर्जांवर एकूण ${amount} बाकी आहे.`,
    pendingApplicationSummary: (count) => `${count} कर्ज अर्ज प्रलंबित आहेत.`,
    todayTransactions: (count, amount) => `आजच्या तारखेचे ${count} व्यवहार आहेत; एकूण ${amount}.`,
    noMemberMatch: (name) => `सध्याच्या गटाच्या नोंदीत “${name}” नावाचा सदस्य सापडला नाही.`,
    member: (name, id) => `${name}${id ? ` (आयडी: ${id})` : ''}.`,
    memberSavings: (name, amount, count) => `${name} चे ${count} बचत रेकॉर्ड आहेत; एकूण ${amount}.`,
    memberLoans: (name, amount, count) => `${name} चे ${count} कर्ज रेकॉर्ड आहेत आणि थकबाकी ${amount} आहे.`,
    memberRecords: (name, counts) => `${name} चे ${counts.savings} बचत, ${counts.loans} कर्ज, ${counts.applications} कर्ज अर्ज, ${counts.payments} पेमेंट संकलन, ${counts.transactions} व्यवहार आणि ${counts.attendance} उपस्थिती रेकॉर्ड आहेत (एकूण ${counts.total})।`,
    moduleOpened: (name) => `${name} उघडत आहे.`,
    unsupportedSearch: 'कृपया सदस्याचे नाव लिहा किंवा “किती सदस्य आहेत?” असा स्पष्ट प्रश्न विचारा.',
    whichMember: 'तुम्ही कोणत्या सदस्याबद्दल विचारत आहात? त्यांचे नाव किंवा सदस्य आयडी सांगा.',
    confirmFirst: 'सध्याच्या प्रश्नाचे उत्तर द्या किंवा कृती थांबवण्यासाठी “रद्द” म्हणा.',
    cancel: 'कृती रद्द केली. कोणताही बदल केला नाही.',
    restarted: 'संभाषण पुन्हा सुरू झाले. तुम्हाला काय करायचे आहे?',
    attendanceAskMeeting: (date) => `मी ${date} ची हजेरी नोंदवतो. या बैठकीचे किंवा कार्यक्रमाचे नाव काय ठेवू?`,
    attendanceAskTime: 'बैठकीची वेळ काय होती? वेळ नको असल्यास “वगळा” म्हणा.',
    attendanceAskLocation: 'बैठक कुठे झाली? ठिकाण नको असल्यास “वगळा” म्हणा.',
    attendanceAskRoster: 'कोण उपस्थित किंवा अनुपस्थित होते? उदाहरण: “सर्व उपस्थित, कोमल वगळता”.',
    attendanceInvalidTime: 'वेळ HH:MM (२४-तास पद्धत) मध्ये सांगा किंवा “वगळा” म्हणा.',
    attendanceUnmatchedMember: 'हे नाव कोणत्याही सदस्याशी जुळले नाही. कृपया यादीतील नाव किंवा पूर्ण नाव सांगा.',
    attendanceAmbiguousMember: 'हे नाव एकापेक्षा जास्त सदस्यांशी जुळते. योग्य सदस्यासाठी पूर्ण नावे सांगा.',
    attendanceNoStatuses: 'हजेरीची स्थिती समजली नाही. “सर्व उपस्थित, कोमल वगळता” किंवा सदस्यांची नावे व स्थिती सांगा.',
    attendancePreview: (date, title, present, absent) => `हजेरी तपासा\nबैठक: ${title}\nतारीख: ${date}\nउपस्थित (${present.length}): ${present.join(', ') || 'कोणी नाही'}\nअनुपस्थित (${absent.length}): ${absent.join(', ') || 'कोणी नाही'}`,
    attendanceAskConfirm: 'हजेरी जतन करण्यासाठी “पुष्टी करा” म्हणा, किंवा न जतन करता रद्द करण्यासाठी “रद्द” म्हणा.',
    attendanceSaving: 'हजेरी जतन होत आहे…',
    attendanceSaved: 'हजेरी जतन करून पडताळली आहे.',
    attendanceRefreshFailed: 'हजेरी जतन करून पडताळली आहे, पण स्क्रीन रिफ्रेश होऊ शकली नाही. कृपया पृष्ठ पुन्हा लोड करा.',
    attendanceSaveFailed: (message) => `हजेरी जतन झाल्याची खात्री करता आली नाही. ${message}`,
    permission: 'हा बदल फक्त प्रशासक करू शकतो. सदस्य दुरुस्तीची विनंती पाठवू शकतात.',
    askMemberForDelete: 'कोणत्या सदस्याला काढायचे आहे? त्यांचे पूर्ण नाव किंवा सदस्य आयडी सांगा.',
    askMemberForUpdate: 'कोणत्या सदस्याची माहिती बदलायची आहे? त्यांचे पूर्ण नाव किंवा सदस्य आयडी सांगा.',
    askField: {
      name: 'नवीन सदस्याचे पूर्ण नाव काय आहे?',
      phone: 'सदस्याचा फोन नंबर काय आहे? नसेल तर “वगळा” म्हणा.',
      address: 'सदस्याचा पत्ता काय आहे? नसेल तर “वगळा” म्हणा.',
      joinedDate: 'सामील झाल्याची तारीख YYYY-MM-DD मध्ये सांगा. आजसाठी “वगळा” म्हणा.',
      member: 'ही बचत कोणत्या सदस्यासाठी आहे? नाव किंवा सदस्य आयडी लिहा.',
      messageMember: 'अॅपमधील संदेश कोणत्या सदस्याला पाठवायचा? त्यांचे नाव किंवा सदस्य आयडी सांगा.',
      messageText: 'या सदस्याला कोणता संदेश पाठवायचा?',
      correctionCategory: 'कोणत्या प्रकारच्या नोंदीत दुरुस्ती हवी: बचत, कर्ज, हजेरी की पासबुक?',
      correctionReference: 'पावती, व्यवहार, बैठक किंवा नोंदीचा आयडी काय आहे? माहीत नसेल तर “वगळा” म्हणा.',
      correctionDescription: 'काय चुकीचे आहे आणि कोणती दुरुस्ती हवी ते सांगा.',
      amount: 'किती बचत नोंदवायची आहे?',
      month: 'कोणत्या महिन्यासाठी? YYYY-MM लिहा, उदा. 2025-06.',
      actualDate: 'बचत कोणत्या दिवशी मिळाली (YYYY-MM-DD)? आजसाठी “वगळा” म्हणा.',
      title: 'नवीन ध्येयाचे नाव काय ठेवायचे?',
      targetAmount: 'या ध्येयासाठी किती रक्कम हवी?',
      dueDate: 'ध्येयाची तारीख YYYY-MM-DD मध्ये सांगा. तारीख नसेल तर “वगळा” म्हणा.',
      goalContribution: 'कोणत्या सक्रिय ध्येयात योगदान जमा करायचे? ध्येयाचे नाव सांगा.',
      note: 'या योगदानासाठी नोंद हवी आहे का? नसेल तर “वगळा” म्हणा.',
      field: 'कोणती माहिती बदलायची: नाव, फोन, पत्ता, सामील तारीख की स्थिती?',
      setting: 'कोणती सेटिंग बदलायची: उशिराच्या दंडाची रक्कम, कर्ज व्याज, बचत व्याज, मासिक बचत रक्कम की भरण्याचा दिवस?',
      value: (field) => `नवीन ${field} काय असावे?`,
    },
    invalid: {
      name: 'किमान दोन अक्षरांचे नाव लिहा.',
      phone: '10 अंकी फोन नंबर द्या किंवा “वगळा” म्हणा.',
      date: 'तारीख YYYY-MM-DD मध्ये द्या किंवा “वगळा” म्हणा.',
      member: 'एक विशिष्ट सदस्य सापडला नाही. पूर्ण नाव किंवा सदस्य आयडी द्या.',
      ambiguous: 'एकापेक्षा अधिक सदस्य जुळतात. कृपया योग्य सदस्य आयडी द्या.',
      amount: 'अंकांमध्ये सकारात्मक रक्कम लिहा.',
      month: 'महिना YYYY-MM मध्ये लिहा, उदा. 2025-06.',
      goal: 'किमान दोन अक्षरांचे ध्येयाचे नाव द्या.',
      goalAmount: 'अंकांमध्ये सकारात्मक लक्ष्य रक्कम द्या.',
      message: '1 ते 1000 अक्षरांमधील संदेश लिहा.',
      correctionCategory: 'बचत, कर्ज, हजेरी किंवा पासबुक यापैकी एक निवडा.',
      correctionDescription: '1 ते 1000 अक्षरांत दुरुस्तीचे वर्णन द्या.',
    },
    previewMember: (values) => `सदस्य जोडा\nनाव: ${values.name}\nफोन: ${values.phone || '—'}\nपत्ता: ${values.address || '—'}\nसामील तारीख: ${values.joinedDate || 'आज'}`,
    previewSavings: (values) => `मासिक बचत नोंदवा\nसदस्य: ${values.memberName}\nरक्कम: ${values.amount}\nमहिना: ${values.month}\nमिळाल्याची तारीख: ${values.actualDate || 'आज'}\nउशिराचा दंड सध्याच्या बचत प्रक्रियेनुसार मोजला जाईल.`,
    previewGoal: (values, formatCurrency) => `ध्येय जोडा\nध्येय: ${values.title}\nरक्कम: ${formatCurrency(values.targetAmount)}\nतारीख: ${values.dueDate || 'निश्चित नाही'}`,
    previewGoalContribution: (values, formatCurrency) => `ध्येयात योगदान\nध्येय: ${values.goalName}\nयोगदान: ${formatCurrency(values.amount)}\nयोगदानानंतर जमा: ${formatCurrency(Number(values.savedAmount || 0) + Number(values.amount))} / ${formatCurrency(values.targetAmount)}\nबाकी: ${formatCurrency(Math.max(0, Number(values.targetAmount || 0) - Number(values.savedAmount || 0) - Number(values.amount)))}\nनोंद: ${values.note || '—'}`,
    previewUpdate: (member, field, label, value) => `सदस्याची माहिती बदला\n${member.name} (${member.memberId})\n${label}: ${member[field] || '—'} → ${value}`,
    previewShgSetting: (label, value) => `गटाची सेटिंग बदला\n${label}: ${value}`,
    previewDelete: (member) => `सदस्य काढा\n${member.name} (${member.memberId})\nयामुळे सदस्याचे बचत रेकॉर्डही हटतील. थकित कर्ज असल्यास काढणे रोखले जाईल.`,
    previewMemberMessage: (member, message) => `अॅपमधील संदेश पाठवा\nकोणाला: ${member.name} (${member.memberId})\nसंदेश: ${message}`,
    memberMessageSent: (name) => `${name} या सदस्याला अॅपमधील संदेश पाठवला.`,
    previewCorrectionRequest: (member, values) => `दुरुस्ती विनंती\nसदस्य: ${member.name} (${member.memberId})\nप्रकार: ${values.category}\nनोंद आयडी: ${values.reference || 'दिला नाही'}\nआवश्यक दुरुस्ती: ${values.description}`,
    correctionRequestSent: 'तुमची दुरुस्ती विनंती प्रशासकाकडे पुनरावलोकनासाठी पाठवली.',
    correctionProfileMissing: 'तुमची सदस्य प्रोफाइल जोडलेली आढळली नाही. दुरुस्ती विनंती पाठवण्यापूर्वी प्रशासकाशी संपर्क साधा.',
    correctionCategoryNames: { savings: 'बचत', loan: 'कर्ज', attendance: 'हजेरी', passbook: 'पासबुक' },
    ambiguousMembers: (rows) => `एकापेक्षा अधिक सदस्य जुळतात. कृपया आयडी सांगा: ${rows.map((row) => `${row.name} (${row.displayId || row.memberId})`).join(', ')}.`,
    updateField: { name: 'नाव', phone: 'फोन क्रमांक', address: 'पत्ता', joinedDate: 'सामील तारीख', status: 'स्थिती' },
    updateFieldOptions: { name: ['name', 'नाम', 'नाव'], phone: ['phone', 'phone number', 'mobile', 'number', 'फोन', 'मोबाइल'], address: ['address', 'पता', 'पत्ता'], joinedDate: ['joining date', 'date', 'तारीख', 'दिनांक', 'सामील तारीख', 'सामील होण्याची तारीख'], status: ['status', 'स्थिति', 'स्थिती'] },
    corrected: 'माहिती बदलली आहे. कृपया पुढे सुरू ठेवा.',
    askConfirm: 'वरील माहिती तपासा. जतन करण्यासाठी “पुष्टी करा” किंवा रद्द करण्यासाठी “रद्द” म्हणा.',
    saving: 'जतन करत आहे…',
    success: (intent) => ({ ADD_MEMBER: 'सदस्य जोडला आणि तपासला.', ADD_GOAL: 'ध्येय जोडले आणि तपासले.', ADD_GOAL_CONTRIBUTION: 'ध्येयाचे योगदान नोंदवले आणि तपासले.', RECORD_SAVINGS: 'बचत नोंदवली आणि तपासली.', UPDATE_MEMBER: 'सदस्याची माहिती बदलली आणि तपासली.', DELETE_MEMBER: 'सदस्य काढला आणि तपासला.', UPDATE_SHG_SETTING: 'गटाची सेटिंग बदलली आणि तपासली.', SEND_MEMBER_MESSAGE: 'सदस्याला अॅपमधील संदेश पाठवला.' })[intent],
    failed: () => 'बदल पूर्ण किंवा तपासता आला नाही. यशाची पुष्टी झालेली नाही. कृपया नोंदी तपासून पुन्हा प्रयत्न करा.',
    speakingUnavailable: 'या ब्राउझरमध्ये आवाज ओळख उपलब्ध नाही.',
    speechError: 'आवाज स्पष्ट ऐकू आला नाही. पुन्हा प्रयत्न करा किंवा लिहा.',
    back: 'मागील प्रश्नावर परत गेलो.',
    skipRequired: 'ही माहिती आवश्यक आहे. कृपया उत्तर द्या.',
  },
}

const moduleNames = {
  dashboard: ['dashboard', 'डॅशबोर्ड', 'डॅशबोर्ड'], profile: ['profile', 'प्रोफाइल', 'प्रोफाइल'],
  notifications: ['notifications', 'सूचनाएँ', 'सूचना'], savings: ['savings', 'बचत', 'बचत'],
  loanCollection: ['loan collection', 'कर्ज वसूली', 'कर्ज वसुली'], loanDetails: ['loan details', 'कर्ज विवरण', 'कर्ज तपशील'],
  loanDemandRisk: ['loan demand and risk', 'कर्ज मांग और जोखिम', 'कर्ज मागणी आणि जोखीम'],
  loans: ['loans', 'कर्ज', 'कर्ज'], ledger: ['ledger', 'लेजर', 'खातेवही'], otherExpense: ['expenses', 'खर्च', 'खर्च'],
  otherIncome: ['income', 'आय', 'उत्पन्न'], passbook: ['passbook', 'पासबुक', 'पासबुक'], monthly: ['monthly accounts', 'मासिक खाते', 'मासिक खाते'],
  memberBalanceSheet: ['member balance sheet', 'सदस्य बैलेंस शीट', 'सदस्य ताळेबंद'], balance: ['balance sheet', 'बैलेंस शीट', 'ताळेबंद'],
  members: ['members', 'सदस्य', 'सदस्य'], removeMember: ['remove member', 'सदस्य हटाएँ', 'सदस्य काढा'],
  rulesNotice: ['rules and notices', 'नियम और सूचना', 'नियम आणि सूचना'], meetings: ['meetings', 'बैठकें', 'बैठका'],
  attendance: ['attendance', 'उपस्थिति', 'उपस्थिती'], goals: ['goals', 'लक्ष्य', 'ध्येय'],
  emergency: ['emergency fund', 'आपातकालीन निधि', 'आपत्कालीन निधी'], documents: ['documents', 'दस्तावेज़', 'कागदपत्रे'],
  loanApplications: ['loan applications', 'कर्ज आवेदन', 'कर्ज अर्ज'], editRequests: ['correction requests', 'सुधार अनुरोध', 'दुरुस्ती विनंती'],
  calculationReport: ['calculation report', 'गणना रिपोर्ट', 'गणना अहवाल'], reports: ['reports', 'रिपोर्ट', 'अहवाल'],
  insights: ['insights', 'जानकारी', 'माहिती'], schemes: ['schemes', 'योजनाएँ', 'योजना'],
  penaltySettings: ['penalty settings', 'जुर्माना सेटिंग', 'दंड सेटिंग'], interestSettings: ['interest settings', 'ब्याज सेटिंग', 'व्याज सेटिंग'],
  shareApp: ['share app', 'ऐप साझा करें', 'अॅप शेअर करा'], settings: ['settings', 'सेटिंग', 'सेटिंग'],
  loanApplication: ['loan application', 'कर्ज आवेदन', 'कर्ज अर्ज'],
}

const shgSettingNames = {
  latePenaltyAmount: ['late penalty per day', 'प्रतिदिन देर का जुर्माना', 'दररोज उशिराचा दंड'],
  loanInterestRate: ['loan interest rate', 'कर्ज़ ब्याज दर', 'कर्ज व्याजदर'],
  savingsInterestRate: ['savings interest rate', 'बचत ब्याज दर', 'बचत व्याजदर'],
  monthlySavingsAmount: ['monthly savings amount', 'मासिक बचत राशि', 'मासिक बचत रक्कम'],
  monthlySavingsDueDay: ['monthly savings due day', 'मासिक बचत जमा करने का दिन', 'मासिक बचत भरण्याचा दिवस'],
}

const settingAliases = {
  latePenaltyAmount: ['late penalty', 'penalty', 'दंड', 'जुर्माना'],
  loanInterestRate: ['loan interest', 'interest on loan', 'कर्ज़ ब्याज', 'कर्ज व्याज'],
  savingsInterestRate: ['savings interest', 'बचत ब्याज'],
  monthlySavingsAmount: ['monthly savings amount', 'मासिक बचत राशि', 'मासिक बचत रक्कम'],
  monthlySavingsDueDay: ['savings due day', 'due day', 'जमा करने का दिन', 'भरण्याचा दिवस'],
}

const backPhrases = ['back', 'go back', 'पिछला', 'वापस', 'मागे']

function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value) {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null
  return `${year}-${month}-${day}`
}

function parseNumericCommand(value) {
  const digitNormalized = String(value).replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966))
  const numericText = digitNormalized
  .replace(/rupees?|rs\.?|रुपये|रुपया|रु/gi, '')
    .replace(/[,\s₹$]/g, '')
  if (!/^\d+(?:\.\d+)?$/.test(numericText)) return NaN
  return Number(numericText)
}

function AssistantPanel({ language: initialLanguage, role, data, setActive, onMutation, close }) {
  const [language, setLanguage] = useState(initialLanguage)
  const [messages, setMessages] = useState(() => [{ role: 'assistant', text: (copy[initialLanguage] || copy.en).welcome }])
  const [text, setText] = useState('')
  const [conversation, setConversation] = useState(null)
  const [attendanceFlow, setAttendanceFlow] = useState(null)
  const [pendingQuery, setPendingQuery] = useState(null)
  const [paymentStatusContext, setPaymentStatusContext] = useState(null)
  const [listening, setListening] = useState(false)
  const [processingSpeech, setProcessingSpeech] = useState(false)
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [readAloud, setReadAloud] = useState(true)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const recognitionRequestRef = useRef(0)
  const stopRequestedRef = useRef(0)
  const logRef = useRef(null)
  const t = copy[language] || copy.en

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages])

  useEffect(() => () => {
    recognitionRequestRef.current += 1
    recognitionRef.current?.cancel()
    cancelSpokenResponse()
  }, [])

  function reply(value) {
    setMessages((current) => [...current, { role: 'assistant', text: value }])
    if (readAloud) {
      speakResponse(value, language, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: (speechError) => {
          setSpeaking(false)
          setError(speechError?.message || t.speechOutputError)
        },
      })
    }
  }

  function askField(flow) {
    const field = getCurrentField(flow)
    if (field === 'member' && flow.intent === 'DELETE_MEMBER') {
      reply(t.askMemberForDelete)
      return
    }
    if (field === 'member' && flow.intent === 'UPDATE_MEMBER') {
      reply(t.askMemberForUpdate)
      return
    }
    if (field === 'category' && flow.intent === 'SUBMIT_EDIT_REQUEST') {
      reply(t.askField.correctionCategory)
      return
    }
    if (field === 'reference' && flow.intent === 'SUBMIT_EDIT_REQUEST') {
      reply(t.askField.correctionReference)
      return
    }
    if (field === 'description' && flow.intent === 'SUBMIT_EDIT_REQUEST') {
      reply(t.askField.correctionDescription)
      return
    }
    if (field === 'member' && flow.intent === 'SEND_MEMBER_MESSAGE') {
      reply(t.askField.messageMember)
      return
    }
    if (field === 'message' && flow.intent === 'SEND_MEMBER_MESSAGE') {
      reply(t.askField.messageText)
      return
    }
    if (field === 'goal' && flow.intent === 'ADD_GOAL_CONTRIBUTION') {
      reply(t.askField.goalContribution)
      return
    }
    if (field === 'field' && flow.intent === 'UPDATE_SHG_SETTING') {
      reply(t.askField.setting)
      return
    }
    if (field === 'value' && flow.intent === 'UPDATE_MEMBER') {
      reply(t.askField.value(t.updateField[flow.values.field]))
      return
    }
    if (field === 'value' && flow.intent === 'UPDATE_SHG_SETTING') {
      const languageIndex = language === 'hi' ? 1 : language === 'mr' ? 2 : 0
      reply(t.askField.value(shgSettingNames[flow.values.field]?.[languageIndex] || flow.values.field))
      return
    }
    reply(t.askField[field])
  }

  function beginFlow(intent, entities = {}) {
    if (intent === 'SUBMIT_EDIT_REQUEST') {
      if (role !== 'member') {
        reply(t.permission)
        return
      }
      const member = currentMember()
      if (!member) {
        reply(t.correctionProfileMissing)
        return
      }
    }
    if (role !== 'admin' && intent !== 'SUBMIT_EDIT_REQUEST') {
      reply(t.permission)
      return
    }
    if (intent === 'ADD_GOAL_CONTRIBUTION'
      && !(data.goals || []).some((goal) => goal.status === 'active')) {
      reply(t.noActiveGoals)
      return
    }
    const initialValues = {}
    const suppliedMember = entities.memberId
      ? (data.members || []).find((member) => String(member._id || member.id) === String(entities.memberId))
      : null
    if (suppliedMember) initialValues.member = suppliedMember._id || suppliedMember.id
    if (intent === 'SUBMIT_EDIT_REQUEST') {
      const member = currentMember()
      initialValues.member = member._id || member.id
      initialValues.memberName = member.name
      initialValues.memberId = member.memberId
    }
    if (entities.memberName) initialValues.memberName = entities.memberName
    if (!initialValues.member && entities.memberName && ['UPDATE_MEMBER', 'DELETE_MEMBER'].includes(intent)) {
      const exactMatches = memberMatches(entities.memberName).filter((member) =>
        normalizeCommand(member.name) === normalizeCommand(entities.memberName)
        || normalizeCommand(member.memberId) === normalizeCommand(entities.memberName),
      )
      if (exactMatches.length === 1) {
        initialValues.member = exactMatches[0]._id || exactMatches[0].id
        initialValues.memberName = exactMatches[0].name
      }
    }
    if (intent === 'ADD_MEMBER') {
      const memberName = typeof entities.name === 'string' ? entities.name : entities.memberName
      if (typeof memberName === 'string' && memberName.trim().length >= 2) initialValues.name = memberName.trim().slice(0, 100)
      if (typeof entities.phone === 'string' && isValidPhone(entities.phone)) initialValues.phone = entities.phone
      if (typeof entities.address === 'string') initialValues.address = entities.address.trim().slice(0, 300)
      if (typeof entities.joinedDate === 'string') initialValues.joinedDate = parseDate(entities.joinedDate) || undefined
    }
    if (intent === 'ADD_GOAL') {
      if (typeof entities.title === 'string' && entities.title.trim().length >= 2) initialValues.title = entities.title.trim().slice(0, 120)
      const targetAmount = Number(entities.targetAmount)
      if (Number.isFinite(targetAmount) && targetAmount > 0) initialValues.targetAmount = targetAmount
      if (typeof entities.dueDate === 'string') initialValues.dueDate = parseDate(entities.dueDate) || undefined
    }
    if (intent === 'ADD_GOAL_CONTRIBUTION') {
      const requestedGoal = typeof entities.goalName === 'string' ? entities.goalName : ''
      const goalCandidates = (data.goals || []).filter((goal) => goal.status === 'active')
      const matchingGoals = requestedGoal
        ? goalCandidates.filter((goal) => normalizeCommand(goal.title) === normalizeCommand(requestedGoal))
        : []
      if (matchingGoals.length === 1) {
        const goal = matchingGoals[0]
        initialValues.goal = goal._id || goal.id
        initialValues.goalName = goal.title
        initialValues.savedAmount = Number(goal.savedAmount || 0)
        initialValues.targetAmount = Number(goal.targetAmount || 0)
      }
      const amount = Number(entities.amount)
      if (Number.isFinite(amount) && amount > 0) initialValues.amount = amount
      if (typeof entities.note === 'string') initialValues.note = entities.note.trim().slice(0, 300)
    }
    if (intent === 'UPDATE_MEMBER' && initialValues.field && entities.value !== undefined) {
      const field = initialValues.field
      const candidate = String(entities.value).trim()
      let validatedValue
      if (field === 'name' && candidate.length >= 2) validatedValue = candidate.slice(0, 100)
      else if (field === 'phone' && isValidPhone(candidate)) validatedValue = candidate
      else if (field === 'address' && candidate) validatedValue = candidate.slice(0, 300)
      else if (field === 'joinedDate') validatedValue = parseDate(candidate) || undefined
      else if (field === 'status') {
        const normalizedStatus = normalizeCommand(candidate)
        if (['active', 'सक्रिय', 'चालू'].includes(normalizedStatus)) validatedValue = 'active'
        else if (['inactive', 'निष्क्रिय', 'बंद'].includes(normalizedStatus)) validatedValue = 'inactive'
      }
      if (validatedValue !== undefined) initialValues.value = validatedValue
    }
    if (intent === 'RECORD_SAVINGS') {
      const memberMatchesForSavings = entities.memberName
        ? memberMatches(entities.memberName).filter((candidate) =>
          normalizeCommand(candidate.name) === normalizeCommand(entities.memberName)
          || normalizeCommand(candidate.memberId) === normalizeCommand(entities.memberName))
        : []
      const member = suppliedMember || (memberMatchesForSavings.length === 1 ? memberMatchesForSavings[0] : null)
      if (member) {
        initialValues.member = member._id || member.id
        initialValues.memberName = member.name
      }
      const amount = Number(entities.amount)
      if (Number.isFinite(amount) && amount > 0) initialValues.amount = amount
      if (typeof entities.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(entities.month)) initialValues.month = entities.month
      const receivedDate = entities.actualDate || entities.date
      initialValues.actualDate = typeof receivedDate === 'string' && receivedDate
        ? parseDate(receivedDate) || undefined
        : new Date().toISOString().slice(0, 10)
    }
    const memberFields = new Set(['name', 'phone', 'address', 'joinedDate', 'status'])
    const settingFields = new Set(Object.keys(shgSettingNames))
    if (['UPDATE_MEMBER', 'UPDATE_SHG_SETTING'].includes(intent)
      && typeof entities.field === 'string'
      && (intent === 'UPDATE_MEMBER' ? memberFields : settingFields).has(entities.field)) {
      initialValues.field = entities.field
    }
    if (intent === 'UPDATE_SHG_SETTING') {
      const value = Number(entities.value)
      if (Number.isFinite(value) && value >= 0
        && (initialValues.field !== 'monthlySavingsDueDay' || (Number.isInteger(value) && value >= 1 && value <= 28))) {
        initialValues.value = value
      }
    }
    const flow = startConversation(intent, initialValues)
    setConversation(flow)
    if (flow.status === 'AWAITING_CONFIRMATION') preview(flow)
    else askField(flow)
  }

  function memberMatches(value) {
    const query = normalizeCommand(value)
    if (!query) return []
    return (data.members || []).filter((member) => {
      const name = normalizeCommand(member.name)
      const id = normalizeCommand(member.memberId)
      return id === query || name === query || name.split(' ').some((part) => part.startsWith(query))
    })
  }

  function preview(flow) {
    const values = flow.values
    const member = (data.members || []).find((row) => String(row._id || row.id) === String(values.member))
      || (flow.intent === 'SUBMIT_EDIT_REQUEST' ? currentMember() : null)
    const goal = (data.goals || []).find((row) => String(row._id || row.id) === String(values.goal))
    const previewText = flow.intent === 'ADD_MEMBER' ? t.previewMember(values)
      : flow.intent === 'ADD_GOAL' ? t.previewGoal(values, formatMoney)
      : flow.intent === 'ADD_GOAL_CONTRIBUTION' && goal ? t.previewGoalContribution(values, formatMoney)
      : flow.intent === 'RECORD_SAVINGS' ? t.previewSavings(values)
      : flow.intent === 'SEND_MEMBER_MESSAGE' && member ? t.previewMemberMessage(member, values.message)
      : flow.intent === 'SUBMIT_EDIT_REQUEST' && member ? t.previewCorrectionRequest(member, {
        ...values,
        category: t.correctionCategoryNames[values.category],
      })
        : flow.intent === 'UPDATE_MEMBER' && member ? t.previewUpdate(member, values.field, t.updateField[values.field], values.value)
          : flow.intent === 'UPDATE_SHG_SETTING' && Object.hasOwn(shgSettingNames, values.field)
            ? t.previewShgSetting(
              shgSettingNames[values.field][language === 'hi' ? 1 : language === 'mr' ? 2 : 0],
              `${data.shg?.[values.field] ?? '—'} → ${values.value}`,
            )
          : flow.intent === 'DELETE_MEMBER' && member ? t.previewDelete(member)
            : t.unrecognized
    reply(previewText)
    reply(t.askConfirm)
  }

  function submitFlowValue(value) {
    if (!conversation) return
    const field = getCurrentField(conversation)
    let extraValues = {}
    const clean = String(value).trim()
    const normalized = clean.toLocaleLowerCase()
    const canSkip = (conversation.intent === 'ADD_MEMBER' && ['phone', 'address', 'joinedDate'].includes(field))
      || (conversation.intent === 'ADD_GOAL' && field === 'dueDate')
      || (conversation.intent === 'ADD_GOAL_CONTRIBUTION' && field === 'note')
      || (conversation.intent === 'RECORD_SAVINGS' && field === 'actualDate')
      || (conversation.intent === 'SUBMIT_EDIT_REQUEST' && field === 'reference')
    const isSkip = isSkipPhrase(clean)
    if (isSkip && !canSkip) {
      reply(t.skipRequired)
      return
    }

    let nextValue = clean
    if (isSkip) nextValue = ['joinedDate', 'actualDate'].includes(field) ? localToday() : ''
    if (field === 'name' && clean.length < 2) return reply(t.invalid.name)
    if (field === 'title' && clean.length < 2) return reply(t.invalid.goal)
    if (field === 'phone' && nextValue && !isValidPhone(nextValue)) return reply(t.invalid.phone)
    if (field === 'targetAmount') {
      const amount = parseNumericCommand(clean)
      if (!Number.isFinite(amount) || amount <= 0) return reply(t.invalid.goalAmount)
      nextValue = amount
    }
    if (field === 'joinedDate' && !isSkip) {
      nextValue = ['today', 'आज', 'आजच'].includes(normalized) ? localToday() : parseDate(clean)
      if (!nextValue) return reply(t.invalid.date)
    }
    if (field === 'dueDate' && !isSkip) {
      nextValue = parseDate(clean)
      if (!nextValue) return reply(t.invalid.date)
    }
    if (field === 'actualDate' && !isSkip) {
      nextValue = parseDate(clean)
      if (!nextValue) return reply(t.invalid.date)
    }
    if (field === 'member') {
      const matches = memberMatches(clean)
      if (!matches.length) return reply(t.invalid.member)
      if (matches.length > 1) return reply(t.invalid.ambiguous)
      nextValue = matches[0]._id || matches[0].id
      extraValues.memberName = matches[0].name
    }
    if (field === 'message' && conversation.intent === 'SEND_MEMBER_MESSAGE') {
      if (!clean || clean.length > 1000) return reply(t.invalid.message)
      nextValue = clean
    }
    if (field === 'category' && conversation.intent === 'SUBMIT_EDIT_REQUEST') {
      const category = parseCorrectionCategory(clean)
      if (!category) return reply(t.invalid.correctionCategory)
      nextValue = category
    }
    if (field === 'description' && conversation.intent === 'SUBMIT_EDIT_REQUEST') {
      if (!clean || clean.length > 1000) return reply(t.invalid.correctionDescription)
      nextValue = clean
    }
    if (field === 'goal' && conversation.intent === 'ADD_GOAL_CONTRIBUTION') {
      const goals = (data.goals || []).filter((goal) => goal.status === 'active')
      const matches = goals.filter((goal) =>
        normalizeCommand(goal.title) === normalizeCommand(clean)
        || normalizeCommand(goal.title).startsWith(normalizeCommand(clean)),
      )
      if (!matches.length) return reply(t.invalid.goal)
      if (matches.length > 1) return reply(t.invalid.ambiguous)
      const goal = matches[0]
      nextValue = goal._id || goal.id
      extraValues.goalName = goal.title
      extraValues.savedAmount = Number(goal.savedAmount || 0)
      extraValues.targetAmount = Number(goal.targetAmount || 0)
    }
    if (field === 'field' && conversation.intent === 'UPDATE_MEMBER') {
      const selected = Object.entries(t.updateFieldOptions).find(([, aliases]) => aliases.some((alias) => normalized === alias))
      if (!selected) return reply(t.askField.field)
      nextValue = selected[0]
    }
    if (field === 'field' && conversation.intent === 'UPDATE_SHG_SETTING') {
      const selected = Object.entries(settingAliases).find(([, aliases]) =>
        aliases.some((alias) => normalizeCommand(alias) === normalizeCommand(clean)
          || normalizeCommand(clean).includes(normalizeCommand(alias))),
      )
      if (!selected) return reply(t.askField.setting)
      nextValue = selected[0]
    }
    if (field === 'value' && conversation.intent === 'UPDATE_MEMBER') {
      const updateField = conversation.values.field
      if (updateField === 'name' && clean.length < 2) return reply(t.invalid.name)
      if (updateField === 'phone' && !isValidPhone(clean)) return reply(t.invalid.phone)
      if (updateField === 'joinedDate') {
        nextValue = ['today', 'आज', 'आजच'].includes(normalized) ? localToday() : parseDate(clean)
        if (!nextValue) return reply(t.invalid.date)
      }
      if (updateField === 'status' && !['active', 'inactive', 'सक्रिय', 'निष्क्रिय', 'चालू', 'बंद'].includes(normalized)) {
        return reply(t.askField.value(t.updateField.status))
      }
      if (updateField === 'status') nextValue = ['active', 'सक्रिय', 'चालू'].includes(normalized) ? 'active' : 'inactive'
    }
    if (field === 'amount') {
      const amount = parseNumericCommand(clean)
      if (!Number.isFinite(amount) || amount <= 0) return reply(t.invalid.amount)
      nextValue = amount
    }
    if (field === 'value' && conversation.intent === 'UPDATE_SHG_SETTING') {
      const settingValue = parseNumericCommand(clean)
      if (!Number.isFinite(settingValue) || settingValue < 0) return reply(t.invalid.amount)
      if (conversation.values.field === 'monthlySavingsDueDay'
        && (!Number.isInteger(settingValue) || settingValue < 1 || settingValue > 28)) {
        return reply(t.invalid.amount)
      }
      nextValue = settingValue
    }
    if (field === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(clean)) return reply(t.invalid.month)

    const flow = advanceConversation(conversation, nextValue)
    flow.values = { ...flow.values, ...extraValues }
    setConversation(flow)
    if (flow.status === 'AWAITING_CONFIRMATION') preview(flow)
    else askField(flow)
  }

  async function confirmFlow() {
    if (!conversation || conversation.status !== 'AWAITING_CONFIRMATION') {
      reply(t.confirmFirst)
      return
    }
    if (role !== 'admin' && !(role === 'member' && conversation.intent === 'SUBMIT_EDIT_REQUEST')) {
      setConversation(null)
      reply(t.permission)
      return
    }
    const { intent, values } = conversation
    const shgId = data.shg?._id || data.shg?.id
    const needsShg = ['ADD_MEMBER', 'ADD_GOAL', 'RECORD_SAVINGS', 'DELETE_MEMBER', 'UPDATE_SHG_SETTING'].includes(conversation.intent)
    if (needsShg && !shgId) {
      reply(t.failed('The SHG could not be identified.'))
      return
    }
    const payload = intent === 'ADD_MEMBER'
      ? { shg: shgId, name: values.name, ...(values.phone ? { phone: values.phone } : {}), ...(values.address ? { address: values.address } : {}), ...(values.joinedDate ? { joinedDate: values.joinedDate } : {}) }
      : intent === 'ADD_GOAL'
        ? { shg: shgId, title: values.title, targetAmount: values.targetAmount, ...(values.dueDate ? { dueDate: values.dueDate } : {}) }
        : intent === 'ADD_GOAL_CONTRIBUTION'
          ? { goal: values.goal, amount: values.amount, ...(values.note ? { note: values.note } : {}) }
      : intent === 'RECORD_SAVINGS'
        ? { shg: shgId, member: values.member, month: values.month, amount: values.amount, actualDate: values.actualDate }
        : intent === 'UPDATE_MEMBER'
          ? { member: values.member, field: values.field, value: values.value }
            : intent === 'UPDATE_SHG_SETTING'
              ? { shg: shgId, field: values.field, value: values.value }
              : { shg: shgId, member: values.member }
    setBusy(true)
    reply(t.saving)
    try {
      if (intent === 'SUBMIT_EDIT_REQUEST') {
        await api('/edit-requests', {
          method: 'POST',
          body: JSON.stringify({
            category: values.category,
            reference: values.reference || '',
            description: values.description,
          }),
        })
        setConversation(null)
        await onMutation?.()
        reply(t.correctionRequestSent)
        return
      }
      if (intent === 'SEND_MEMBER_MESSAGE') {
        const result = await api('/notifications/member-message', {
          method: 'POST',
          body: JSON.stringify({ member: values.member, message: values.message }),
        })
        setConversation(null)
        window.dispatchEvent(new Event('shgms-notifications-updated'))
        await onMutation?.()
        reply(t.memberMessageSent(result.recipient?.name || ''))
        return
      }
      await executeRegisteredAction(intent, payload, role)
      setConversation(null)
      await onMutation?.()
      reply(t.success(intent))
    } catch (actionError) {
      reply(t.failed(actionError.message))
    } finally {
      setBusy(false)
    }
  }

  function applyCorrection(command) {
    const correction = parseCorrection(command)
    if (!correction || !conversation) return false
    const { field: rawLabel, value } = correction
    const label = rawLabel
    const normalizedLabel = label.toLocaleLowerCase()
    const field = ['joining date', 'तारीख', 'दिनांक'].includes(normalizedLabel) ? 'joinedDate'
      : ['actual date', 'received date', 'collection date', 'date', 'प्राप्ति तारीख', 'मिळाल्याची तारीख'].includes(normalizedLabel) ? 'actualDate'
      : normalizedLabel === 'due date' ? 'dueDate'
        : ['note', 'नोंद', 'टिप्पणी'].includes(normalizedLabel) ? 'note'
        : ['target amount'].includes(normalizedLabel) ? 'targetAmount'
          : ['राशि', 'रक्कम'].includes(normalizedLabel)
            ? (conversation.intent === 'ADD_GOAL' ? 'targetAmount' : 'amount')
          : normalizedLabel === 'goal' && conversation.intent === 'ADD_GOAL_CONTRIBUTION' ? 'goal'
            : normalizedLabel === 'goal' ? 'title'
            : ['phone', 'phone number', 'मोबाइल', 'फोन'].includes(normalizedLabel) ? 'phone'
              : ['नाम', 'नाव'].includes(normalizedLabel) ? 'name'
                : ['पता', 'पत्ता'].includes(normalizedLabel) ? 'address'
                  : ['स्थिति', 'स्थिती'].includes(normalizedLabel) ? 'status'
                    : ['penalty', 'penalty per day', 'जुर्माना', 'दंड', 'value'].includes(normalizedLabel) ? 'value'
                  : normalizedLabel
    const clean = value.trim().replace(/[.!?।]+$/u, '')
    const updated = { ...conversation, values: { ...conversation.values } }
    if (conversation.intent === 'UPDATE_SHG_SETTING' && field === 'value') {
      const amount = parseNumericCommand(clean)
      if (!Number.isFinite(amount) || amount < 0) return false
      if (conversation.values.field === 'monthlySavingsDueDay'
        && (!Number.isInteger(amount) || amount < 1 || amount > 28)) return false
      updated.values.value = amount
      updated.fieldIndex = 2
      updated.status = 'AWAITING_CONFIRMATION'
      setConversation(updated)
      preview(updated)
      return true
    }
    if (conversation.intent === 'UPDATE_MEMBER' && Object.hasOwn(t.updateFieldOptions, field)) {
      let correctedValue = clean
      if (field === 'name' && clean.length < 2) return false
      if (field === 'phone' && !isValidPhone(clean)) return false
      if (field === 'joinedDate') {
        correctedValue = ['today', 'आज', 'आजच'].includes(normalizeCommand(clean)) ? localToday() : parseDate(clean)
        if (!correctedValue) return false
      }
      if (field === 'status') {
        const normalized = normalizeCommand(clean)
        if (!['active', 'inactive', 'सक्रिय', 'निष्क्रिय', 'चालू', 'बंद'].includes(normalized)) return false
        correctedValue = ['active', 'सक्रिय', 'चालू'].includes(normalized) ? 'active' : 'inactive'
      }
      updated.values.field = field
      updated.values.value = correctedValue
      updated.fieldIndex = 3
      updated.status = 'AWAITING_CONFIRMATION'
      setConversation(updated)
      preview(updated)
      return true
    }
    if (field === 'goal' && conversation.intent === 'ADD_GOAL_CONTRIBUTION') {
      const matches = (data.goals || []).filter((goal) =>
        goal.status === 'active'
        && (normalizeCommand(goal.title) === normalizeCommand(clean)
          || normalizeCommand(goal.title).startsWith(normalizeCommand(clean))),
      )
      if (matches.length !== 1) return false
      updated.values.goal = matches[0]._id || matches[0].id
      updated.values.goalName = matches[0].title
      updated.values.savedAmount = Number(matches[0].savedAmount || 0)
      updated.values.targetAmount = Number(matches[0].targetAmount || 0)
    } else if (field === 'amount'
      && conversation.intent === 'ADD_GOAL_CONTRIBUTION') {
      const amount = parseNumericCommand(clean)
      if (!Number.isFinite(amount) || amount <= 0) return false
      updated.values.amount = amount
    } else if (field === 'note' && conversation.intent === 'ADD_GOAL_CONTRIBUTION') {
      updated.values.note = isSkipPhrase(clean) ? '' : clean.slice(0, 300)
    } else if (field === 'name' && (conversation.intent !== 'ADD_MEMBER' || clean.length < 2)) return false
    if (field === 'title' && (conversation.intent !== 'ADD_GOAL' || clean.length < 2)) return false
    if (field === 'targetAmount' && conversation.intent === 'ADD_GOAL') {
      const amount = parseNumericCommand(clean)
      if (!Number.isFinite(amount) || amount <= 0) return false
      updated.values.targetAmount = amount
    }
    if (field === 'actualDate' && conversation.intent === 'RECORD_SAVINGS') {
      const date = parseDate(clean)
      if (!date) return false
      updated.values.actualDate = date
    }
    if (field === 'phone' && conversation.intent === 'ADD_MEMBER' && !isValidPhone(clean)) return false
    if (field === 'address' && conversation.intent === 'ADD_MEMBER') updated.values.address = clean
    else if (field === 'name' && conversation.intent === 'ADD_MEMBER') updated.values.name = clean
    else if (field === 'title' && conversation.intent === 'ADD_GOAL') updated.values.title = clean
    else if (field === 'targetAmount' && conversation.intent === 'ADD_GOAL') {
      updated.values.targetAmount = parseNumericCommand(clean)
    }
    else if (field === 'phone' && conversation.intent === 'ADD_MEMBER') updated.values.phone = clean
    else if (field === 'dueDate' && conversation.intent === 'ADD_GOAL') {
      if (isSkipPhrase(clean)) updated.values.dueDate = ''
      else {
        const date = parseDate(clean)
        if (!date) return false
        updated.values.dueDate = date
      }
    }
    else if (field === 'date' || field === 'joinedDate') {
      const date = parseDate(clean)
      if (!date || conversation.intent !== 'ADD_MEMBER') return false
      updated.values.joinedDate = date
    } else if (field === 'member' && conversation.intent === 'RECORD_SAVINGS') {
      const matches = memberMatches(clean)
      if (matches.length !== 1) return false
      updated.values.member = matches[0]._id || matches[0].id
      updated.values.memberName = matches[0].name
    } else if (field === 'amount' && conversation.intent === 'RECORD_SAVINGS') {
      const amount = Number(clean.replace(/,/g, '').replace(/[₹$]/g, ''))
      if (!Number.isFinite(amount) || amount <= 0) return false
      updated.values.amount = amount
    } else if (field === 'month' && conversation.intent === 'RECORD_SAVINGS' && /^\d{4}-(0[1-9]|1[0-2])$/.test(clean)) {
      updated.values.month = clean
    } else if (field === 'actualDate' && conversation.intent === 'RECORD_SAVINGS') {
      const date = parseDate(clean)
      if (!date) return false
      updated.values.actualDate = date
    } else if (!(field === 'goal' || (field === 'amount' && conversation.intent === 'ADD_GOAL_CONTRIBUTION')
      || (field === 'note' && conversation.intent === 'ADD_GOAL_CONTRIBUTION')
      || (field === 'message' && conversation.intent === 'SEND_MEMBER_MESSAGE'))) return false
    if (field === 'message' && conversation.intent === 'SEND_MEMBER_MESSAGE') {
      if (!clean || clean.length > 1000) return false
      updated.values.message = clean
    }
    setConversation(updated)
    if (conversation.status === 'AWAITING_CONFIRMATION') preview(updated)
    else {
      reply(t.corrected)
      askField(updated)
    }
    return true
  }

  function findMemberFromQuery(command) {
    const normalized = String(command).toLocaleLowerCase()
    return (data.members || []).find((member) => {
      const name = String(member.name || '').toLocaleLowerCase()
      return name && normalized.includes(name)
    })
  }

  function formatMoney(value) {
    return new Intl.NumberFormat(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 2,
    }).format(Number(value) || 0)
  }

  function currentMember() {
    let user = null
    try {
      user = JSON.parse(localStorage.getItem('unnati_user') || 'null')
    } catch {
      return null
    }
    const ownId = user?.member?._id || user?.member || user?.memberId
    return (data.members || []).find((item) =>
      (ownId && String(item._id || item.id) === String(ownId))
      || (user?._id && String(item.user?._id || item.user) === String(user._id)),
    ) || null
  }

  function answerQuery(result, command) {
    if (result.intent === 'ASK_MEMBER') {
      const ownMember = role === 'member' ? currentMember() : null
      if (role === 'member' && !ownMember) return reply(t.denied)
      const candidates = (data.members || [])
        .filter((item) => role !== 'member' || String(item._id || item.id) === String(ownMember._id || ownMember.id))
        .map(({ _id, id, name, memberId }) => ({
        memberId: _id || id, name, displayId: memberId,
      }))
      if (!candidates.length) return reply(t.unsupportedSearch)
      setPendingQuery({ intent: result.entities.queryIntent, candidates })
      return reply(t.whichMember)
    }
    if (result.intent === 'CLARIFY_MEMBER') {
      if (role === 'member') {
        const ownMember = currentMember()
        const isOwnCandidate = ownMember && result.entities.candidates.some((item) =>
          String(item.memberId) === String(ownMember._id || ownMember.id))
        if (!isOwnCandidate) return reply(t.denied)
        const ownCandidate = result.entities.candidates.find((item) =>
          String(item.memberId) === String(ownMember._id || ownMember.id))
        return answerQuery({ intent: result.entities.queryIntent, entities: { memberId: ownCandidate.memberId } }, command)
      }
      setPendingQuery({ intent: result.entities.queryIntent, candidates: result.entities.candidates })
      return reply(t.ambiguousMembers(result.entities.candidates))
    }
    const member = result.entities.memberId
      ? (data.members || []).find((item) => String(item._id || item.id) === String(result.entities.memberId))
      : null
    if (role === 'member' && ['QUERY_MEMBER', 'QUERY_MEMBER_SAVINGS', 'QUERY_MEMBER_LOANS', 'QUERY_MEMBER_RECORDS'].includes(result.intent)) {
      const ownMember = currentMember()
      if (!ownMember || !member || String(member._id || member.id) !== String(ownMember._id || ownMember.id)) {
        return reply(t.denied)
      }
    }
    if (result.intent === 'QUERY_MEMBER_COUNT') return reply(t.memberCount(data.members?.length || 0))
    if (result.intent === 'QUERY_GROUP_BALANCE') return reply(t.groupBalance(formatMoney(data.summary?.groupBalance)))
    if (result.intent === 'QUERY_GROUP_HEALTH') return reply(t.groupHealth(data.summary?.financialHealth ?? 0))
    if (result.intent === 'QUERY_GOALS') {
      if (role !== 'admin') return reply(t.denied)
      const goals = (data.goals || []).filter((goal) =>
        !result.entities?.goalName
        || normalizeCommand(goal.title) === normalizeCommand(result.entities.goalName),
      )
      if (result.entities?.goalName && !goals.length) return reply(t.goalNotFound(result.entities.goalName))
      return reply(t.goalProgress(goals, formatMoney))
    }
    if (result.intent === 'QUERY_GROUP_SAVINGS') {
      const ownMember = role === 'member' ? currentMember() : null
      if (role === 'member' && !ownMember) return reply(t.denied)
      const memberId = ownMember ? String(ownMember._id || ownMember.id) : ''
      const savings = (data.savings || []).filter((row) => {
        if (!ownMember) return true
        const rowMember = row.member?._id || row.member?.id || row.memberId || row.member
        return String(rowMember) === memberId
      })
      const total = savings.reduce((sum, row) => sum + Number(row.amount || 0), 0)
      return ownMember
        ? reply(t.memberSavings(ownMember.name, formatMoney(total), savings.length))
        : reply(t.groupSavings(formatMoney(total)))
    }
    if (result.intent === 'QUERY_MEMBER_LIST') {
      if (role !== 'admin') return reply(t.denied)
      return reply(t.memberList((data.members || []).map((item) => item.name).filter(Boolean)))
    }
    if (result.intent === 'QUERY_PENDING_LOANS') {
      const memberId = role === 'member' ? String(currentMember()?._id || currentMember()?.id || '') : ''
      if (role === 'member' && !memberId) return reply(t.denied)
      const rows = (data.loans || []).filter((loan) => {
        const loanMember = loan.member?._id || loan.member?.id || loan.memberId || loan.member
        return Number(loan.outstanding || 0) > 0
          && ['pending', 'approved', 'active', 'partially_paid', 'overdue'].includes(loan.status)
          && (role !== 'member' || String(loanMember) === memberId)
      })
      return reply(t.pendingLoanSummary(
        rows.length,
        formatMoney(rows.reduce((sum, loan) => sum + Number(loan.outstanding || 0), 0)),
      ))
    }
    if (result.intent === 'QUERY_PENDING_APPLICATIONS') {
      const memberId = role === 'member' ? String(currentMember()?._id || currentMember()?.id || '') : ''
      if (role === 'member' && !memberId) return reply(t.denied)
      const rows = (data.loanApplications || []).filter((application) => {
        const applicationMember = application.member?._id || application.member?.id || application.memberId || application.member
        return application.status === 'pending'
          && (role !== 'member' || String(applicationMember) === memberId)
      })
      return reply(t.pendingApplicationSummary(rows.length))
    }
    if (result.intent === 'QUERY_TODAYS_TRANSACTIONS') {
      const ownMember = role === 'member' ? currentMember() : null
      const memberId = String(ownMember?._id || ownMember?.id || '')
      if (role === 'member' && !memberId) return reply(t.denied)
      const today = localToday()
      const rows = (data.transactions || []).filter((transaction) => {
        const transactionMember = transaction.member?._id || transaction.member?.id || transaction.memberId || transaction.member
        const transactionDate = transaction.date ? new Date(transaction.date) : null
        const transactionDateKey = transactionDate && !Number.isNaN(transactionDate.getTime())
          ? `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}-${String(transactionDate.getDate()).padStart(2, '0')}`
          : ''
        const belongsToMember = String(transactionMember) === memberId
          || (ownMember && normalizeCommand(transactionMember) === normalizeCommand(ownMember.name))
        return transactionDateKey === today
          && (role !== 'member' || belongsToMember)
      })
      return reply(t.todayTransactions(
        rows.length,
        formatMoney(rows.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)),
      ))
    }
    if (result.intent === 'QUERY_MEMBER_RECORDS' && member) {
      return reply(t.memberRecords(member.name, countMemberRecords(member, data)))
    }
    if (result.intent === 'QUERY_MEMBER' && member) return reply(t.member(member.name, member.memberId))
    if (result.intent === 'QUERY_MEMBER_SAVINGS' && member) {
      const memberId = String(member._id || member.id)
      const rows = (data.savings || []).filter((row) =>
        row.memberId
          ? String(row.memberId) === memberId
          : String(row.member || '').toLocaleLowerCase() === String(member.name).toLocaleLowerCase(),
      )
      return reply(t.memberSavings(member.name, formatMoney(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)), rows.length))
    }
    if (result.intent === 'QUERY_MEMBER_LOANS' && member) {
      const rows = (data.loans || []).filter((row) => String(row.memberId || row.member?._id || row.member).toLocaleLowerCase() === String(member._id || member.id).toLocaleLowerCase() || String(row.memberName || row.member).toLocaleLowerCase() === String(member.name).toLocaleLowerCase())
      return reply(t.memberLoans(member.name, formatMoney(rows.reduce((sum, row) => sum + Number(row.outstanding || 0), 0)), rows.length))
    }
    if (result.intent === 'SEARCH_RECORDS') {
      const found = findMemberFromQuery(command)
      const ownMember = currentMember()
      if (role === 'member' && (!found || !ownMember || String(found._id || found.id) !== String(ownMember._id || ownMember.id))) {
        return reply(t.denied)
      }
      if (found) return reply(t.member(found.name, found.memberId))
      return reply(t.unsupportedSearch)
    }
    reply(t.unrecognized)
  }

  function answerAssistantQuery(result, command) {
    const memberIntents = new Set([
      'QUERY_MEMBER', 'QUERY_MEMBER_SAVINGS', 'QUERY_MEMBER_LOANS', 'QUERY_MEMBER_RECORDS',
    ])
    if (memberIntents.has(result.intent)) {
      if (!result.entities.memberName) {
        const queryIntent = result.intent
        return answerQuery({ intent: 'ASK_MEMBER', entities: { queryIntent } }, command)
      }
      const candidates = memberMatches(result.entities.memberName)
      const exactCandidates = candidates.filter((member) =>
        normalizeCommand(member.name) === normalizeCommand(result.entities.memberName)
        || normalizeCommand(member.memberId) === normalizeCommand(result.entities.memberName),
      )
      const matches = exactCandidates.length ? exactCandidates : candidates
      if (!matches.length) return reply(t.noMemberMatch(result.entities.memberName))
      if (role === 'member') {
        const ownMember = currentMember()
        if (!ownMember || matches.length !== 1
          || String(matches[0]._id || matches[0].id) !== String(ownMember._id || ownMember.id)) {
          return reply(t.denied)
        }
      }
      if (matches.length > 1) {
        const candidatesForClarification = matches.map((member) => ({
          memberId: member._id || member.id,
          name: member.name,
          displayId: member.memberId,
        }))
        setPendingQuery({
          intent: result.intent,
          candidates: candidatesForClarification,
        })
        return reply(t.ambiguousMembers(candidatesForClarification))
      }
      return answerQuery({
        intent: result.intent,
        entities: { memberId: matches[0]._id || matches[0].id },
      }, command)
    }
    return answerQuery({ intent: result.intent, entities: result.entities || {} }, command)
  }

  async function processAssistantMessage(command, history, localPaymentStatus = null) {
    setBusy(true)
    try {
      if (role === 'admin' && localPaymentStatus) {
        const query = new URLSearchParams(localPaymentStatus)
        const report = await api(`/notifications/payment-compliance?${query}`)
        setPaymentStatusContext({
          period: report.period,
          paymentType: report.paymentType,
          report,
        })
        reply(formatPaymentCompliance(report, language))
        return
      }
      const modules = [...new Set(supportedIntents
        .map((item) => item.module)
        .filter((module) => module && canOpenModule(module, role)))]
      const result = await api('/speech/assistant', {
        method: 'POST',
        body: JSON.stringify({ text: command, language, modules, history }),
      })
      if (result.type === 'answer') {
        reply(result.text || t.unrecognized)
        return
      }
      if (result.type === 'unsupported') {
        reply(result.text || t.unsupportedAction)
        return
      }
      if (result.type === 'query') {
        if (['QUERY_MEMBER_LIST', 'QUERY_PAYMENT_STATUS'].includes(result.intent) && role !== 'admin') {
          reply(t.denied)
          return
        }
        if (result.intent === 'QUERY_PAYMENT_STATUS') {
          try {
            const query = new URLSearchParams({
              period: String(result.entities.period),
              paymentType: result.entities.paymentType,
            })
            const report = await api(`/notifications/payment-compliance?${query}`)
            setPaymentStatusContext({
              period: report.period,
              paymentType: report.paymentType,
              report,
            })
            reply(formatPaymentCompliance(report, language))
          } catch (requestError) {
            reply(requestError.message || t.chatUnavailable)
          }
          return
        }
        answerAssistantQuery(result, command)
        return
      }
      if (result.type === 'navigate') {
        const moduleExists = supportedIntents.some((item) => item.module === result.module)
        if (!moduleExists || !canOpenModule(result.module, role)) {
          reply(t.denied)
          return
        }
        setActive(result.module)
        const localizedName = moduleNames[result.module]?.[language === 'hi' ? 1 : language === 'mr' ? 2 : 0] || result.module
        reply(t.moduleOpened(localizedName))
        return
      }
      if (result.type === 'action' && role === 'admin' && approvedMutationIntents.includes(result.intent)) {
        beginFlow(result.intent, result.entities || {})
        return
      }
      reply(t.unsupportedAction)
    } catch {
      reply(t.chatUnavailable)
    } finally {
      setBusy(false)
    }
  }

  async function sendPaymentReminder(command, requestedStatus) {
    setBusy(true)
    try {
      let context = paymentStatusContext
      if (requestedStatus) {
        const query = new URLSearchParams(requestedStatus)
        const report = await api(`/notifications/payment-compliance?${query}`)
        context = {
          period: report.period,
          paymentType: report.paymentType,
          report,
        }
        setPaymentStatusContext(context)
      }
      if (!context) {
        reply(t.unrecognized)
        return
      }
      const mentionedIds = getMentionedMemberIds(command, data.members || [])
      if (isExplicitRecipientRequest(command) && !mentionedIds.length) {
        reply(paymentReminderCopy(language).noMatchingRecipient)
        return
      }
      const result = await api('/notifications/payment-reminders', {
        method: 'POST',
        body: JSON.stringify({
          period: context.period,
          paymentType: context.paymentType,
          language,
          ...(mentionedIds.length ? { memberIds: mentionedIds } : {}),
        }),
      })
      setPaymentStatusContext(null)
      window.dispatchEvent(new Event('shgms-notifications-updated'))
      await onMutation?.()
      reply(formatPaymentReminderResult(result, language))
    } catch (requestError) {
      const mentionedIds = getMentionedMemberIds(command, data.members || [])
      const mentionedNames = (data.members || [])
        .filter((member) => mentionedIds.includes(member._id || member.id))
        .map((member) => member.name)
      reply(requestError.status === 400
        && requestError.message?.includes('selected members have a recorded payment')
        && mentionedNames.length
        ? paymentReminderCopy(language).notUnpaid(mentionedNames.join(', '))
        : requestError.message || t.chatUnavailable)
    } finally {
      setBusy(false)
    }
  }

  function beginAttendanceFlow() {
    const flow = {
      step: 'meeting',
      date: getLocalDateKey(),
      title: '',
      time: '',
      location: '',
    }
    setAttendanceFlow(flow)
    setActive('attendance')
    reply(t.attendanceAskMeeting(flow.date))
  }

  function attendancePreview(flow) {
    const present = (data.members || [])
      .filter((member) => flow.statuses[String(member._id || member.id)] === 'Present')
      .map((member) => member.name)
    const absent = (data.members || [])
      .filter((member) => flow.statuses[String(member._id || member.id)] === 'Absent')
      .map((member) => member.name)
    reply(t.attendancePreview(flow.date, flow.title, present, absent))
    reply(t.attendanceAskConfirm)
  }

  async function saveAttendanceFlow(flow) {
    setBusy(true)
    reply(t.attendanceSaving)
    try {
      await executeAttendanceAction({
        ...flow,
        members: data.members || [],
        meetings: data.meetings || [],
      }, role)
      setAttendanceFlow(null)
      reply(t.attendanceSaved)
      try {
        await onMutation?.()
      } catch (refreshError) {
        reply(`${t.attendanceRefreshFailed} ${refreshError.message || ''}`.trim())
      }
    } catch (saveError) {
      reply(t.attendanceSaveFailed(saveError.message || t.chatUnavailable))
    } finally {
      setBusy(false)
    }
  }

  async function processAttendanceInput(command, flow) {
    const normalized = normalizeCommand(command)
    const commandResult = understandCommand(command, { language, members: data.members || [] })
    if (commandResult.intent === 'CANCEL'
      || ['discard', 'discard attendance', 'don’t save', 'dont save', 'रद्द करें', 'रद्द करो', 'रद्द करा', 'वगळा'].includes(normalized)) {
      setAttendanceFlow(null)
      reply(t.cancel)
      return
    }

    if (flow.step === 'meeting') {
      if (isSkipPhrase(command) || normalized.length < 2) {
        reply(t.attendanceAskMeeting(flow.date))
        return
      }
      const next = { ...flow, title: String(command).trim(), step: 'time' }
      setAttendanceFlow(next)
      reply(t.attendanceAskTime)
      return
    }
    if (flow.step === 'time') {
      if (!isSkipPhrase(command) && !/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
        reply(t.attendanceInvalidTime)
        return
      }
      const next = { ...flow, time: isSkipPhrase(command) ? '' : normalized, step: 'location' }
      setAttendanceFlow(next)
      reply(t.attendanceAskLocation)
      return
    }
    if (flow.step === 'location') {
      const next = {
        ...flow,
        location: isSkipPhrase(command) ? '' : String(command).trim(),
        step: 'roster',
      }
      setAttendanceFlow(next)
      reply(t.attendanceAskRoster)
      return
    }
    if (flow.step === 'confirmation' && commandResult.intent === 'CONFIRM') {
      await saveAttendanceFlow(flow)
      return
    }
    if (flow.step === 'roster' || flow.step === 'confirmation') {
      const parsed = parseAttendanceStatuses(command, data.members || [])
      if (!parsed.statuses) {
        reply(parsed.error === 'unmatched-exception' ? t.attendanceUnmatchedMember
          : parsed.error === 'ambiguous-member' ? t.attendanceAmbiguousMember
            : t.attendanceNoStatuses)
        return
      }
      const next = { ...flow, statuses: parsed.statuses, step: 'confirmation' }
      setAttendanceFlow(next)
      attendancePreview(next)
      if (flow.step === 'confirmation') return
      return
    }
  }

  async function processCommand(command) {
    const clean = String(command || '').trim()
    if (!clean) return
    setError('')
    setMessages((current) => [...current, { role: 'user', text: clean }])
    if (attendanceFlow) return processAttendanceInput(clean, attendanceFlow)
    if (!conversation && !pendingQuery && role === 'admin' && isAttendanceMarkRequest(clean)) {
      beginAttendanceFlow()
      return
    }
    const paymentStatus = parsePaymentStatusRequest(clean)
    if (role === 'admin' && isPaymentReminderRequest(clean)) {
      if (paymentStatus || paymentStatusContext) {
        void sendPaymentReminder(clean, paymentStatus)
        return
      }
    }
    if (role === 'admin' && paymentStatusContext && isPaymentStatusFollowUp(clean)) {
      return reply(formatUnpaidMembers(paymentStatusContext.report, language))
    }
    if (role === 'admin' && paymentStatus) {
      const history = [
        ...messages.slice(-9).map(({ role: messageRole, text: messageText }) => ({
          role: messageRole,
          text: String(messageText).slice(0, 500),
        })),
        { role: 'user', text: clean.slice(0, 500) },
      ].slice(-10)
      void processAssistantMessage(clean, history, paymentStatus)
      return
    }
    if (role === 'member' && !conversation && isCorrectionRequest(clean)) {
      beginFlow('SUBMIT_EDIT_REQUEST')
      return
    }
    if (role === 'admin' && !conversation && isMemberMessageRequest(clean)) {
      const mentionedIds = getMentionedMemberIds(clean, data.members || [])
      beginFlow('SEND_MEMBER_MESSAGE', mentionedIds.length === 1 ? { memberId: mentionedIds[0] } : {})
      return
    }
    if (paymentStatusContext && !isPaymentReminderRequest(clean)) {
      setPaymentStatusContext(null)
    }
    if (pendingQuery && !conversation) {
      const matches = pendingQuery.candidates.filter((candidate) =>
        normalizeCommand(candidate.displayId) === normalizeCommand(clean)
        || normalizeCommand(candidate.name) === normalizeCommand(clean),
      )
      if (matches.length !== 1) {
        return reply(t.ambiguousMembers(pendingQuery.candidates))
      }
      setPendingQuery(null)
      return answerQuery({ intent: pendingQuery.intent, entities: { memberId: matches[0].memberId } }, clean)
    }
    if (conversation) {
      const result = understandCommand(clean, { language, members: data.members || [] })
      if (result.intent === 'CANCEL') {
        setConversation(null)
        setAttendanceFlow(null)
        return reply(t.cancel)
      }
      if (result.intent === 'RESTART') {
        setConversation(null)
        return reply(t.restarted)
      }
      if (conversation.status === 'AWAITING_CONFIRMATION') {
        if (result.intent === 'CONFIRM') return confirmFlow()
        if (applyCorrection(clean)) return
        return reply(t.askConfirm)
      }
      if (backPhrases.some((phrase) => clean.toLocaleLowerCase().includes(phrase))) {
        const previous = { ...conversation, fieldIndex: Math.max(0, conversation.fieldIndex - 1) }
        setConversation(previous)
        reply(t.back)
        return askField(previous)
      }
      if (applyCorrection(clean)) return
      return submitFlowValue(clean)
    }

    const result = understandCommand(clean, { language, members: data.members || [] })
    if (['ADD_MEMBER', 'ADD_GOAL', 'RECORD_SAVINGS', 'UPDATE_MEMBER', 'DELETE_MEMBER'].includes(result.intent)) return beginFlow(result.intent, result.entities)
    if (['QUERY_MEMBER_COUNT', 'QUERY_GROUP_BALANCE', 'QUERY_GOALS', 'QUERY_MEMBER', 'QUERY_MEMBER_SAVINGS', 'QUERY_MEMBER_LOANS', 'QUERY_MEMBER_RECORDS', 'ASK_MEMBER', 'CLARIFY_MEMBER'].includes(result.intent)) {
      return answerQuery(result, clean)
    }
    if (result.intent.startsWith('OPEN_')) {
      const destination = supportedIntents.find((item) => item.intent === result.intent)?.module
      if (!destination || !canOpenModule(destination, role)) return reply(t.denied)
      setActive(destination)
      const localizedName = moduleNames[destination]?.[language === 'hi' ? 1 : language === 'mr' ? 2 : 0] || destination
      return reply(t.moduleOpened(localizedName))
    }
    if (result.intent === 'CONFIRM') return reply(t.confirmFirst)
    const history = [
      ...messages.slice(-9).map(({ role: messageRole, text: messageText }) => ({
        role: messageRole,
        text: String(messageText).slice(0, 500),
      })),
      { role: 'user', text: clean.slice(0, 500) },
    ].slice(-10)
    void processAssistantMessage(clean, history)
  }

  function submit(event) {
    event.preventDefault()
    if (busy) return
    prepareSpokenResponse()
    const command = text
    setText('')
    processCommand(command)
  }

  async function startListening() {
    prepareSpokenResponse()
    const requestId = ++recognitionRequestRef.current
    stopRequestedRef.current = 0
    setError('')
    cancelSpokenResponse()
    recognitionRef.current?.cancel()
    recognitionRef.current = null
    setSpeaking(false)
    setListening(true)
    try {
      const recognition = await createSpeechRecognition(
        language,
        (transcript) => {
          if (requestId !== recognitionRequestRef.current) return
          setProcessingSpeech(false)
          processCommand(transcript)
          setText('')
        },
        (speechError) => {
          if (requestId !== recognitionRequestRef.current) return
          setListening(false)
          setProcessingSpeech(false)
          setError(speechError instanceof Error && speechError.message
            ? speechError.message
            : t.speechError)
        },
        () => {
          if (requestId === recognitionRequestRef.current) {
            setListening(false)
            setProcessingSpeech(false)
          }
        },
      )
      if (requestId !== recognitionRequestRef.current) {
        recognition.cancel()
        return
      }
      recognitionRef.current = recognition
      recognition.start()
      if (stopRequestedRef.current === requestId) {
        recognition.stop()
        setListening(false)
        setProcessingSpeech(true)
      }
    } catch (speechError) {
      if (requestId === recognitionRequestRef.current) {
        setListening(false)
        setError(speechError instanceof Error && speechError.message
          ? speechError.message
          : t.speechUnavailable)
      }
    }
  }

  function stopListening() {
    stopRequestedRef.current = recognitionRequestRef.current
    setListening(false)
    setProcessingSpeech(true)
    if (recognitionRef.current) recognitionRef.current.stop()
  }

  function changeAssistantLanguage(nextLanguage) {
    recognitionRequestRef.current += 1
    recognitionRef.current?.cancel()
    recognitionRef.current = null
    setListening(false)
    setProcessingSpeech(false)
    cancelSpokenResponse()
    setSpeaking(false)
    setError('')
    setLanguage(nextLanguage)
    setMessages((current) => current.map((message, index) => (
      index === 0 && message.role === 'assistant'
        ? { ...message, text: (copy[nextLanguage] || copy.en).welcome }
        : message
    )))
  }

  function startNewChat() {
    recognitionRequestRef.current += 1
    recognitionRef.current?.cancel()
    recognitionRef.current = null
    cancelSpokenResponse()
    setMessages([{ role: 'assistant', text: t.welcome }])
    setText('')
    setConversation(null)
    setAttendanceFlow(null)
    setPendingQuery(null)
    setPaymentStatusContext(null)
    setListening(false)
    setProcessingSpeech(false)
    setSpeaking(false)
    setError('')
  }

  return (
    <div className="modal-backdrop assistant-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
        <header className="assistant-header">
          <div><p className="eyebrow">{t.title}</p><h2 id="assistant-title">{t.ask}</h2></div>
          <div className="assistant-header-actions">
            <select aria-label="Assistant language" value={language} onChange={(event) => changeAssistantLanguage(event.target.value)}>
              <option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option>
            </select>
            <button className="btn ghost" type="button" onClick={startNewChat} disabled={busy}>{t.clearChat}</button>
            <button className="btn ghost" type="button" onClick={close}>{t.close}</button>
          </div>
        </header>
        <label className="assistant-read-aloud"><input type="checkbox" checked={readAloud} onChange={(event) => setReadAloud(event.target.checked)} />{t.readAloud}</label>
        <div className="assistant-status-group">
          <p className="assistant-status" role="status">{listening ? t.listening : processingSpeech || busy ? t.processing : speaking ? t.speaking : t.ready}</p>
          {error && <p className="assistant-error" role="alert">{error}</p>}
        </div>
        <div className="assistant-log" ref={logRef} aria-live="polite">
          {messages.map((message, index) => <p className={`assistant-message ${message.role}`} key={`${index}-${message.role}`}>{message.text}</p>)}
        </div>
        <form className="assistant-compose" onSubmit={submit}>
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder={t.placeholder} aria-label={t.placeholder} disabled={busy} />
          <button className="btn secondary" type="button" onClick={listening ? stopListening : startListening} disabled={busy || processingSpeech}>{listening ? t.stop : t.listen}</button>
          <button className="btn" type="submit" disabled={busy || !text.trim()}>{busy ? t.saving : t.send}</button>
        </form>
      </section>
    </div>
  )
}

export default AssistantPanel
