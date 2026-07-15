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
