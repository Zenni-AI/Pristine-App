const PALETTE = ['#B85C38', '#5E7A93', '#5B7A5B', '#B8842E', '#8C6E86', '#8A6A50'];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AvatarProps {
  name: string;
  size?: number;
}

/** A simple initial-in-a-circle avatar, colored deterministically per person — no photo upload yet. */
export function Avatar({ name, size = 40 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-textOnAccent"
      style={{ width: size, height: size, backgroundColor: colorFor(name), fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
