/**
 * Admin Role Middleware
 */
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }

  if (!req.session || !req.session.user) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'অ্যাডমিন প্যানেলে প্রবেশ করতে প্রথমে অ্যাডমিন অ্যাকাউন্টে লগইন করুন।');
    return res.redirect('/login');
  }

  req.flash('error', 'আপনার অ্যাডমিন প্যানেলে প্রবেশ করার অনুমতি নেই।');
  return res.redirect('/');
};

module.exports = { requireAdmin };
