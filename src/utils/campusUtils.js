export function getCampusAcronym(collegeName) {
  if (!collegeName) return 'MNIT';
  
  const name = collegeName.trim().toUpperCase();
  
  // Handle some common known formats
  if (name.includes('MALAVIYA NATIONAL INSTITUTE OF TECHNOLOGY') || name === 'MNIT') return 'MNIT';
  if (name === 'COLLEGE_1') return 'C1';
  if (name === 'COLLEGE_2') return 'C2';
  
  const words = name.split(/[\s_]+/);
  const stopWords = ['OF', 'AND', 'FOR', 'IN', 'THE', 'AT'];
  
  let acronym = '';
  for (const word of words) {
    if (stopWords.includes(word)) continue;
    if (word.length > 0) {
      if (word === 'IIT' || word === 'NIT' || word === 'IIIT' || word === 'IIM') {
        acronym += word;
      } else {
        acronym += word[0];
      }
    }
  }
  
  return acronym || 'MNIT';
}

// ── MNIT Email Branch Code → Full Branch Name ──────────────────────────────
export const MNIT_BRANCH_MAP = {
  cp: 'Computer Science and Engineering',
  ec: 'Electronics and Communication Engineering',
  me: 'Mechanical Engineering',
  mt: 'Metallurgical and Materials Engineering',
  ce: 'Civil Engineering',
  ee: 'Electrical Engineering',
  ch: 'Chemical Engineering',
  ar: 'Architecture and Planning (B.Arch)',
}

/**
 * Parses an MNIT institutional email and extracts student info.
 * Regex: /^(\d{4})(u|p)([a-z]{2})(\d+)@mnit\.ac\.in$/i
 *
 * @param {string} email - e.g. "2025umt1790@mnit.ac.in"
 * @returns {{ admissionYear: number, level: string, branchCode: string, branch: string } | null}
 */
export function parseMnitEmail(email) {
  if (!email) return null
  const match = email.match(/^(\d{4})(u|p)([a-z]{2})(\d+)@mnit\.ac\.in$/i)
  if (!match) return null
  const [, admissionYear, level, branchCode] = match
  return {
    admissionYear: parseInt(admissionYear, 10),
    level: level.toLowerCase(), // 'u' = UG, 'p' = PG
    branchCode: branchCode.toLowerCase(),
    branch: MNIT_BRANCH_MAP[branchCode.toLowerCase()] || null,
  }
}

/**
 * Dynamically calculates the student's current academic year label.
 * Academic year advances after mid-May (month >= 6 i.e. June onwards).
 *
 * @param {number} admissionYear - e.g. 2025
 * @returns {string} - e.g. "1st Year", "2nd Year", "3rd Year", "4th Year"
 */
export function calcBtechYear(admissionYear) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // getMonth() is 0-indexed

  let year = currentYear - admissionYear
  if (currentMonth >= 6) year += 1 // Academic year advances after May

  year = Math.max(1, Math.min(year, 4)) // Clamp between 1 and 4

  const ordinals = ['', '1st Year', '2nd Year', '3rd Year', '4th Year']
  return ordinals[year] || '1st Year'
}
