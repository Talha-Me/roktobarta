/**
 * Smart location search for Bangladesh & Kolkata (districts + upazilas).
 *
 * Users may type in Bangla ("ঢাকা"), English ("Dhaka") or Banglish ("Dhaka", "Dinajpur", "Ctg", "Mirpur").
 * The result is always the canonical Bangla name.
 *
 * How it works:
 *  1. Every Bangla name is transliterated automatically to Roman letters (so ALL ~580 upazilas are searchable).
 *  2. Hand-written aliases (utils/banglishMap.js) are added on top for common spellings (Chittagong, Comilla ...).
 *  3. Queries are matched with a forgiving "phonetic skeleton" (vowels / silent h removed, similar letters merged),
 *     so "dhaka", "dhaaka", "dacca" and "Daka" all find ঢাকা, and "d" suggests ঢাকা, দিনাজপুর ...
 */
const fs = require('fs');
const path = require('path');
const { districtAliases, upazilaAliases } = require('./banglishMap');

const districtsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/districts.json'), 'utf8'));
const upazilasData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/upazilas.json'), 'utf8'));

/* ------------------------------------------------------------------ */
/* Bangla -> Roman transliteration                                      */
/* ------------------------------------------------------------------ */
const INDEPENDENT_VOWELS = {
  '\u0985': 'o', '\u0986': 'a', '\u0987': 'i', '\u0988': 'i', '\u0989': 'u', '\u098A': 'u',
  '\u098B': 'ri', '\u098F': 'e', '\u0990': 'oi', '\u0993': 'o', '\u0994': 'ou'
};
const VOWEL_SIGNS = {
  '\u09BE': 'a', '\u09BF': 'i', '\u09C0': 'i', '\u09C1': 'u', '\u09C2': 'u', '\u09C3': 'ri',
  '\u09C7': 'e', '\u09C8': 'oi', '\u09CB': 'o', '\u09CC': 'ou'
};
const CONSONANTS = {
  '\u0995': 'k', '\u0996': 'kh', '\u0997': 'g', '\u0998': 'gh', '\u0999': 'ng',
  '\u099A': 'ch', '\u099B': 'chh', '\u099C': 'j', '\u099D': 'jh', '\u099E': 'n',
  '\u099F': 't', '\u09A0': 'th', '\u09A1': 'd', '\u09A2': 'dh', '\u09A3': 'n',
  '\u09A4': 't', '\u09A5': 'th', '\u09A6': 'd', '\u09A7': 'dh', '\u09A8': 'n',
  '\u09AA': 'p', '\u09AB': 'f', '\u09AC': 'b', '\u09AD': 'bh', '\u09AE': 'm',
  '\u09AF': 'j', '\u09B0': 'r', '\u09B2': 'l', '\u09B6': 'sh', '\u09B7': 'sh',
  '\u09B8': 's', '\u09B9': 'h', '\u09CE': 't'
};
const NUKTA_CONSONANTS = { '\u09A1': 'r', '\u09A2': 'rh', '\u09AF': 'y' }; // ড় ঢ় য়
const HALANT = '\u09CD';
const NUKTA = '\u09BC';

const hasBangla = (s) => /[\u0980-\u09FF]/.test(s);

function normalizeBanglaText(text) {
  return String(text)
    .replace(/\u09DC/g, '\u09A1\u09BC')
    .replace(/\u09DD/g, '\u09A2\u09BC')
    .replace(/\u09DF/g, '\u09AF\u09BC')
    .replace(/\u09C7\u09BE/g, '\u09CB')
    .replace(/\u09C7\u09D7/g, '\u09CC');
}

function transliterateWord(word) {
  const chars = [...normalizeBanglaText(word)];
  const units = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    if (CONSONANTS[ch]) {
      let rom = '';
      // consonant (+nukta) ( halant consonant (+nukta) )*
      for (;;) {
        const c = chars[i];
        if (chars[i + 1] === NUKTA && NUKTA_CONSONANTS[c]) {
          rom += NUKTA_CONSONANTS[c];
          i += 2;
        } else {
          rom += CONSONANTS[c];
          i += 1;
        }
        if (chars[i] === HALANT && CONSONANTS[chars[i + 1]]) {
          i += 1; // conjunct, continue
          continue;
        }
        break;
      }
      let vowel = null;
      if (chars[i] === HALANT) {
        vowel = ''; // explicit vowel killer at end
        i += 1;
      } else if (VOWEL_SIGNS[chars[i]]) {
        vowel = VOWEL_SIGNS[chars[i]];
        i += 1;
      }
      units.push({ type: 'C', rom, vowel });
    } else if (INDEPENDENT_VOWELS[ch]) {
      units.push({ type: 'V', rom: INDEPENDENT_VOWELS[ch] });
      i += 1;
    } else if (ch === '\u0982') {
      units.push({ type: 'M', rom: 'ng' });
      i += 1;
    } else if (ch === '\u0983') {
      units.push({ type: 'M', rom: 'h' });
      i += 1;
    } else {
      i += 1; // chandrabindu, nukta leftovers, unknown marks
    }
  }

  let out = '';
  units.forEach((u, idx) => {
    if (u.type !== 'C') {
      out += u.rom;
      return;
    }
    if (u.vowel !== null) {
      out += u.rom + u.vowel;
      return;
    }
    // Inherent vowel handling (simple schwa deletion)
    const prev = units[idx - 1];
    const next = units[idx + 1];
    const isLast = idx === units.length - 1;
    const prevHasVowel = prev && (prev.type === 'V' || (prev.type === 'C' && prev.vowel));
    const deleteIt = isLast || (idx > 0 && prevHasVowel && next && next.type === 'C');
    out += u.rom + (deleteIt ? '' : 'a');
  });
  return out;
}

function transliterate(text) {
  return String(text)
    .split(/(\s+|[()\-,/])/)
    .map((part) => (hasBangla(part) ? transliterateWord(part) : part))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Phonetic skeleton for forgiving English matching                     */
/* ------------------------------------------------------------------ */
function skeleton(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/chh|ch/g, 'k')
    .replace(/sh/g, 's')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/jh/g, 'j')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/ph/g, 'p')
    .replace(/[cq]/g, 'k')
    .replace(/f/g, 'p')
    .replace(/z/g, 'j')
    .replace(/v/g, 'b')
    .replace(/x/g, 'ks')
    .replace(/[aeiouyhw]/g, '')
    .replace(/(.)\1+/g, '$1');
}

const normalizeRoman = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ */
/* Build the search index                                               */
/* ------------------------------------------------------------------ */
function buildEntry(base, manualAliases) {
  const romans = new Set();
  const auto = normalizeRoman(transliterate(base.n));
  if (auto) romans.add(auto);
  (manualAliases || []).forEach((a) => {
    const r = normalizeRoman(a);
    if (r) romans.add(r);
  });
  const romanList = [...romans];
  const words = new Set();
  romanList.forEach((r) => r.split(' ').forEach((w) => w && words.add(w)));
  return {
    ...base,
    romans: romanList,
    skels: romanList.map(skeleton),
    wordRomans: [...words],
    wordSkels: [...words].map(skeleton),
    bnWords: base.n.split(/\s+/)
  };
}

const districtIndex = [];
districtsData.forEach((div) => {
  div.districts.forEach((dist) => {
    districtIndex.push(
      buildEntry({ n: dist, s: `${div.division} (${div.country})`, division: div.division, country: div.country }, districtAliases[dist])
    );
  });
});

const upazilaIndex = [];
Object.entries(upazilasData).forEach(([district, list]) => {
  list.forEach((name) => {
    upazilaIndex.push(buildEntry({ n: name, s: district, district }, upazilaAliases[name]));
  });
});

/* ------------------------------------------------------------------ */
/* Scoring                                                              */
/* ------------------------------------------------------------------ */
// lower score = better. Infinity = no match.
function scoreEntry(entry, rawQuery) {
  const q = rawQuery.trim();
  if (!q) return 5;

  if (hasBangla(q)) {
    if (entry.n === q) return 0;
    if (entry.n.startsWith(q)) return 1;
    if (entry.bnWords.some((w) => w.startsWith(q))) return 2;
    if (entry.n.includes(q)) return 3;
    return Infinity;
  }

  const rq = normalizeRoman(q);
  const sq = skeleton(q);
  if (!rq) return Infinity;

  if (entry.romans.some((r) => r === rq)) return 0;
  if (entry.romans.some((r) => r.startsWith(rq))) return 1;
  if (sq && entry.skels.some((s) => s === sq)) return 1;
  if (sq && entry.skels.some((s) => s.startsWith(sq))) return 2;
  if (entry.wordRomans.some((w) => w.startsWith(rq))) return 3;
  if (sq && entry.wordSkels.some((w) => w.startsWith(sq))) return 3;
  if (rq.length >= 2 && entry.romans.some((r) => r.includes(rq))) return 4;
  if (sq.length >= 2 && entry.skels.some((s) => s.includes(sq))) return 4;
  return Infinity;
}

function rank(list, query, limit) {
  const scored = [];
  list.forEach((entry) => {
    const sc = scoreEntry(entry, query);
    if (sc !== Infinity) scored.push({ entry, sc });
  });
  scored.sort((a, b) => a.sc - b.sc || a.entry.n.length - b.entry.n.length || a.entry.n.localeCompare(b.entry.n, 'bn'));
  // Keep results focused: loose matches are shown only when there is nothing better.
  let result = scored;
  if (query.trim() && scored.length) {
    const best = scored[0].sc;
    const cutoff = best <= 1 ? 1 : best + 1;
    result = scored.filter((x) => x.sc <= cutoff || (best <= 1 && x.sc === 3));
  }
  const sliced = limit ? result.slice(0, limit) : result;
  return sliced.map((x) => x.entry);
}

const publicShape = (e) => ({ n: e.n, s: e.s, division: e.division, country: e.country, district: e.district });

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */
function searchDistricts(query, { division, limit = 30 } = {}) {
  let list = districtIndex;
  if (division) list = list.filter((d) => d.division === division);
  return rank(list, query || '', limit).map(publicShape);
}

function searchUpazilas(query, { district, limit = 40 } = {}) {
  let list = upazilaIndex;
  if (district) {
    const resolved = resolveDistrict(district) || district;
    list = list.filter((u) => u.district === resolved || u.district === district);
  }
  return rank(list, query || '', limit).map(publicShape);
}

/** Returns a name only when the text clearly identifies ONE entry (exact, or a unique prefix/phonetic match). */
function pickConfident(list, text) {
  const matches = rank(list, text).filter((e) => scoreEntry(e, text) <= 1);
  if (!matches.length) return '';
  if (scoreEntry(matches[0], text) === 0) return matches[0].n;
  return matches.length === 1 ? matches[0].n : '';
}

/** Exact-ish resolution of free text to a canonical district name (returns '' if unknown). */
function resolveDistrict(input) {
  if (!input || typeof input !== 'string') return '';
  const text = input.trim();
  if (!text) return '';
  const exact = districtIndex.find((d) => d.n === text);
  if (exact) return exact.n;
  return pickConfident(districtIndex, text) || '';
}

/** Resolve a district keeping the user's text if it is unknown (used for filters). */
function normalizeDistrict(input) {
  if (!input || typeof input !== 'string') return '';
  return resolveDistrict(input) || input.trim();
}

/** Resolve an upazila (optionally inside a district) to its Bangla name, else keep the text. */
function normalizeUpazila(input, district) {
  if (!input || typeof input !== 'string') return '';
  const text = input.trim();
  if (!text) return '';
  let list = upazilaIndex;
  const dist = district ? resolveDistrict(district) : '';
  if (dist) list = list.filter((u) => u.district === dist);
  const exact = list.find((u) => u.n === text);
  if (exact) return exact.n;
  return pickConfident(list, text) || text;
}

const isKnownDistrict = (name) => districtIndex.some((d) => d.n === name);

module.exports = {
  transliterate,
  skeleton,
  searchDistricts,
  searchUpazilas,
  resolveDistrict,
  normalizeDistrict,
  normalizeUpazila,
  isKnownDistrict
};
