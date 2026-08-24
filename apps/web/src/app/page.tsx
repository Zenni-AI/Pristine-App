import Link from 'next/link';
import { SEAT_PRICES, BUNDLE_PRICES, formatCents } from '@motherboard/shared';

const FEATURES = [
  { title: 'Proactive AI butler', desc: 'Motherboard anticipates needs — oil changes, tax season, date nights — before you ask.' },
  { title: 'Family location, never paywalled', desc: 'Real-time map, safe zones, drive alerts, and an SOS button for every account.' },
  { title: 'Chores kids actually do', desc: 'Assign, submit, approve, and reward with points — quick-reply buttons for little ones.' },
  { title: 'One app, every role', desc: 'Admins, adults, kids, and babysitters each see exactly what’s meant for them.' },
  { title: 'Home, finance, food, health', desc: 'Maintenance schedules, bills, meal plans, meds — all in one place.' },
  { title: 'Voice, Jarvis-style', desc: 'Talk to Motherboard on your phone, tablet, or countertop display.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-textPrimary">
      <header className="flex items-center justify-between px-6 py-6 md:px-16">
        <span className="text-2xl font-bold tracking-tight">Motherboard</span>
        <nav className="flex items-center gap-6 text-sm text-textSecondary">
          <a href="#features" className="hover:text-textPrimary">
            Features
          </a>
          <a href="#pricing" className="hover:text-textPrimary">
            Pricing
          </a>
          <Link href="/sign-in" className="rounded-full bg-accent px-5 py-2 font-semibold text-white hover:bg-accentGlow">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="px-6 pb-24 pt-16 text-center md:px-16">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Your family's AI life & home butler
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-textSecondary">
          Motherboard runs the household stuff — chores, schedules, meals, maintenance, money, and more — so you don't have to
          remember everything. One app, a different experience for every family member.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/join" className="rounded-full bg-accent px-8 py-3 font-semibold text-white hover:bg-accentGlow">
            Start your household
          </Link>
          <a href="#pricing" className="rounded-full border border-border px-8 py-3 font-semibold text-textPrimary hover:border-accent">
            See pricing
          </a>
        </div>
      </section>

      <section id="features" className="px-6 py-16 md:px-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-textSecondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="px-6 py-20 md:px-16">
        <h2 className="mb-2 text-center text-3xl font-bold">Pricing that fits your family</h2>
        <p className="mb-12 text-center text-textSecondary">Messaging and location sharing are never paywalled — for anyone.</p>

        <div className="mx-auto mb-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {Object.values(BUNDLE_PRICES).map((b) => (
            <div key={b.plan} className="rounded-2xl border border-border bg-surface p-6 text-center">
              <h4 className="text-sm font-semibold text-textSecondary">{b.label}</h4>
              <p className="mt-2 text-3xl font-bold">{formatCents(b.monthlyCents)}</p>
              <p className="text-xs text-textSecondary">/month</p>
              <p className="mt-3 text-xs text-textSecondary">{b.description}</p>
            </div>
          ))}
        </div>

        <h3 className="mb-6 text-center text-lg font-semibold text-textSecondary">Or pay per account</h3>
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-5">
          {Object.values(SEAT_PRICES).map((s) => (
            <div key={s.role} className="rounded-2xl border border-border bg-surface p-5 text-center">
              <h4 className="text-sm font-semibold">{s.label}</h4>
              <p className="mt-2 text-2xl font-bold">{formatCents(s.monthlyCents)}</p>
              <p className="text-xs text-textSecondary">/month{s.perSessionCents ? ` or ${formatCents(s.perSessionCents)}/session` : ''}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-textSecondary">One free member seat included with every plan.</p>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-textSecondary md:px-16">
        © {new Date().getFullYear()} Motherboard. Built for families.
      </footer>
    </main>
  );
}
