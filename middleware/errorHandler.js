/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  res.status(404);

  // Respond with JSON if requested
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({
      success: false,
      message: 'অনুরোধকৃত পেজ বা তথ্যটি খুঁজে পাওয়া যায়নি।'
    });
  }

  // Render 404 EJS page
  res.render('errors/404', {
    metaTitle: 'পৃষ্ঠাটি পাওয়া যায়নি - রক্তবার্তা',
    layout: 'layouts/main'
  });
};

/**
 * Global Error Handler (500)
 */
const globalErrorHandler = (err, req, res, next) => {
  console.error('[Application Error]:', err);

  const status = err.status || 500;
  res.status(status);

  // CSRF token error
  if (err.code === 'EBADCSRFTOKEN') {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({
        success: false,
        message: 'ফর্মের নিরাপত্তা টোকেনটি মেয়াদোত্তীর্ণ বা অবৈধ। দয়া করে পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।'
      });
    }
    req.flash('error', 'নিরাপত্তা টোকেন মেয়াদোত্তীর্ণ হয়েছে। পুনরায় চেষ্টা করুন।');
    return res.redirect('back');
  }

  // JSON responses
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({
      success: false,
      message: err.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।'
    });
  }

  // Render 500 EJS page
  res.render('errors/500', {
    metaTitle: 'সার্ভার ত্রুটি - রক্তবার্তা',
    layout: 'layouts/main',
    error: process.env.NODE_ENV === 'development' ? err : null
  });
};

module.exports = { notFoundHandler, globalErrorHandler };
