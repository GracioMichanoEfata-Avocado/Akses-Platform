const SKIP_SELECTOR =
  'button, a, input, textarea, select, nav, aside, [aria-hidden="true"], [data-voice-ignore], .sr-only';

function walk(node: Node, out: string[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 /* TEXT_NODE */) {
      const t = (child.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
      const el = child as HTMLElement;
      if (el.matches(SKIP_SELECTOR)) continue;
      if (el.hasAttribute('hidden')) continue;
      walk(el, out);
    }
  }
}

export function extractMainContent(root: HTMLElement): string {
  const main = root.querySelector('main') || root;
  const out: string[] = [];
  walk(main, out);
  return out.join('. ').trim();
}
