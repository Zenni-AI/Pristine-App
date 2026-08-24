import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-textOnAccent hover:bg-accentHover',
  secondary: 'border border-border bg-surface text-textPrimary hover:border-borderStrong',
  ghost: 'text-textPrimary hover:bg-surfaceSunken',
  danger: 'bg-danger text-textOnAccent hover:opacity-90',
};

const SIZE_CLASSES: Record<Size, string> = {
  md: 'px-5 py-3 text-body',
  sm: 'px-4 py-2 text-secondary',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

/** The one button component every screen should use — variant + size cover every case we have. */
export function Button({ variant = 'primary', size = 'md', fullWidth, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
