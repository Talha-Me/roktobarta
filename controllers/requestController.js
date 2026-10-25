const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const { sendMail } = require('../config/mail');
const { getCompatibleDonors, toBnGroup, toEnGroup } = require('../utils/bloodGroups');
const { toBn } = require('../utils/bnDigits');
const { formatBnDate } = require('../utils/dates');
const { normalizeDistrict, normalizeUpazila } = require('../utils/banglishMap');

/**
 * List Blood Requests with Filters & Pagination
 * GET /requests
 */
exports.getRequests = async (req, res) => {
  try {
    // Auto-expire past requests
    await BloodRequest.expireOldRequests();

    const page = parseInt(req.query.page, 10) || 1;
    const limit = 9; // 9 cards per page
    const skip = (page - 1) * limit;

    const { group, district, upazila, urgency, status } = req.query;

    const query = {};

    // Status filter (default to 'open')
    if (status) {
      if (status !== 'all') query.status = status;
    } else {
      query.status = 'open';
    }

    // Blood Group filter
    if (group) {
      const enGroup = toEnGroup(group);
      query.bloodGroup = enGroup;
    }

    // Location filters (supports Bangla, English & Banglish)
    if (district) {
      query.district = normalizeDistrict(district);
    }
    if (upazila) {
      query.upazila = normalizeUpazila(upazila);
    }

    // Urgency filter
    if (urgency) {
      query.urgency = urgency.trim();
    }

    const [requests, totalCount] = await Promise.all([
      BloodRequest.find(query)
        .populate('requester', 'name avatar isVerified')
        .sort({ urgency: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BloodRequest.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render('pages/requests/index', {
      metaTitle: 'জরুরি রক্তের অনুরোধসমূহ - রক্তবার্তা',
      metaDescription: 'বাংলাদেশ ও কলকাতার বিভিন্ন হাসপাতালে জরুরি রক্তের অনুরোধের সার্বক্ষণিক তালিকা। রক্ত দিন, জীবন বাঁচান।',
      requests,
      currentPage: page,
      totalPages,
      totalCount,
      filters: {
        group: group || '',
        district: district || '',
        upazila: upazila || '',
        urgency: urgency || '',
        status: status || 'open'
      }
    });
  } catch (error) {
    console.error('Get Requests Error:', error);
    req.flash('error', 'রক্তের অনুরোধ তালিকা লোড করতে সমস্যা হয়েছে।');
    return res.redirect('/');
  }
};

/**
 * Render Create Request Page
 * GET /requests/new
 */
exports.getNewRequest = (req, res) => {
  const formData = req.session.formData || {};
  delete req.session.formData;

  res.render('pages/requests/new', {
    metaTitle: 'নতুন রক্তের অনুরোধ করুন - রক্তবার্তা',
    formData
  });
};

/**
 * Process Create Request
 * POST /requests/new
 */
exports.postNewRequest = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Check anti-spam: limit of max 5 active open requests per user
    const activeRequestsCount = await BloodRequest.countDocuments({
      requester: userId,
      status: 'open'
    });

    if (activeRequestsCount >= 5) {
      req.flash('error', 'আপনার ইতিমধ্যে ৫টি সক্রিয় রক্তের অনুরোধ রয়েছে। নতুন অনুরোধ করার আগে পূর্ববর্তী অনুরোধ সম্পন্ন করুন।');
      return res.redirect('/dashboard#requests');
    }

    const {
      patientName,
      bloodGroup,
      bagsNeeded,
      reason,
      urgency,
      hospitalName,
      district,
      upazila,
      address,
      neededDate,
      neededTime,
      contactName,
      contactPhone,
      note
    } = req.body;

    const newRequest = await BloodRequest.create({
      requester: userId,
      patientName: patientName.trim(),
      bloodGroup: toEnGroup(bloodGroup),
      bagsNeeded: parseInt(bagsNeeded, 10) || 1,
      reason,
      urgency: urgency || '২৪ ঘণ্টা',
      hospitalName: hospitalName.trim(),
      district: district.trim(),
      upazila: upazila.trim(),
      address: address.trim(),
      neededDate: new Date(neededDate),
      neededTime: neededTime ? neededTime.trim() : '',
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      note: note ? note.trim() : '',
      status: 'open'
    });

    // Notify matching donors in background
    notifyMatchingDonors(newRequest);

    req.flash('success', 'আপনার রক্তের অনুরোধটি সফলভাবে পোস্ট হয়েছে এবং সংশ্লিষ্ট জেলার রক্তদাতাদের অবহিত করা হচ্ছে।');
    return res.redirect(`/requests/${newRequest._id}`);
  } catch (error) {
    console.error('Create Request Error:', error);
    req.flash('error', 'রক্তের অনুরোধ তৈরি করতে সমস্যা হয়েছে।');
    req.session.formData = req.body;
    return res.redirect('/requests/new');
  }
};

/**
 * Request Details Page
 * GET /requests/:id
 */
exports.getRequestDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await BloodRequest.findById(id)
      .populate('requester', 'name avatar isVerified phone email')
      .populate('responses.donor', 'name avatar phone bloodGroup district upazila');

    if (!request) {
      req.flash('error', 'অনুরোধটি খুঁজে পাওয়া যায়নি।');
      return res.redirect('/requests');
    }

    // Increment view counter
    request.views = (request.views || 0) + 1;
    await request.save();

    // Find other urgent requests in the same district or compatible group
    const relatedRequests = await BloodRequest.find({
      _id: { $ne: request._id },
      status: 'open',
      $or: [{ district: request.district }, { bloodGroup: request.bloodGroup }]
    })
      .sort({ createdAt: -1 })
      .limit(3);

    const isOwner = req.session.user && req.session.user._id.toString() === request.requester._id.toString();
    const hasResponded = req.session.user && request.responses.some(
      (r) => r.donor && r.donor._id.toString() === req.session.user._id.toString()
    );

    res.render('pages/requests/show', {
      metaTitle: `${request.patientName}-এর জন্য ${toBnGroup(request.bloodGroup)} রক্ত প্রয়োজন - রক্তবার্তা`,
      metaDescription: `${request.hospitalName}, ${request.upazila}, ${request.district}-এ ${toBn(request.bagsNeeded)} ব্যাগ ${toBnGroup(request.bloodGroup)} রক্ত প্রয়োজন। যোগাযোগ: ${request.contactName}`,
      request,
      isOwner,
      hasResponded,
      relatedRequests
    });
  } catch (error) {
    console.error('Get Request Details Error:', error);
    return res.redirect('/requests');
  }
};

/**
 * Respond to Request ("আমি রক্ত দিতে পারি")
 * POST /requests/:id/respond
 */
exports.postRespondRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;
    const { message } = req.body;

    const request = await BloodRequest.findById(id);
    if (!request) {
      req.flash('error', 'অনুরোধটি খুঁজে পাওয়া যায়নি।');
      return res.redirect('/requests');
    }

    if (request.status !== 'open') {
      req.flash('error', 'এই অনুরোধটি ইতোমধ্যে সম্পন্ন বা বন্ধ হয়ে গেছে।');
      return res.redirect(`/requests/${id}`);
    }

    // Check if already responded
    const alreadyResponded = request.responses.some(
      (r) => r.donor && r.donor.toString() === userId.toString()
    );

    if (alreadyResponded) {
      req.flash('info', 'আপনি ইতিমধ্যে এই অনুরোধে সাড়া দিয়েছেন। ধন্যবাদ!');
      return res.redirect(`/requests/${id}`);
    }

    const donorUser = await User.findById(userId);

    // Add response
    request.responses.push({
      donor: userId,
      message: message ? message.trim() : 'আমি রক্তদানে আগ্রহী এবং সাহায্য করতে চাই।',
      phone: donorUser ? donorUser.phone : ''
    });

    await request.save();

    // Create notification for the requester
    await Notification.create({
      user: request.requester,
      type: 'response_received',
      message: `${donorUser.name} (${toBnGroup(donorUser.bloodGroup)}) আপনার "${request.patientName}"-এর রক্তের অনুরোধে সাড়া দিয়েছেন।`,
      link: `/requests/${request._id}`
    });

    req.flash('success', 'অশেষ ধন্যবাদ! আপনার সম্মতির বার্তা রোগীর স্বজনদের কাছে পৌঁছে দেওয়া হয়েছে।');
    return res.redirect(`/requests/${id}`);
  } catch (error) {
    console.error('Respond Request Error:', error);
    req.flash('error', 'সাড়া প্রদান করতে সমস্যা হয়েছে।');
    return res.redirect(`/requests/${req.params.id}`);
  }
};

/**
 * Update Request Status (Fulfilled / Closed)
 * POST /requests/:id/status
 */
exports.postUpdateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;
    const { status } = req.body;

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.redirect('/requests');
    }

    // Only owner or admin can update status
    const isOwner = request.requester.toString() === userId.toString();
    const isAdmin = req.session.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      req.flash('error', 'আপনার এই স্ট্যাটাস পরিবর্তন করার অনুমতি নেই।');
      return res.redirect(`/requests/${id}`);
    }

    if (['open', 'fulfilled', 'closed'].includes(status)) {
      request.status = status;
      await request.save();

      const msg = status === 'fulfilled'
        ? 'আলহামদুলিল্লাহ! অনুরোধটি "রক্ত পাওয়া গেছে" হিসেবে চিহ্নিত করা হয়েছে।'
        : 'অনুরোধটির স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে।';

      req.flash('success', msg);
    }

    return res.redirect(`/requests/${id}`);
  } catch (error) {
    console.error('Update Request Status Error:', error);
    return res.redirect(`/requests/${req.params.id}`);
  }
};

/**
 * Helper to Notify Matching Donors (In-site & Email)
 */
async function notifyMatchingDonors(bloodRequest) {
  try {
    const compatibleGroups = getCompatibleDonors(bloodRequest.bloodGroup);

    // Find eligible matching donors in the same district (limited to 15 to avoid spam)
    const matchingDonors = await User.find({
      _id: { $ne: bloodRequest.requester },
      district: bloodRequest.district,
      bloodGroup: { $in: compatibleGroups },
      isDonor: true,
      isAvailable: true,
      isBanned: false
    }).limit(15);

    if (!matchingDonors || matchingDonors.length === 0) return;

    for (const donor of matchingDonors) {
      // 1. In-site Notification
      await Notification.create({
        user: donor._id,
        type: 'blood_request',
        message: `জরুরি: আপনার জেলা (${bloodRequest.district})-এ ${toBnGroup(bloodRequest.bloodGroup)} রক্ত প্রয়োজন (${bloodRequest.hospitalName})।`,
        link: `/requests/${bloodRequest._id}`
      });

      // 2. Email Notification (if email available)
      if (donor.email) {
        sendMail({
          to: donor.email,
          subject: `জরুরি রক্তের প্রয়োজন: ${toBnGroup(bloodRequest.bloodGroup)} (${bloodRequest.district})`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ffd4d8; border-radius: 12px; background: #fff;">
              <h2 style="color: #c8102e; text-align: center;">জরুরি রক্তের অনুরোধ</h2>
              <p>প্রিয় <strong>${donor.name}</strong>,</p>
              <p>আপনার জেলা <strong>${bloodRequest.district}</strong>-এ আপনার রক্তের গ্রুপের সাথে সামঞ্জস্যপূর্ণ একজন মুমূর্ষু রোগীর জরুরি রক্তের প্রয়োজন দেখা দিয়েছে।</p>
              <div style="background: #fff1f2; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>রোগীর নাম:</strong> ${bloodRequest.patientName} (${bloodRequest.reason})</p>
                <p style="margin: 4px 0;"><strong>রক্তের গ্রুপ:</strong> ${toBnGroup(bloodRequest.bloodGroup)}</p>
                <p style="margin: 4px 0;"><strong>প্রয়োজনীয় ব্যাগ:</strong> ${toBn(bloodRequest.bagsNeeded)} ব্যাগ</p>
                <p style="margin: 4px 0;"><strong>হাসপাতাল:</strong> ${bloodRequest.hospitalName}, ${bloodRequest.upazila}</p>
                <p style="margin: 4px 0;"><strong>রক্তের প্রয়োজন:</strong> ${formatBnDate(bloodRequest.neededDate)}</p>
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.SITE_URL || 'http://localhost:5000'}/requests/${bloodRequest._id}" style="background: #e11d2e; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: bold; display: inline-block;">অনুরোধটি বিস্তারিত দেখুন ও রক্ত দিন</a>
              </p>
              <hr style="border: none; border-top: 1px solid #ffe0e3; margin: 25px 0;" />
              <p style="font-size: 12px; color: #777; text-align: center;">রক্তবার্তা - একটি বার্তা, একটি প্রাণ বাঁচাতে পারে।</p>
            </div>
          `
        });
      }
    }
  } catch (err) {
    console.error('Error notifying donors:', err);
  }
}
