const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    onModel: {
      type: String,
      required: true,
      enum: ['Post', 'Story']
    },
    onId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'onModel'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userAvatar: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      required: [true, 'মন্তব্যের বিবরণ আবশ্যক'],
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'spam'],
      default: 'approved'
    }
  },
  {
    timestamps: true
  }
);

commentSchema.index({ onId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
