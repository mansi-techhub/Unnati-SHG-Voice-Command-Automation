const test = require('node:test');
const assert = require('node:assert/strict');
const Member = require('../models/Member');
const Notification = require('../models/Notification');
const smsProvider = require('../services/smsProvider');

let smsAttempts = 0;
const originalSendSms = smsProvider.sendSms;
smsProvider.sendSms = async () => {
  smsAttempts += 1;
  throw new Error('Member messages must not invoke SMS');
};
const controller = require('./notificationController');
smsProvider.sendSms = originalSendSms;

function responseCapture() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('creates an in-app-only notification scoped to the specified SHG member', async (t) => {
  const originalFindOne = Member.findOne;
  const originalCreate = Notification.create;
  t.after(() => {
    Member.findOne = originalFindOne;
    Notification.create = originalCreate;
  });

  const member = { _id: '64a000000000000000000001', name: 'Komal' };
  let savedNotification;
  Member.findOne = (filter) => {
    assert.deepEqual(filter, { _id: member._id, shg: '64a000000000000000000002' });
    return { select: async () => member };
  };
  Notification.create = async (notification) => {
    savedNotification = notification;
    return { _id: '64a000000000000000000003', ...notification };
  };

  const res = responseCapture();
  await controller.createMemberMessage({
    body: { member: member._id, message: 'Please call me when you are available.' },
    user: { shg: '64a000000000000000000002', _id: '64a000000000000000000004' },
  }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.recipient.name, 'Komal');
  assert.equal(savedNotification.member, member._id);
  assert.equal(savedNotification.message, 'Please call me when you are available.');
  assert.equal(savedNotification.channel, 'in_app');
  assert.equal(savedNotification.deliveryStatus, 'not_attempted');
  assert.equal(smsAttempts, 0);
});

test('rejects invalid message input before creating a notification', async (t) => {
  const originalCreate = Notification.create;
  t.after(() => { Notification.create = originalCreate; });
  Notification.create = async () => assert.fail('Invalid messages must not be saved');

  const res = responseCapture();
  await controller.createMemberMessage({
    body: { member: 'not-an-object-id', message: '  ' },
    user: { shg: '64a000000000000000000002', _id: '64a000000000000000000004' },
  }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'A valid member is required');
});
