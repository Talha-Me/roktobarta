const { toBn } = require('./bnDigits');

const bnMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

/**
 * Format date to Bangla string, e.g. "২৩ অক্টোবর ২০২৬"
 * @param {Date|string|number} dateInput 
 * @param {boolean} [includeTime=false]
 * @returns {string}
 */
const formatBnDate = (dateInput, includeTime = false) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const day = toBn(d.getDate());
  const month = bnMonths[d.getMonth()];
  const year = toBn(d.getFullYear());

  let result = `${day} ${month} ${year}`;

  if (includeTime) {
    let hours = d.getHours();
    const minutes = toBn(String(d.getMinutes()).padStart(2, '0'));
    const ampm = hours >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
    hours = hours % 12 || 12;
    result += `, ${ampm} ${toBn(hours)}:${minutes}`;
  }

  return result;
};

/**
 * Natural Bangla relative time: "এইমাত্র", "৫ মিনিট আগে", "২ ঘণ্টা আগে", "৩ দিন আগে", etc.
 * @param {Date|string|number} dateInput 
 * @returns {string}
 */
const timeAgoBn = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSec < 45) {
    return 'এইমাত্র';
  }
  if (diffInSec < 3600) {
    const mins = Math.floor(diffInSec / 60);
    return `${toBn(mins)} মিনিট আগে`;
  }
  if (diffInSec < 86400) {
    const hours = Math.floor(diffInSec / 3600);
    return `${toBn(hours)} ঘণ্টা আগে`;
  }
  if (diffInSec < 2592000) {
    const days = Math.floor(diffInSec / 86400);
    return `${toBn(days)} দিন আগে`;
  }
  if (diffInSec < 31536000) {
    const months = Math.floor(diffInSec / 2592000);
    return `${toBn(months)} মাস আগে`;
  }
  const years = Math.floor(diffInSec / 31536000);
  return `${toBn(years)} বছর আগে`;
};

/**
 * Format relative elapsed time since last donation in months
 * e.g., "১ মাস আগে", "২ মাস আগে", "৩ মাস আগে", "৩+ মাস আগে", "কখনো দেননি"
 */
const formatLastDonationBn = (dateInput) => {
  if (!dateInput) return 'কখনো দেননি';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'তথ্য নেই';

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'তথ্য নেই';
  if (diffDays < 45) return '১ মাস আগে';
  if (diffDays < 75) return '২ মাস আগে';
  if (diffDays < 105) return '৩ মাস আগে';
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${toBn(months)} মাস আগে`;
  }
  const years = Math.floor(diffDays / 365);
  return `${toBn(years)} বছর আগে`;
};

/**
 * Check if 90 days (3 months) have passed since last donation
 */
const isDonationEligible = (dateInput) => {
  if (!dateInput) return true; // never donated is eligible
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return true;
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 90;
};

module.exports = {
  formatBnDate,
  timeAgoBn,
  formatLastDonationBn,
  isDonationEligible,
  bnMonths
};
