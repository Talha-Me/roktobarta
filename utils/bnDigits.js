/**
 * Convert English digits to Bangla digits
 * @param {number|string} n 
 * @returns {string}
 */
const toBn = (n) => {
  if (n === null || n === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(n).replace(/\d/g, (d) => bnDigits[Number(d)]);
};

/**
 * Convert Bangla digits to English digits
 * @param {string} str 
 * @returns {string}
 */
const toEn = (str) => {
  if (!str) return '';
  const bnMap = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return String(str).replace(/[০-৯]/g, (d) => bnMap[d]);
};

module.exports = { toBn, toEn };
