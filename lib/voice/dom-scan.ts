import type { MatchType } from './keyword-match';

export interface ScannedCommand {
  label: string;
  keywords: string[];
  matchType: MatchType;
  el: HTMLElement;
}

const SELECTOR =
  'button, a[href], [role="button"], [role="tab"], input[type="button"], input[type="submit"]';

// Rapikan teks: satukan whitespace, buang simbol/emoji di tepi, potong ~60 char.
function cleanName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const trimmed = collapsed
    .replace(new RegExp('^[^\\p{L}\\p{N}]+', 'u'), '')
    .replace(new RegExp('[^\\p{L}\\p{N}]+$', 'u'), '');
  return trimmed.slice(0, 60).trim();
}

function accessibleName(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return cleanName(aria);
  const text = el.textContent || '';
  const cleaned = cleanName(text);
  if (cleaned) return cleaned;
  const title = el.getAttribute('title');
  if (title && title.trim()) return cleanName(title);
  return '';
}

function isSkipped(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (el.hasAttribute('hidden')) return true;
  if (el.closest('[data-voice-ignore],[aria-hidden="true"],[hidden]')) return true;
  return false;
}

function buildKeywords(name: string): string[] {
  const lower = name.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  return [lower, ...words].filter((k, i, arr) => arr.indexOf(k) === i);
}

function pickMatchType(name: string): MatchType {
  const words = name.trim().split(/\s+/);
  if (words.length === 1 && words[0].length <= 3) return 'word';
  return 'includes';
}

export function scanClickables(root: HTMLElement): ScannedCommand[] {
  const els = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR));
  const out: ScannedCommand[] = [];
  const seen = new Set<string>();

  for (const el of els) {
    if (isSkipped(el)) continue;
    const label = accessibleName(el);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label,
      keywords: buildKeywords(label),
      matchType: pickMatchType(label),
      el,
    });
  }
  return out;
}
