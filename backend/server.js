const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

connectDB().then((databaseConnected) => {
  app.listen(PORT, () => {
    console.log(`SHGMS API running on port ${PORT}`);
    if (!databaseConnected) {
      console.log('Database routes are disabled until MongoDB is configured and connected.');
    }
  });
}).catch((error) => {
  console.error('Failed to start SHGMS API:', error);
  process.exit(1);
});
