import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

/** A labeled text input — the one input shape used across auth, settings, and every form. */
export function Input({ label, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-secondary font-medium text-textSecondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-md border border-border bg-surfaceSunken px-4 py-3 text-body text-textPrimary outline-none placeholder:text-textTertiary focus:border-accent focus:bg-surface ${className}`}
        {...props}
      />
      {hint && <p className="mt-1.5 text-secondary text-textTertiary">{hint}</p>}
    </div>
  );
}
