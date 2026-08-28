/**
 * Motherboard's daily empowerment quote — shown at the top of the home
 * screen on web and mobile. One quote per calendar day, the same for
 * everyone (no per-user/household state, no network call, no DB table —
 * intentionally simple; see docs/DESIGN_SYSTEM.md rollout notes if this
 * ever needs to move to a table so quotes can be edited without a deploy).
 */
export const EMPOWERMENT_QUOTES: string[] = [
  'You handled harder than this before breakfast.',
  "Nobody's coming to save the day. Good thing you already are.",
  'Progress, not perfection — today counts.',
  "You don't have to feel ready. You just have to start.",
  "Somebody in this house thinks you're a superhero. They're right.",
  "You've survived 100% of your hardest days so far.",
  'Small wins add up. Today, take one.',
  "You're allowed to do this imperfectly and still be amazing.",
  "The laundry can wait. Your strength can't.",
  'You are the calm this house runs on.',
  "One thing at a time. You've got this.",
  "Tired and still showing up? That's what strong looks like.",
  "You don't need more hours. You need to trust you're doing enough.",
  "Whatever today throws at you, you've thrown back harder before.",
  'This family runs because you keep it running. Take the win.',
  "You're not behind. You're exactly on time for your own life.",
  'Deep breath. You know exactly what to do.',
  "Some days the win is just getting everyone fed and out the door. That's enough.",
  "You are stronger than the voice that says you're not doing enough.",
  "Today doesn't have to be perfect to be good.",
  'You built this home out of love and sheer will. Keep going.',
  "The bar isn't 'flawless.' It's 'showed up anyway.' You clear it daily.",
  "You've got more patience, grit, and love than you give yourself credit for.",
  "Whatever's on today's list, you're more than capable of it.",
  "You are somebody's whole world. Act like it — you already do.",
  'Rest is productive too. Take it when you need it.',
  "You don't have to have it all figured out to be doing great.",
  "Today's chaos is tomorrow's funny story. Ride it out.",
  "You are not 'just' anything. You are everything to this household.",
  "Let's go. You've got this.",
  "You show up even on the hard days. That's the whole job, done well.",
  "Your best today doesn't have to look like your best yesterday.",
  "You're the reason this family feels like home.",
  "Ask for help. Strong doesn't mean solo.",
  "However today goes, you're still the one holding it all together.",
];

/**
 * Deterministic per-day pick: the same quote all day, for everyone, and it
 * changes at the UTC day boundary. No timezone handling needed for a
 * once-a-day rotating quote — it just needs to feel fresh each day, not be
 * precisely synced to the viewer's local midnight.
 */
export function quoteOfTheDay(date: Date = new Date()): string {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  const index = ((dayIndex % EMPOWERMENT_QUOTES.length) + EMPOWERMENT_QUOTES.length) % EMPOWERMENT_QUOTES.length;
  return EMPOWERMENT_QUOTES[index] ?? "You've got this.";
}
