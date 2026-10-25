const { toBn } = require('../utils/bnDigits');
const { formatBnDate, timeAgoBn, formatLastDonationBn, isDonationEligible } = require('../utils/dates');
const { toBnGroup } = require('../utils/bloodGroups');

/**
 * Generates an array of page numbers with ellipsis ('...')
 * e.g. [1, 2, 3, '...', 348] or [1, '...', 8, 9, 10, 11, 12, '...', 348]
 */
const getPagination = (currentPage, totalPages, delta = 2) => {
  const total = parseInt(totalPages, 10) || 1;
  const current = Math.max(1, Math.min(parseInt(currentPage, 10) || 1, total));
  if (total <= 1) return [1];

  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
};

const setLocals = (req, res, next) => {
  // Helpers available to all EJS templates
  res.locals.toBn = toBn;
  res.locals.formatBnDate = formatBnDate;
  res.locals.timeAgoBn = timeAgoBn;
  res.locals.formatLastDonationBn = formatLastDonationBn;
  res.locals.isDonationEligible = isDonationEligible;
  res.locals.toBnGroup = toBnGroup;
  res.locals.getPagination = getPagination;

  // App & Environment config
  res.locals.siteName = process.env.SITE_NAME || 'রক্তবার্তা';
  res.locals.siteUrl = process.env.SITE_URL || 'http://localhost:5000';
  res.locals.adsenseClient = process.env.ADSENSE_CLIENT || '';
  res.locals.gaId = process.env.GA_ID || '';

  // Auth & Session
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.isAdmin = req.session && req.session.user && req.session.user.role === 'admin';

  // Current route
  res.locals.currentPath = req.path;

  // Flash messages
  res.locals.flashSuccess = req.flash ? req.flash('success') : [];
  res.locals.flashError = req.flash ? req.flash('error') : [];
  res.locals.flashInfo = req.flash ? req.flash('info') : [];

  // CSRF token if available
  res.locals.csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';

  // Current year in Bangla
  res.locals.currentYearBn = toBn(new Date().getFullYear());

  // Default SEO meta tags
  res.locals.metaTitle = 'রক্তবার্তা – বাংলাদেশ ও কলকাতার রক্তদাতা ও গ্রহীতার সংযোগ';
  res.locals.metaDescription = 'রক্তবার্তা: বাংলাদেশ ও কলকাতায় জরুরি রক্তের অনুরোধ করুন, জেলা ও উপজেলা ভিত্তিক রক্তদাতা খুঁজুন এবং আপনার রক্তদানের গল্প শেয়ার করুন।';
  res.locals.metaImage = `${res.locals.siteUrl}/images/logo.png`;

  next();
};

module.exports = setLocals;
