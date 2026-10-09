const test = require('node:test');
const assert = require('node:assert/strict');
const { respondToAssistant } = require('./geminiSpeechService');

function mockClient(result, capture) {
  return {
    models: {
      generateContent: async (request) => {
        capture.request = request;
        return { text: JSON.stringify(result) };
      },
    },
  };
}

test('answers multilingual questions using the Gemini chat model and JSON response mode', async () => {
  const capture = {};
  const result = await respondToAssistant({
    text: 'एसएचजी क्या है?',
    language: 'hi',
    role: 'member',
    modules: ['dashboard', 'savings'],
    client: mockClient({ type: 'answer', text: 'एसएचजी एक स्वयं सहायता समूह है।' }, capture),
  });

  assert.deepEqual(result, { type: 'answer', text: 'एसएचजी एक स्वयं सहायता समूह है।' });
  assert.equal(capture.request.model, 'gemini-3.1-flash-lite');
  assert.equal(capture.request.config.responseMimeType, 'application/json');
  assert.match(capture.request.contents[0].parts[0].text, /intent exactly matches one of: none/);
  assert.match(capture.request.contents[0].parts[0].text, /एसएचजी क्या है/);
});

test('only returns navigation destinations supplied as accessible modules', async () => {
  const allowed = await respondToAssistant({
    text: 'Open reports',
    language: 'en',
    role: 'member',
    modules: ['reports'],
    client: mockClient({ type: 'navigate', module: 'reports', text: 'Opening reports.' }, {}),
  });
  const blocked = await respondToAssistant({
    text: 'Open settings',
    language: 'en',
    role: 'member',
    modules: ['reports'],
    client: mockClient({ type: 'navigate', module: 'settings', text: 'Opening settings.' }, {}),
  });

  assert.deepEqual(allowed, { type: 'navigate', text: 'Opening reports.', module: 'reports' });
  assert.deepEqual(blocked, { type: 'unsupported', text: 'Opening settings.' });
});

test('returns a structured data query without inventing record values and carries bounded history', async () => {
  const capture = {};
  const result = await respondToAssistant({
    text: 'What about his savings?',
    language: 'en',
    role: 'admin',
    history: [
      { role: 'user', text: 'Tell me about Rahul.' },
      { role: 'assistant', text: 'Rahul is a member of this SHG.' },
      { role: 'system', text: 'must be ignored' },
      { role: 'user', text: 'x'.repeat(600) },
    ],
    client: mockClient({
      type: 'query',
      intent: 'QUERY_MEMBER_SAVINGS',
      entities: { memberName: 'Rahul', fabricatedValue: 100000 },
      text: 'Looking up Rahul’s current savings.',
    }, capture),
  });
  const prompt = capture.request.contents[0].parts[0].text;
  const serializedRequest = JSON.parse(prompt.slice(prompt.lastIndexOf('JSON: ') + 6));

  assert.deepEqual(result, {
    type: 'query',
    text: 'Looking up Rahul’s current savings.',
    intent: 'QUERY_MEMBER_SAVINGS',
    entities: { memberName: 'Rahul' },
  });
  assert.equal(serializedRequest.history.length, 2);
  assert.equal(serializedRequest.history[1].text.length, 500);
  assert.equal(serializedRequest.history.some((turn) => turn.role === 'system'), false);
});

test('allows goal progress queries to carry only an identified goal title', async () => {
  const result = await respondToAssistant({
    text: 'How much has been saved toward school supplies?',
    language: 'en',
    role: 'admin',
    modules: ['dashboard'],
    client: mockClient({
      type: 'query',
      intent: 'QUERY_GOALS',
      entities: { goalName: 'School supplies', savedAmount: 900000 },
      text: 'I will check the saved goal records.',
    }, {}),
  });

  assert.deepEqual(result, {
    type: 'query',
    text: 'I will check the saved goal records.',
    intent: 'QUERY_GOALS',
    entities: { goalName: 'School supplies' },
  });
});

test('does not expose goal progress to member accounts', async () => {
  const result = await respondToAssistant({
    text: 'Show goal progress',
    language: 'en',
    role: 'member',
    modules: ['dashboard'],
    client: mockClient({
      type: 'query',
      intent: 'QUERY_GOALS',
      text: 'Checking the goals.',
    }, {}),
  });

  assert.deepEqual(result, { type: 'unsupported', text: 'Checking the goals.' });
});

test('a member cannot use a client-supplied admin module or request the full member list', async () => {
  const result = await respondToAssistant({
    text: 'Show the admin reports and all member names',
    language: 'en',
    role: 'member',
    modules: ['reports', 'settings', 'penaltySettings'],
    client: mockClient({ type: 'navigate', module: 'settings', text: 'Opening settings.' }, {}),
  });
  const memberList = await respondToAssistant({
    text: 'Show me all member names',
    language: 'en',
    role: 'member',
    modules: ['reports'],
    client: mockClient({ type: 'query', intent: 'QUERY_MEMBER_LIST', text: 'Listing members.' }, {}),
  });

  assert.deepEqual(result, { type: 'unsupported', text: 'Opening settings.' });
  assert.deepEqual(memberList, { type: 'unsupported', text: 'Listing members.' });
});

test('members cannot receive mutation actions and SHG settings must be valid', async () => {
  const memberAction = await respondToAssistant({
    text: 'Add a goal',
    language: 'en',
    role: 'member',
    client: mockClient({ type: 'action', intent: 'ADD_GOAL', text: 'Adding a goal.' }, {}),
  });
  const invalidPenalty = await respondToAssistant({
    text: 'Change penalty',
    language: 'en',
    role: 'admin',
    client: mockClient({
      type: 'action',
      intent: 'UPDATE_SHG_SETTING',
      entities: { field: 'latePenaltyAmount', value: -1 },
      text: 'Changing the setting.',
    }, {}),
  });

  assert.deepEqual(memberAction, { type: 'unsupported', text: 'Adding a goal.' });
  assert.deepEqual(invalidPenalty, { type: 'unsupported', text: 'Changing the setting.' });
});

test('does not forward model-invented member fields as writable actions', async () => {
  const result = await respondToAssistant({
    text: 'Change the member database role',
    language: 'en',
    role: 'admin',
    client: mockClient({
      type: 'action',
      intent: 'UPDATE_MEMBER',
      entities: { field: 'role', memberName: 'Asha Pawar' },
      text: 'Changing member role.',
    }, {}),
  });

  assert.deepEqual(result, { type: 'unsupported', text: 'Changing member role.' });
});

test('preserves member update values as text instead of coercing identifiers to numbers', async () => {
  const result = await respondToAssistant({
    text: 'Change Priya phone to 0987654321',
    language: 'en',
    role: 'admin',
    client: mockClient({
      type: 'action',
      intent: 'UPDATE_MEMBER',
      entities: { memberName: 'Priya', field: 'phone', value: '0987654321' },
      text: 'Review this member phone number change.',
    }, {}),
  });

  assert.deepEqual(result.entities, {
    memberName: 'Priya',
    field: 'phone',
    value: '0987654321',
  });
});

test('returns only an allowlisted, parsed admin setting action', async () => {
  const result = await respondToAssistant({
    text: 'Change penalty per day to 100 rupees',
    language: 'en',
    role: 'admin',
    client: mockClient({
      type: 'action',
      intent: 'UPDATE_SHG_SETTING',
      entities: { field: 'latePenaltyAmount', value: '100', extra: 'not forwarded' },
      text: 'Review the setting change.',
    }, {}),
  });

  assert.deepEqual(result, {
    type: 'action',
    text: 'Review the setting change.',
    intent: 'UPDATE_SHG_SETTING',
    entities: { field: 'latePenaltyAmount', value: 100 },
  });
});

test('normalizes natural member names into the existing add-member flow', async () => {
  const result = await respondToAssistant({
    text: 'Rahul ko member list mein add करा',
    language: 'hi',
    role: 'admin',
    modules: ['members'],
    client: mockClient({
      type: 'action',
      intent: 'ADD_MEMBER',
      entities: { memberName: 'Rahul' },
      text: 'राहुल को सदस्य जोड़ने के लिए आगे बढ़ते हैं।',
    }, {}),
  });

  assert.deepEqual(result.entities, { memberName: 'Rahul', name: 'Rahul' });
});

test('allows the confirmed setting flow to ask for a missing value', async () => {
  const result = await respondToAssistant({
    text: 'Change the penalty amount',
    language: 'en',
    role: 'admin',
    client: mockClient({
      type: 'action',
      intent: 'UPDATE_SHG_SETTING',
      entities: { field: 'latePenaltyAmount' },
      text: 'I will ask you to confirm the amount.',
    }, {}),
  });

  assert.deepEqual(result, {
    type: 'action',
    text: 'I will ask you to confirm the amount.',
    intent: 'UPDATE_SHG_SETTING',
    entities: { field: 'latePenaltyAmount' },
  });
});

test('allows a goal contribution action with only supported user-provided fields', async () => {
  const result = await respondToAssistant({
    text: 'Add 500 rupees to the school supplies goal for monthly contribution',
    language: 'en',
    role: 'admin',
    client: mockClient({
      type: 'action',
      intent: 'ADD_GOAL_CONTRIBUTION',
      entities: {
        goalName: 'School supplies',
        amount: '500',
        note: 'Monthly contribution',
        goalId: 'model-invented-id',
      },
      text: 'Review this goal contribution.',
    }, {}),
  });

  assert.deepEqual(result, {
    type: 'action',
    text: 'Review this goal contribution.',
    intent: 'ADD_GOAL_CONTRIBUTION',
    entities: {
      goalName: 'School supplies',
      note: 'Monthly contribution',
      amount: 500,
    },
  });
});

test('preserves an explicitly supplied monthly savings received date', async () => {
  const result = await respondToAssistant({
    text: 'Record Asha savings for June, received on 2026-06-30',
    language: 'en',
    role: 'admin',
    client: mockClient({
      type: 'action',
      intent: 'RECORD_SAVINGS',
      entities: { memberName: 'Asha', amount: '500', month: '2026-06', actualDate: '2026-06-30' },
      text: 'Review the monthly savings entry.',
    }, {}),
  });

  assert.deepEqual(result.entities, {
    memberName: 'Asha',
    actualDate: '2026-06-30',
    month: '2026-06',
    amount: 500,
  });
});

test('allows monthly payment status queries only for admins and accepts a valid payment type', async () => {
  const result = await respondToAssistant({
    text: 'Who paid savings in September 2026?',
    language: 'en',
    role: 'admin',
    client: mockClient({
      type: 'query',
      intent: 'QUERY_PAYMENT_STATUS',
      entities: { period: '2026-09', paymentType: 'savings', memberName: 'invented' },
      text: 'I will check the savings records.',
    }, {}),
  });

  assert.deepEqual(result, {
    type: 'query',
    text: 'I will check the savings records.',
    intent: 'QUERY_PAYMENT_STATUS',
    entities: { period: '2026-09', paymentType: 'savings' },
  });
});

test('does not allow members to query group-wide payment compliance', async () => {
  const result = await respondToAssistant({
    text: 'Who has not paid in 2026?',
    language: 'en',
    role: 'member',
    client: mockClient({
      type: 'query',
      intent: 'QUERY_PAYMENT_STATUS',
      entities: { period: '2026', paymentType: 'both' },
      text: 'Checking payment records.',
    }, {}),
  });

  assert.deepEqual(result, { type: 'unsupported', text: 'Checking payment records.' });
});
