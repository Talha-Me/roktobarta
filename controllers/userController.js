const bcrypt = require('bcryptjs');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Story = require('../models/Story');
const DonationLog = require('../models/DonationLog');
const Notification = require('../models/Notification');

/**
 * Render User Dashboard
 * GET /dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Fetch full user record
    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    // Update session user snapshot with latest data
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      bloodGroup: user.bloodGroup,
      district: user.district,
      upazila: user.upazila,
      avatar: user.avatar,
      isDonor: user.isDonor,
      isAvailable: user.isAvailable
    };

    // Parallel fetch user-related data
    const [myRequests, myStories, myDonations, notifications] = await Promise.all([
      BloodRequest.find({ requester: userId }).sort({ createdAt: -1 }),
      Story.find({ author: userId }).sort({ createdAt: -1 }),
      DonationLog.find({ donor: userId }).sort({ date: -1 }),
      Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(20)
    ]);

    const activeRequestsCount = myRequests.filter((r) => r.status === 'open').length;
    const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

    res.render('pages/user/dashboard', {
      metaTitle: 'আমার ড্যাশবোর্ড - রক্তবার্তা',
      user,
      myRequests,
      myStories,
      myDonations,
      notifications,
      stats: {
        activeRequestsCount,
        totalStoriesCount: myStories.length,
        totalDonationsCount: user.totalDonations || myDonations.length,
        unreadNotificationsCount
      }
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    req.flash('error', 'ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে।');
    return res.redirect('/');
  }
};

/**
 * Update Profile Information
 * POST /dashboard/profile
 */
exports.postEditProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const {
      name,
      district,
      upazila,
      area,
      gender,
      dateOfBirth,
      weight,
      bio,
      bloodGroup,
      country
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect('/login');
    }

    user.name = name.trim();
    user.district = district.trim();
    user.upazila = upazila.trim();
    user.area = area ? area.trim() : '';
    user.gender = gender || user.gender;
    user.bio = bio ? bio.trim() : '';
    user.bloodGroup = bloodGroup || user.bloodGroup;
    user.country = country || user.country;

    if (dateOfBirth) {
      user.dateOfBirth = new Date(dateOfBirth);
    }
    if (weight) {
      user.weight = Number(weight);
    }

    // Handle last donation period update
    const { lastDonationPeriod } = req.body;
    if (lastDonationPeriod && lastDonationPeriod !== 'keep') {
      if (lastDonationPeriod === '1_month') {
        user.lastDonationDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        user.isAvailable = false;
        if (!user.totalDonations) user.totalDonations = 1;
      } else if (lastDonationPeriod === '2_months') {
        user.lastDonationDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        user.isAvailable = false;
        if (!user.totalDonations) user.totalDonations = 1;
      } else if (lastDonationPeriod === '3_months') {
        user.lastDonationDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        user.isAvailable = true;
        if (!user.totalDonations) user.totalDonations = 1;
      } else if (lastDonationPeriod === 'over_3_months') {
        user.lastDonationDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
        user.isAvailable = true;
        if (!user.totalDonations) user.totalDonations = 1;
      } else if (lastDonationPeriod === 'never') {
        user.lastDonationDate = null;
        user.isAvailable = true;
      }
    }

    // If new avatar file uploaded
    if (req.file) {
      user.avatar = `/uploads/${req.file.filename}`;
    }

    await user.save();

    // Update session
    req.session.user.name = user.name;
    req.session.user.district = user.district;
    req.session.user.upazila = user.upazila;
    req.session.user.bloodGroup = user.bloodGroup;
    req.session.user.avatar = user.avatar;

    req.flash('success', 'আপনার প্রোফাইল তথ্য সফলভাবে হালনাগাদ করা হয়েছে।');
    return res.redirect('/dashboard#profile');
  } catch (error) {
    console.error('Edit Profile Error:', error);
    req.flash('error', 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।');
    return res.redirect('/dashboard#profile');
  }
};

/**
 * Toggle Donor Availability
 * POST /dashboard/toggle-availability
 */
exports.toggleAvailability = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (user) {
      user.isAvailable = !user.isAvailable;
      await user.save();
      req.session.user.isAvailable = user.isAvailable;

      const statusMsg = user.isAvailable
        ? 'আপনার রক্তদানের প্রাপ্যতা সক্রিয় (Available) করা হয়েছে।'
        : 'আপনার রক্তদানের প্রাপ্যতা নিষ্ক্রিয় (Unavailable) করা হয়েছে।';

      req.flash('success', statusMsg);
    }

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Toggle Availability Error:', error);
    req.flash('error', 'প্রাপ্যতা পরিবর্তনে সমস্যা হয়েছে।');
    return res.redirect('/dashboard');
  }
};

/**
 * Toggle Public Phone Visibility
 * POST /dashboard/toggle-phone-public
 */
exports.togglePhonePublic = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (user) {
      user.showPhonePublic = !user.showPhonePublic;
      await user.save();

      const msg = user.showPhonePublic
        ? 'ফোন নম্বর সকল লগইন করা ব্যবহারকারীর জন্য উন্মুক্ত করা হয়েছে।'
        : 'ফোন নম্বর কেবল রক্তদানের জরুরি মুহূর্তে দৃশ্যমান থাকবে।';

      req.flash('success', msg);
    }

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Toggle Phone Visibility Error:', error);
    return res.redirect('/dashboard');
  }
};

/**
 * Change Password
 * POST /dashboard/change-password
 */
exports.postChangePassword = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.redirect('/login');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      req.flash('error', 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।');
      return res.redirect('/dashboard#security');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    req.flash('success', 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
    return res.redirect('/dashboard#security');
  } catch (error) {
    console.error('Change Password Error:', error);
    req.flash('error', 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।');
    return res.redirect('/dashboard#security');
  }
};

/**
 * Add Donation Log
 * POST /dashboard/donations
 */
exports.postAddDonationLog = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { date, location, recipientName, note } = req.body;

    await DonationLog.create({
      donor: userId,
      date: new Date(date),
      location: location.trim(),
      recipientName: recipientName ? recipientName.trim() : '',
      note: note ? note.trim() : ''
    });

    req.flash('success', 'রক্তদানের নতুন ইতিহাস সফলভাবে যুক্ত হয়েছে!');
    return res.redirect('/dashboard#history');
  } catch (error) {
    console.error('Add Donation Log Error:', error);
    req.flash('error', 'রক্তদানের তথ্য সংরক্ষণে ত্রুটি হয়েছে।');
    return res.redirect('/dashboard#history');
  }
};

/**
 * Mark Notification as Read
 * POST /dashboard/notifications/:id/read
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const notifId = req.params.id;

    await Notification.findOneAndUpdate(
      { _id: notifId, user: userId },
      { $set: { isRead: true } }
    );

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }
    return res.redirect('back');
  } catch (error) {
    console.error('Notification Read Error:', error);
    return res.redirect('back');
  }
};

/**
 * Delete Account
 * POST /dashboard/delete-account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { confirmPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.redirect('/login');

    const isMatch = await bcrypt.compare(confirmPassword, user.passwordHash);
    if (!isMatch) {
      req.flash('error', 'অ্যাকাউন্ট ডিলিট করতে আপনার সঠিক পাসওয়ার্ড প্রদান করুন।');
      return res.redirect('/dashboard#security');
    }

    // Delete user records
    await Promise.all([
      User.findByIdAndDelete(userId),
      BloodRequest.deleteMany({ requester: userId }),
      Story.deleteMany({ author: userId }),
      DonationLog.deleteMany({ donor: userId }),
      Notification.deleteMany({ user: userId })
    ]);

    req.session.destroy();
    return res.redirect('/?deleted=true');
  } catch (error) {
    console.error('Delete Account Error:', error);
    req.flash('error', 'অ্যাকাউন্ট মুছে ফেলতে ব্যর্থ হয়েছে।');
    return res.redirect('/dashboard');
  }
};
