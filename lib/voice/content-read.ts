const SKIP_SELECTOR =
  'button, a, input, textarea, select, nav, aside, [aria-hidden="true"], [data-voice-ignore], .sr-only';

// Tag block-level: teks di dalamnya jadi satu blok; antar-blok dipisah '. '.
const BLOCK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DETAILS', 'DIV', 'DL', 'DD', 'DT',
  'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5',
  'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE',
  'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'UL',
]);

function isBlock(el: HTMLElement): boolean {
  return BLOCK_TAGS.has(el.tagName);
}

// Kumpulkan teks per blok. Teks inline dalam satu blok digabung (tanpa titik);
// batas blok memicu flush sehingga saat join antar-blok dipisah '. '.
function collectBlocks(node: Node, blocks: string[], buffer: { text: string }): void {
  const flush = () => {
    const t = buffer.text.replace(/\s+/g, ' ').trim();
    if (t) blocks.push(t);
    buffer.text = '';
  };
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 /* TEXT_NODE */) {
      buffer.text += ' ' + (child.textContent || '');
    } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
      const el = child as HTMLElement;
      if (el.matches(SKIP_SELECTOR)) continue;
      if (el.hasAttribute('hidden')) continue;
      if (isBlock(el)) {
        flush();
        collectBlocks(el, blocks, buffer);
        flush();
      } else {
        collectBlocks(el, blocks, buffer);
      }
    }
  }
}

export function extractMainContent(root: HTMLElement): string {
  const main = root.querySelector('main') || root;
  const blocks: string[] = [];
  const buffer = { text: '' };
  collectBlocks(main, blocks, buffer);
  const t = buffer.text.replace(/\s+/g, ' ').trim();
  if (t) blocks.push(t);
  return blocks.join('. ').trim();
}
