/**
 * Motherboard type scale (mobile). Mirrors the fontSize tokens in
 * apps/web/tailwind.config.ts. React Native's default font already
 * approximates SF Pro on iOS / Roboto on Android — no custom font is
 * loaded yet, this just standardizes the size/weight/line-height scale.
 */
export const typography = {
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  secondary: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const }, // smallest size allowed
};
