/**
 * Authentication Middleware
 */

// Require logged-in user
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  // Store intended URL to redirect after successful login
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'এই পৃষ্ঠাটি দেখতে আপনাকে প্রথমে লগইন করতে হবে।');
  return res.redirect('/login');
};

// Require guest (not logged in)
const requireGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

const ensureAuth = requireAuth;

module.exports = { requireAuth, ensureAuth, requireGuest };
