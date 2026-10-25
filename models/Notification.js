const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['blood_request', 'response_received', 'story_approved', 'story_rejected', 'donation_reminder', 'system'],
      default: 'system'
    },
    message: {
      type: String,
      required: true
    },
    link: {
      type: String,
      default: '#'
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
