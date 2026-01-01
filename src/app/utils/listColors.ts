import type { VisitList } from '../types';
import type React from 'react';

const DEFAULT_TOKEN: NonNullable<VisitList['color']> = 'chart-1';
const EVENING_BRIGHTNESS = 0.88;
const EVENING_SATURATION_BOOST = 0.18;

const isThemeToken = (token: string): boolean => {
  return /^chart-[1-5]$/.test(token);
};

const normalizeColorToken = (token?: VisitList['color']): string => {
  const tkn = String(token ?? DEFAULT_TOKEN).trim();
  if (!tkn) return DEFAULT_TOKEN;
  return tkn;
};

const resolveAccentColor = (token?: VisitList['color']): string => {
  const tkn = normalizeColorToken(token);
  if (isThemeToken(tkn)) return `var(--${tkn})`;
  // Assume user provided a valid CSS color (e.g. '#rrggbb').
  return tkn;
};

/**
 * Returns a light-but-noticeable background color derived from the list token.
 * Uses the current theme background, so it stays readable in both light/dark.
 */
export function getListColorBackground(token?: VisitList['color']): string {
  const accent = resolveAccentColor(token);
  return `color-mix(in oklch, var(--background) 60%, ${accent} 40%)`;
}

export function getListColorStyle(token?: VisitList['color'], opts?: { isEvening?: boolean }) {
  const base = getListColorBackground(token);
  const eveningDarkened = `color-mix(in oklch, ${base} ${Math.round(EVENING_BRIGHTNESS * 100)}%, black ${Math.round((1 - EVENING_BRIGHTNESS) * 100)}%)`;
  const accent = resolveAccentColor(token);
  const eveningBoosted = `color-mix(in oklch, ${eveningDarkened} ${Math.round((1 - EVENING_SATURATION_BOOST) * 100)}%, ${accent} ${Math.round(EVENING_SATURATION_BOOST * 100)}%)`;

  const backgroundColor = opts?.isEvening ? eveningBoosted : base;

  const style: React.CSSProperties = { backgroundColor };
  return style;
}
