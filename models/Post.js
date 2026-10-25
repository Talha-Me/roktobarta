const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'ব্লগের শিরোনাম আবশ্যক'],
      trim: true,
      maxlength: 180
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    excerpt: {
      type: String,
      required: [true, 'সংক্ষিপ্ত বিবরণ (Excerpt) আবশ্যক'],
      trim: true,
      maxlength: 300
    },
    content: {
      type: String,
      required: [true, 'ব্লগের বিস্তারিত বিষয়বস্তু আবশ্যক']
    },
    coverImage: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      required: true,
      enum: ['স্বাস্থ্য টিপস', 'সচেতনতা', 'রক্তদান সহায়িকা', 'বিজ্ঞান ও গবেষণা', 'অনুপ্রেরণা'],
      default: 'স্বাস্থ্য টিপস'
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    authorName: {
      type: String,
      default: 'রক্তবার্তা টিম'
    },
    metaTitle: {
      type: String,
      trim: true
    },
    metaDescription: {
      type: String,
      trim: true
    },
    focusKeyword: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    },
    views: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ category: 1 });
postSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Post', postSchema);
