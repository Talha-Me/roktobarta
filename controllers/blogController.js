const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { toBn } = require('../utils/bnDigits');
const { formatBnDate } = require('../utils/dates');

// Helper to compute reading time in Bangla
const computeReadTime = (htmlContent) => {
  if (!htmlContent) return '১ মিনিট';
  const text = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;
  const minutes = Math.max(1, Math.ceil(wordCount / 180));
  return `${toBn(minutes)} মিনিট`;
};

/**
 * List Blog Posts with Category & Search Filters & Pagination
 * GET /blog
 */
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const { category, tag, q } = req.query;

    const filter = { status: 'published' };

    if (category && category.trim()) {
      filter.category = category.trim();
    }

    if (tag && tag.trim()) {
      filter.tags = tag.trim();
    }

    if (q && q.trim()) {
      const searchTerm = q.trim();
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { excerpt: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ];
    }

    // Parallel fetch: posts, totalCount, categories with counts, popular posts
    const [posts, totalPosts, categoriesCount, popularPosts] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
      Post.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Post.find({ status: 'published' })
        .sort({ views: -1, createdAt: -1 })
        .limit(4)
        .select('title slug coverImage createdAt views')
        .lean()
    ]);

    // Attach reading time to each post
    const postsWithReadTime = posts.map((post) => ({
      ...post,
      readTime: computeReadTime(post.content)
    }));

    const totalPages = Math.ceil(totalPosts / limit);

    res.render('pages/blog/index', {
      metaTitle: category ? `${category} বিষয়ক স্বাস্থ্য নিবন্ধ – রক্তবার্তা` : 'স্বাস্থ্য ব্লগ ও সচেতনতামূলক নিবন্ধ – রক্তবার্তা',
      metaDescription: 'রক্তদান, থ্যালাসেমিয়া, পুষ্টি, সুস্থ জীবনযাপন এবং চিকিৎসা বিজ্ঞান সম্পর্কিত তথ্যবহুল ও নির্ভরযোগ্য বাংলা স্বাস্থ্য নিবন্ধ।',
      posts: postsWithReadTime,
      categoriesCount,
      popularPosts,
      selectedCategory: category || '',
      selectedTag: tag || '',
      searchQuery: q || '',
      currentPage: page,
      totalPages,
      totalPosts,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevPage: page - 1,
      nextPage: page + 1
    });
  } catch (error) {
    console.error('Blog List Error:', error);
    req.flash('error', 'ব্লগ লোড করতে সমস্যা হয়েছে');
    res.redirect('/');
  }
};

/**
 * Single Blog Post Details Page
 * GET /blog/:slug
 */
exports.getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await Post.findOne({ slug: slug.trim(), status: 'published' })
      .populate('author', 'name avatar bio')
      .lean();

    if (!post) {
      req.flash('error', 'অনুরোধকৃত ব্লগ নিবন্ধটি খুঁজে পাওয়া যায়নি');
      return res.redirect('/blog');
    }

    // Increment views asynchronously
    Post.updateOne({ _id: post._id }, { $inc: { views: 1 } }).exec();

    // Fetch comments for this post
    const comments = await Comment.find({
      onModel: 'Post',
      onId: post._id,
      status: 'approved'
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch related posts in the same category
    const relatedPosts = await Post.find({
      _id: { $ne: post._id },
      category: post.category,
      status: 'published'
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title slug excerpt coverImage createdAt views')
      .lean();

    // Extract headings for Table of Contents (h2, h3 tags)
    const toc = [];
    const headingRegex = /<h([23])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    let index = 1;
    while ((match = headingRegex.exec(post.content)) !== null) {
      const level = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      const id = `section-${index++}`;
      toc.push({ level, title, id });
    }

    // Inject anchor IDs into headings in content
    let contentWithIds = post.content;
    let replaceIdx = 1;
    contentWithIds = contentWithIds.replace(/<h([23])([^>]*)>(.*?)<\/h\1>/gi, (full, lvl, attrs, inner) => {
      const id = `section-${replaceIdx++}`;
      return `<h${lvl} id="${id}" ${attrs}>${inner}</h${lvl}>`;
    });

    const readTime = computeReadTime(post.content);

    res.render('pages/blog/show', {
      metaTitle: post.metaTitle || `${post.title} – রক্তবার্তা ব্লগ`,
      metaDescription: post.metaDescription || post.excerpt,
      post: {
        ...post,
        content: contentWithIds,
        readTime
      },
      comments,
      relatedPosts,
      toc,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    console.error('Blog Show Error:', error);
    req.flash('error', 'ব্লগটি প্রদর্শন করতে সমস্যা হয়েছে');
    res.redirect('/blog');
  }
};

/**
 * Post a Comment on Blog Article
 * POST /blog/:slug/comment
 */
exports.postComment = async (req, res) => {
  try {
    const { slug } = req.params;
    const { text } = req.body;

    if (!req.session.userId) {
      req.flash('error', 'মন্তব্য করতে অনুগ্রহ করে প্রথমে লগইন করুন');
      return res.redirect(`/login?returnUrl=/blog/${slug}`);
    }

    if (!text || text.trim().length < 3) {
      req.flash('error', 'কমপক্ষে ৩ অক্ষরের একটি অর্থপূর্ণ মন্তব্য লিখুন');
      return res.redirect(`/blog/${slug}#commentForm`);
    }

    const post = await Post.findOne({ slug: slug.trim(), status: 'published' });
    if (!post) {
      req.flash('error', 'ব্লগ নিবন্ধটি বিদ্যমান নেই');
      return res.redirect('/blog');
    }

    await Comment.create({
      onModel: 'Post',
      onId: post._id,
      user: req.currentUser._id,
      userName: req.currentUser.name,
      userAvatar: req.currentUser.avatar || '',
      text: text.trim(),
      status: 'approved'
    });

    req.flash('success', 'আপনার মন্তব্যটি সফলভাবে প্রকাশিত হয়েছে');
    res.redirect(`/blog/${slug}#comments`);
  } catch (error) {
    console.error('Post Comment Error:', error);
    req.flash('error', 'মন্তব্য প্রকাশ করতে ব্যর্থ হয়েছে');
    res.redirect(`/blog/${req.params.slug}`);
  }
};
