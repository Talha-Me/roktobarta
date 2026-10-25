const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const seoController = require('../controllers/seoController');
const { contactLimiter, csrfProtection } = require('../middleware/security');

// SEO Files
router.get('/sitemap.xml', seoController.getSitemap);
router.get('/robots.txt', seoController.getRobots);
router.get('/ads.txt', seoController.getAdsTxt);

// Home route
router.get('/', publicController.getHome);

// Static / Informational Pages
router.get('/about', publicController.getAbout);
router.get('/contact', publicController.getContact);
router.post('/contact', contactLimiter, csrfProtection, publicController.postContact);
router.get('/faq', publicController.getFaq);
router.get('/guide', publicController.getGuide);

// Legal Pages (AdSense Compliance)
router.get('/privacy-policy', publicController.getPrivacy);
router.get('/terms', publicController.getTerms);
router.get('/disclaimer', publicController.getDisclaimer);
router.get('/cookie-policy', publicController.getCookiePolicy);

module.exports = router;
