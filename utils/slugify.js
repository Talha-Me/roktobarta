/**
 * Generate a URL-safe slug supporting Bangla & English text
 * @param {string} text 
 * @returns {string}
 */
const createSlug = (text) => {
  if (!text) return `post-${Date.now()}`;

  const clean = text
    .toString()
    .trim()
    .toLowerCase()
    // Replace spaces and special characters with hyphens, but keep Bengali unicode and alphanumeric
    .replace(/[^\u0980-\u09FFa-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const randomHash = Math.random().toString(36).substring(2, 7);
  return clean ? `${clean}-${randomHash}` : `item-${randomHash}`;
};

module.exports = { createSlug };
