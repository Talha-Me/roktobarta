require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const districtsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/districts.json'), 'utf8'));
const upazilasData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/upazilas.json'), 'utf8'));

const districtToDiv = {};
const districtToCountry = {};
districtsData.forEach(div => {
  div.districts.forEach(d => {
    districtToDiv[d] = div.division;
    districtToCountry[d] = div.country;
  });
});

const bnToEnMap = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

function bnToEnDigits(str) {
  if (!str) return '';
  return str.replace(/[০-৯]/g, d => bnToEnMap[d] || d);
}

function cleanPhoneNumber(str) {
  if (!str) return '';
  let clean = bnToEnDigits(str).trim();
  clean = clean.replace(/[\s\-\(\)\t]/g, '');
  if (clean.startsWith('+88')) clean = clean.substring(3);
  if (clean.startsWith('8801')) clean = clean.substring(2);
  return clean;
}

const districtNormalizeMap = {
  'শরীয়তপুর': 'শরীয়তপুর',
  'শরীয়তপুর': 'শরীয়তপুর',
  'রাজবাড়ী': 'রাজবাড়ী',
  'রাজবাড়ী': 'রাজবাড়ী',
  'বগুড়া': 'বগুড়া',
  'বগুড়া': 'বগুড়া',
  'চাঁপাইনবাবগঞ্জ': 'চাঁপাইনবাবগঞ্জ',
  'মৌলভীবাজার': 'মৌলভীবাজার',
  'কুড়িগ্রাম': 'কুড়িগ্রাম',
  'কুড়িগ্রাম': 'কুড়িগ্রাম',
  'চট্টগ্রাম': 'চট্টগ্রাম',
  'চট্টগ্রম': 'চট্টগ্রাম',
  'ময়মনসিংহ': 'ময়মনসিংহ',
  'ময়মনসিংহ': 'ময়মনসিংহ'
};

function normalizeDistrictName(dist) {
  if (!dist) return '';
  let d = dist.split('-')[0].trim();
  return districtNormalizeMap[d] || d;
}

const allDistricts = Object.keys(upazilasData);

function matchUpazila(district, address) {
  const upList = upazilasData[district] || [];
  if (!upList.length) return district + ' সদর';

  const lowerAddr = (address || '').toLowerCase();

  for (const up of upList) {
    if (address && address.includes(up)) return up;
  }
  for (const up of upList) {
    const base = up.replace(/\s*সদর$/, '').trim();
    if (base && address && address.includes(base)) return up;
  }
  if (lowerAddr.includes('sadar') || lowerAddr.includes('সদর')) {
    const sadarUp = upList.find(u => u.includes('সদর'));
    if (sadarUp) return sadarUp;
  }
  const sadarUp = upList.find(u => u.includes('সদর'));
  return sadarUp || upList[0];
}

function parseDonorsFromText(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\r\n').join('\n').split('\n');

  let currentGroup = '';
  let currentDistrict = '';
  let currentUpazila = '';

  const rawBlocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'গ্রুপ:') {
      if (lines[i + 1]) currentGroup = lines[i + 1].trim();
    }

    if (line === 'বর্তমান জেলা') {
      for (let j = 1; j <= 3; j++) {
        const candidate = lines[i + j] ? lines[i + j].trim() : '';
        if (candidate && candidate !== 'বর্তমান জেলা') {
          if (candidate !== 'সব জেলা') {
            currentDistrict = normalizeDistrictName(candidate);
          } else {
            currentDistrict = 'সব জেলা';
          }
          break;
        }
      }
    }

    if (line === 'বর্তমান উপজেলা') {
      for (let j = 1; j <= 3; j++) {
        const candidate = lines[i + j] ? lines[i + j].trim() : '';
        if (candidate && candidate !== 'বর্তমান উপজেলা' && candidate !== 'সব উপজেলা') {
          currentUpazila = candidate.split('-')[0].trim();
          break;
        }
      }
    }

    if (/^\d+\t/.test(lines[i])) {
      const startLine = i + 1;
      const block = [lines[i]];
      i++;
      while (
        i < lines.length &&
        !/^\d+\t/.test(lines[i]) &&
        !lines[i].includes('গ্রুপ:') &&
        !lines[i].includes('বর্তমান জেলা') &&
        !lines[i].includes('নং\tনাম\tঠিকানা')
      ) {
        block.push(lines[i]);
        i++;
      }

      rawBlocks.push({
        startLine,
        group: currentGroup,
        sectionDistrict: currentDistrict,
        sectionUpazila: currentUpazila,
        block
      });
      continue;
    }
    i++;
  }

  return rawBlocks;
}

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  console.log('[Import] Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('[Import] Connected to MongoDB Atlas successfully.');

  // Pre-generate password hash
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Donor@123456', salt);

  // Load existing donors from real_donors.json if available
  const realDonorsPath = path.join(__dirname, '../data/real_donors.json');
  let existingRealDonors = [];
  if (fs.existsSync(realDonorsPath)) {
    existingRealDonors = JSON.parse(fs.readFileSync(realDonorsPath, 'utf8'));
    console.log(`[Import] Found ${existingRealDonors.length} previously saved real donors.`);
  }

  const usedPhones = new Set();
  const usedEmails = new Set();

  existingRealDonors.forEach(d => {
    usedPhones.add(d.phone);
    usedEmails.add(d.email);
  });

  const txtPath = path.join(__dirname, '../blooddoner details.txt');
  console.log('[Import] Parsing blooddoner details.txt...');
  const blocks = parseDonorsFromText(txtPath);
  console.log(`[Import] Parsed ${blocks.length} donor blocks from blooddoner details.txt.`);

  let placeholderSeq = 1;
  const newDonorsList = [];

  for (let idx = 0; idx < blocks.length; idx++) {
    const d = blocks[idx];
    const firstLine = d.block[0];
    const parts = firstLine.split('\t');
    const num = parts[0].trim();
    let rawName = parts[1] ? parts[1].trim() : '';
    let addressPart = parts.slice(2).join(' ').trim();

    let bio = '';
    let rawPhone = '';
    let homeDistrict = '';
    let status = '';
    let dateStr = '';

    for (let b = 1; b < d.block.length; b++) {
      const bline = d.block[b].trim();
      if (!bline) continue;

      if (bline.includes('নোটঃ') || bline.includes('নোট:')) {
        bio += (bio ? ' ' : '') + bline.replace(/\.\.\.\s*আরও\s*পড়ুন.*$/, '');
      } else if (bline.includes('নিজ জেলাঃ') || bline.includes('নিজ জেলা:')) {
        const phoneParts = bline.split('\t');
        const distMatch = bline.match(/নিজ জেলা[ঃ:]\s*([^\t]+)/);
        if (distMatch) {
          homeDistrict = normalizeDistrictName(distMatch[1].trim());
        }
        for (const p of phoneParts) {
          const cleanP = cleanPhoneNumber(p);
          if (cleanP.length >= 8 && (cleanP.startsWith('01') || cleanP.startsWith('9') || cleanP.includes('X') || cleanP.includes('*') || /^\d{8,15}$/.test(cleanP))) {
            rawPhone = cleanP;
          }
        }
      } else if (bline.includes('রক্তদানের সময়')) {
        status = bline;
      } else if (/\d+.*(January|February|March|April|May|June|July|August|September|October|November|December|\d{4})/i.test(bline)) {
        dateStr = bline;
      } else if (!bline.includes('আরও দেখুন') && !bline.includes('ক্লিনিক') && !bline.includes('রক্তবন্ধু') && !bline.includes('কুইক লিঙ্কস') && !bline.includes('©')) {
        addressPart += (addressPart ? ', ' : '') + bline;
      }
    }

    // Clean Name & extract note if inside name
    const noteIdx = rawName.search(/নোট[ঃ:]/);
    if (noteIdx !== -1) {
      bio = rawName.substring(noteIdx).replace(/\.\.\.\s*আরও\s*পড়ুন.*$/, '').trim() + (bio ? ' ' + bio : '');
      rawName = rawName.substring(0, noteIdx).trim();
    }
    let cleanName = rawName.replace(/\[([^\]]+)\]\([^)]*\)/g, (m, p1) => p1).trim();
    if (!cleanName) cleanName = 'রক্তদাতা ' + num;
    if (cleanName.length > 80) cleanName = cleanName.substring(0, 80).trim();

    // Determine District
    let district = '';
    if (d.sectionDistrict && d.sectionDistrict !== 'সব জেলা') {
      district = d.sectionDistrict;
    } else {
      for (const dist of allDistricts) {
        if (addressPart.includes(dist)) {
          district = dist;
          break;
        }
      }
      if (!district) {
        district = homeDistrict || 'ঢাকা';
      }
    }
    district = normalizeDistrictName(district);

    // Determine Division and Country
    const division = districtToDiv[district] || 'ঢাকা';
    const country = districtToCountry[district] || 'বাংলাদেশ';

    // Determine Upazila
    const upazila = matchUpazila(district, addressPart);

    // Process Phone
    let finalPhone = rawPhone;
    let showPhonePublic = true;
    const isValidBDPhone = /^01[3-9]\d{8}$/.test(finalPhone);

    if (!isValidBDPhone || usedPhones.has(finalPhone)) {
      if (rawPhone && !rawPhone.includes('X') && !rawPhone.includes('*')) {
        bio = (bio ? bio + ' | ' : '') + `ফোন: ${rawPhone}`;
      }
      finalPhone = '01997' + String(placeholderSeq).padStart(6, '0');
      showPhonePublic = false;
      placeholderSeq++;
    }
    usedPhones.add(finalPhone);

    // Process Email
    let email = `donor_${finalPhone}@roktobarta.com`;
    if (usedEmails.has(email)) {
      email = `donor_${finalPhone}_${idx + 1}@roktobarta.com`;
    }
    usedEmails.add(email);

    // Process Date & Availability
    let lastDonationDate = null;
    let isAvailable = true;

    if (dateStr) {
      const cleanedDateStr = dateStr.replace(/\s*-\s*/g, ' ').trim();
      const parsedDate = new Date(cleanedDateStr);
      if (!isNaN(parsedDate.getTime())) {
        lastDonationDate = parsedDate;
      }
    }

    if (status.includes('হয়নি')) {
      isAvailable = false;
    } else if (status.includes('হয়েছে')) {
      isAvailable = true;
    } else if (lastDonationDate) {
      const now = new Date();
      const diffDays = (now - lastDonationDate) / (1000 * 60 * 60 * 24);
      if (diffDays < 90) {
        isAvailable = false;
      }
    }

    if (bio.length > 300) bio = bio.substring(0, 300).trim();
    const area = addressPart.length > 200 ? addressPart.substring(0, 200).trim() : addressPart.trim();

    newDonorsList.push({
      name: cleanName,
      email,
      phone: finalPhone,
      passwordHash: defaultPasswordHash,
      role: 'user',
      country,
      division,
      district,
      upazila,
      area,
      bloodGroup: d.group || 'A+',
      gender: 'পুরুষ',
      isDonor: true,
      isAvailable,
      lastDonationDate,
      totalDonations: lastDonationDate ? 1 : 0,
      showPhonePublic,
      bio,
      isVerified: true
    });
  }

  console.log(`[Import] Processed ${newDonorsList.length} donors ready for database.`);

  // Combine with existing real donors for persistence
  const masterDonorsList = [...existingRealDonors];
  for (const nd of newDonorsList) {
    masterDonorsList.push({
      ...nd,
      lastDonationDate: nd.lastDonationDate ? nd.lastDonationDate.toISOString() : null
    });
  }

  fs.writeFileSync(realDonorsPath, JSON.stringify(masterDonorsList, null, 2), 'utf8');
  console.log(`[Import] Saved total ${masterDonorsList.length} donors into data/real_donors.json for permanent persistence.`);

  // Bulk Insert into MongoDB Atlas in chunks of 500
  console.log('[Import] Inserting donors into MongoDB Atlas in batches...');
  const CHUNK_SIZE = 500;
  let totalUpserted = 0;

  for (let c = 0; c < newDonorsList.length; c += CHUNK_SIZE) {
    const chunk = newDonorsList.slice(c, c + CHUNK_SIZE);
    const bulkOps = chunk.map(doc => ({
      updateOne: {
        filter: { phone: doc.phone },
        update: { $set: doc },
        upsert: true
      }
    }));

    const result = await User.bulkWrite(bulkOps, { ordered: false });
    totalUpserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);
    console.log(`[Import] Batch ${Math.floor(c / CHUNK_SIZE) + 1}: ${chunk.length} processed.`);
  }

  console.log('\n=======================================');
  console.log(`[Import Summary]`);
  console.log(`Total blocks in text: ${blocks.length}`);
  console.log(`Successfully added to DB: ${newDonorsList.length}`);
  console.log(`Master real_donors.json count: ${masterDonorsList.length}`);
  console.log('=======================================\n');

  // Verify DB stats
  const totalInDB = await User.countDocuments({ isDonor: true });
  console.log(`Total active donors in MongoDB Atlas: ${totalInDB}`);

  const groupStats = await User.aggregate([
    { $match: { isDonor: true } },
    { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('[Donors by Blood Group]:');
  console.table(groupStats.map(s => ({ bloodGroup: s._id, count: s.count })));

  const districtStats = await User.aggregate([
    { $match: { isDonor: true } },
    { $group: { _id: '$district', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]);
  console.log('[Top 15 Districts by Donor Count]:');
  console.table(districtStats.map(s => ({ district: s._id, count: s.count })));

  await mongoose.disconnect();
  console.log('[Import] MongoDB connection closed. All tasks complete!');
}

run().catch(err => {
  console.error('[Import Error]:', err);
  process.exit(1);
});
