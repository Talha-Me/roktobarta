const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'নাম আবশ্যক'],
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: [true, 'ইমেইল আবশ্যক'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    subject: {
      type: String,
      required: [true, 'বিষয় আবশ্যক'],
      trim: true,
      maxlength: 150
    },
    message: {
      type: String,
      required: [true, 'বার্তা আবশ্যক'],
      maxlength: 2000
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied'],
      default: 'new'
    },
    replyNote: {
      type: String,
      default: ''
    },
    repliedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

contactSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
