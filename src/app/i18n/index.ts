import { nb } from './nb';
import { en } from './en';

export type Locale = 'nb' | 'en';
export const DEFAULT_LOCALE: Locale = 'nb';

const DICTS = {
  nb,
  en,
} as const;

type Dict = typeof nb;
export type TranslationKey = keyof Dict;

type Vars = Record<string, string | number>;

function format(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? `{${key}}` : String(value);
  });
}

let i18nEnabled = true;

function loadEnabledFromStorage(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem('dev:i18nEnabled');
    if (raw === null) return true;
    return raw === '1' || raw === 'true';
  } catch {
    return true;
  }
}

if (typeof window !== 'undefined') {
  i18nEnabled = loadEnabledFromStorage();
}

export function getI18nEnabled(): boolean {
  return i18nEnabled;
}

export function setI18nEnabled(enabled: boolean): void {
  i18nEnabled = enabled;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('dev:i18nEnabled', enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export function t(key: TranslationKey, vars?: Vars): string {
  const dict = i18nEnabled ? DICTS[DEFAULT_LOCALE] : DICTS.en;
  const template = (dict as unknown as Record<string, string>)[key] ?? nb[key];
  return format(template, vars);
}
