/**
 * Wraps each word of an element's text in a masked span so GSAP can raise
 * words out of their own overflow box. Idempotent, and keeps the original
 * sentence available to assistive technology via `aria-label`.
 */
export function splitWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === 'words') {
    return Array.from(el.querySelectorAll<HTMLElement>('[data-word]'))
  }

  const text = el.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  if (!text) return []

  el.setAttribute('aria-label', text)
  el.dataset.split = 'words'

  // `pb-1 -mb-1` keeps descenders from being clipped by the mask.
  el.innerHTML = text
    .split(' ')
    .map(
      (word) =>
        `<span aria-hidden="true" class="inline-block overflow-hidden pb-1 -mb-1 align-bottom"><span data-word class="inline-block will-change-transform">${escapeHtml(word)}</span></span>`,
    )
    .join(' ')

  return Array.from(el.querySelectorAll<HTMLElement>('[data-word]'))
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
