const BloodRequest = require('../models/BloodRequest');
const Story = require('../models/Story');
const Post = require('../models/Post');

/**
 * Dynamic XML Sitemap
 * GET /sitemap.xml
 */
exports.getSitemap = async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://roktobarta.com';

    // Static URLs
    const staticUrls = [
      { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${siteUrl}/requests`, priority: '0.9', changefreq: 'hourly' },
      { loc: `${siteUrl}/donors`, priority: '0.9', changefreq: 'daily' },
      { loc: `${siteUrl}/stories`, priority: '0.8', changefreq: 'daily' },
      { loc: `${siteUrl}/blog`, priority: '0.8', changefreq: 'daily' },
      { loc: `${siteUrl}/about`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${siteUrl}/contact`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${siteUrl}/guide`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${siteUrl}/faq`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${siteUrl}/privacy-policy`, priority: '0.5', changefreq: 'yearly' },
      { loc: `${siteUrl}/terms`, priority: '0.5', changefreq: 'yearly' },
      { loc: `${siteUrl}/disclaimer`, priority: '0.5', changefreq: 'yearly' },
      { loc: `${siteUrl}/cookie-policy`, priority: '0.5', changefreq: 'yearly' }
    ];

    // Dynamic URLs from MongoDB
    const [openRequests, stories, posts] = await Promise.all([
      BloodRequest.find({ status: 'open' }).select('_id updatedAt').lean(),
      Story.find({ status: 'approved' }).select('slug updatedAt').lean(),
      Post.find({ status: 'published' }).select('slug updatedAt').lean()
    ]);

    const requestUrls = openRequests.map((r) => ({
      loc: `${siteUrl}/requests/${r._id}`,
      lastmod: (r.updatedAt || new Date()).toISOString().split('T')[0],
      priority: '0.8',
      changefreq: 'hourly'
    }));

    const storyUrls = stories.map((s) => ({
      loc: `${siteUrl}/stories/${s.slug}`,
      lastmod: (s.updatedAt || new Date()).toISOString().split('T')[0],
      priority: '0.7',
      changefreq: 'weekly'
    }));

    const postUrls = posts.map((p) => ({
      loc: `${siteUrl}/blog/${p.slug}`,
      lastmod: (p.updatedAt || new Date()).toISOString().split('T')[0],
      priority: '0.8',
      changefreq: 'weekly'
    }));

    const allUrls = [...staticUrls, ...postUrls, ...storyUrls, ...requestUrls];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    allUrls.forEach((u) => {
      xml += `  <url>\n`;
      xml += `    <loc>${u.loc}</loc>\n`;
      if (u.lastmod) xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
      if (u.changefreq) xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
      if (u.priority) xml += `    <priority>${u.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (error) {
    console.error('Sitemap Error:', error);
    res.status(500).end();
  }
};

/**
 * Robots.txt handler
 * GET /robots.txt
 */
exports.getRobots = (req, res) => {
  const siteUrl = process.env.SITE_URL || 'https://roktobarta.com';
  let txt = `User-agent: *\n`;
  txt += `Disallow: /admin/\n`;
  txt += `Disallow: /dashboard/\n`;
  txt += `Disallow: /api/\n`;
  txt += `Allow: /\n\n`;
  txt += `Sitemap: ${siteUrl}/sitemap.xml\n`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(txt);
};

/**
 * Ads.txt handler (Google AdSense)
 * GET /ads.txt
 */
exports.getAdsTxt = (req, res) => {
  const client = process.env.ADSENSE_CLIENT || '';
  // e.g. ca-pub-1234567890123456 -> pub-1234567890123456
  const pubId = client.replace('ca-', '');
  let txt = '';
  if (pubId) {
    txt = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
  } else {
    txt = `# Google AdSense ads.txt - Set ADSENSE_CLIENT in .env\n`;
  }

  res.setHeader('Content-Type', 'text/plain');
  res.send(txt);
};
