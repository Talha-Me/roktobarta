require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Story = require('../models/Story');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Contact = require('../models/Contact');
const Notification = require('../models/Notification');
const DonationLog = require('../models/DonationLog');
const { createSlug } = require('../utils/slugify');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/roktobarta';
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected successfully.');

    // Clear existing collections
    console.log('[Seed] Cleaning old data...');
    await Promise.all([
      User.deleteMany({}),
      BloodRequest.deleteMany({}),
      Story.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Contact.deleteMany({}),
      Notification.deleteMany({}),
      DonationLog.deleteMany({})
    ]);

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('123456', salt);
    const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);

    // 1. Create Admins
    console.log('[Seed] Creating Admins...');
    const adminUser = await User.create({
      name: 'অ্যাডমিন রক্তবার্তা',
      email: 'admin@roktobarta.com',
      phone: '+8801700000000',
      passwordHash: adminPasswordHash,
      role: 'admin',
      country: 'বাংলাদেশ',
      division: 'ঢাকা',
      district: 'ঢাকা',
      upazila: 'ধানমন্ডি',
      area: 'রোড ৭/এ',
      bloodGroup: 'O+',
      gender: 'পুরুষ',
      dateOfBirth: new Date('1990-05-15'),
      weight: 72,
      isDonor: true,
      isAvailable: true,
      lastDonationDate: new Date('2026-06-10'),
      totalDonations: 8,
      showPhonePublic: true,
      avatar: '/images/user1.jpg',
      bio: 'রক্তবার্তা প্ল্যাটফর্মের প্রধান সমন্বয়ক ও নিয়মিত রক্তদাতা।',
      isVerified: true
    });

    const founderUser = await User.create({
      name: 'মুহাম্মদ আবু তালহা আকাশ',
      email: 'abutalhaakash26@gmail.com',
      phone: '01516579760',
      passwordHash: adminPasswordHash,
      role: 'admin',
      country: 'বাংলাদেশ',
      division: 'ঢাকা',
      district: 'ঢাকা',
      upazila: 'বাড্ডা',
      area: 'House 12, Road Avenue-8, Block M, Banasree',
      bloodGroup: 'A+',
      gender: 'পুরুষ',
      dateOfBirth: new Date('1998-01-01'),
      weight: 68,
      isDonor: true,
      isAvailable: true,
      totalDonations: 4,
      showPhonePublic: true,
      bio: 'Owner, Founder & CEO at TalhaByteIT | রক্তবার্তা প্রতিষ্ঠাতা',
      isVerified: true
    });
    });

    // 2. Create 32 Donors across BD & Kolkata
    console.log('[Seed] Creating 32 Donors...');
    const donorsRaw = [
      { name: 'তানভীর আহমেদ', email: 'tanvir@example.com', phone: '+8801711000001', bg: 'O+', dist: 'ঢাকা', upz: 'মিরপুর', gen: 'পুরুষ', lastDon: '2026-05-10', count: 6, avatar: '/images/user1.jpg' },
      { name: 'ফারজানা ইসলাম', email: 'farzana@example.com', phone: '+8801811000002', bg: 'A+', dist: 'ঢাকা', upz: 'ধানমন্ডি', gen: 'মহিলা', lastDon: '2026-04-12', count: 4, avatar: '/images/user2.jpg' },
      { name: 'সাইফ মাহমুদ', email: 'saif@example.com', phone: '+8801911000003', bg: 'B+', dist: 'চট্টগ্রাম', upz: 'পাঁচলাইশ', gen: 'পুরুষ', lastDon: '2026-06-20', count: 9, avatar: '/images/user3.jpg' },
      { name: 'অর্পিতা দাস', email: 'arpita@example.com', phone: '+919830000001', bg: 'AB+', dist: 'কলকাতা', upz: 'সল্টলেক', gen: 'মহিলা', lastDon: '2026-03-15', count: 5, avatar: '/images/user4.jpg', country: 'ভারত (কলকাতা)', division: 'পশ্চিমবঙ্গ (ভারত)' },
      { name: 'রাশেদুল ইসলাম', email: 'rashed@example.com', phone: '+8801711000004', bg: 'O-', dist: 'বগুড়া', upz: 'বগুড়া সদর', gen: 'পুরুষ', lastDon: '2026-07-01', count: 12, avatar: '/images/user5.jpg' },
      { name: 'সাদিয়া আক্তার', email: 'sadia@example.com', phone: '+8801511000005', bg: 'B-', dist: 'সিলেট', upz: 'সিলেট সদর', gen: 'মহিলা', lastDon: '2026-05-18', count: 3, avatar: '/images/user2.jpg' },
      { name: 'আরিফুল হাসান', email: 'ariful@example.com', phone: '+8801611000006', bg: 'A-', dist: 'রাজশাহী', upz: 'বোয়ালিয়া', gen: 'পুরুষ', lastDon: '2026-04-25', count: 7, avatar: '/images/user1.jpg' },
      { name: 'দেবব্রত রায়', email: 'deb@example.com', phone: '+919830000002', bg: 'O+', dist: 'কলকাতা', upz: 'বেহালা', gen: 'পুরুষ', lastDon: '2026-06-05', count: 8, avatar: '/images/user3.jpg', country: 'ভারত (কলকাতা)', division: 'পশ্চিমবঙ্গ (ভারত)' },
      { name: 'আনিকা তাবাসসুম', email: 'anika@example.com', phone: '+8801711000007', bg: 'AB-', dist: 'খুলনা', upz: 'সোনাডাঙ্গা', gen: 'মহিলা', lastDon: '2026-02-14', count: 2, avatar: '/images/user4.jpg' },
      { name: 'রবিউল করিম', email: 'robiul@example.com', phone: '+8801811000008', bg: 'A+', dist: 'কুমিল্লা', upz: 'কুমিল্লা আদর্শ সদর', gen: 'পুরুষ', lastDon: '2026-06-15', count: 5, avatar: '/images/user5.jpg' },
      { name: 'সুমাইয়া জান্নাত', email: 'sumaiya@example.com', phone: '+8801911000009', bg: 'B+', dist: 'ময়মনসিংহ', upz: 'ময়মনসিংহ সদর', gen: 'মহিলা', lastDon: '2026-05-01', count: 3, avatar: '/images/user2.jpg' },
      { name: 'মেহরাব হোসেন', email: 'mehrab@example.com', phone: '+8801311000010', bg: 'O+', dist: 'রংপুর', upz: 'রংপুর সদর', gen: 'পুরুষ', lastDon: '2026-06-25', count: 4, avatar: '/images/user1.jpg' },
      { name: 'পৌলমী সেনগুপ্ত', email: 'poulomi@example.com', phone: '+919830000003', bg: 'A+', dist: 'হাওড়া', upz: 'শিবপুর', gen: 'মহিলা', lastDon: '2026-05-20', count: 6, avatar: '/images/user4.jpg', country: 'ভারত (কলকাতা)', division: 'পশ্চিমবঙ্গ (ভারত)' },
      { name: 'নাজমুল হুদা', email: 'nazmul@example.com', phone: '+8801711000011', bg: 'B+', dist: 'বরিশাল', upz: 'বরিশাল সদর', gen: 'পুরুষ', lastDon: '2026-04-10', count: 5, avatar: '/images/user3.jpg' },
      { name: 'তাসনিয়া রহমান', email: 'tasnia@example.com', phone: '+8801811000012', bg: 'O-', dist: 'ঢাকা', upz: 'উত্তরা', gen: 'মহিলা', lastDon: '2026-06-12', count: 4, avatar: '/images/user2.jpg' },
      { name: 'সোহেল রানা', email: 'sohel@example.com', phone: '+8801911000013', bg: 'A+', dist: 'যশোর', upz: 'যশোর সদর', gen: 'পুরুষ', lastDon: '2026-07-05', count: 11, avatar: '/images/user5.jpg' },
      { name: 'রিয়াজুল হক', email: 'riazul@example.com', phone: '+8801711000014', bg: 'AB+', dist: 'কক্সবাজার', upz: 'কক্সবাজার সদর', gen: 'পুরুষ', lastDon: '2026-05-02', count: 3, avatar: '/images/user1.jpg' },
      { name: 'নুসরাত জাহান', email: 'nusrat@example.com', phone: '+8801611000015', bg: 'O+', dist: 'গাজীপুর', upz: 'টঙ্গী', gen: 'মহিলা', lastDon: '2026-04-18', count: 2, avatar: '/images/user4.jpg' },
      { name: 'মাহমুদুল হাসান', email: 'mahmud@example.com', phone: '+8801711000016', bg: 'B-', dist: 'নারায়ণগঞ্জ', upz: 'সিদ্ধিরগঞ্জ', gen: 'পুরুষ', lastDon: '2026-06-18', count: 4, avatar: '/images/user3.jpg' },
      { name: 'শুভ্র চ্যাটার্জি', email: 'subhra@example.com', phone: '+919830000004', bg: 'O-', dist: 'কলকাতা', upz: 'টালিগঞ্জ', gen: 'পুরুষ', lastDon: '2026-05-15', count: 7, avatar: '/images/user5.jpg', country: 'ভারত (কলকাতা)', division: 'পশ্চিমবঙ্গ (ভারত)' },
      { name: 'কামরুল হাসান', email: 'kamrul@example.com', phone: '+8801811000017', bg: 'A-', dist: 'টাঙ্গাইল', upz: 'টাঙ্গাইল সদর', gen: 'পুরুষ', lastDon: '2026-05-22', count: 5, avatar: '/images/user1.jpg' },
      { name: 'শামীমা নাসরিন', email: 'shamima@example.com', phone: '+8801911000018', bg: 'AB-', dist: 'দিনাজপুর', upz: 'দিনাজপুর সদর', gen: 'মহিলা', lastDon: '2026-03-30', count: 3, avatar: '/images/user2.jpg' },
      { name: 'হাসিবুল ইসলাম', email: 'hasibul@example.com', phone: '+8801711000019', bg: 'B+', dist: 'পাবনা', upz: 'ঈশ্বরদী', gen: 'পুরুষ', lastDon: '2026-06-10', count: 6, avatar: '/images/user3.jpg' },
      { name: 'রেহনুমা ফেরদৌস', email: 'rehnuma@example.com', phone: '+8801511000020', bg: 'O+', dist: 'ফরিদপুর', upz: 'ফরিদপুর সদর', gen: 'মহিলা', lastDon: '2026-04-05', count: 4, avatar: '/images/user4.jpg' },
      { name: 'ইশতিয়াক আহমেদ', email: 'ishtiaq@example.com', phone: '+8801711000021', bg: 'A+', dist: 'কুষ্টিয়া', upz: 'কুষ্টিয়া সদর', gen: 'পুরুষ', lastDon: '2026-07-02', count: 8, avatar: '/images/user5.jpg' },
      { name: 'অর্ণব সেন', email: 'arnab@example.com', phone: '+919830000005', bg: 'B+', dist: 'উত্তর ২৪ পরগনা', upz: 'বারাসাত', gen: 'পুরুষ', lastDon: '2026-06-14', count: 5, avatar: '/images/user1.jpg', country: 'ভারত (কলকাতা)', division: 'পশ্চিমবঙ্গ (ভারত)' },
      { name: 'ফাহমিদা হক', email: 'fahmida@example.com', phone: '+8801811000022', bg: 'A+', dist: 'কিশোরগঞ্জ', upz: 'ভৈরব', gen: 'মহিলা', lastDon: '2026-05-11', count: 3, avatar: '/images/user2.jpg' },
      { name: 'তৌহিদুল ইসলাম', email: 'touhid@example.com', phone: '+8801911000023', bg: 'O+', dist: 'সিরাজগঞ্জ', upz: 'সিরাজগঞ্জ সদর', gen: 'পুরুষ', lastDon: '2026-06-28', count: 9, avatar: '/images/user3.jpg' },
      { name: 'জেরিন আনজুম', email: 'jerin@example.com', phone: '+8801711000024', bg: 'B+', dist: 'ব্রাহ্মণবাড়িয়া', upz: 'ব্রাহ্মণবাড়িয়া সদর', gen: 'মহিলা', lastDon: '2026-04-20', count: 2, avatar: '/images/user4.jpg' },
      { name: 'আসিফ ইকবাল', email: 'asif@example.com', phone: '+8801811000025', bg: 'AB+', dist: 'নোয়াখালী', upz: 'নোয়াখালী সদর', gen: 'পুরুষ', lastDon: '2026-05-19', count: 4, avatar: '/images/user5.jpg' },
      { name: 'রুমানা রশিদ', email: 'rumana@example.com', phone: '+8801611000026', bg: 'O-', dist: 'ফেনী', upz: 'ফেনী সদর', gen: 'মহিলা', lastDon: '2026-06-08', count: 5, avatar: '/images/user2.jpg' },
      { name: 'পার্থ সারথী', email: 'partha@example.com', phone: '+919830000006', bg: 'A-', dist: 'হুগলি', upz: 'শ্রীরামপুর', gen: 'পুরুষ', lastDon: '2026-05-25', count: 6, avatar: '/images/user3.jpg', country: 'ভারত (কলকাতা)', division: 'পশ্চিমবঙ্গ (ভারত)' }
    ];

    const createdDonors = [];
    for (const d of donorsRaw) {
      const user = await User.create({
        name: d.name,
        email: d.email,
        phone: d.phone,
        passwordHash: defaultPasswordHash,
        country: d.country || 'বাংলাদেশ',
        division: d.division || '',
        district: d.dist,
        upazila: d.upz,
        bloodGroup: d.bg,
        gender: d.gen,
        dateOfBirth: new Date('1996-03-20'),
        weight: 65,
        isDonor: true,
        isAvailable: true,
        lastDonationDate: new Date(d.lastDon),
        totalDonations: d.count,
        showPhonePublic: true,
        avatar: d.avatar,
        bio: `${d.dist} জেলার নিয়মিত স্বেচ্ছাসেবী রক্তদাতা। যেকোনো জরুরি প্রয়োজনে আমাকে পাবেন।`,
        isVerified: true
      });
      createdDonors.push(user);
    }

    // 2.1 Load Real Donors from data/real_donors.json if available
    const realDonorsPath = path.join(__dirname, '..', 'data', 'real_donors.json');
    if (fs.existsSync(realDonorsPath)) {
      console.log('[Seed] Seeding real donors from data/real_donors.json...');
      const realDonorsList = JSON.parse(fs.readFileSync(realDonorsPath, 'utf8'));
      const CHUNK = 500;
      for (let c = 0; c < realDonorsList.length; c += CHUNK) {
        const chunk = realDonorsList.slice(c, c + CHUNK);
        const ops = chunk.map(rd => ({
          updateOne: {
            filter: { phone: rd.phone },
            update: {
              $set: {
                ...rd,
                passwordHash: defaultPasswordHash,
                lastDonationDate: rd.lastDonationDate ? new Date(rd.lastDonationDate) : null
              }
            },
            upsert: true
          }
        }));
        await User.bulkWrite(ops, { ordered: false });
      }
      console.log(`[Seed] Seeded ${realDonorsList.length} real donors via bulk operations.`);
    }

    // 3. Create 10 Blood Requests
    console.log('[Seed] Creating 10 Blood Requests...');
    const requestsRaw = [
      {
        patient: 'আব্দুল করিম (৫৫)',
        bg: 'A+',
        bags: 2,
        reason: 'হৃদরোগ',
        urgency: 'অতি জরুরি',
        hosp: 'জাতীয় হৃদরোগ ইনস্টিটিউট ও হাসপাতাল',
        dist: 'ঢাকা',
        upz: 'মিরপুর',
        addr: 'শেরেবাংলা নগর, ঢাকা-১২০৭, সিসিইউ বেড ৪',
        date: new Date(Date.now() + 18 * 3600 * 1000), // In 18 hours
        contactName: 'কামরুল হাসান (ছেলে)',
        contactPhone: '+8801711223344',
        note: 'আজ রাতেই ওপেন হার্ট সার্জারি হবে। জরুরি ভিত্তিতে ২ ব্যাগ এ+ রক্ত প্রয়োজন।'
      },
      {
        patient: 'সুমী আক্তার (২৮)',
        bg: 'O-',
        bags: 1,
        reason: 'সিজার',
        urgency: 'অতি জরুরি',
        hosp: 'চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল',
        dist: 'চট্টগ্রাম',
        upz: 'পাঁচলাইশ',
        addr: 'গাইনি ওয়ার্ড নং ২২, বেড ১৫',
        date: new Date(Date.now() + 10 * 3600 * 1000),
        contactName: 'মাহবুব আলম (স্বামী)',
        contactPhone: '+8801811556677',
        note: 'সিজারের রোগী, নেগেটিভ গ্রুপ হওয়ায় রক্ত পেতে সমস্যা হচ্ছে। সাহায্য করুন।'
      },
      {
        patient: 'ছোট্ট রাফি (৬)',
        bg: 'B+',
        bags: 1,
        reason: 'থ্যালাসেমিয়া',
        urgency: '২৪ ঘণ্টা',
        hosp: 'বগুড়া শহীদ জিয়াউর রহমান মেডিকেল কলেজ',
        dist: 'বগুড়া',
        upz: 'বগুড়া সদর',
        addr: 'ওয়ার্ড ৪, শিশু বিভাগ',
        date: new Date(Date.now() + 28 * 3600 * 1000),
        contactName: 'মো. রফিকুল ইসলাম (পিতা)',
        contactPhone: '+8801711889900',
        note: 'প্রতি মাসে নিয়মিত রক্ত দিতে হয়। হিমোগ্লোবিন ৫-এ নেমে গেছে।'
      },
      {
        patient: 'সুব্রত মুখার্জি (৪৫)',
        bg: 'B-',
        bags: 2,
        reason: 'দুর্ঘটনা',
        urgency: 'অতি জরুরি',
        hosp: 'এসএসকেএম হাসপাতাল',
        dist: 'কলকাতা',
        upz: 'বেহালা',
        addr: 'ট্রমা কেয়ার ইউনিট, কলকাতা',
        date: new Date(Date.now() + 8 * 3600 * 1000),
        contactName: 'অরিন্দম মুখার্জি (ভাই)',
        contactPhone: '+919830112233',
        note: 'রোড এক্সিডেন্টে প্রচুর রক্তক্ষরণ হয়েছে। অতি দ্রুত বি নেগেটিভ রক্তের প্রয়োজন।'
      },
      {
        patient: 'নাজমীন সুলতানা (৩৪)',
        bg: 'AB+',
        bags: 2,
        reason: 'অপারেশন',
        urgency: '২৪ ঘণ্টা',
        hosp: 'সিলেট এম.এ.জি ওসমানী মেডিকেল কলেজ',
        dist: 'সিলেট',
        upz: 'সিলেট সদর',
        addr: 'সার্জারি ওয়ার্ড নং ৫',
        date: new Date(Date.now() + 24 * 3600 * 1000),
        contactName: 'আবুল কালাম',
        contactPhone: '+8801712334455',
        note: 'পিত্তথলির অপারেশনের জন্য এবি পজিটিভ রক্তের প্রয়োজন।'
      },
      {
        patient: 'মোশাররফ হোসেন (৬২)',
        bg: 'O+',
        bags: 1,
        reason: 'কিডনি ডায়ালাইসিস',
        urgency: '২৪ ঘণ্টা',
        hosp: 'রাজশাহী মেডিকেল কলেজ হাসপাতাল',
        dist: 'রাজশাহী',
        upz: 'বোয়ালিয়া',
        addr: 'নেফ্রোলজি বিভাগ',
        date: new Date(Date.now() + 30 * 3600 * 1000),
        contactName: 'জাকির হোসেন',
        contactPhone: '+8801713445566',
        note: 'ডায়ালাইসিসের সময় রক্ত লাগবে। ও+ রক্তের দাতা প্রয়োজন।'
      },
      {
        patient: 'তানজিলা ইসলাম (২২)',
        bg: 'A-',
        bags: 2,
        reason: 'ডেঙ্গু',
        urgency: 'অতি জরুরি',
        hosp: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
        dist: 'ঢাকা',
        upz: 'ধানমন্ডি',
        addr: 'নতুন ভবন, মেডিসিন ওয়ার্ড নং ৭০২',
        date: new Date(Date.now() + 12 * 3600 * 1000),
        contactName: 'ইমরান নাজির',
        contactPhone: '+8801714556677',
        note: 'প্লেটলেট অনেক কমে গেছে, জরুরি রক্ত ও ফ্রেশ প্লাজমা দরকার।'
      },
      {
        patient: 'অরুণাভ রায় (৫০)',
        bg: 'AB-',
        bags: 2,
        reason: 'ক্যান্সার',
        urgency: '২৪ ঘণ্টা',
        hosp: 'চিত্তরঞ্জন জাতীয় ক্যান্সার ইনস্টিটিউট',
        dist: 'কলকাতা',
        upz: 'সল্টলেক',
        addr: 'ক্যান্সার ব্লক ৩, কলকাতা',
        date: new Date(Date.now() + 36 * 3600 * 1000),
        contactName: 'সোমা রায়',
        contactPhone: '+919830223344',
        note: 'কেমোথেরাপির পর রক্তের প্রয়োজন। এবি নেগেটিভ রক্তের সাহায্য প্রার্থনা করছি।'
      },
      {
        patient: 'মনোয়ারা বেগম (৪০)',
        bg: 'A+',
        bags: 1,
        reason: 'সিজার',
        urgency: 'সাধারণ',
        hosp: 'খুলনা মেডিকেল কলেজ হাসপাতাল',
        dist: 'খুলনা',
        upz: 'সোনাডাঙ্গা',
        addr: 'লেবার ওয়ার্ড',
        date: new Date(Date.now() + 48 * 3600 * 1000),
        contactName: 'আলমগীর হোসেন',
        contactPhone: '+8801715667788',
        note: 'পরশু সকালে সিজার হবে। আগে থেকেই এ+ রক্ত ম্যানেজ করে রাখতে হবে।'
      },
      {
        patient: 'ইকবাল বাহার (৪৮)',
        bg: 'O+',
        bags: 2,
        reason: 'অপারেশন',
        urgency: '২৪ ঘণ্টা',
        hosp: 'ময়মনসিংহ মেডিকেল কলেজ হাসপাতাল',
        dist: 'ময়মনসিংহ',
        upz: 'ময়মনসিংহ সদর',
        addr: 'অর্থোপেডিক বিভাগ',
        date: new Date(Date.now() + 20 * 3600 * 1000),
        contactName: 'সাজ্জাদুল হক',
        contactPhone: '+8801716778899',
        note: 'হাড় ভাঙার জটিল অপারেশনের জন্য ২ ব্যাগ ও+ রক্ত লাগবে।'
      }
    ];

    for (let i = 0; i < requestsRaw.length; i++) {
      const r = requestsRaw[i];
      await BloodRequest.create({
        requester: createdDonors[i % createdDonors.length]._id,
        patientName: r.patient,
        bloodGroup: r.bg,
        bagsNeeded: r.bags,
        reason: r.reason,
        urgency: r.urgency,
        hospitalName: r.hosp,
        district: r.dist,
        upazila: r.upz,
        address: r.addr,
        neededDate: r.date,
        contactName: r.contactName,
        contactPhone: r.contactPhone,
        note: r.note,
        status: 'open',
        views: Math.floor(Math.random() * 80) + 10
      });
    }

    // 4. Create 6 Stories
    console.log('[Seed] Creating 6 Stories...');
    const storiesRaw = [
      {
        author: createdDonors[0]._id,
        role: 'donor',
        title: 'প্রথমবার রক্ত দিয়ে যা শিখেছিলাম',
        bloodGroup: 'O+',
        location: 'ঢাকা',
        likesCount: 52,
        body: 'বিশ্ববিদ্যালয় জীবনের প্রথম বর্ষে রক্তদান ক্যাম্পেইনে খুব ভয়ে ভয়ে রক্ত দিতে গিয়েছিলাম। সুঁই দেখলে আমি ভয় পেতাম। কিন্তু রক্ত দেওয়ার পর যখন ক্যাম্পের ডাক্তার বললেন—আপনার এই এক ব্যাগ রক্ত হয়তো ঢাকা মেডিকেলের কোনো মুমূর্ষু শিশুর জীবন বাঁচাবে, তখন বুকটা এক অদ্ভুত শান্তিতে ভরে গেল। এখন প্রতি চার মাস পর পর নিয়ম করে রক্ত দিই। ভয়কে জয় করাই মানবিকতার প্রথম ধাপ।'
      },
      {
        author: createdDonors[1]._id,
        role: 'receiver',
        title: 'নেগেটিভ গ্রুপের রক্ত, তবুও দেবদূতের মতো পাশে পেলাম রক্তদাতাকে',
        bloodGroup: 'B-',
        location: 'বগুড়া',
        likesCount: 118,
        body: 'আমার সিজারের আগের রাতে হঠাৎ রক্তক্ষরণ শুরু হয়। চিকিৎসকরা জানান তৎক্ষণাৎ বি নেগেটিভ রক্তের প্রয়োজন। জেলা শহরের ব্লাড ব্যাংকে কোথাও রক্ত মিলছিল না। পরিবারের সবাই যখন কান্নায় ভেঙে পড়েছিল, তখন আমার ভাই রক্তবার্তায় একটি জরুরি পোস্ট দেয়। মাত্র দেড় ঘণ্টার মধ্যে শিবগঞ্জ থেকে একজন রক্তদাতা এসে নিঃস্বার্থভাবে রক্ত দিয়ে যান। আজ আমার সন্তান ও আমি সুস্থ আছি সেই অচেনা মানুষটির জন্য।'
      },
      {
        author: createdDonors[3]._id,
        role: 'donor',
        title: '৫০তম বার রক্তদানের অনুভূতি: রক্তদানই আমার জীবনের সর্বশ্রেষ্ঠ প্রার্থনা',
        bloodGroup: 'AB+',
        location: 'কলকাতা',
        likesCount: 84,
        body: '১৯ বছর বয়সে প্রথমবার কলেজ ক্যাম্পাসে রক্তদান করেছিলাম। আজ আমার ৫০তম রক্তদান সম্পন্ন হলো কলকাতার এসএসকেএম হাসপাতালে। অনেকে বলেন নিয়মিত রক্ত দিলে শরীর দুর্বল হয়, কিন্তু বিশ্বাস করুন রক্তদানের পর শরীর আরো সতেজ ও প্রাণবন্ত লাগে। মানুষের বিপদে রক্তের ব্যবস্থা করার চেয়ে বড় কোনো মানবিক পুণ্য পৃথিবীতে নেই।'
      },
      {
        author: createdDonors[2]._id,
        role: 'donor',
        title: 'মধ্যরাতের সেই জরুরি ডাক ও এক অচেনা প্রাণের সন্ধান',
        bloodGroup: 'B+',
        location: 'চট্টগ্রাম',
        likesCount: 65,
        body: 'রাত তখন আড়াইটা। হঠাৎ ফোনে রক্তবার্তার নোটিফিকেশন বাজে—চট্টগ্রাম মেডিকেলে একজন থ্যালাসেমিয়া রোগীর প্রচণ্ড জরুরি রক্ত লাগবে। আমি ঘুম থেকে উঠে বাইক নিয়ে হাসপাতালে ছুটে যাই। রোগীর স্বজনদের চোখের জল আর রক্তদানের পর তাদের মুখের হাসিটুকুই ছিল আমার জন্য পৃথিবীর শ্রেষ্ঠ উপহার।'
      },
      {
        author: createdDonors[4]._id,
        role: 'receiver',
        title: 'থ্যালাসেমিয়া আক্রান্ত আমার ছোট্ট ছেলের মুখে আজ হাসি',
        bloodGroup: 'O-',
        location: 'রাজশাহী',
        likesCount: 97,
        body: 'আমার ৬ বছরের ছেলে আবিরের প্রতি তিন সপ্তাহ পর পর ও নেগেটিভ রক্তের প্রয়োজন হয়। নিয়মিত রক্তদাতা পাওয়া আমাদের জন্য এক দুঃস্বপ্ন ছিল। কিন্তু রক্তবার্তা প্ল্যাটফর্মে যুক্ত হওয়ার পর রাজশাহীর স্থানীয় কয়েকজন ভাই নিয়মিত শিডিউল করে রক্ত দিচ্ছেন। এই মানবিক মানুষগুলোর ঋণ আমরা কোনোদিন শোধ করতে পারব না।'
      },
      {
        author: createdDonors[7]._id,
        role: 'donor',
        title: 'করোনাকালীন সংকট থেকে শুরু করে আজ অব্দি একটাই অঙ্গীকার',
        bloodGroup: 'A+',
        location: 'সিলেট',
        likesCount: 43,
        body: 'কোভিডের চরম মুহূর্তে যখন সবাই ঘরে বন্দি ছিল, তখন রক্তের তীব্র সংকটে অসহায় মানুষদের পাশে দাঁড়িয়েছিলাম। সেই থেকে শুরু, রক্তদান এখন আমার অভ্যাসে পরিণত হয়েছে। রক্ত দিন, এতে কোনো ক্ষতি নেই; বরং নিজের শরীর ও মন দুটোই ভালো থাকে।'
      }
    ];

    for (const s of storiesRaw) {
      const slug = createSlug(s.title);
      await Story.create({
        author: s.author,
        role: s.role,
        title: s.title,
        slug,
        body: s.body,
        bloodGroup: s.bloodGroup,
        location: s.location,
        status: 'approved',
        likes: [adminUser._id],
        views: Math.floor(Math.random() * 200) + 50
      });
    }

    // 5. Create 5 Blog Posts
    console.log('[Seed] Creating 5 Blog Posts...');
    const postsRaw = [
      {
        title: 'নিয়মিত রক্তদানের ১০টি বিস্ময়কর স্বাস্থ্য উপকারিতা',
        category: 'স্বাস্থ্য টিপস',
        tags: ['রক্তদান', 'স্বাস্থ্য', 'হার্ট', 'ক্যান্সার প্রতিরোধ'],
        excerpt: 'রক্তদান কেবল অন্যের জীবনই বাঁচায় না, বরং রক্তদাতার নিজের হার্টের স্বাস্থ্য উন্নত করে, অতিরিক্ত আয়রন দূর করে এবং ক্যান্সারের ঝুঁকি হ্রাস করে।',
        content: `
          <p class="lead">অনেকেই মনে করেন রক্ত দিলে শরীর দুর্বল হয় বা স্বাস্থ্যহানি ঘটে। কিন্তু চিকিৎসা বিজ্ঞান স্পষ্টভাবে প্রমাণ করেছে যে নিয়মিত রক্তদান রক্তদাতার শারীরিক ও মানসিক স্বাস্থ্যের জন্য অত্যন্ত উপকারী।</p>
          
          <h2>১. হৃদরোগ ও হার্ট অ্যাটাকের ঝুঁকি কমায়</h2>
          <p>নিয়মিত রক্ত দিলে রক্তে অতিরিক্ত আয়রনের মাত্রা স্বাভাবিক থাকে। শরীরে অতিরিক্ত আয়রন জমা হলে তা রক্তনালীতে ব্লক তৈরি করতে পারে। গবেষণায় দেখা গেছে, বছরে অন্তত দুবার রক্ত দিলে রক্তদাতাদের হার্ট অ্যাটাকের ঝুঁকি প্রায় ৮০% পর্যন্ত কমে যায়।</p>
          
          <h2>২. নতুন রক্তকণিকা তৈরিতে সহায়তা করে</h2>
          <p>এক ব্যাগ রক্ত দানের মাত্র ৪৮ ঘণ্টার মধ্যেই শরীরে রক্তের তরল অংশ (প্লাজমা) পূরণ হয়ে যায় এবং কয়েক সপ্তাহের মধ্যে অস্থিমজ্জা (Bone Marrow) থেকে নতুন ও সতেজ লোহিত রক্তকণিকা উৎপাদিত হয়। ফলে শরীরে কর্মক্ষমতা বৃদ্ধি পায়।</p>
          
          <h2>৩. বিনামূল্যে স্বাস্থ্য পরীক্ষা</h2>
          <p>প্রতিবার রক্তদানের আগে দাতার রক্তচাপ, পালস, হিমোগ্লোবিনের মাত্রা এবং হেপাটাইটিস বি, সি, এইচআইভি, ম্যালেরিয়া ও সিফিলিসের মতো মারাত্মক রোগ বিনামূল্যে স্ক্রিনিং করা হয়। ফলে রক্তদাতা নিজের শারীরিক অবস্থা সম্পর্কে সবসময় সচেতন থাকতে পারেন।</p>
          
          <h2>৪. ওজন নিয়ন্ত্রণে সহায়ক</h2>
          <p>একবার রক্ত দিলে প্রায় ৬৫০ ক্যালোরি শক্তি ব্যয় হয়। যারা ওজন নিয়ন্ত্রণে রাখতে চান, তাদের জন্য রক্তদান একটি চমৎকার সহায়ক অভ্যাস।</p>
          
          <h2>৫. মানসিক তৃপ্তি ও দীর্ঘায়ু</h2>
          <p>কারো জীবন বাঁচাতে সাহায্য করার অনুভূতি মানসিক চাপ কমায়, বিষণ্নতা দূর করে এবং বেঁচে থাকার ইতিবাচক প্রেরণা যোগায়।</p>
        `
      },
      {
        title: 'রক্তদানের আগে ও পরে কী খাবেন? জরুরি খাদ্য নির্দেশিকা',
        category: 'রক্তদান সহায়িকা',
        tags: ['খাদ্যাভ্যাস', 'রক্তদান প্রস্তুতি', 'আয়রন', 'পানি'],
        excerpt: 'রক্তদানের আগে প্রচুর পানি পান ও আয়রনযুক্ত খাবার খাওয়া এবং রক্তদানের পর পর্যাপ্ত বিশ্রাম নেওয়া শরীরকে দ্রুত স্বাভাবিক করে তোলে। জেনে নিন বিস্তারিত নিয়ম।',
        content: `
          <p class="lead">রক্তদানের পূর্বে ও পরবর্তীতে সঠিক খাদ্যাভ্যাস শরীরকে ক্লান্তিহীন রাখতে এবং দ্রুত রক্ত পূরণ করতে সাহায্য করে। নিচে রক্তদাতাদের জন্য একটি নির্ভরযোগ্য খাবারের গাইডলাইন তুলে ধরা হলো।</p>

          <h2>রক্তদানের আগে যা করবেন:</h2>
          <ul>
            <li><strong>পর্যাপ্ত পানি পান:</strong> রক্তদানের আগের দিন এবং রক্তদানের ২-৩ ঘণ্টা আগে অন্তত ৩-৪ গ্লাস পানি বা তাজা ফলের শরবত পান করুন। এটি রক্তচাপ স্বাভাবিক রাখতে সহায়তা করে।</li>
            <li><strong>আয়রনসমৃদ্ধ খাবার:</strong> রক্তদানের আগে শাকসবজি (পালং শাক, ডাঁটা শাক), ডাল, ডিম, লাল মাংস ও শুকনো ফল (কিশমিশ, খেজুর) খান।</li>
            <li><strong>ভারী তৈলাক্ত খাবার পরিহার:</strong> অতিরিক্ত চর্বিযুক্ত বা ভাজাপোড়া খাবার খেলে রক্তের প্লাজমায় ফ্যাটের পরিমাণ বেড়ে যেতে পারে, যা ল্যাব টেস্টে সমস্যা তৈরি করে।</li>
            <li><strong>ধূমপান পরিহার:</strong> রক্তদানের অন্তত ৩ ঘণ্টা আগে ধূমপান থেকে বিরত থাকুন।</li>
          </ul>

          <h2>রক্তদানের ঠিক পরে যা করবেন:</h2>
          <ul>
            <li>রক্তদানের পর অন্তত ১৫-২০ মিনিট চেয়ারে বা বিছানায় শান্তভাবে শুয়ে বা বসে থাকুন।</li>
            <li>স্যালাইন, ফলের রস বা বিস্কুট খেয়ে হালকা শক্তি সঞ্চয় করুন।</li>
            <li>রক্তদানের পর অন্তত ৫ ঘণ্টা ভারী ব্যায়াম বা ভারী জিনিস তোলা থেকে বিরত থাকুন।</li>
          </ul>
        `
      },
      {
        title: 'থ্যালাসেমিয়া ও রক্তের প্রয়োজনীয়তা: আমাদের সামাজিক দায়িত্ব',
        category: 'সচেতনতা',
        tags: ['থ্যালাসেমিয়া', 'সচেতনতা', 'শিশু স্বাস্থ্য', 'নিয়মিত রক্তদাতা'],
        excerpt: 'বাংলাদেশে প্রতি বছর হাজার হাজার শিশু থ্যালাসেমিয়া রোগ নিয়ে জন্মগ্রহণ করে। তাদের একমাত্র ভরসা নিয়মিত রক্তদান। জেনে নিন তাদের পাশে আমরা কীভাবে দাঁড়াতে পারি।',
        content: `
          <p class="lead">থ্যালাসেমিয়া একটি জন্মগত বংশগত রক্তের রোগ, যাতে আক্রান্ত রোগীদের শরীরে পর্যাপ্ত হিমোগ্লোবিন তৈরি হয় না। এদের বেঁচে থাকার জন্য প্রতি মাসে ১ থেকে ৩ ব্যাগ রক্তের প্রয়োজন হয়।</p>

          <h2>থ্যালাসেমিয়ার বাস্তবতা</h2>
          <p>একটি শিশুর যখন থ্যালাসেমিয়া ধরা পড়ে, তখন থেকেই পরিবারটির সংগ্রাম শুরু হয়। নিয়মিত রক্ত সংগ্রহ করা একটি অসহায় পরিবারের জন্য কতটা কষ্টকর, তা শুধু ভুক্তভোগীরাই জানেন। সঠিক সময়ে রক্ত না পেলে রোগীর প্লীহা বড় হয়ে যায়, হাড় দুর্বল হয় এবং হার্ট ফেইলিউর হতে পারে।</p>

          <h2>রক্তদাতাদের ভূমিকা</h2>
          <p>স্বেচ্ছাসেবী রক্তদাতারা হলেন থ্যালাসেমিয়া শিশুদের জীবনের সবচেয়ে বড় ভরসা। রক্তবার্তার মাধ্যমে আপনি যেকোনো একটি থ্যালাসেমিয়া রোগীর নিয়মিত রক্তদাতা হিসেবে নিজেকে যুক্ত করতে পারেন। আপনার মাত্র এক ব্যাগ রক্তে একটি নিষ্পাপ শিশুর মুখে হাসি ফুটবে।</p>

          <h2>প্রতিরোধই মূল সমাধান</h2>
          <p>বিবাহের পূর্বে পাত্র-পাত্রীর রক্তে থ্যালাসেমিয়া বাহক পরীক্ষা (Hemoglobin Electrophoresis) করার মাধ্যমে আমরা সহজেই এই রোগ নির্মূল করতে পারি। দুজন বাহকের বিয়ে না হলে সন্তান থ্যালাসেমিক হওয়ার কোনো সম্ভাবনা থাকে না।</p>
        `
      },
      {
        title: 'রক্তদানের যোগ্যতা ও শর্তাবলী: কে রক্ত দিতে পারবেন আর কে পারবেন না?',
        category: 'রক্তদান সহায়িকা',
        tags: ['যোগ্যতা', 'শর্ত', 'রক্তদান বিধি'],
        excerpt: '১৮ থেকে ৬০ বছর বয়সী যেকোনো সুস্থ ব্যক্তি নির্দিষ্ট কিছু শর্ত পূরণ সাপেক্ষে নিয়মিত রক্ত দিতে পারেন। জেনে নিন আপনার রক্তদানের সক্ষমতা সংক্রান্ত চিকিৎসাগত নিয়ম।',
        content: `
          <p class="lead">রক্তদান একটি মহৎ কাজ হলেও রক্তদাতার নিজের স্বাস্থ্য এবং গ্রহীতার নিরাপত্তা নিশ্চিত করা সবার আগে জরুরি। কে রক্ত দিতে পারবেন এবং কাদের রক্তদান থেকে বিরত থাকতে হবে, তা জেনে নেওয়া যাক।</p>

          <h2>কারা রক্ত দিতে পারবেন?</h2>
          <ul>
            <li>বয়স: ১৮ থেকে ৬০ বছরের মধ্যে হতে হবে।</li>
            <li>ওজন: পুরুষের ক্ষেত্রে কমপক্ষে ৫০ কেজি এবং নারীর ক্ষেত্রে কমপক্ষে ৪৫ কেজি হতে হবে।</li>
            <li>হিমোগ্লোবিনের মাত্রা: রক্তদাতার হিমোগ্লোবিন অন্তত ১২.৫ গ্রাম/ডেসিলিটার হতে হবে।</li>
            <li>রক্তদানের ব্যবধান: পুরুষরা প্রতি ৩ মাস (৯০ দিন) পর পর এবং নারীরা প্রতি ৪ মাস (১২০ দিন) পর পর রক্ত দিতে পারবেন।</li>
            <li>রক্তচাপ ও পালস স্বাভাবিক থাকতে হবে।</li>
          </ul>

          <h2>কারা সাময়িকভাবে রক্ত দিতে পারবেন না?</h2>
          <ul>
            <li>গর্ভবতী বা স্তন্যদায়ী মায়েরা।</li>
            <li>গত ৬ মাসের মধ্যে কোনো বড় ধরনের অপারেশন হয়ে থাকলে।</li>
            <li>গত ৬ মাসের মধ্যে শরীরে ট্যাটু বা ছিদ্র (Piercing) করে থাকলে।</li>
            <li>অ্যান্টিবায়োটিক ওষুধ সেবনরত অবস্থায় (ওষুধ শেষ হওয়ার অন্তত ৭ দিন পর রক্ত দেওয়া যাবে)।</li>
            <li>টাইফয়েড, ডেঙ্গু বা ম্যালেরিয়া থেকে সুস্থ হওয়ার পর নির্দিষ্ট সময় পর্যন্ত।</li>
          </ul>
        `
      },
      {
        title: 'রক্তদান নিয়ে প্রচলিত ৫টি ভুল ধারণা ও চিকিৎসাবিজ্ঞানের সঠিক তথ্য',
        category: 'সচেতনতা',
        tags: ['কুসংস্কার', 'ভুল ধারণা', 'সঠিক তথ্য', 'রক্তদান মিথ'],
        excerpt: 'রক্তদান নিয়ে আমাদের সমাজে এখনো অনেক অমূলক ভয় ও কুসংস্কার প্রচলিত রয়েছে। জেনে নিন এই ধারণাগুলোর পেছনের প্রকৃত বৈজ্ঞানিক সত্য।',
        content: `
          <p class="lead">কুসংস্কার ও ভুল তথ্যের কারণে এখনো অনেক সুস্থ মানুষ রক্তদানে দ্বিধাবোধ করেন। আসুন জেনে নিই প্রচলিত ভুল ধারণাগুলো কী এবং বিজ্ঞান কী বলে।</p>

          <h2>ভুল ধারণা ১: রক্ত দিলে শরীর স্থায়ীভাবে দুর্বল হয়ে যায়</h2>
          <p><strong>সত্য:</strong> মানবদেহে গড়ে ৫ থেকে ৬ লিটার রক্ত থাকে। এক ব্যাগ রক্তে মাত্র ৩৫০ থেকে ৪৫০ মিলিলিটার রক্ত নেওয়া হয়, যা মোট রক্তের মাত্র ৭-৮%। এইটুকু রক্ত দিলে শরীরে কোনো দুর্বলতা তৈরি হয় না এবং অল্প কয়েকদিনের মধ্যে সম্পূর্ণ স্বাভাবিক হয়ে যায়।</p>

          <h2>ভুল ধারণা ২: রক্তদানের ফলে রোগ সংক্রমিত হতে পারে</h2>
          <p><strong>সত্য:</strong> রক্ত সংগ্রহের জন্য সবসময় সম্পূর্ণ নতুন, জীবাণুমুক্ত (Sterile) ডিসপোজেবল সুঁই ও ব্যাগ ব্যবহার করা হয় যা একবার ব্যবহারের পর ফেলে দেওয়া হয়। তাই রক্তদাতার কোনো প্রকার রোগ সংক্রমণের কোনো সুযোগ নেই।</p>

          <h2>ভুল ধারণা ৩: রক্তদানের সময় প্রচণ্ড ব্যথা হয়</h2>
          <p><strong>সত্য:</strong> সুঁই প্রবেশের সময় সামান্য পিঁপড়ে কামড়ানোর মতো হালকা অনুভূতি ছাড়া রক্তদানে কোনো ধরনের তীব্র ব্যথা অনুভূত হয় না। সম্পূর্ণ প্রক্রিয়াটি মাত্র ৮ থেকে ১০ মিনিটে সম্পন্ন হয়।</p>

          <h2>ভুল ধারণা ৪: একবার রক্ত দিলে বারবার দিতে হয় নয়তো সমস্যা হয়</h2>
          <p><strong>সত্য:</strong> এটি সম্পূর্ণ কাল্পনিক একটি ধারণা। রক্তদানের কোনো আসক্তি বা বাধ্যতামূলক কোনো শারীরিক প্রতিক্রিয়া নেই। তবে সুস্থ থাকার সুফল পাওয়ায় অনেকেই স্বেচ্ছায় বারবার রক্ত দেন।</p>

          <h2>ভুল ধারণা ৫: নারীদের রক্ত দেওয়া উচিত নয়</h2>
          <p><strong>সত্য:</strong> ওজন, বয়স ও হিমোগ্লোবিনের মাত্রা ঠিক থাকলে নারীরাও নিয়মিত রক্ত দিতে পারেন। রক্তবার্তায় হাজার হাজার নারী রক্তদাতা নিয়মিত রক্ত দিয়ে জীবন বাঁচাচ্ছেন।</p>
        `
      }
    ];

    for (const p of postsRaw) {
      const slug = createSlug(p.title);
      await Post.create({
        title: p.title,
        slug,
        excerpt: p.excerpt,
        content: p.content,
        category: p.category,
        tags: p.tags,
        author: adminUser._id,
        authorName: 'রক্তবার্তা মেডিকেল ডেস্ক',
        metaTitle: `${p.title} - রক্তবার্তা`,
        metaDescription: p.excerpt,
        status: 'published',
        views: Math.floor(Math.random() * 500) + 120
      });
    }

    // 6. Create Demo Contacts & Notifications
    console.log('[Seed] Creating Contacts & Notifications...');
    await Contact.create({
      name: 'হাসান মাহমুদ',
      email: 'hasan@example.com',
      phone: '+8801711223344',
      subject: 'আমাদের এলাকায় ফ্রি ব্লাড ক্যাম্পেইন আয়োজন',
      message: 'আমরা কুমিল্লা জেলায় একটি রক্তদান ক্যাম্পেইন করতে চাই। আপনাদের ওয়েবসাইটের সহায়তা প্রয়োজন।',
      status: 'new'
    });

    await Notification.create({
      user: adminUser._id,
      type: 'system',
      message: 'রক্তবার্তা প্ল্যাটফর্মে আপনাকে স্বাগতম।',
      link: '/dashboard',
      isRead: false
    });

    console.log('----------------------------------------------------');
    console.log('✅ SEED SUCCESSFUL!');
    console.log('Admin account: admin@roktobarta.com | Password: Admin@123456');
    console.log('Donors count: 33');
    console.log('Blood Requests: 10');
    console.log('Stories: 6');
    console.log('Blog Posts: 5');
    console.log('----------------------------------------------------');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ SEED ERROR:', error);
    process.exit(1);
  }
};

seedData();
