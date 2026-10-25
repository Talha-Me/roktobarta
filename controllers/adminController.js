const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Story = require('../models/Story');
const Post = require('../models/Post');
const Contact = require('../models/Contact');
const DonationLog = require('../models/DonationLog');
const { createSlug } = require('../utils/slugify');
const { toBn } = require('../utils/bnDigits');
const { formatBnDate } = require('../utils/dates');
const { toBnGroup } = require('../utils/bloodGroups');

/**
 * 1. Admin Dashboard Overview
 * GET /admin
 */
exports.getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalRequests,
      openRequests,
      pendingStories,
      totalPosts,
      newContacts,
      recentRequests,
      recentUsers,
      recentContacts
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isDonor: true }),
      BloodRequest.countDocuments({}),
      BloodRequest.countDocuments({ status: 'open' }),
      Story.countDocuments({ status: 'pending' }),
      Post.countDocuments({}),
      Contact.countDocuments({ status: 'new' }),
      BloodRequest.find({}).sort({ createdAt: -1 }).limit(5).lean(),
      User.find({}).sort({ createdAt: -1 }).limit(5).lean(),
      Contact.find({}).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    res.render('admin/dashboard', {
      layout: 'layouts/admin',
      pageTitle: 'অ্যাডমিন ড্যাশবোর্ড',
      metaTitle: 'অ্যাডমিন ড্যাশবোর্ড – রক্তবার্তা',
      stats: {
        totalUsers,
        totalDonors,
        totalRequests,
        openRequests,
        pendingStories,
        totalPosts,
        newContacts
      },
      recentRequests,
      recentUsers,
      recentContacts
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    req.flash('error', 'ড্যাশবোর্ড ডেটা লোড করতে সমস্যা হয়েছে');
    res.redirect('/');
  }
};

/**
 * 2. User & Donor Management
 * GET /admin/users
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const { role, donor, q } = req.query;
    const query = {};

    if (role && role !== 'all') query.role = role;
    if (donor === 'yes') query.isDonor = true;
    if (donor === 'no') query.isDonor = false;

    if (q && q.trim()) {
      const term = q.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { district: { $regex: term, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('admin/users/index', {
      layout: 'layouts/admin',
      pageTitle: 'ব্যবহারকারী ও রক্তদাতা তালিকা',
      metaTitle: 'ব্যবহারকারী ম্যানেজমেন্ট – অ্যাডমিন',
      users,
      total,
      currentPage: page,
      totalPages,
      queryRole: role || 'all',
      queryDonor: donor || 'all',
      searchQuery: q || ''
    });
  } catch (error) {
    console.error('Admin Users Error:', error);
    req.flash('error', 'ব্যবহারকারীদের তালিকা লোড করা যায়নি');
    res.redirect('/admin');
  }
};

/**
 * Toggle Ban Status
 * POST /admin/users/:id/ban
 */
exports.postToggleBanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'ব্যবহারকারী পাওয়া যায়নি');
      return res.redirect('/admin/users');
    }

    if (user._id.toString() === req.session.user._id.toString()) {
      req.flash('error', 'আপনি নিজের অ্যাকাউন্ট নিষিদ্ধ করতে পারবেন না');
      return res.redirect('/admin/users');
    }

    user.isBanned = !user.isBanned;
    await user.save();

    req.flash('success', user.isBanned ? 'ব্যবহারকারীকে সফলভাবে নিষিদ্ধ (Banned) করা হয়েছে' : 'ব্যবহারকারীর নিষেধাজ্ঞা প্রত্যাহার করা হয়েছে');
    res.redirect(req.header('Referer') || '/admin/users');
  } catch (error) {
    console.error('Ban User Error:', error);
    req.flash('error', 'অ্যাকশন সম্পন্ন করা যায়নি');
    res.redirect('/admin/users');
  }
};

/**
 * Toggle Admin Role
 * POST /admin/users/:id/role
 */
exports.postToggleRoleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'ব্যবহারকারী পাওয়া যায়নি');
      return res.redirect('/admin/users');
    }

    if (user._id.toString() === req.session.user._id.toString()) {
      req.flash('error', 'আপনি নিজের রোল পরিবর্তন করতে পারবেন না');
      return res.redirect('/admin/users');
    }

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    req.flash('success', `রোল সফলভাবে পরিবর্তন করে '${user.role}' করা হয়েছে`);
    res.redirect(req.header('Referer') || '/admin/users');
  } catch (error) {
    console.error('Toggle Role Error:', error);
    req.flash('error', 'রোল পরিবর্তন করতে ব্যর্থ');
    res.redirect('/admin/users');
  }
};

/**
 * Delete User
 * POST /admin/users/:id/delete
 */
exports.postDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.session.user._id.toString()) {
      req.flash('error', 'নিজের অ্যাকাউন্ট ডিলিট করা সম্ভব নয়');
      return res.redirect('/admin/users');
    }

    await User.findByIdAndDelete(req.params.id);
    req.flash('success', 'ব্যবহারকারী অ্যাকাউন্ট মুছে ফেলা হয়েছে');
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Delete User Error:', error);
    req.flash('error', 'মুছে ফেলতে সমস্যা হয়েছে');
    res.redirect('/admin/users');
  }
};

/**
 * 3. Blood Request Management
 * GET /admin/requests
 */
exports.getRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const { status, group, q } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (group && group !== 'all') query.bloodGroup = group;

    if (q && q.trim()) {
      const term = q.trim();
      query.$or = [
        { patientName: { $regex: term, $options: 'i' } },
        { hospitalName: { $regex: term, $options: 'i' } },
        { district: { $regex: term, $options: 'i' } },
        { contactPhone: { $regex: term, $options: 'i' } }
      ];
    }

    const [requests, total] = await Promise.all([
      BloodRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      BloodRequest.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('admin/requests/index', {
      layout: 'layouts/admin',
      pageTitle: 'রক্তের অনুরোধ ম্যানেজমেন্ট',
      metaTitle: 'রক্তের অনুরোধ তালিকা – অ্যাডমিন',
      requests,
      total,
      currentPage: page,
      totalPages,
      queryStatus: status || 'all',
      queryGroup: group || 'all',
      searchQuery: q || ''
    });
  } catch (error) {
    console.error('Admin Requests Error:', error);
    req.flash('error', 'অনুরোধের তালিকা লোড করা যায়নি');
    res.redirect('/admin');
  }
};

/**
 * Update Blood Request Status
 * POST /admin/requests/:id/status
 */
exports.postUpdateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await BloodRequest.findByIdAndUpdate(req.params.id, { status });
    req.flash('success', `অনুরোধের স্ট্যাটাস সফলভাবে '${status}' করা হয়েছে`);
    res.redirect(req.header('Referer') || '/admin/requests');
  } catch (error) {
    console.error('Update Request Status Error:', error);
    req.flash('error', 'স্ট্যাটাস আপডেট করা যায়নি');
    res.redirect('/admin/requests');
  }
};

/**
 * Delete Blood Request
 * POST /admin/requests/:id/delete
 */
exports.postDeleteRequest = async (req, res) => {
  try {
    await BloodRequest.findByIdAndDelete(req.params.id);
    req.flash('success', 'রক্তের অনুরোধটি মুছে ফেলা হয়েছে');
    res.redirect('/admin/requests');
  } catch (error) {
    console.error('Delete Request Error:', error);
    req.flash('error', 'মুছে ফেলতে সমস্যা হয়েছে');
    res.redirect('/admin/requests');
  }
};

/**
 * 4. Story Moderation
 * GET /admin/stories
 */
exports.getStories = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const stories = await Story.find(query)
      .populate('author', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/stories/index', {
      layout: 'layouts/admin',
      pageTitle: 'রক্তের গল্প অনুমোদন ও মডারেশন',
      metaTitle: 'গল্প মডারেশন – অ্যাডমিন',
      stories,
      queryStatus: status || 'all'
    });
  } catch (error) {
    console.error('Admin Stories Error:', error);
    req.flash('error', 'গল্পের তালিকা লোড করতে সমস্যা হয়েছে');
    res.redirect('/admin');
  }
};

/**
 * Approve or Reject Story
 * POST /admin/stories/:id/status
 */
exports.postUpdateStoryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await Story.findByIdAndUpdate(req.params.id, { status });
    req.flash('success', `গল্পের স্ট্যাটাস '${status}' হিসেবে আপডেট করা হয়েছে`);
    res.redirect('/admin/stories');
  } catch (error) {
    console.error('Update Story Status Error:', error);
    req.flash('error', 'স্ট্যাটাস পরিবর্তন করতে ব্যর্থ');
    res.redirect('/admin/stories');
  }
};

/**
 * Delete Story
 * POST /admin/stories/:id/delete
 */
exports.postDeleteStory = async (req, res) => {
  try {
    await Story.findByIdAndDelete(req.params.id);
    req.flash('success', 'গল্পটি সফলভাবে মুছে ফেলা হয়েছে');
    res.redirect('/admin/stories');
  } catch (error) {
    console.error('Delete Story Error:', error);
    req.flash('error', 'গল্প মুছে ফেলতে ব্যর্থ');
    res.redirect('/admin/stories');
  }
};

/**
 * 5. Blog Post Management
 * GET /admin/posts
 */
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/posts/index', {
      layout: 'layouts/admin',
      pageTitle: 'সকল ব্লগ নিবন্ধ ও এসইও (SEO)',
      metaTitle: 'ব্লগ পোস্ট তালিকা – অ্যাডমিন',
      posts
    });
  } catch (error) {
    console.error('Admin Posts Error:', error);
    req.flash('error', 'ব্লগ তালিকা লোড করা যায়নি');
    res.redirect('/admin');
  }
};

/**
 * New Blog Post Form (100% SEO Blog Uploader)
 * GET /admin/posts/new
 */
exports.getNewPost = (req, res) => {
  res.render('admin/posts/form', {
    layout: 'layouts/admin',
    pageTitle: 'নতুন ব্লগ পোস্ট লিখুন (100% SEO Ready)',
    metaTitle: 'নতুন ব্লগ নিবন্ধ তৈরি – রক্তবার্তা অ্যাডমিন',
    post: {},
    isEdit: false
  });
};

/**
 * Handle Create Blog Post
 * POST /admin/posts/new
 */
exports.postCreatePost = async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      authorName,
      metaTitle,
      metaDescription,
      focusKeyword,
      status
    } = req.body;

    if (!title || !excerpt || !content) {
      req.flash('error', 'শিরোনাম, সারসংক্ষেপ ও বিস্তারিত কন্টেন্ট প্রদান করা আবশ্যক');
      return res.redirect('/admin/posts/new');
    }

    // Auto slug or user provided slug
    let generatedSlug = (slug && slug.trim()) ? createSlug(slug) : createSlug(title);
    if (!generatedSlug) generatedSlug = `post-${Date.now()}`;

    // Verify uniqueness of slug
    const existing = await Post.findOne({ slug: generatedSlug });
    if (existing) {
      generatedSlug = `${generatedSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Process tags
    const tagArray = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

    // Cover image path: supports both external URL (Cloudflare R2/CDN) and direct file upload
    let coverImagePath = '';
    if (req.body.coverImageUrl && req.body.coverImageUrl.trim()) {
      coverImagePath = req.body.coverImageUrl.trim();
    }
    if (req.file) {
      coverImagePath = `/uploads/${req.file.filename}`;
    }

    await Post.create({
      title: title.trim(),
      slug: generatedSlug,
      excerpt: excerpt.trim(),
      content: content.trim(),
      coverImage: coverImagePath,
      category: category || 'স্বাস্থ্য টিপস',
      tags: tagArray,
      author: req.session.user._id,
      authorName: authorName ? authorName.trim() : 'রক্তবার্তা মেডিকেল ডেস্ক',
      metaTitle: metaTitle ? metaTitle.trim() : title.trim(),
      metaDescription: metaDescription ? metaDescription.trim() : excerpt.trim(),
      focusKeyword: focusKeyword ? focusKeyword.trim() : '',
      status: status || 'published'
    });

    req.flash('success', 'ব্লগ নিবন্ধটি সফলভাবে তৈরি ও প্রকাশিত হয়েছে!');
    res.redirect('/admin/posts');
  } catch (error) {
    console.error('Create Post Error:', error);
    req.flash('error', `ব্লগ তৈরিতে ত্রুটি: ${error.message}`);
    res.redirect('/admin/posts/new');
  }
};

/**
 * Edit Blog Post Form
 * GET /admin/posts/:id/edit
 */
exports.getEditPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      req.flash('error', 'পোস্টটি খুঁজে পাওয়া যায়নি');
      return res.redirect('/admin/posts');
    }

    res.render('admin/posts/form', {
      layout: 'layouts/admin',
      pageTitle: 'ব্লগ পোস্ট সম্পাদনা (SEO)',
      metaTitle: `সম্পাদনা: ${post.title}`,
      post,
      isEdit: true
    });
  } catch (error) {
    console.error('Get Edit Post Error:', error);
    req.flash('error', 'পোস্টটি লোড করা যায়নি');
    res.redirect('/admin/posts');
  }
};

/**
 * Handle Update Blog Post
 * POST /admin/posts/:id/edit
 */
exports.postUpdatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      req.flash('error', 'পোস্টটি পাওয়া যায়নি');
      return res.redirect('/admin/posts');
    }

    const {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      authorName,
      metaTitle,
      metaDescription,
      focusKeyword,
      status
    } = req.body;

    post.title = title.trim();
    post.excerpt = excerpt.trim();
    post.content = content.trim();
    post.category = category || post.category;
    post.authorName = authorName ? authorName.trim() : post.authorName;
    post.metaTitle = metaTitle ? metaTitle.trim() : title.trim();
    post.metaDescription = metaDescription ? metaDescription.trim() : excerpt.trim();
    post.focusKeyword = focusKeyword ? focusKeyword.trim() : '';
    post.status = status || post.status;

    if (tags) {
      post.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    if (slug && slug.trim() && slug !== post.slug) {
      const customSlug = createSlug(slug);
      const conflict = await Post.findOne({ slug: customSlug, _id: { $ne: post._id } });
      if (!conflict) post.slug = customSlug;
    }

    if (req.body.coverImageUrl !== undefined) {
      const url = req.body.coverImageUrl.trim();
      if (url) post.coverImage = url;
    }

    if (req.file) {
      post.coverImage = `/uploads/${req.file.filename}`;
    }

    await post.save();

    req.flash('success', 'ব্লগ নিবন্ধটি সফলভাবে আপডেট করা হয়েছে');
    res.redirect('/admin/posts');
  } catch (error) {
    console.error('Update Post Error:', error);
    req.flash('error', `আপডেট ব্যর্থ: ${error.message}`);
    res.redirect(`/admin/posts/${req.params.id}/edit`);
  }
};

/**
 * Delete Blog Post
 * POST /admin/posts/:id/delete
 */
exports.postDeletePost = async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    req.flash('success', 'ব্লগ নিবন্ধটি সফলভাবে মুছে ফেলা হয়েছে');
    res.redirect('/admin/posts');
  } catch (error) {
    console.error('Delete Post Error:', error);
    req.flash('error', 'পোস্ট মুছে ফেলতে ব্যর্থ');
    res.redirect('/admin/posts');
  }
};

/**
 * 6. Contact Messages Inbox
 * GET /admin/contacts
 */
exports.getContacts = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/contacts/index', {
      layout: 'layouts/admin',
      pageTitle: 'যোগাযোগ ইনবক্স',
      metaTitle: 'যোগাযোগ বার্তা – অ্যাডমিন',
      contacts,
      queryStatus: status || 'all'
    });
  } catch (error) {
    console.error('Admin Contacts Error:', error);
    req.flash('error', 'মেসেজ লোড করা যায়নি');
    res.redirect('/admin');
  }
};

/**
 * Mark Contact Message Status
 * POST /admin/contacts/:id/status
 */
exports.postUpdateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await Contact.findByIdAndUpdate(req.params.id, { status });
    req.flash('success', `বার্তার স্ট্যাটাস '${status}' হিসেবে চিহ্নিত করা হয়েছে`);
    res.redirect('/admin/contacts');
  } catch (error) {
    console.error('Update Contact Status Error:', error);
    req.flash('error', 'স্ট্যাটাস আপডেট ব্যর্থ');
    res.redirect('/admin/contacts');
  }
};

/**
 * Delete Contact Message
 * POST /admin/contacts/:id/delete
 */
exports.postDeleteContact = async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    req.flash('success', 'বার্তাটি মুছে ফেলা হয়েছে');
    res.redirect('/admin/contacts');
  } catch (error) {
    console.error('Delete Contact Error:', error);
    req.flash('error', 'বার্তা মুছে ফেলা যায়নি');
    res.redirect('/admin/contacts');
  }
};

/**
 * 7. Export Donors to CSV (UTF-8 Excel Friendly)
 * GET /admin/export/donors
 */
exports.exportDonorsCSV = async (req, res) => {
  try {
    const donors = await User.find({ isDonor: true }).sort({ district: 1, name: 1 }).lean();

    let csv = '\uFEFF'; // UTF-8 BOM for Bengali display in Excel
    csv += 'Name,Phone,Blood Group,Country,Division,District,Upazila,Total Donations,Last Donation Date,Available,Verified\n';

    donors.forEach((d) => {
      const row = [
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${(d.phone || '').replace(/"/g, '""')}"`,
        `"${d.bloodGroup || ''}"`,
        `"${d.country || ''}"`,
        `"${d.division || ''}"`,
        `"${(d.district || '').replace(/"/g, '""')}"`,
        `"${(d.upazila || '').replace(/"/g, '""')}"`,
        d.totalDonations || 0,
        d.lastDonationDate ? d.lastDonationDate.toISOString().split('T')[0] : 'N/A',
        d.isAvailable ? 'Yes' : 'No',
        d.isVerified ? 'Yes' : 'No'
      ];
      csv += `${row.join(',')}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="roktobarta-donors-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error('Export Donors Error:', error);
    req.flash('error', 'রক্তদাতাদের ফাইল এক্সপোর্ট করতে ব্যর্থ');
    res.redirect('/admin');
  }
};

/**
 * Export Blood Requests to CSV
 * GET /admin/export/requests
 */
exports.exportRequestsCSV = async (req, res) => {
  try {
    const requests = await BloodRequest.find({}).sort({ createdAt: -1 }).lean();

    let csv = '\uFEFF';
    csv += 'Patient Name,Blood Group,Bags Needed,Reason,Urgency,Hospital,District,Upazila,Contact Name,Phone,Status,Needed Date\n';

    requests.forEach((r) => {
      const row = [
        `"${(r.patientName || '').replace(/"/g, '""')}"`,
        `"${r.bloodGroup || ''}"`,
        r.bagsNeeded || 1,
        `"${(r.reason || '').replace(/"/g, '""')}"`,
        `"${r.urgency || ''}"`,
        `"${(r.hospitalName || '').replace(/"/g, '""')}"`,
        `"${(r.district || '').replace(/"/g, '""')}"`,
        `"${(r.upazila || '').replace(/"/g, '""')}"`,
        `"${(r.contactName || '').replace(/"/g, '""')}"`,
        `"${(r.contactPhone || '').replace(/"/g, '""')}"`,
        `"${r.status || ''}"`,
        r.neededDate ? r.neededDate.toISOString().split('T')[0] : 'N/A'
      ];
      csv += `${row.join(',')}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="roktobarta-requests-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error('Export Requests Error:', error);
    req.flash('error', 'অনুরোধ ফাইল এক্সপোর্ট করতে ব্যর্থ');
    res.redirect('/admin');
  }
};
