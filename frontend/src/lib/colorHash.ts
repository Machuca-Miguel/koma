/**
 * Deterministic title → HEX color using djb2 hash.
 * Output is always in a visually pleasant range:
 *   Saturation 55–74 %, Lightness 45–58 %
 * so the color is never washed-out or too dark in either theme.
 */

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = ln - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function titleToColor(title: string): string {
  // djb2 hash — fast, good distribution, pure unsigned 32-bit arithmetic
  let hash = 5381
  for (let i = 0; i < title.length; i++) {
    hash = Math.imul(hash, 33) ^ title.charCodeAt(i)
    hash = hash >>> 0 // keep as uint32
  }

  const h = hash % 360                          // hue  0–359
  const s = 55 + ((hash >>> 8) & 0xff) % 20    // sat  55–74 %
  const l = 45 + ((hash >>> 16) & 0xff) % 14   // lgt  45–58 %

  return hslToHex(h, s, l)
}

/** Same color at reduced opacity — useful for backgrounds */
export function titleToColorAlpha(title: string, alpha: number): string {
  const hex = titleToColor(title)
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return `${hex}${a}`
}
