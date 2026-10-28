export type CaseMode = 'upper' | 'lower' | 'mixed';

export function toDisplayCase(text: string, mode?: CaseMode): string {
  if (!text) return text;
  switch (mode) {
    case 'lower': return text.toLowerCase();
    case 'mixed': return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'upper':
    default: return text.toUpperCase();
  }
}