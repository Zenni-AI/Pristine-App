type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-surfaceSunken text-textSecondary',
  success: 'bg-successSoft text-success',
  warning: 'bg-warningSoft text-warning',
  danger: 'bg-dangerSoft text-danger',
  accent: 'bg-accentSoft text-accent',
};

/** A small status/category pill — for task status, bill due-soon, category tags. Never a call to action. */
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-block rounded-sm px-2.5 py-1 text-secondary font-semibold ${TONE_CLASSES[tone]}`}>{children}</span>;
}

/** A small colored dot for calendar/category identification without a full color fill. */
export function CategoryDot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />;
}
