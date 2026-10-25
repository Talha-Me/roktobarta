/**
 * Banglish / English transliteration mapping for Bangladesh and West Bengal Districts & Popular Areas
 * Allows users to search in Bangla (ঢাকা), English (Dhaka), or Banglish (Dacca/Ctg/Bogra)
 */

const districtAliases = {
  // ঢাকা বিভাগ
  'ঢাকা': ['dhaka', 'dacca', 'dhka'],
  'গাজীপুর': ['gazipur', 'gazipor', 'gazipur sadar'],
  'নারায়ণগঞ্জ': ['narayanganj', 'narayongonj', 'narayangonj'],
  'মানিকগঞ্জ': ['manikganj', 'manikgonj'],
  'মুন্সীগঞ্জ': ['munshiganj', 'munshigonj', 'munshigang'],
  'নরসিংদী': ['narsingdi', 'norsingdi'],
  'কিশোরগঞ্জ': ['kishoreganj', 'kishorgonj'],
  'টাঙ্গাইল': ['tangail', 'tangayel'],
  'ফরিদপুর': ['faridpur', 'foridpur'],
  'গোপালগঞ্জ': ['gopalganj', 'gopalgonj'],
  'মাদারীপুর': ['madaripur'],
  'রাজবাড়ী': ['rajbari', 'rajbari sadar'],
  'শরীয়তপুর': ['shariatpur', 'soriyotpur'],

  // চট্টগ্রাম বিভাগ
  'চট্টগ্রাম': ['chittagong', 'chattogram', 'ctg', 'chittagong sadar'],
  'কক্সবাজার': ['coxsbazar', "cox's bazar", 'coxs bazar', 'coxbazar'],
  'কুমিল্লা': ['comilla', 'cumilla'],
  'ফেনী': ['feni', 'pheni'],
  'নোয়াখালী': ['noakhali', 'noyakhali'],
  'লক্ষ্মীপুর': ['lakshmipur', 'laxmipur', 'lokkhipur'],
  'চাঁদপুর': ['chandpur', 'cadpur'],
  'ব্রাহ্মণবাড়িয়া': ['brahmanbaria', 'bbaria', 'b.baria', 'b-baria'],
  'রাঙ্গামাটি': ['rangamati'],
  'বান্দরবান': ['bandarban', 'bandarbon'],
  'খাগড়াছড়ি': ['khagrachhari', 'khagrachari'],

  // রাজশাহী বিভাগ
  'রাজশাহী': ['rajshahi', 'raj'],
  'বগুড়া': ['bogra', 'bogura', 'bagura'],
  'পাবনা': ['pabna'],
  'সিরাজগঞ্জ': ['sirajganj', 'sirajgonj'],
  'নাটোর': ['natore', 'nator'],
  'নওগাঁ': ['naogaon', 'nawgaon'],
  'জয়পুরহাট': ['joypurhat', 'jaipurhat'],
  'চাঁপাইনবাবগঞ্জ': ['chapainawabganj', 'nawabganj', 'chapainawabgonj', 'chapayee'],

  // খুলনা বিভাগ
  'খুলনা': ['khulna'],
  'যশোর': ['jashore', 'jessore', 'joshor'],
  'সাতক্ষীরা': ['satkhira'],
  'বাগেরহাট': ['bagerhat'],
  'কুষ্টিয়া': ['kushtia', 'kustia'],
  'ঝিনাইদহ': ['jhenaidah', 'jhenaidaha', 'jhenaidha'],
  'মাগুরা': ['magura'],
  'নড়াইল': ['narail'],
  'চুয়াডাঙ্গা': ['chuadanga'],
  'মেহেরপুর': ['meherpur'],

  // বরিশাল বিভাগ
  'বরিশাল': ['barishal', 'barisal'],
  'ভোলা': ['bhola'],
  'পটুয়াখালী': ['patuakhali'],
  'পিরোজপুর': ['pirojpur', 'pirojpor'],
  'বরগুনা': ['barguna'],
  'ঝালকাঠি': ['jhalokati', 'jhalakathi'],

  // সিলেট বিভাগ
  'সিলেট': ['sylhet', 'silhet'],
  'মৌলভীবাজার': ['moulvibazar', 'moulovibazar', 'maulvibazar'],
  'হবিগঞ্জ': ['habiganj', 'hobigonj'],
  'সুনামগঞ্জ': ['sunamganj', 'sunamgonj'],

  // রংপুর বিভাগ
  'রংপুর': ['rangpur'],
  'দিনাজপুর': ['dinajpur'],
  'গাইবান্ধা': ['gaibandha', 'gaybandha'],
  'কুড়িগ্রাম': ['kurigram'],
  'লালমনিরহাট': ['lalmonirhat'],
  'নীলফামারী': ['nilphamari'],
  'পঞ্চগড়': ['panchagarh', 'panchagar'],
  'ঠাকুরগাঁও': ['thakurgaon', 'thakurgon'],

  // ময়মনসিংহ বিভাগ
  'ময়মনসিংহ': ['mymensingh', 'momenshahi'],
  'জামালপুর': ['jamalpur'],
  'নেত্রকোণা': ['netrokona', 'netrakona'],
  'শেরপুর': ['sherpur'],

  // পশ্চিমবঙ্গ (ভারত)
  'কলকাতা': ['kolkata', 'calcutta'],
  'হাওড়া': ['howrah', 'haora'],
  'উত্তর ২৪ পরগনা': ['north 24 parganas', 'uttar 24 pargana', 'north 24', 'barasat'],
  'দক্ষিণ ২৪ পরগনা': ['south 24 parganas', 'dakshin 24 pargana', 'south 24', 'baruipur'],
  'হুগলি': ['hooghly', 'hugli', 'chinsurah']
};

/**
 * Common Upazila/Area Banglish transliterations (especially Dhaka & major metropolitan hubs)
 */
const upazilaAliases = {
  'ধানমন্ডি': ['dhanmondi', 'danmondi'],
  'মিরপুর': ['mirpur', 'meerpur'],
  'উত্তরা': ['uttara', 'uttora'],
  'গুলশান': ['gulshan'],
  'বনানী': ['banani'],
  'মতিঝিল': ['motijheel', 'motijhil'],
  'মোহাম্মদপুর': ['mohammadpur', 'mohammedpur'],
  'খিলগাঁও': ['khilgaon'],
  'বাড্ডা': ['badda'],
  'সাভার': ['savar'],
  'কেরানীগঞ্জ': ['keraniganj', 'keranigonj'],
  'তেজগাঁও': ['tejgaon'],
  'শাহবাগ': ['shahbag', 'shahbagh'],
  'যাত্রাবাড়ী': ['jatrabari'],
  'পল্টন': ['paltan'],
  'রমনা': ['ramna'],
  'লালবাগ': ['lalbagh', 'lalbag'],
  'চকবাজার': ['chawkbazar', 'chawk bazar'],
  'কোতোয়ালী': ['kotwali'],
  'পাঁচলাইশ': ['panchlaish'],
  'হালিশহর': ['halishahar'],
  'আগ্রাবাদ': ['agrabad'],
  'পাহাড়তলী': ['pahartali'],
  'খুলশী': ['khulshi'],
  'বোয়ালিয়া': ['boalia'],
  'মতিহার': ['motihar'],
  'রাজপাড়া': ['rajpara'],
  'খালিশপুর': ['khalishpur'],
  'দৌলতপুর': ['daulatpur'],
  'সোনাডাঙ্গা': ['sonadanga'],
  'কতোয়ালী': ['kotwali'],
  'বিমানবন্দর': ['airport', 'bimandar'],
  'জালালাবাদ': ['jalalabad'],
  'দক্ষিণ সুরমা': ['south surma', 'dakshin surma']
};


// Normalizers live in locationSearch.js (lazy-required to avoid a circular dependency).
const normalizeDistrict = (input) => require('./locationSearch').normalizeDistrict(input);
const normalizeUpazila = (input, district) => require('./locationSearch').normalizeUpazila(input, district);

module.exports = {
  districtAliases,
  upazilaAliases,
  normalizeDistrict,
  normalizeUpazila
};
