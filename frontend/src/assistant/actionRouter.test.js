import test from 'node:test'
import assert from 'node:assert/strict'
import { executeAttendanceAction, executeRegisteredAction } from './actionRouter.js'

function withFetchMock(handler) {
  const originalFetch = globalThis.fetch
  const originalStorage = globalThis.localStorage
  globalThis.localStorage = { getItem: () => 'test-token' }
  globalThis.fetch = handler
  return () => {
    globalThis.fetch = originalFetch
    if (originalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalStorage
  }
}

test('posts and then re-reads an added member before reporting completion', async () => {
  const calls = []
  const restore = withFetchMock(async (url, options) => {
    calls.push({ url: String(url), options })
    if (options.method === 'POST') {
      return new Response(JSON.stringify({ _id: 'member-1', name: 'Asha Pawar' }), { status: 201 })
    }
    return new Response(JSON.stringify([{ _id: 'member-1', name: 'Asha Pawar' }]), { status: 200 })
  })
  try {
    const result = await executeRegisteredAction('ADD_MEMBER', { shg: 'shg-1', name: 'Asha Pawar' }, 'admin')
    assert.equal(result._id, 'member-1')
    assert.equal(calls.length, 2)
    assert.match(calls[0].url, /\/members$/)
    assert.match(calls[1].url, /\/members\?shg=shg-1$/)
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token')
  } finally {
    restore()
  }
})

test('posts savings with required SHG/member identifiers and verifies the saved row', async () => {
  const calls = []
  const restore = withFetchMock(async (url, options) => {
    calls.push({ url: String(url), options })
    const saved = { _id: 'saving-1', amount: 500, member: 'member-1', month: '2026-09' }
    return new Response(JSON.stringify(options.method === 'POST' ? saved : [saved]), { status: 200 })
  })
  try {
    const result = await executeRegisteredAction('RECORD_SAVINGS', {
      shg: 'shg-1', member: 'member-1', month: '2026-09', amount: 500,
    }, 'admin')
    assert.equal(result._id, 'saving-1')
    assert.match(calls[1].url, /\/savings\?shg=shg-1&member=member-1&month=2026-09$/)
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      shg: 'shg-1', member: 'member-1', month: '2026-09', amount: 500,
    })
  } finally {
    restore()
  }
})

test('posts and verifies a goal through the authenticated goals API', async () => {
  const calls = []
  const goal = { _id: 'goal-1', title: 'School supplies', targetAmount: 25000 }
  const restore = withFetchMock(async (url, options) => {
    calls.push({ url: String(url), options })
    return new Response(JSON.stringify(options.method === 'POST' ? goal : [goal]), { status: 200 })
  })
  try {
    const result = await executeRegisteredAction('ADD_GOAL', {
      shg: 'shg-1', title: goal.title, targetAmount: goal.targetAmount,
    }, 'admin')
    assert.equal(result._id, goal._id)
    assert.match(calls[0].url, /\/goals$/)
    assert.equal(calls[0].options.method, 'POST')
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      shg: 'shg-1', title: goal.title, targetAmount: goal.targetAmount,
    })
    assert.match(calls[1].url, /\/goals$/)
  } finally {
    restore()
  }
})

test('posts a goal contribution through its existing endpoint and verifies saved progress', async () => {
  const calls = []
  const contribution = { amount: 500, note: 'Monthly contribution' }
  const savedGoal = {
    _id: 'goal-1',
    title: 'School supplies',
    savedAmount: 7500,
    targetAmount: 10000,
    contributions: [contribution],
  }
  const restore = withFetchMock(async (url, options) => {
    calls.push({ url: String(url), options })
    return new Response(JSON.stringify(options.method === 'POST'
      ? { goal: savedGoal, transaction: { _id: 'transaction-1' } }
      : [savedGoal]), { status: options.method === 'POST' ? 201 : 200 })
  })
  try {
    const result = await executeRegisteredAction('ADD_GOAL_CONTRIBUTION', {
      goal: 'goal-1', amount: 500, note: 'Monthly contribution',
    }, 'admin')
    assert.equal(result.goal.savedAmount, 7500)
    assert.match(calls[0].url, /\/goals\/goal-1\/contributions$/)
    assert.deepEqual(JSON.parse(calls[0].options.body), contribution)
    assert.equal(calls[1].url.endsWith('/goals'), true)
  } finally {
    restore()
  }
})

test('updates an allowlisted member property and verifies its persisted value', async () => {
  const calls = []
  const restore = withFetchMock(async (url, options) => {
    calls.push({ url: String(url), options })
    return new Response(JSON.stringify({ _id: 'member-1', phone: '9999999999' }), { status: 200 })
  })
  try {
    await executeRegisteredAction('UPDATE_MEMBER', {
      member: 'member-1', field: 'phone', value: '9999999999',
    }, 'admin')
    assert.match(calls[0].url, /\/members\/member-1$/)
    assert.deepEqual(JSON.parse(calls[0].options.body), { phone: '9999999999' })
    assert.match(calls[1].url, /\/members\/member-1$/)
  } finally {
    restore()
  }
})

test('denies unregistered and member writes before calling the API', async () => {
  let called = false
  const restore = withFetchMock(async () => {
    called = true
    return new Response('{}', { status: 200 })
  })
  try {
    await assert.rejects(executeRegisteredAction('RAW_DATABASE_COMMAND', {}, 'admin'), /not available/)
    await assert.rejects(executeRegisteredAction('ADD_MEMBER', { shg: 's', name: 'Asha' }, 'member'), /permission/)
    await assert.rejects(executeRegisteredAction('ADD_GOAL_CONTRIBUTION', {
      goal: 'goal-1', amount: 500,
    }, 'member'), /permission/)
    await assert.rejects(executeRegisteredAction('ADD_GOAL_CONTRIBUTION', {
      goal: 'goal-1', amount: -5,
    }, 'admin'), /positive contribution/)
    await assert.rejects(executeRegisteredAction('UPDATE_SHG_SETTING', {
      shg: 's', field: 'latePenaltyAmount', value: 100,
    }, 'member'), /permission/)
    await assert.rejects(executeRegisteredAction('UPDATE_MEMBER', { member: 'member-1', field: 'shg', value: 'other-shg' }, 'admin'), /cannot be updated/)
    assert.equal(called, false)
  } finally {
    restore()
  }
})

test('only treats a deletion as verified after GET confirms the member is absent', async () => {
  const calls = []
  const restore = withFetchMock(async (_url, options) => {
    calls.push(options.method || 'GET')
    if (options.method === 'DELETE') return new Response(JSON.stringify({ id: 'member-1' }), { status: 200 })
    return new Response(JSON.stringify([]), { status: 200 })
  })
  try {
    const result = await executeRegisteredAction('DELETE_MEMBER', { shg: 'shg-1', member: 'member-1' }, 'admin')
    assert.equal(result.id, 'member-1')
    assert.deepEqual(calls, ['DELETE', 'GET'])
  } finally {
    restore()
  }
})

test('updates and re-reads an allowlisted SHG setting after admin confirmation', async () => {
  const calls = []
  const restore = withFetchMock(async (url, options) => {
    calls.push({ url: String(url), options })
    return new Response(JSON.stringify({ _id: 'shg-1', latePenaltyAmount: 100 }), { status: 200 })
  })
  try {
    const result = await executeRegisteredAction('UPDATE_SHG_SETTING', {
      shg: 'shg-1', field: 'latePenaltyAmount', value: 100,
    }, 'admin')
    assert.equal(result.latePenaltyAmount, 100)
    assert.match(calls[0].url, /\/shgs\/shg-1$/)
    assert.equal(calls[0].options.method, 'PATCH')
    assert.deepEqual(JSON.parse(calls[0].options.body), { latePenaltyAmount: 100 })
    assert.match(calls[1].url, /\/shgs\/shg-1$/)
    await assert.rejects(executeRegisteredAction('UPDATE_SHG_SETTING', {
      shg: 'shg-1', field: 'createdBy', value: 'someone-else',
    }, 'admin'), /invalid or cannot be updated/)
  } finally {
    restore()
  }
})

test('creates a meeting, records every member, and verifies bulk attendance', async () => {
  const calls = []
  const restore = withFetchMock(async (url, options) => {
    calls.push({ url: String(url), options })
    if (options.method === 'POST') {
      return new Response(JSON.stringify({ _id: 'meeting-1' }), { status: 201 })
    }
    return new Response(JSON.stringify({
      _id: 'meeting-1',
      attendance: [
        { member: { _id: 'member-1' }, present: true },
        { member: { _id: 'member-2' }, present: false },
      ],
    }), { status: 200 })
  })
  try {
    await executeAttendanceAction({
      title: 'Monthly meeting',
      date: '2026-10-01',
      time: '',
      location: '',
      members: [{ _id: 'member-1' }, { _id: 'member-2' }],
      statuses: { 'member-1': 'Present', 'member-2': 'Absent' },
      meetings: [],
    }, 'admin')
    assert.equal(calls.length, 2)
    assert.match(calls[0].url, /\/meetings$/)
    assert.equal(JSON.parse(calls[0].options.body).title, 'Monthly meeting')
    assert.match(calls[1].url, /\/meetings\/meeting-1\/attendance$/)
    assert.deepEqual(JSON.parse(calls[1].options.body), {
      attendance: [
        { member: 'member-1', present: true },
        { member: 'member-2', present: false },
      ],
    })
  } finally {
    restore()
  }
})

test('refuses attendance writes for members and rejects incomplete status maps', async () => {
  let called = false
  const restore = withFetchMock(async () => {
    called = true
    return new Response('{}', { status: 200 })
  })
  try {
    const payload = {
      title: 'Meeting',
      date: '2026-10-01',
      members: [{ _id: 'member-1' }],
      statuses: {},
    }
    await assert.rejects(executeAttendanceAction(payload, 'member'), /permission/)
    await assert.rejects(executeAttendanceAction(payload, 'admin'), /valid status/)
    assert.equal(called, false)
  } finally {
    restore()
  }
})

test('updates a matching saved meeting instead of creating a duplicate', async () => {
  const calls = []
  const restore = withFetchMock(async (url, options) => {
    calls.push({ url: String(url), options })
    if (options.method === 'PATCH' && !String(url).endsWith('/attendance')) {
      return new Response(JSON.stringify({ _id: 'meeting-1' }), { status: 200 })
    }
    return new Response(JSON.stringify({
      _id: 'meeting-1',
      attendance: [{ member: { _id: 'member-1' }, present: true }],
    }), { status: 200 })
  })
  try {
    await executeAttendanceAction({
      title: 'Monthly meeting',
      date: '2026-10-01',
      members: [{ _id: 'member-1' }],
      statuses: { 'member-1': 'Present' },
      meetings: [{ _id: 'meeting-1', title: 'Monthly Meeting', date: '2026-10-01T00:00:00.000Z' }],
    }, 'admin')
    assert.equal(calls.length, 2)
    assert.match(calls[0].url, /\/meetings\/meeting-1$/)
    assert.equal(calls[0].options.method, 'PATCH')
    assert.doesNotMatch(calls[0].url, /\/meetings$/)
  } finally {
    restore()
  }
})
