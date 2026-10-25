const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    patientName: {
      type: String,
      required: [true, 'রোগীর নাম প্রদান করা আবশ্যক'],
      trim: true,
      maxlength: 80
    },
    bloodGroup: {
      type: String,
      required: [true, 'রক্তের গ্রুপ নির্বাচন করা আবশ্যক'],
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    },
    bagsNeeded: {
      type: Number,
      required: [true, 'রক্তের ব্যাগের সংখ্যা আবশ্যক'],
      min: [1, 'কমপক্ষে ১ ব্যাগ রক্ত প্রয়োজন'],
      max: [20, 'সর্বোচ্চ ২০ ব্যাগ অনুরোধ করা যাবে'],
      default: 1
    },
    reason: {
      type: String,
      required: [true, 'রক্তের কারণ/রোগের ধরন নির্বাচন করুন'],
      enum: [
        'অপারেশন',
        'সিজার',
        'থ্যালাসেমিয়া',
        'দুর্ঘটনা',
        'ডেঙ্গু',
        'ক্যান্সার',
        'কিডনি ডায়ালাইসিস',
        'হৃদরোগ',
        'অন্যান্য'
      ]
    },
    urgency: {
      type: String,
      required: [true, 'জরুরিতার মাত্রা নির্বাচন করুন'],
      enum: ['অতি জরুরি', '২৪ ঘণ্টা', 'সাধারণ'],
      default: '২৪ ঘণ্টা'
    },
    hospitalName: {
      type: String,
      required: [true, 'হাসপাতাল বা ক্লিনিকের নাম আবশ্যক'],
      trim: true
    },
    district: {
      type: String,
      required: [true, 'জেলা নির্বাচন আবশ্যক'],
      trim: true
    },
    upazila: {
      type: String,
      required: [true, 'উপজেলা বা থানা আবশ্যক'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'হাসপাতালের সঠিক ঠিকানা বা ওয়ার্ড নং প্রদান করুন'],
      trim: true
    },
    neededDate: {
      type: Date,
      required: [true, 'রক্ত কখন প্রয়োজন তার তারিখ নির্বাচন করুন']
    },
    neededTime: {
      type: String,
      default: ''
    },
    contactName: {
      type: String,
      required: [true, 'যোগাযোগকারী ব্যক্তির নাম আবশ্যক'],
      trim: true
    },
    contactPhone: {
      type: String,
      required: [true, 'যোগাযোগের ফোন নম্বর আবশ্যক'],
      trim: true
    },
    note: {
      type: String,
      maxlength: [500, 'বিশেষ বার্তা সর্বোচ্চ ৫০০ অক্ষরের হতে পারে'],
      default: ''
    },
    status: {
      type: String,
      enum: ['open', 'fulfilled', 'closed', 'expired'],
      default: 'open'
    },
    approvedByAdmin: {
      type: Boolean,
      default: true
    },
    responses: [
      {
        donor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        message: {
          type: String,
          default: ''
        },
        phone: {
          type: String,
          default: ''
        },
        respondedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    views: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes
bloodRequestSchema.index({ status: 1, district: 1, bloodGroup: 1, createdAt: -1 });
bloodRequestSchema.index({ neededDate: 1, status: 1 });
bloodRequestSchema.index({ patientName: 'text', hospitalName: 'text', district: 'text' });

// Static method to auto-expire past requests
bloodRequestSchema.statics.expireOldRequests = async function () {
  const now = new Date();
  return this.updateMany(
    {
      status: 'open',
      neededDate: { $lt: now }
    },
    {
      $set: { status: 'expired' }
    }
  );
};

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
