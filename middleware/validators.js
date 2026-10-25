const { body, validationResult } = require('express-validator');
const { normalizeDistrict, normalizeUpazila, isKnownDistrict } = require('../utils/locationSearch');

/**
 * Common validation result processor
 */
const handleValidation = (redirectUrl = null) => {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      req.flash('error', firstError);

      // Save form data into session to repopulate input fields
      req.session.formData = req.body;

      if (redirectUrl) {
        return res.redirect(redirectUrl);
      }
      return res.redirect('back');
    }
    next();
  };
};

/**
 * Registration Validation Rules
 */
const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('আপনার পূর্ণ নাম প্রদান করুন')
    .isLength({ max: 80 }).withMessage('নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

  body('email')
    .trim()
    .notEmpty().withMessage('ইমেইল ঠিকানা আবশ্যক')
    .isEmail().withMessage('একটি সঠিক ইমেইল ঠিকানা প্রদান করুন')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('মোবাইল নম্বর প্রদান করুন')
    .matches(/^(?:\+?8801[3-9]\d{8}|01[3-9]\d{8}|(?:\+?91)?[6-9]\d{9})$/)
    .withMessage('সঠিক বাংলাদেশি (০১...) বা ভারতীয় মোবাইল নম্বর প্রদান করুন'),

  body('password')
    .isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড দুটি মিলছে না');
      }
      return true;
    }),

  body('bloodGroup')
    .notEmpty().withMessage('রক্তের গ্রুপ নির্বাচন করুন')
    .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
    .withMessage('সঠিক রক্তের গ্রুপ নির্বাচন করুন'),

  body('district')
    .customSanitizer((value) => normalizeDistrict(value))
    .trim()
    .notEmpty().withMessage('জেলা নির্বাচন বা উল্লেখ করুন')
    .custom((value) => isKnownDistrict(value)).withMessage('তালিকা থেকে সঠিক জেলা বেছে নিন (বাংলা বা ইংরেজিতে লিখলেও চলবে)'),

  body('upazila')
    .customSanitizer((value, { req }) => normalizeUpazila(value, req.body.district))
    .trim()
    .notEmpty().withMessage('উপজেলা বা থানা নির্বাচন বা উল্লেখ করুন'),

  body('terms')
    .notEmpty().withMessage('আপনাকে অবশ্যই ব্যবহারের শর্তাবলী ও গোপনীয়তা নীতি মেনে নিতে হবে')
];

/**
 * Login Validation Rules
 */
const loginValidator = [
  body('login')
    .trim()
    .notEmpty().withMessage('আপনার ইমেইল বা ফোন নম্বর প্রদান করুন'),

  body('password')
    .notEmpty().withMessage('পাসওয়ার্ড প্রদান করুন')
];

/**
 * Forgot Password Validation
 */
const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('আপনার নিবন্ধিত ইমেইল ঠিকানা প্রদান করুন')
    .isEmail().withMessage('সঠিক ইমেইল ঠিকানা প্রদান করুন')
    .normalizeEmail()
];

/**
 * Reset Password Validation
 */
const resetPasswordValidator = [
  body('password')
    .isLength({ min: 6 }).withMessage('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('পাসওয়ার্ড দুটি মিলছে না');
      }
      return true;
    })
];

/**
 * Profile Edit Validation
 */
const profileValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('আপনার পূর্ণ নাম প্রদান করুন'),

  body('district')
    .customSanitizer((value) => normalizeDistrict(value))
    .trim()
    .notEmpty().withMessage('জেলা নির্বাচন করুন')
    .custom((value) => isKnownDistrict(value)).withMessage('তালিকা থেকে সঠিক জেলা বেছে নিন (বাংলা বা ইংরেজিতে লিখলেও চলবে)'),

  body('upazila')
    .customSanitizer((value, { req }) => normalizeUpazila(value, req.body.district))
    .trim()
    .notEmpty().withMessage('উপজেলা বা থানা নির্বাচন করুন'),

  body('bloodGroup')
    .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
    .withMessage('সঠিক রক্তের গ্রুপ নির্বাচন করুন')
];

/**
 * Change Password Validation
 */
const changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('বর্তমান পাসওয়ার্ড প্রদান করুন'),

  body('newPassword')
    .isLength({ min: 6 }).withMessage('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),

  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('নতুন পাসওয়ার্ড দুটি মিলছে না');
      }
      return true;
    })
];

/**
 * Donation Log Validation
 */
const donationLogValidator = [
  body('date')
    .notEmpty().withMessage('রক্তদানের তারিখ প্রদান করুন'),

  body('location')
    .trim()
    .notEmpty().withMessage('রক্তদানের স্থান বা হাসপাতালের নাম লিখুন')
];

/**
 * Blood Request Validation Rules
 */
const bloodRequestValidator = [
  body('patientName')
    .trim()
    .notEmpty().withMessage('রোগীর নাম আবশ্যক')
    .isLength({ max: 80 }).withMessage('রোগীর নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

  body('bloodGroup')
    .notEmpty().withMessage('রক্তের গ্রুপ নির্বাচন করুন')
    .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'এ+', 'এ-', 'বি+', 'বি-', 'ও+', 'ও-', 'এবি+', 'এবি-'])
    .withMessage('সঠিক রক্তের গ্রুপ নির্বাচন করুন'),

  body('bagsNeeded')
    .isInt({ min: 1, max: 20 })
    .withMessage('রক্তের ব্যাগের সংখ্যা ১ থেকে ২০-এর মধ্যে হতে হবে'),

  body('reason')
    .notEmpty().withMessage('রক্তের কারণ বা রোগের ধরন নির্বাচন করুন'),

  body('hospitalName')
    .trim()
    .notEmpty().withMessage('হাসপাতালের নাম প্রদান করুন'),

  body('district')
    .customSanitizer((value) => normalizeDistrict(value))
    .trim()
    .notEmpty().withMessage('জেলা নির্বাচন করুন')
    .custom((value) => isKnownDistrict(value)).withMessage('তালিকা থেকে সঠিক জেলা বেছে নিন (বাংলা বা ইংরেজিতে লিখলেও চলবে)'),

  body('upazila')
    .customSanitizer((value, { req }) => normalizeUpazila(value, req.body.district))
    .trim()
    .notEmpty().withMessage('উপজেলা বা থানা নির্বাচন করুন'),

  body('address')
    .trim()
    .notEmpty().withMessage('হাসপাতালের ঠিকানা বা ওয়ার্ড নং লিখুন'),

  body('neededDate')
    .notEmpty().withMessage('রক্ত কখন প্রয়োজন তার তারিখ নির্বাচন করুন'),

  body('contactName')
    .trim()
    .notEmpty().withMessage('যোগাযোগকারী ব্যক্তির নাম আবশ্যক'),

  body('contactPhone')
    .trim()
    .notEmpty().withMessage('যোগাযোগের ফোন নম্বর আবশ্যক')
    .matches(/^(?:\+?8801[3-9]\d{8}|01[3-9]\d{8}|(?:\+?91)?[6-9]\d{9})$/)
    .withMessage('সঠিক মোবাইল নম্বর প্রদান করুন')
];

module.exports = {
  handleValidation,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  profileValidator,
  changePasswordValidator,
  donationLogValidator,
  bloodRequestValidator
};
