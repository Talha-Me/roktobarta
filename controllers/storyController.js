const Story = require('../models/Story');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { createSlug } = require('../utils/slugify');
const { toBn } = require('../utils/bnDigits');
const { formatBnDate, timeAgoBn } = require('../utils/dates');
const { toBnGroup } = require('../utils/bloodGroups');

/**
 * List Stories with Role Filter & Pagination
 * GET /stories
 */
exports.getStories = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const { role } = req.query;
    const query = { status: 'approved' };

    if (role && ['donor', 'receiver'].includes(role)) {
      query.role = role;
    }

    const [stories, totalCount] = await Promise.all([
      Story.find(query)
        .populate('author', 'name avatar district upazila')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Story.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render('pages/stories/index', {
      metaTitle: 'রক্তের গল্প - মানবিক অনুভূতির দলিল | রক্তবার্তা',
      metaDescription: 'রক্তদাতা ও রক্তগ্রহীতাদের বাস্তব জীবনের গল্প, অভিজ্ঞতা এবং অনুপ্রেরণাদায়ী মানবিক অনুভূতির সংকলন।',
      stories,
      currentRole: role || 'all',
      currentPage: page,
      totalPages,
      totalCount
    });
  } catch (error) {
    console.error('Get Stories Error:', error);
    req.flash('error', 'গল্পের তালিকা লোড করতে সমস্যা হয়েছে।');
    return res.redirect('/');
  }
};

/**
 * Story Details Page
 * GET /stories/:slug
 */
exports.getStoryDetails = async (req, res) => {
  try {
    const { slug } = req.params;

    const story = await Story.findOne({ slug })
      .populate('author', 'name avatar district upazila bloodGroup totalDonations');

    if (!story) {
      req.flash('error', 'অনুরোধকৃত গল্পটি খুঁজে পাওয়া যায়নি।');
      return res.redirect('/stories');
    }

    // Increment view count
    story.views = (story.views || 0) + 1;
    await story.save();

    // Fetch approved comments for this story
    const comments = await Comment.find({
      onModel: 'Story',
      onId: story._id,
      status: 'approved'
    }).sort({ createdAt: -1 });

    // Fetch related stories
    const relatedStories = await Story.find({
      _id: { $ne: story._id },
      status: 'approved'
    })
      .sort({ createdAt: -1 })
      .limit(3);

    const isLiked = req.session.user && story.likes.some(
      (id) => id.toString() === req.session.user._id.toString()
    );

    res.render('pages/stories/show', {
      metaTitle: `${story.title} - রক্তবার্তা`,
      metaDescription: story.body.substring(0, 160),
      metaImage: story.image ? `${process.env.SITE_URL || ''}${story.image}` : undefined,
      story,
      comments,
      relatedStories,
      isLiked
    });
  } catch (error) {
    console.error('Get Story Details Error:', error);
    return res.redirect('/stories');
  }
};

/**
 * Submit New Story
 * POST /stories
 */
exports.postSubmitStory = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { role, title, body, bloodGroup, location } = req.body;

    if (!title || !body || body.length < 30) {
      req.flash('error', 'গল্পের শিরোনাম এবং কমপক্ষে ৩০ অক্ষরের বিবরণ প্রদান করুন।');
      return res.redirect('back');
    }

    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const slug = createSlug(title);

    await Story.create({
      author: userId,
      role: role || 'donor',
      title: title.trim(),
      slug,
      body: body.trim(),
      image: imagePath,
      bloodGroup: bloodGroup || req.session.user.bloodGroup || 'O+',
      location: location ? location.trim() : req.session.user.district,
      status: 'pending' // Requires admin approval
    });

    // Notify admins in system
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: 'system',
        message: `নতুন গল্প পর্যালোচনার জন্য জমা হয়েছে: "${title.substring(0, 40)}..."`,
        link: '/admin/stories'
      });
    }

    req.flash('success', 'আপনার গল্পটি সফলভাবে জমা হয়েছে! আমাদের অ্যাডমিন টিম যাচাই করার পর এটি ওয়েবসাইটে প্রকাশিত হবে।');
    return res.redirect('/dashboard#stories');
  } catch (error) {
    console.error('Submit Story Error:', error);
    req.flash('error', 'গল্প জমা দিতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।');
    return res.redirect('back');
  }
};

/**
 * Toggle Story Like
 * POST /stories/:id/like
 */
exports.postToggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'গল্পটি পাওয়া যায়নি।' });
    }

    const likeIndex = story.likes.indexOf(userId);
    let liked = false;

    if (likeIndex === -1) {
      story.likes.push(userId);
      liked = true;
    } else {
      story.likes.splice(likeIndex, 1);
      liked = false;
    }

    await story.save();

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        liked,
        count: story.likes.length,
        countBn: toBn(story.likes.length)
      });
    }

    return res.redirect('back');
  } catch (error) {
    console.error('Toggle Like Error:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false });
    }
    return res.redirect('back');
  }
};

/**
 * Add Comment to Story
 * POST /stories/:id/comments
 */
exports.postAddComment = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      req.flash('error', 'মন্তব্যের বিবরণ খালি রাখা যাবে না।');
      return res.redirect('back');
    }

    await Comment.create({
      onModel: 'Story',
      onId: id,
      user: user._id,
      userName: user.name,
      userAvatar: user.avatar,
      text: text.trim(),
      status: 'approved'
    });

    req.flash('success', 'আপনার মন্তব্যটি সফলভাবে প্রকাশিত হয়েছে।');
    return res.redirect(`/stories/${req.body.slug || ''}#comments`);
  } catch (error) {
    console.error('Add Comment Error:', error);
    req.flash('error', 'মন্তব্য প্রকাশ করতে সমস্যা হয়েছে।');
    return res.redirect('back');
  }
};
