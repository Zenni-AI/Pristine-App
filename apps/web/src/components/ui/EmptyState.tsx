/**
 * An intentional-looking empty state — never a bare "No data available."
 * Always give the reader a next step, even if it's just reassurance.
 */
export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="py-6 text-center">
      <p className="text-body text-textSecondary">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** A calm loading placeholder — no spinners that draw attention to themselves. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-textSecondary">
      <p className="text-body">{label}</p>
    </div>
  );
}
