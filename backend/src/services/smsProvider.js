/*
 * Small provider boundary so notifications remain usable without an SMS
 * dependency. Set SMS_PROVIDER=twilio and the three TWILIO_* variables to
 * enable delivery; otherwise callers receive an explicit unconfigured status.
 */
async function sendSms({ to, body }) {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (provider !== 'twilio' || !sid || !token || !from) {
    return { status: 'unconfigured', error: 'SMS provider is not configured' };
  }
  if (!to) return { status: 'failed', error: 'Member has no phone number' };

  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!response.ok) {
    const detail = await response.text();
    return { status: 'failed', error: `SMS provider returned ${response.status}: ${detail.slice(0, 200)}` };
  }
  return { status: 'sent' };
}

module.exports = { sendSms };
