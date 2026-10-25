const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['donor', 'receiver'],
      required: true,
      default: 'donor'
    },
    title: {
      type: String,
      required: [true, 'গল্পের শিরোনাম আবশ্যক'],
      trim: true,
      maxlength: 120
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    body: {
      type: String,
      required: [true, 'গল্পের বিষয়বস্তু আবশ্যক'],
      minlength: [30, 'কমপক্ষে ৩০ অক্ষরের বিবরণ লিখুন']
    },
    image: {
      type: String,
      default: ''
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
      default: 'O+'
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

storySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);
