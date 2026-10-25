const {
  searchDistricts,
  searchUpazilas,
  resolveDistrict
} = require('../utils/locationSearch');

/**
 * Autocomplete for districts (Bangla / English / Banglish input, Bangla output)
 * GET /api/locations/districts?query=d&division=ঢাকা
 */
exports.getDistricts = (req, res) => {
  const { query, division } = req.query;
  const data = searchDistricts(query, { division, limit: 70 });
  return res.json({ success: true, count: data.length, data });
};

/**
 * Autocomplete for upazilas, optionally limited to a district
 * (district may also be typed in English, e.g. ?district=dhaka&query=mir)
 * GET /api/locations/upazilas?district=ঢাকা&query=মির
 */
exports.getUpazilas = (req, res) => {
  const { district, query } = req.query;
  const typed = district ? district.trim() : '';
  const resolved = typed ? resolveDistrict(typed) : '';

  // A district was typed but is not a known one -> no upazila suggestions
  if (typed && !resolved) {
    return res.json({ success: true, district: typed, count: 0, data: [] });
  }

  const data = searchUpazilas(query, { district: resolved, limit: resolved ? 60 : 30 });
  return res.json({ success: true, district: resolved, count: data.length, data });
};
