import { BindingFormat } from '@prisma/client';

// Order matters: more specific patterns first (BOLSILLO before TAPA_BLANDA)
const BINDING_MAP: [RegExp, BindingFormat][] = [
  [/cart[oó]n[eé]?|cartoné|tapa\s*dura|hard\s*cover|hardcover|casebound/i, BindingFormat.CARTONE],
  [/mass\s*market|pocket|bolsillo|digest/i, BindingFormat.BOLSILLO],
  [/soft\s*cover|softcover/i, BindingFormat.SOFTCOVER],
  [/paperback|trade\s*paper|tapa\s*blanda|perfect\s*bound/i, BindingFormat.TAPA_BLANDA],
  [/omnibus/i, BindingFormat.OMNIBUS],
  [/digital|e[-\s]?book|kindle|epub/i, BindingFormat.DIGITAL],
];

export function normalizeBinding(
  raw: string | undefined | null,
): BindingFormat | undefined {
  if (!raw?.trim()) return undefined;
  for (const [pattern, format] of BINDING_MAP) {
    if (pattern.test(raw)) return format;
  }
  return BindingFormat.OTHER;
}
