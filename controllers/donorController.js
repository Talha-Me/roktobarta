const User = require('../models/User');
const { getCompatibleDonors, toBnGroup, toEnGroup } = require('../utils/bloodGroups');
const { normalizeDistrict, normalizeUpazila } = require('../utils/banglishMap');

/**
 * List & Search Blood Donors
 * GET /donors
 */
exports.getDonors = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 12; // 12 donors per page
    const skip = (page - 1) * limit;

    const { group, district, upazila, available, compatible } = req.query;

    const query = {
      isDonor: true,
      isBanned: false
    };

    // Blood Group & Compatibility Filtering
    if (group && group.trim()) {
      const enGroup = toEnGroup(group.trim());
      if (compatible === 'on' || compatible === 'true') {
        const compGroups = getCompatibleDonors(enGroup);
        query.bloodGroup = { $in: compGroups };
      } else {
        query.bloodGroup = enGroup;
      }
    }

    // Location Filtering (supports Bangla, English & Banglish)
    if (district && district.trim()) {
      const normDist = normalizeDistrict(district.trim());
      query.district = new RegExp('^' + normDist + '$', 'i');
    }
    if (upazila && upazila.trim()) {
      const upTerm = upazila.trim();
      const normUp = normalizeUpazila(upTerm);
      query.$or = [
        { upazila: new RegExp('^' + normUp + '$', 'i') },
        { upazila: new RegExp(upTerm, 'i') },
        { area: new RegExp(upTerm, 'i') }
      ];
    }

    // Availability Filter
    if (available === 'available') {
      query.isAvailable = true;
    } else if (available === 'unavailable') {
      query.isAvailable = false;
    }

    const [donors, totalCount] = await Promise.all([
      User.find(query)
        .sort({ isAvailable: -1, lastDonationDate: 1, totalDonations: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render('pages/donors/index', {
      metaTitle: 'রক্তদাতা খুঁজুন - রক্তবার্তা',
      metaDescription: 'বাংলাদেশ ও কলকাতার বিভিন্ন জেলা ও উপজেলার স্বেচ্ছাসেবী রক্তদাতাদের সরাসরি খুঁজে পেতে অনুসন্ধান করুন।',
      donors,
      currentPage: page,
      totalPages,
      totalCount,
      filters: {
        group: group ? toEnGroup(group) : '',
        district: district || '',
        upazila: upazila || '',
        available: available || 'all',
        compatible: compatible === 'on' || compatible === 'true'
      }
    });
  } catch (error) {
    console.error('Get Donors Error:', error);
    req.flash('error', 'রক্তদাতাদের তালিকা লোড করতে সমস্যা হয়েছে।');
    return res.redirect('/');
  }
};
