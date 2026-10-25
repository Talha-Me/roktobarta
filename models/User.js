const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'নাম প্রদান করা আবশ্যক'],
      trim: true,
      maxlength: [80, 'নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে']
    },
    email: {
      type: String,
      required: [true, 'ইমেইল প্রদান করা আবশ্যক'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'একটি সঠিক ইমেইল ঠিকানা প্রদান করুন']
    },
    phone: {
      type: String,
      required: [true, 'ফোন নম্বর প্রদান করা আবশ্যক'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Supports Bangladesh (+8801XXXXXXXXX or 01XXXXXXXXX) and India (+91XXXXXXXXXX or 91XXXXXXXXXX)
          return /^(?:\+?8801[3-9]\d{8}|01[3-9]\d{8}|(?:\+?91)?[6-9]\d{9})$/.test(v);
        },
        message: 'সঠিক বাংলাদেশি (০১...) বা ভারতীয় মোবাইল নম্বর প্রদান করুন'
      }
    },
    passwordHash: {
      type: String,
      required: [true, 'পাসওয়ার্ড আবশ্যক']
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    country: {
      type: String,
      enum: ['বাংলাদেশ', 'ভারত (কলকাতা)'],
      default: 'বাংলাদেশ'
    },
    division: {
      type: String,
      trim: true,
      default: ''
    },
    district: {
      type: String,
      required: [true, 'জেলা নির্বাচন করা আবশ্যক'],
      trim: true
    },
    upazila: {
      type: String,
      required: [true, 'উপজেলা বা থানা নির্বাচন করা আবশ্যক'],
      trim: true
    },
    area: {
      type: String,
      trim: true,
      default: ''
    },
    bloodGroup: {
      type: String,
      required: [true, 'রক্তের গ্রুপ আবশ্যক'],
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    },
    gender: {
      type: String,
      enum: ['পুরুষ', 'মহিলা', 'অন্যান্য'],
      default: 'পুরুষ'
    },
    dateOfBirth: {
      type: Date
    },
    weight: {
      type: Number, // In KG
      min: [40, 'রক্তদানের জন্য ওজন কমপক্ষে ৪৫ কেজি হওয়া উচিত']
    },
    isDonor: {
      type: Boolean,
      default: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    lastDonationDate: {
      type: Date,
      default: null
    },
    totalDonations: {
      type: Number,
      default: 0
    },
    showPhonePublic: {
      type: Boolean,
      default: false
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: [300, 'বায়ো সর্বোচ্চ ৩০০ অক্ষরের হতে পারে'],
      default: ''
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    resetToken: String,
    resetOtp: String,
    resetTokenExpire: Date
  },
  {
    timestamps: true
  }
);

// Indexes
userSchema.index({ bloodGroup: 1, district: 1, upazila: 1, isDonor: 1, isAvailable: 1 });
userSchema.index({ name: 'text', district: 'text', upazila: 'text' });

// Virtual for calculating age
userSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const diffMs = Date.now() - this.dateOfBirth.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// Virtual for next eligible donation date
userSchema.virtual('nextEligibleDate').get(function () {
  if (!this.lastDonationDate) return new Date();
  const daysToAdd = this.gender === 'মহিলা' ? 120 : 90;
  const nextDate = new Date(this.lastDonationDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
});

// Virtual for checking if currently eligible to donate
userSchema.virtual('isEligible').get(function () {
  if (!this.isDonor || !this.isAvailable || this.isBanned) return false;
  if (!this.lastDonationDate) return true;
  return new Date() >= this.nextEligibleDate;
});

module.exports = mongoose.model('User', userSchema);
