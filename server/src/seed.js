const User = require('./models/User');

async function seedAdmin() {
  const count = await User.countDocuments();
  if (count > 0) return;
  const passwordHash = await User.hashPassword('admin123');
  await User.create({ username: 'admin', passwordHash, name: 'Admin', role: 'admin' });
  console.warn('\n⚠️  Seeded default admin account — username: admin  password: admin123');
  console.warn('    Please log in and change this password immediately (Setup → Users).\n');
}

module.exports = seedAdmin;
