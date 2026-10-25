require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../models/User');

async function verifyAll() {
  await mongoose.connect(process.env.MONGO_URI);

  const content = fs.readFileSync('blooddoner details.txt', 'utf8');
  const lines = content.split('\r\n').join('\n').split('\n');

  let totalEntriesInFile = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\d+\t/.test(lines[i])) totalEntriesInFile++;
  }

  const totalInDB = await User.countDocuments({ isDonor: true });
  const realDonorsJson = JSON.parse(fs.readFileSync('data/real_donors.json', 'utf8'));

  console.log('=== INTEGRITY AUDIT ===');
  console.log('Total donor entries in blooddoner details.txt:', totalEntriesInFile);
  console.log('Total entries in permanent master file (real_donors.json):', realDonorsJson.length);
  console.log('Total active blood donors in MongoDB Atlas DB:', totalInDB);

  const corruptCount = await User.countDocuments({
    isDonor: true,
    $or: [
      { name: { $in: ['', null] } },
      { bloodGroup: { $in: ['', null] } },
      { district: { $in: ['', null] } },
      { upazila: { $in: ['', null] } },
      { phone: { $in: ['', null] } }
    ]
  });
  console.log('Incomplete or corrupt records in DB:', corruptCount);

  await mongoose.disconnect();
}
verifyAll();
