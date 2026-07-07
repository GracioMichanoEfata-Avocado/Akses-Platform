// Pencocokan keyword transkrip suara.
// 'includes' = substring (perilaku lama); 'word' = kata/frasa utuh berbatas non-huruf,
// supaya keyword pendek seperti "a" tidak cocok dengan sembarang kata.

export type MatchType = 'includes' | 'word';

export function matchesKeyword(
  transcript: string,
  keyword: string,
  matchType: MatchType = 'includes'
): boolean {
  const lower = transcript.toLowerCase();
  const kw = keyword.toLowerCase().trim();
  if (!kw) return false;
  if (matchType === 'includes') return lower.includes(kw);
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(lower);
}
