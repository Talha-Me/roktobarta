const rateLimit = require('express-rate-limit');
const csrf = require('csurf');

// Auth rate limiter (login, register, forgot password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 25 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.flash('error', 'অতিরিক্ত অনুরোধের কারণে আপনার অ্যাক্সেস সাময়িকভাবে স্থগিত করা হয়েছে। দয়া করে ১৫ মিনিট পর চেষ্টা করুন।');
    return res.redirect('back');
  }
});

// Contact form limiter (prevent spam emails)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.flash('error', 'অতিরিক্ত বার্তার কারণে সাময়িকভাবে স্থগিত। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    return res.redirect('back');
  }
});

// Comment & story interaction limiter
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.flash('error', 'অতিরিক্ত মন্তব্যের কারণে সাময়িক বিরতি। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    return res.redirect('back');
  }
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'অতিরিক্ত এপিআই অনুরোধের কারণে অ্যাক্সেস সীমিত করা হয়েছে।'
  }
});

// CSRF Protection using session storage.
// After validation, expose a fresh token to every EJS view via res.locals.csrfToken
// (locals middleware runs before csurf, so it cannot know the token yet).
const csrfMiddleware = csrf();
const csrfProtection = (req, res, next) => {
  csrfMiddleware(req, res, (err) => {
    if (err) return next(err);
    res.locals.csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';
    next();
  });
};

module.exports = {
  authLimiter,
  contactLimiter,
  commentLimiter,
  apiLimiter,
  csrfProtection
};
