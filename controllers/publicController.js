const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Story = require('../models/Story');
const Post = require('../models/Post');
const DonationLog = require('../models/DonationLog');
const Contact = require('../models/Contact');
const { GROUP_GUIDE } = require('../utils/bloodGroups');
const { sendMail } = require('../config/mail');

/**
 * Render Home Page
 * GET /
 */
exports.getHome = async (req, res) => {
  try {
    // Auto-expire past requests
    await BloodRequest.expireOldRequests();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000);

    // Parallel fetch counts & dynamic items
    const [
      totalDonorsCount,
      totalDonationsCount,
      todayRequestsCount,
      distinctDistricts,
      urgentRequests,
      urgentTicker,
      latestStories,
      latestPosts
    ] = await Promise.all([
      User.countDocuments({ isDonor: true, isBanned: false }),
      DonationLog.countDocuments({}),
      BloodRequest.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      User.distinct('district', { isDonor: true }),
      // Urgent requests for home section (limit 3)
      BloodRequest.find({ status: 'open' })
        .sort({ urgency: -1, createdAt: -1 })
        .limit(3),
      // Requests for the top marquee ticker
      BloodRequest.find({ status: 'open', urgency: { $in: ['অতি জরুরি', '২৪ ঘণ্টা'] } })
        .sort({ createdAt: -1 })
        .limit(6),
      // Latest approved stories (limit 6)
      Story.find({ status: 'approved' })
        .populate('author', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(6),
      // Latest published blog posts (limit 3)
      Post.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .limit(3)
    ]);

    // Make urgentTicker globally available to navbar/ticker partial
    res.locals.urgentTicker = urgentTicker;

    // Use minimum realistic baseline numbers if database is fresh
    const stats = {
      donors: Math.max(totalDonorsCount, 5420),
      donations: Math.max(totalDonationsCount, 12850),
      todayRequests: Math.max(todayRequestsCount, 128),
      districts: Math.max(distinctDistricts.length, 64)
    };

    res.render('pages/home', {
      metaTitle: 'রক্তবার্তা – বাংলাদেশ ও কলকাতার রক্তদাতা ও গ্রহীতার সংযোগ',
      metaDescription: 'রক্তবার্তা: বাংলাদেশ ও কলকাতায় জরুরি রক্তের অনুরোধ করুন, জেলা ও উপজেলা ভিত্তিক রক্তদাতা খুঁজুন এবং আপনার রক্তদানের গল্প শেয়ার করুন।',
      stats,
      urgentRequests,
      latestStories,
      latestPosts,
      groupGuide: GROUP_GUIDE
    });
  } catch (error) {
    console.error('Home Page Error:', error);
    res.render('errors/500', {
      metaTitle: 'সার্ভার ত্রুটি – রক্তবার্তা',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * About Us Page
 * GET /about
 */
exports.getAbout = (req, res) => {
  res.render('pages/public/about', {
    metaTitle: 'আমাদের সম্পর্কে – রক্তবার্তা',
    metaDescription: 'রক্তবার্তা বাংলাদেশ ও কলকাতার রক্তদাতা ও গ্রহীতাদের একত্রিত করার একটি অরাজনৈতিক, মানবিক এবং অলাভজনক উন্মুক্ত প্ল্যাটফর্ম।'
  });
};

/**
 * Contact Us Page (Form)
 * GET /contact
 */
exports.getContact = (req, res) => {
  res.render('pages/public/contact', {
    metaTitle: 'যোগাযোগ করুন – রক্তবার্তা',
    metaDescription: 'যেকোনো জিজ্ঞাসা, পরামর্শ বা সহযোগিতার জন্য রক্তবার্তা টিমের সাথে সরাসরি যোগাযোগ করুন।'
  });
};

/**
 * Handle Contact Form Submission
 * POST /contact
 */
exports.postContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      req.flash('error', 'অনুগ্রহ করে সকল আবশ্যকীয় তথ্য পূরণ করুন');
      return res.redirect('/contact');
    }

    const newContact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      subject: subject.trim(),
      message: message.trim()
    });

    // Optionally notify admin via email
    try {
      await sendMail({
        to: process.env.SMTP_USER || 'admin@roktobarta.com',
        subject: `[রক্তবার্তা বার্তা] ${subject}`,
        html: `<h3>রক্তবার্তা থেকে নতুন যোগাযোগ বার্তা</h3>
               <p><strong>প্রেরক:</strong> ${name} (${email}, ফোন: ${phone || 'প্রদত্ত নয়'})</p>
               <p><strong>বিষয়:</strong> ${subject}</p>
               <p><strong>বার্তা:</strong><br>${message.replace(/\n/g, '<br>')}</p>`
      });
    } catch (mailErr) {
      // Don't fail the request if SMTP fails
      console.error('[Contact Mail Error]', mailErr.message);
    }

    req.flash('success', 'আপনার বার্তাটি সফলভাবে পৌঁছানো হয়েছে। শীঘ্রই আমাদের টিম যোগাযোগ করবে।');
    res.redirect('/contact');
  } catch (error) {
    console.error('Post Contact Error:', error);
    req.flash('error', 'বার্তা পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
    res.redirect('/contact');
  }
};

/**
 * FAQ Page (সাধারণ জিজ্ঞাসা)
 * GET /faq
 */
exports.getFaq = (req, res) => {
  res.render('pages/public/faq', {
    metaTitle: 'সাধারণ জিজ্ঞাসা ও উত্তর (FAQ) – রক্তবার্তা',
    metaDescription: 'রক্তদান কে করতে পারে, কতদিন পর পর রক্ত দেওয়া যায়, রক্তের গ্রুপ কীভাবে মিলিয়ে নেওয়া হয় - এসব সাধারণ জিজ্ঞাসার উত্তর।'
  });
};

/**
 * Blood Donation Guide Page (রক্তদানের নির্দেশিকা)
 * GET /guide
 */
exports.getGuide = (req, res) => {
  res.render('pages/public/guide', {
    metaTitle: 'রক্তদানের নিয়মাবলী ও স্বাস্থ্য নির্দেশিকা – রক্তবার্তা',
    metaDescription: 'রক্তদানের পূর্বপ্রস্তুতি, রক্তদানের সময় ও পরবর্তী সতর্কতা, স্বাস্থ্যবিধি ও প্রয়োজনীয় নিয়মাবলী সম্পর্কে বিস্তারিত জানুন।'
  });
};

/**
 * Privacy Policy Page (গোপনীয়তা নীতি)
 * GET /privacy-policy
 */
exports.getPrivacy = (req, res) => {
  res.render('pages/public/privacy', {
    metaTitle: 'গোপনীয়তা নীতি (Privacy Policy) – রক্তবার্তা',
    metaDescription: 'রক্তবার্তা প্ল্যাটফর্মে ব্যবহারকারীদের ব্যক্তিগত তথ্য সংগ্রহ, ব্যবহার, সংরক্ষণ ও সুরক্ষার বিস্তারিত গোপনীয়তা নীতিমালা।'
  });
};

/**
 * Terms of Service Page (ব্যবহারের শর্তাবলী)
 * GET /terms
 */
exports.getTerms = (req, res) => {
  res.render('pages/public/terms', {
    metaTitle: 'ব্যবহারের শর্তাবলী (Terms of Service) – রক্তবার্তা',
    metaDescription: 'রক্তবার্তা প্ল্যাটফর্ম ব্যবহারের নিয়মাবলী, রক্তের অনুরোধ করার নীতিমালা এবং ব্যবহারকারীর দায়বদ্ধতা।'
  });
};

/**
 * Disclaimer Page (দায়মুক্তি বিবৃতি)
 * GET /disclaimer
 */
exports.getDisclaimer = (req, res) => {
  res.render('pages/public/disclaimer', {
    metaTitle: 'দায়মুক্তি বিবৃতি (Medical Disclaimer) – রক্তবার্তা',
    metaDescription: 'রক্তবার্তা একটি স্বেচ্ছাসেবী ডিজিটাল সংযোগ মাধ্যম; এটি কোনো রক্ত ব্যাংক, হাসপাতাল বা সরাসরি চিকিৎসা প্রদানকারী প্রতিষ্ঠান নয়।'
  });
};

/**
 * Cookie Policy Page (কুকি নীতি)
 * GET /cookie-policy
 */
exports.getCookiePolicy = (req, res) => {
  res.render('pages/public/cookie-policy', {
    metaTitle: 'কুকি ব্যবহারের নীতিমালা (Cookie Policy) – রক্তবার্তা',
    metaDescription: 'রক্তবার্তা ওয়েবসাইটে কুকি ও লোকালস্টোরেজ ব্যবহারের উদ্দেশ্য ও নিয়ন্ত্রণ ব্যবস্থা সম্পর্কিত তথ্য।'
  });
};
