/** Mirrors the `onboarding_topic` enum in 0001_core.sql. */
export const ONBOARDING_TOPICS = [
  'household_basics',
  'kids',
  'vehicles',
  'home',
  'garden',
  'health',
  'holidays',
  'calendar_connections',
  'reminder_preferences',
  'finance',
  'food',
] as const;

export type OnboardingTopic = (typeof ONBOARDING_TOPICS)[number];

export const ONBOARDING_TOPIC_COPY: Record<OnboardingTopic, { title: string; prompt: string }> = {
  household_basics: {
    title: 'Your household',
    prompt: "First, tell me a bit about your household — how many people, and what kind of home do you live in?",
  },
  kids: {
    title: 'Kids',
    prompt: 'Do you have kids? Tell me their names, ages, and schools and I\'ll set up their profiles.',
  },
  vehicles: {
    title: 'Vehicles',
    prompt: "What vehicles does your household have? Make, model, year — and if you know it, the last oil change date.",
  },
  home: {
    title: 'Home',
    prompt: 'Any major home systems I should track — HVAC, water heater, appliances under warranty?',
  },
  garden: {
    title: 'Garden & plants',
    prompt: 'Do you have any plants or a garden I should help you keep alive?',
  },
  health: {
    title: 'Health',
    prompt: "Any medications, doctors, or dentists I should help you keep track of for the family?",
  },
  holidays: {
    title: 'Holidays',
    prompt: "Which holidays would you like reminders for — federal, religious, cultural, personal?",
  },
  calendar_connections: {
    title: 'Calendars',
    prompt: 'Want to connect Google, Outlook, or Apple Calendar so everything stays in sync?',
  },
  reminder_preferences: {
    title: 'Reminders',
    prompt: 'How should I remind you about things — push notification, text, or email?',
  },
  finance: {
    title: 'Finance',
    prompt: 'Want help tracking bills, subscriptions, and insurance due dates?',
  },
  food: {
    title: 'Food',
    prompt: "Should I help with weekly meal planning and grocery lists?",
  },
};

/** "I don't know" / skip is always a valid answer — Domo follows up later. */
export const SKIP_PHRASES = ["i don't know", 'skip', 'not sure', 'later', "i'll do it later"];

export function isSkipAnswer(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return SKIP_PHRASES.some((p) => normalized.includes(p));
}
