require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

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
  clean = clean.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+88')) clean = clean.substring(3);
  if (clean.startsWith('8801')) clean = clean.substring(2);
  return clean;
}

// Dhaka 20 Thanas/Upazilas mapping based on data/upazilas.json
const upazilaRules = [
  { upazila: 'সাভার', keywords: ['সাভার', 'savar', 'নবীনগর', 'হেমায়েতপুর', 'হেমায়েতপুর', 'আমিনবাজার', 'জাহাঙ্গীরনগর', 'juniv', 'enam', 'biam', 'তেঁতুলঝোড়া'] },
  { upazila: 'আশুলিয়া', keywords: ['আশুলিয়া', 'ashulia', 'বাইপাইল', 'জিরাবো', 'নরসিংহপুর', 'জামগড়া', 'ডিইপিজেড', 'depz', 'চন্দ্রা'] },
  { upazila: 'ধামরাই', keywords: ['ধামরাই', 'dhamrai'] },
  { upazila: 'কেরানীগঞ্জ', keywords: ['কেরানীগঞ্জ', 'keraniganj', 'জিনজিরা', 'হাসনাবাদ', 'রুহিতপুর', 'কেরানিগঞ্জ', 'আটি বাজার'] },
  { upazila: 'দোহার', keywords: ['দোহার', 'dohar', 'জয়পাড়া', 'জয়পাড়া'] },
  { upazila: 'নবাবগঞ্জ', keywords: ['নবাবগঞ্জ', 'nawabganj', 'বান্দুরা'] },
  { upazila: 'উত্তরা', keywords: ['উত্তরা', 'uttara', 'উত্তরখান', 'দক্ষিণখান', 'বিমানবন্দর', 'এয়ারপোর্ট', 'খিলক্ষেত', 'কুড়িল', 'nikunja', 'নিকুঞ্জ', 'airport', 'দিয়াবাড়ি', 'দিয়াবাড়ী', 'সেক্টর', 'sector', 'কাউলা', 'আশকোণা', 'আজমপুর', 'তুরাগ'] },
  { upazila: 'মিরপুর', keywords: ['মিরপুর', 'mirpur', 'পল্লবী', 'pallabi', 'পাইকপাড়া', 'কল্যাণপুর', 'kalyanpur', 'গাবতলী', 'gabtoli', 'সেনপাড়া', 'শেওড়াপাড়া', 'কাজীপাড়া', 'রূপনগর', 'ইব্রাহীমপুর', 'কাফরুল', 'মণিপুর', 'কালশী', 'ভাষানটেক', 'ভাসানটেক', 'আনসার ক্যাম্প', 'মাজার রোড', 'দারুস সালাম', 'darus salam', 'টোলারবাগ', 'চিড়িয়াখানা', 'আগারগাঁও', 'agargaon'] },
  { upazila: 'মোহাম্মদপুর', keywords: ['মোহাম্মদপুর', 'mohammadpur', 'আদাবর', 'adabor', 'শ্যামলী', 'shyamoli', 'জাপান গার্ডেন', 'বসিলা', 'bosila', 'কাটাসুর', 'রিং রোড', 'হুমায়ুন রোড', 'বাবর রোড', 'শিয়া মসজিদ', 'নবোদয়', 'মনসুরাবাদ', 'চাঁনমিয়া', 'শেখেরটেক', 'শিকদার'] },
  { upazila: 'ধানমন্ডি', keywords: ['ধানমন্ডি', 'dhanmondi', 'জিগাতলা', 'jigatola', 'শংকর', 'শুক্রাবাদ', 'সোবহানবাগ', 'সোবাহানবাগ', 'কলাবাগান', 'kalabagan', 'পান্থপথ', 'panthapath', 'গ্রিন রোড', 'green road', 'সেন্ট্রাল রোড', 'রায়েরবাজার', 'শংকুর'] },
  { upazila: 'তেজগাঁও', keywords: ['তেজগাঁও', 'tejgaon', 'তেজকুনীপাড়া', 'ফার্মগেট', 'farmgate', 'নাখালপাড়া', 'nakhalpara', 'বিজয় স্মরণী', 'কারওয়ান বাজার', 'কাওরান বাজার', 'kawran bazar', 'মনিপুরী পাড়া', 'রাজাবাজার', 'ইন্দিরা রোড'] },
  { upazila: 'গুলশান', keywords: ['গুলশান', 'gulshan', 'মহাখালী', 'mohakhali', 'নিকেতন', 'niketan', 'বারিধারা', 'baridhara', 'বসুন্ধরা', 'bashundhara', 'ভাটারা', 'শাহজাদপুর'] },
  { upazila: 'বনানী', keywords: ['বনানী', 'banani', 'চেয়ারম্যান বাড়ি', 'কাকলী'] },
  { upazila: 'বাড্ডা', keywords: ['বাড্ডা', 'badda', 'রামপুরা', 'rampura', 'আফতাবনগর', 'aftabnagar', 'বনশ্রী', 'banasree', 'মেরুল', 'merul', 'সাঁতারকুল', 'উলন', 'মহাখালী ওয়ারলেস'] },
  { upazila: 'খিলগাঁও', keywords: ['খিলগাঁও', 'khilgaon', 'বাসাবো', 'basabo', 'মাদারটেক', 'গোড়ান', 'goran', 'সিপাহীবাগ', 'নন্দীপাড়া', 'তিলপাপাড়া', 'খিলগাও'] },
  { upazila: 'মতিঝিল', keywords: ['মতিঝিল', 'motijheel', 'দিলকুশা', 'কমলাপুর', 'kamlapur', 'আরামবাগ', 'ফকিরাপুল', 'মুগদা', 'mugda', 'মানিকনগর', 'মান্ডা', 'গোপীবাগ', 'টিএন্ডটি'] },
  { upazila: 'পল্টন', keywords: ['পল্টন', 'polton', 'বিজয়নগর', 'সেগুনবাগিচা', 'কাকরাইল', 'তোপখানা', 'প্রেস ক্লাব', 'নয়া পল্টন', 'পুরানা পল্টন'] },
  { upazila: 'রমনা', keywords: ['রমনা', 'ramna', 'শাহবাগ', 'shahbagh', 'ঢাকা বিশ্ববিদ্যালয়', 'du', 'বুয়েট', 'buet', 'বেইলি রোড', 'শান্তিনগর', 'মগবাজার', 'সিদ্ধেশ্বরী', 'ইস্কাটন', 'হায়দারবক্স'] },
  { upazila: 'লালবাগ', keywords: ['লালবাগ', 'lalbagh', 'আজিমপুর', 'azimpur', 'চকবাজার', 'chawkbazar', 'কোতোয়ালী', 'বংশাল', 'ইসলামপুর', 'পুরান ঢাকা', 'আরমানিটোলা', 'বাবুবাজার', 'সদরঘাট', 'কামরাঙ্গীরচর', 'কামরাঙ্গিরচর', 'নবাবগঞ্জ পার্ক', 'মিটফোর্ড'] },
  { upazila: 'যাত্রাবাড়ী', keywords: ['যাত্রাবাড়ী', 'jatrabari', 'সায়েদাবাদ', 'ধোলাইপাড়', 'শনির আখড়া', 'রায়েরবাগ', 'ডেমরা', 'demra', 'মাতুয়াইল', 'কদমতলী', 'সূত্রাপুর', 'গেন্ডারিয়া', 'ওয়ারী', 'wari', 'দয়াগঞ্জ', 'জুরাইন', 'পোস্তগোলা'] }
];

function detectUpazila(address, defaultUpazila = 'মিরপুর') {
  if (!address) return defaultUpazila;
  const lower = address.toLowerCase();
  for (const rule of upazilaRules) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return rule.upazila;
      }
    }
  }
  return defaultUpazila;
}

function parseRawDonors(content) {
  const lines = content.split('\r\n').join('\n').split('\n');
  let currentGroup = 'A+';
  const parsed = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('গ্রুপ:A+')) currentGroup = 'A+';
    else if (line.includes('গ্রুপ:A-') || line === 'A-') currentGroup = 'A-';
    else if (line.includes('গ্রুপ:B+')) currentGroup = 'B+';

    if (/^\d+$/.test(line)) {
      const num = parseInt(line, 10);
      if (i + 2 < lines.length) {
        let nameCandidate = lines[i + 1].trim();
        let addrCandidate = lines[i + 2].trim();
        let phoneCandidate = lines[i + 3] ? lines[i + 3].trim() : '';

        // Special case: Index 6 where name was empty and address was on the first line
        if (nameCandidate.includes('নিজ জেলাঃ') && cleanPhoneNumber(addrCandidate).startsWith('01')) {
          phoneCandidate = addrCandidate;
          addrCandidate = nameCandidate;
          nameCandidate = 'রক্তদাতা ' + num;

          let status = '';
          let date = '';
          let offset = 3;
          if (i + offset < lines.length && (lines[i + offset].includes('রক্তদানের সময়') || lines[i + offset].includes('হয়েছে') || lines[i + offset].includes('হয়নি'))) {
            status = lines[i + offset].trim();
            offset++;
          }
          if (i + offset < lines.length && /\d+.*(January|February|March|April|May|June|July|August|September|October|November|December|\d{4})/i.test(lines[i + offset])) {
            date = lines[i + offset].trim();
            offset++;
          }
          parsed.push({ num, group: currentGroup, rawName: nameCandidate, address: addrCandidate, rawPhone: phoneCandidate, status, date });
          i += offset;
          continue;
        }

        const cleanPhone = cleanPhoneNumber(phoneCandidate);
        if (cleanPhone.startsWith('01') || cleanPhone.includes('X') || cleanPhone.includes('*') || /^\d{8,12}$/.test(cleanPhone)) {
          let status = '';
          let date = '';
          let offset = 4;
          if (i + offset < lines.length && (lines[i + offset].includes('রক্তদানের সময়') || lines[i + offset].includes('হয়েছে') || lines[i + offset].includes('হয়নি'))) {
            status = lines[i + offset].trim();
            offset++;
          }
          if (i + offset < lines.length && /\d+.*(January|February|March|April|May|June|July|August|September|October|November|December|\d{4})/i.test(lines[i + offset])) {
            date = lines[i + offset].trim();
            offset++;
          }
          parsed.push({ num, group: currentGroup, rawName: nameCandidate, address: addrCandidate, rawPhone: phoneCandidate, status, date });
          i += offset;
          continue;
        }
      }
    }
    i++;
  }

  return parsed;
}

async function runImport() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  console.log('[Import] Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('[Import] Connected successfully.');

  const inputPath = path.join(__dirname, '..', 'raw_donors_input.txt');
  const rawContent = fs.readFileSync(inputPath, 'utf8');
  const donorsRaw = parseRawDonors(rawContent);

  console.log(`[Import] Successfully parsed ${donorsRaw.length} donors from raw file.`);

  // Generate default password hash once
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Donor@123456', salt);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedAdminCount = 0;

  const usedPhones = new Set();
  const usedEmails = new Set();
  let placeholderSeq = 1;

  for (let idx = 0; idx < donorsRaw.length; idx++) {
    const raw = donorsRaw[idx];

    // 1. Process Name & Bio
    let name = raw.rawName.trim();
    let bio = '';
    const noteIdx = name.search(/নোট[ঃ:]/);
    if (noteIdx !== -1) {
      bio = name.substring(noteIdx).replace(/\.\.\.\s*আরও\s*পড়ুন.*$/, '').trim();
      name = name.substring(0, noteIdx).trim();
    }
    // Clean markdown link: [Name](url) -> Name
    name = name.replace(/\[([^\]]+)\]\([^)]*\)/g, (match, p1) => p1).trim();
    if (!name) name = `রক্তদাতা ${raw.num}`;
    if (name.length > 80) name = name.substring(0, 80).trim();
    if (bio.length > 300) bio = bio.substring(0, 300).trim();

    // 2. Process Phone
    let cleanPhone = cleanPhoneNumber(raw.rawPhone);
    let showPhonePublic = true;
    const isValidBDPhone = /^01[3-9]\d{8}$/.test(cleanPhone);

    if (!isValidBDPhone || usedPhones.has(cleanPhone)) {
      // Use sequential valid placeholder phone format
      cleanPhone = `01999${String(placeholderSeq).padStart(6, '0')}`;
      showPhonePublic = false;
      placeholderSeq++;
    }
    usedPhones.add(cleanPhone);

    // 3. Process Email
    let email = `donor_${cleanPhone}@roktobarta.com`;
    if (usedEmails.has(email)) {
      email = `donor_${cleanPhone}_${idx + 1}@roktobarta.com`;
    }
    usedEmails.add(email);

    // 4. Process Upazila & Address
    const upazila = detectUpazila(raw.address, 'মিরপুর');
    const area = raw.address.length > 200 ? raw.address.substring(0, 200) : raw.address;

    // 5. Process Date & Availability
    let lastDonationDate = null;
    let isAvailable = true;

    if (raw.date) {
      const cleanedDateStr = raw.date.replace(/\s*-\s*/g, ' ').trim();
      const parsedDate = new Date(cleanedDateStr);
      if (!isNaN(parsedDate.getTime())) {
        lastDonationDate = parsedDate;
      }
    }

    if (raw.status.includes('হয়নি')) {
      isAvailable = false;
    } else if (raw.status.includes('হয়েছে')) {
      isAvailable = true;
    } else if (lastDonationDate) {
      const now = new Date();
      const diffDays = (now - lastDonationDate) / (1000 * 60 * 60 * 24);
      if (diffDays < 90) {
        isAvailable = false;
      }
    }

    // 6. Check existing user in MongoDB
    const existing = await User.findOne({
      $or: [{ phone: cleanPhone }, { email: email }]
    });

    if (existing) {
      if (existing.role === 'admin') {
        skippedAdminCount++;
        continue;
      }

      existing.name = name;
      existing.bloodGroup = raw.group;
      existing.country = 'বাংলাদেশ';
      existing.division = 'ঢাকা';
      existing.district = 'ঢাকা';
      existing.upazila = upazila;
      existing.area = area;
      existing.isDonor = true;
      existing.isAvailable = isAvailable;
      existing.lastDonationDate = lastDonationDate;
      existing.totalDonations = lastDonationDate ? 1 : 0;
      existing.showPhonePublic = showPhonePublic;
      if (bio) existing.bio = bio;
      existing.isVerified = true;

      await existing.save();
      updatedCount++;
    } else {
      await User.create({
        name,
        email,
        phone: cleanPhone,
        passwordHash: defaultPasswordHash,
        role: 'user',
        country: 'বাংলাদেশ',
        division: 'ঢাকা',
        district: 'ঢাকা',
        upazila,
        area,
        bloodGroup: raw.group,
        gender: 'পুরুষ',
        isDonor: true,
        isAvailable,
        lastDonationDate,
        totalDonations: lastDonationDate ? 1 : 0,
        showPhonePublic,
        bio,
        isVerified: true
      });
      insertedCount++;
    }

    if ((idx + 1) % 100 === 0 || idx === donorsRaw.length - 1) {
      console.log(`[Import] Processed ${idx + 1}/${donorsRaw.length} donors... (Inserted: ${insertedCount}, Updated: ${updatedCount})`);
    }
  }

  console.log('\n=======================================');
  console.log(`[Import Complete]`);
  console.log(`Total parsed: ${donorsRaw.length}`);
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped Admin: ${skippedAdminCount}`);
  console.log('=======================================\n');

  // Verify upazila distribution in DB
  const stats = await User.aggregate([
    { $match: { district: 'ঢাকা' } },
    { $group: { _id: { upazila: '$upazila', bloodGroup: '$bloodGroup' }, count: { $sum: 1 } } },
    { $sort: { '_id.bloodGroup': 1, count: -1 } }
  ]);

  console.log('[DB Stats by Blood Group & Upazila in Dhaka]:');
  console.table(stats.map(s => ({ bloodGroup: s._id.bloodGroup, upazila: s._id.upazila, count: s.count })));

  await mongoose.disconnect();
  console.log('[Import] Finished & Disconnected.');
}

runImport().catch(err => {
  console.error('[Import Error]:', err);
  process.exit(1);
});
