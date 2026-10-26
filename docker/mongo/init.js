// Runs once on first MongoDB boot. Creates a least-privilege application user.
const appDb = db.getSiblingDB(process.env.MONGO_DB_NAME || 'streamvault');
const appUser = process.env.MONGO_APP_USERNAME || 'streamvault_app';
const appPassword = process.env.MONGO_APP_PASSWORD || 'streamvault_dev_password';

try {
  appDb.createUser({
    user: appUser,
    pwd: appPassword,
    roles: [{ role: 'readWrite', db: process.env.MONGO_DB_NAME || 'streamvault' }],
  });
  print(`created application user ${appUser}`);
} catch (error) {
  print(`application user not created: ${error.message}`);
}
