const mongoose = require('mongoose');

const donationLogSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null
    },
    date: {
      type: Date,
      required: [true, 'রক্তদানের তারিখ আবশ্যক'],
      default: Date.now
    },
    location: {
      type: String,
      required: [true, 'রক্তদানের স্থান বা হাসপাতালের নাম আবশ্যক'],
      trim: true
    },
    recipientName: {
      type: String,
      trim: true,
      default: ''
    },
    note: {
      type: String,
      maxlength: [300, 'নোট সর্বোচ্চ ৩০০ অক্ষরের হতে পারে'],
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Update donor's lastDonationDate and totalDonations upon creating a donation log
donationLogSchema.post('save', async function (doc) {
  try {
    const User = mongoose.model('User');
    const logsCount = await mongoose.model('DonationLog').countDocuments({ donor: doc.donor });
    
    // Find the latest donation date for this donor
    const latestLog = await mongoose.model('DonationLog')
      .findOne({ donor: doc.donor })
      .sort({ date: -1 });

    await User.findByIdAndUpdate(doc.donor, {
      totalDonations: logsCount,
      lastDonationDate: latestLog ? latestLog.date : doc.date
    });
  } catch (err) {
    console.error('Error updating user donation stats:', err);
  }
});

donationLogSchema.index({ donor: 1, date: -1 });

module.exports = mongoose.model('DonationLog', donationLogSchema);
