const app = require('./src/app');
const connectDB = require('./src/config/db');
const { sendDueReminders } = require('./src/services/reminderService');

const PORT = process.env.PORT || 5000;

connectDB().then((databaseConnected) => {
  app.listen(PORT, () => {
    console.log(`SHGMS API running on port ${PORT}`);
    if (!databaseConnected) {
      console.log('Database routes are unavailable until MongoDB is connected.');
    }
    const interval = Number(process.env.EMI_REMINDER_INTERVAL_MS || 86400000);
    if (databaseConnected && interval > 0) {
      sendDueReminders().catch((error) => console.error('EMI reminder run failed:', error.message));
      setInterval(
        () => sendDueReminders().catch((error) => console.error('EMI reminder run failed:', error.message)),
        interval
      ).unref();
    }
  });
}).catch((error) => {
  console.error('Failed to start SHGMS API:', error);
  process.exit(1);
});
