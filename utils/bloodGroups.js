const EN_TO_BN = {
  'A+': 'এ+',
  'A-': 'এ-',
  'B+': 'বি+',
  'B-': 'বি-',
  'O+': 'ও+',
  'O-': 'ও-',
  'AB+': 'এবি+',
  'AB-': 'এবি-'
};

const BN_TO_EN = {
  'এ+': 'A+',
  'এ-': 'A-',
  'বি+': 'B+',
  'বি-': 'B-',
  'ও+': 'O+',
  'ও-': 'O-',
  'এবি+': 'AB+',
  'এবি-': 'AB-'
};

// Blood groups list in standard order
const BLOOD_GROUPS_EN = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const BLOOD_GROUPS_BN = ['এ+', 'এ-', 'বি+', 'বি-', 'ও+', 'ও-', 'এবি+', 'এবি-'];

// Who can donate to whom (internal EN keys)
const CAN_DONATE_TO = {
  'A+': ['A+', 'AB+'],
  'A-': ['A+', 'A-', 'AB+', 'AB-'],
  'B+': ['B+', 'AB+'],
  'B-': ['B+', 'B-', 'AB+', 'AB-'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'O-': ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], // Universal Donor
  'AB+': ['AB+'],
  'AB-': ['AB+', 'AB-']
};

// Who can receive from whom (internal EN keys)
const CAN_RECEIVE_FROM = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], // Universal Recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-']
};

/**
 * Convert any blood group (EN or BN) to Bangla
 */
const toBnGroup = (grp) => {
  if (!grp) return '';
  const trimmed = grp.trim();
  return EN_TO_BN[trimmed] || trimmed;
};

/**
 * Convert any blood group (EN or BN) to standard English
 */
const toEnGroup = (grp) => {
  if (!grp) return '';
  let raw = String(grp).trim();
  // When + is passed in URL query string, Express/URL decoders convert + into space (e.g. "A " or "A ")
  if (raw.endsWith(' ') || raw.includes(' ')) {
    raw = raw.replace(/\s+/g, '+');
  } else if (/^[ABOabo]{1,2}$/.test(raw) && !raw.includes('+') && !raw.includes('-')) {
    // If a single letter like A, B, O, AB came from a query where trailing + was stripped
    // check if it was originally positive
    raw = raw.toUpperCase() + '+';
  }
  raw = raw.toUpperCase();
  return BN_TO_EN[raw] || raw;
};

/**
 * Get list of compatible donor groups for a given recipient group
 * e.g. for 'A+', returns ['A+', 'A-', 'O+', 'O-']
 */
const getCompatibleDonors = (recipientGroup) => {
  const en = toEnGroup(recipientGroup);
  return CAN_RECEIVE_FROM[en] || [en];
};

/**
 * Get list of compatible recipient groups for a given donor group
 */
const getCompatibleRecipients = (donorGroup) => {
  const en = toEnGroup(donorGroup);
  return CAN_DONATE_TO[en] || [en];
};

/**
 * Group guide data for UI rendering
 */
const GROUP_GUIDE = [
  { group: 'এ+', donate: 'দিতে পারে: এ+, এবি+', receive: 'নিতে পারে: এ+, এ-, ও+, ও-' },
  { group: 'এ-', donate: 'দিতে পারে: এ+, এ-, এবি+, এবি-', receive: 'নিতে পারে: এ-, ও-' },
  { group: 'বি+', donate: 'দিতে পারে: বি+, এবি+', receive: 'নিতে পারে: বি+, বি-, ও+, ও-' },
  { group: 'বি-', donate: 'দিতে পারে: বি+, বি-, এবি+, এবি-', receive: 'নিতে পারে: বি-, ও-' },
  { group: 'ও+', donate: 'দিতে পারে: ও+, এ+, বি+, এবি+', receive: 'নিতে পারে: ও+, ও-' },
  { group: 'ও-', donate: 'সবাইকে দিতে পারে (সার্বজনীন দাতা)', receive: 'নিতে পারে: শুধু ও-' },
  { group: 'এবি+', donate: 'দিতে পারে: শুধু এবি+', receive: 'সবার রক্ত নিতে পারে (সার্বজনীন গ্রহীতা)' },
  { group: 'এবি-', donate: 'দিতে পারে: এবি+, এবি-', receive: 'নিতে পারে: সব নেগেটিভ গ্রুপ' }
];

module.exports = {
  EN_TO_BN,
  BN_TO_EN,
  BLOOD_GROUPS_EN,
  BLOOD_GROUPS_BN,
  CAN_DONATE_TO,
  CAN_RECEIVE_FROM,
  toBnGroup,
  toEnGroup,
  getCompatibleDonors,
  getCompatibleRecipients,
  GROUP_GUIDE
};
