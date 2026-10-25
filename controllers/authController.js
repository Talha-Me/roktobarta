const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendMail } = require('../config/mail');

/**
 * Render Registration Page
 * GET /register
 */
exports.getRegister = (req, res) => {
  const formData = req.session.formData || {};
  delete req.session.formData;

  res.render('pages/auth/register', {
    metaTitle: 'নতুন অ্যাকাউন্ট তৈরি করুন - রক্তবার্তা',
    formData
  });
};

/**
 * Process Registration
 * POST /register
 */
exports.postRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      bloodGroup,
      country,
      division,
      district,
      upazila,
      area,
      gender,
      dateOfBirth,
      weight,
      isDonor,
      showPhonePublic
    } = req.body;

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      req.flash('error', 'এই ইমেইল ঠিকানা দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত আছে।');
      req.session.formData = req.body;
      return res.redirect('/register');
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone: phone.trim() });
    if (existingPhone) {
      req.flash('error', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত আছে।');
      req.session.formData = req.body;
      return res.redirect('/register');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Calculate last donation date & availability based on period
    const { lastDonationPeriod } = req.body;
    let lastDonationDate = null;
    let isAvailable = true;
    let totalDonations = 0;

    if (lastDonationPeriod === '1_month') {
      lastDonationDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      isAvailable = false;
      totalDonations = 1;
    } else if (lastDonationPeriod === '2_months') {
      lastDonationDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      isAvailable = false;
      totalDonations = 1;
    } else if (lastDonationPeriod === '3_months') {
      lastDonationDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      isAvailable = true;
      totalDonations = 1;
    } else if (lastDonationPeriod === 'over_3_months') {
      lastDonationDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
      isAvailable = true;
      totalDonations = 1;
    } else {
      lastDonationDate = null;
      isAvailable = true;
      totalDonations = 0;
    }

    // Create user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      passwordHash,
      bloodGroup,
      country: country || 'বাংলাদেশ',
      division: division || '',
      district: district.trim(),
      upazila: upazila.trim(),
      area: area ? area.trim() : '',
      gender: gender || 'পুরুষ',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      weight: weight ? Number(weight) : null,
      isDonor: isDonor === 'on' || isDonor === true || isDonor === 'true',
      isAvailable,
      lastDonationDate,
      totalDonations,
      showPhonePublic: showPhonePublic === 'on' || showPhonePublic === true,
      avatar: '/images/user1.jpg',
      isVerified: false
    });

    // Send Welcome Email asynchronously
    sendMail({
      to: newUser.email,
      subject: 'রক্তবার্তা পরিবারে আপনাকে স্বাগতম!',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ffd4d8; border-radius: 12px; background: #fff;">
          <h2 style="color: #c8102e; text-align: center;">রক্তবার্তায় আপনাকে স্বাগতম!</h2>
          <p>প্রিয় <strong>${newUser.name}</strong>,</p>
          <p>রক্তবার্তা প্ল্যাটফর্মে আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। বাংলাদেশ ও কলকাতার রক্তদাতা ও গ্রহীতাদের মানবিক মেলবন্ধনে আপনাকে পেয়ে আমরা অত্যন্ত আনন্দিত।</p>
          <div style="background: #fff1f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>রক্তের গ্রুপ:</strong> ${newUser.bloodGroup}</p>
            <p style="margin: 5px 0;"><strong>অবস্থান:</strong> ${newUser.upazila}, ${newUser.district}</p>
            <p style="margin: 5px 0;"><strong>মোবাইল:</strong> ${newUser.phone}</p>
          </div>
          <p>জরুরি মুহূর্তে যেকোনো রক্তের অনুরোধ করতে বা রক্তদানে এগিয়ে আসতে ড্যাশবোর্ডে লগইন করুন।</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.SITE_URL || 'http://localhost:5000'}/login" style="background: #e11d2e; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: bold; display: inline-block;">লগইন করুন</a>
          </p>
          <hr style="border: none; border-top: 1px solid #ffe0e3; margin: 25px 0;" />
          <p style="font-size: 12px; color: #777; text-align: center;">রক্তবার্তা - একটি বার্তা, একটি প্রাণ বাঁচাতে পারে।</p>
        </div>
      `
    });

    // Auto login after registration
    req.session.user = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      bloodGroup: newUser.bloodGroup,
      district: newUser.district,
      upazila: newUser.upazila,
      avatar: newUser.avatar,
      isDonor: newUser.isDonor,
      isAvailable: newUser.isAvailable
    };

    req.flash('success', 'অভিনন্দন! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।');
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;

    return req.session.save((err) => {
      if (err) console.error('Session save error on register:', err);
      return res.redirect(returnTo);
    });
  } catch (error) {
    console.error('Registration Error:', error);
    req.flash('error', 'অ্যাকাউন্ট তৈরিতে একটি ত্রুটি ঘটেছে। দয়া করে পুনরায় চেষ্টা করুন।');
    req.session.formData = req.body;
    return res.redirect('/register');
  }
};

/**
 * Render Login Page
 * GET /login
 */
exports.getLogin = (req, res) => {
  res.render('pages/auth/login', {
    metaTitle: 'লগইন করুন - রক্তবার্তা'
  });
};

/**
 * Process Login
 * POST /login
 */
exports.postLogin = async (req, res) => {
  try {
    const { login, password, rememberMe } = req.body;
    const loginIdentifier = login.trim().toLowerCase();

    // Check by email or phone
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { phone: login.trim() }
      ]
    });

    if (!user) {
      req.flash('error', 'প্রদত্ত ইমেইল বা ফোন নম্বরের কোনো অ্যাকাউন্ট পাওয়া যায়নি।');
      return res.redirect('/login');
    }

    if (user.isBanned) {
      req.flash('error', 'আপনার অ্যাকাউন্টটি নীতিমালার লঙ্ঘনের কারণে সাময়িকভাবে স্থগিত করা হয়েছে।');
      return res.redirect('/login');
    }

    // Verify password (forgiving trailing/leading copy-paste spaces)
    const trimmedPassword = password ? password.trim() : '';
    let isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch && trimmedPassword && trimmedPassword !== password) {
      isMatch = await bcrypt.compare(trimmedPassword, user.passwordHash);
    }

    if (!isMatch) {
      req.flash('error', 'আপনার পাসওয়ার্ডটি সঠিক নয়। পুনরায় চেষ্টা করুন।');
      return res.redirect('/login');
    }

    // Set remember me duration
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    // Save user session
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

    req.flash('success', `স্বাগতম, ${user.name}! আপনি সফলভাবে লগইন করেছেন।`);
    const defaultRedirect = user.role === 'admin' ? '/admin' : '/dashboard';
    const returnTo = req.session.returnTo || defaultRedirect;
    delete req.session.returnTo;

    return req.session.save((err) => {
      if (err) console.error('Session save error on login:', err);
      return res.redirect(returnTo);
    });
  } catch (error) {
    console.error('Login Error:', error);
    req.flash('error', 'লগইনে সমস্যা হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।');
    return res.redirect('/login');
  }
};

/**
 * Logout
 * GET /logout
 */
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
};

/**
 * Render Forgot Password Page
 * GET /forgot-password
 */
exports.getForgotPassword = (req, res) => {
  res.render('pages/auth/forgot-password', {
    metaTitle: 'পাসওয়ার্ড ভুলে গেছেন? - রক্তবার্তা'
  });
};

/**
 * Process Forgot Password - Generate 6-digit OTP & Send Email
 * POST /forgot-password
 */
exports.postForgotPassword = async (req, res) => {
  try {
    const input = (req.body.email || req.body.login || '').trim().toLowerCase();
    if (!input) {
      req.flash('error', 'আপনার নিবন্ধিত ইমেইল ঠিকানা প্রদান করুন।');
      return res.redirect('/forgot-password');
    }

    const user = await User.findOne({
      $or: [
        { email: input },
        { phone: input }
      ]
    });

    if (!user) {
      req.flash('error', 'এই তথ্যের সাথে কোনো নিবন্ধিত অ্যাকাউন্ট পাওয়া যায়নি।');
      return res.redirect('/forgot-password');
    }

    // Generate 6-digit OTP code and 32-byte secure token
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetToken = resetToken;
    user.resetOtp = resetOtp;
    user.resetTokenExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    req.session.resetEmail = user.email;
    req.session.resetToken = resetToken;

    const resetUrl = `${process.env.SITE_URL || 'http://localhost:5000'}/reset-password/${resetToken}`;

    // Send Reset Email with both 6-digit OTP Code and 1-click Link
    await sendMail({
      to: user.email,
      subject: `পাসওয়ার্ড রিসেট ভেরিফিকেশন কোড: ${resetOtp} - রক্তবার্তা`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #ffd4d8; border-radius: 16px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; background: #fee2e2; color: #dc2626; font-size: 24px; font-weight: bold;">
              🩸
            </div>
            <h2 style="color: #c8102e; margin: 10px 0 5px 0;">পাসওয়ার্ড রিসেট কোড</h2>
            <p style="color: #666; font-size: 14px; margin: 0;">রক্তবার্তা প্ল্যাটফর্ম</p>
          </div>

          <p style="color: #333; font-size: 15px; line-height: 1.6;">প্রিয় <strong>${user.name}</strong>,</p>
          <p style="color: #444; font-size: 14px; line-height: 1.6;">
            আপনার রক্তবার্তা অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন করার অনুরোধ করা হয়েছে। পাসওয়ার্ড পরিবর্তনের জন্য নিচের ৬ ডিজিটের ওটিপি (OTP) কোডটি ব্যবহার করুন:
          </p>

          <div style="background: #fff5f5; border: 2px dashed #e11d2e; border-radius: 14px; padding: 20px; text-align: center; margin: 25px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666; font-weight: 600;">আপনার ৬ ডিজিটের ভেরিফিকেশন কোড</p>
            <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #c8102e; font-family: 'Courier New', Courier, monospace;">
              ${resetOtp}
            </div>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #888;">এই কোডটি আগামী ১৫ মিনিট পর্যন্ত কার্যকর থাকবে।</p>
          </div>

          <p style="color: #444; font-size: 14px; text-align: center; margin: 25px 0 10px 0;">
            অথবা নিচের বাটনে ক্লিক করে সরাসরি নতুন পাসওয়ার্ড নির্ধারণ করুন:
          </p>
          <p style="text-align: center; margin: 0 0 25px 0;">
            <a href="${resetUrl}" style="background: #e11d2e; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(225, 29, 46, 0.3);">
              সরাসরি পাসওয়ার্ড পরিবর্তন করুন
            </a>
          </p>

          <p style="font-size: 12px; color: #888; line-height: 1.5; border-top: 1px solid #ffe0e3; padding-top: 15px;">
            ⚠️ আপনি যদি পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন। আপনার অ্যাকাউন্ট সম্পূর্ণ নিরাপদ রয়েছে।
          </p>
          <p style="font-size: 12px; color: #aaa; text-align: center; margin-top: 15px;">
            © ${new Date().getFullYear()} রক্তবার্তা — একটি বার্তা, একটি প্রাণ বাঁচাতে পারে।
          </p>
        </div>
      `
    });

    req.flash('success', 'আপনার ইমেইলে ৬ ডিজিটের ভেরিফিকেশন কোড পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।');
    return res.redirect('/reset-password');
  } catch (error) {
    console.error('Forgot Password Error:', error);
    req.flash('error', 'একটি সমস্যা দেখা দিয়েছে। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন।');
    return res.redirect('/forgot-password');
  }
};

/**
 * Render Reset Password Page
 * GET /reset-password OR GET /reset-password/:token
 */
exports.getResetPassword = async (req, res) => {
  try {
    const token = req.params.token || req.query.token || req.session.resetToken || '';
    const email = req.session.resetEmail || req.query.email || '';

    res.render('pages/auth/reset-password', {
      metaTitle: 'নতুন পাসওয়ার্ড নির্ধারণ করুন - রক্তবার্তা',
      token,
      email
    });
  } catch (error) {
    console.error('Reset Password View Error:', error);
    req.flash('error', 'একটি সমস্যা দেখা দিয়েছে।');
    return res.redirect('/forgot-password');
  }
};

/**
 * Process Reset Password (via 6-digit OTP or Token)
 * POST /reset-password OR POST /reset-password/:token
 */
exports.postResetPassword = async (req, res) => {
  try {
    const token = req.params.token || req.body.token || '';
    const otp = (req.body.otp || '').trim();
    const email = (req.body.email || req.session.resetEmail || '').trim().toLowerCase();
    const { password, confirmPassword } = req.body;

    if (!password || password.length < 6) {
      req.flash('error', 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return res.redirect(token ? `/reset-password/${token}` : '/reset-password');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'পাসওয়ার্ড দুটি মিলছে না।');
      return res.redirect(token ? `/reset-password/${token}` : '/reset-password');
    }

    let user = null;

    if (token) {
      user = await User.findOne({
        resetToken: token,
        resetTokenExpire: { $gt: Date.now() }
      });
    }

    if (!user && otp && email) {
      user = await User.findOne({
        email,
        resetOtp: otp,
        resetTokenExpire: { $gt: Date.now() }
      });
    }

    if (!user) {
      req.flash('error', 'ভেরিফিকেশন কোড বা রিসেট লিংকটি ভুল অথবা মেয়াদোত্তীর্ণ হয়েছে। পুনরায় কোড পাঠানোর চেষ্টা করুন।');
      return res.redirect('/forgot-password');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.resetToken = undefined;
    user.resetOtp = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    delete req.session.resetEmail;
    delete req.session.resetToken;

    req.flash('success', 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।');
    return res.redirect('/login');
  } catch (error) {
    console.error('Reset Password Post Error:', error);
    req.flash('error', 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    return res.redirect('/forgot-password');
  }
};

/**
 * Email Verification
 * GET /verify-email/:token
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ resetToken: token });

    if (!user) {
      req.flash('error', 'ভেরিফিকেশন লিংকটি অবৈধ।');
      return res.redirect('/dashboard');
    }

    user.isVerified = true;
    user.resetToken = undefined;
    await user.save();

    if (req.session.user && req.session.user._id.toString() === user._id.toString()) {
      req.session.user.isVerified = true;
    }

    req.flash('success', 'আপনার ইমেইল সফলভাবে যাচাইকৃত (Verified) হয়েছে!');
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Verify Email Error:', error);
    return res.redirect('/');
  }
};
