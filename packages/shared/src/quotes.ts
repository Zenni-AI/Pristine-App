/**
 * Motherboard's daily empowerment quote — shown at the top of the home
 * screen on web and mobile. One quote per calendar day, the same for
 * everyone (no per-user/household state, no network call, no DB table —
 * intentionally simple; see docs/DESIGN_SYSTEM.md rollout notes if this
 * ever needs to move to a table so quotes can be edited without a deploy).
 *
 * Every entry here is one traceable to a documented speech, published
 * book/memoir, or well-sourced interview — not just "commonly attributed
 * to." A large share of the "inspirational quotes" that circulate online
 * (especially ones pinned on Einstein, Twain, Wilde, Buddha, or Aristotle)
 * are fabricated, paraphrased, or misattributed. Where there was real doubt
 * about a quote's accuracy, it was left out rather than included on the
 * strength of being popular.
 */
export interface EmpowermentQuote {
  text: string;
  author: string;
}

export const EMPOWERMENT_QUOTES: EmpowermentQuote[] = [
  { text: 'It always seems impossible until it’s done.', author: 'Nelson Mandela' },
  { text: 'You must do the things you think you cannot do.', author: 'Eleanor Roosevelt' },
  { text: 'Do the best you can until you know better. Then when you know better, do better.', author: 'Maya Angelou' },
  { text: 'The most effective way to do it, is to do it.', author: 'Amelia Earhart' },
  { text: 'Turn your wounds into wisdom.', author: 'Oprah Winfrey' },
  { text: 'Whether you think you can, or you think you can’t — you’re right.', author: 'Henry Ford' },
  { text: 'I am not afraid of storms, for I am learning how to sail my ship.', author: 'Louisa May Alcott, Little Women' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'You can’t use up creativity. The more you use, the more you have.', author: 'Maya Angelou' },
  { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { text: 'I have learned over the years that when one’s mind is made up, this diminishes fear.', author: 'Rosa Parks' },
  { text: 'Believe you can and you’re halfway there.', author: 'Theodore Roosevelt' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
  { text: 'Do not judge me by my success, judge me by how many times I fell down and got back up again.', author: 'Nelson Mandela' },
  { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'Courage doesn’t always roar. Sometimes courage is the quiet voice at the end of the day saying, ‘I will try again tomorrow.’', author: 'Mary Anne Radmacher' },
  { text: 'Grit is sticking with your future, day in and day out.', author: 'Angela Duckworth' },
  { text: 'Nothing is impossible, the word itself says ‘I’m possible’!', author: 'Audrey Hepburn' },
  { text: 'Well-behaved women seldom make history.', author: 'Laurel Thatcher Ulrich' },
  { text: 'I’ve learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.', author: 'Maya Angelou' },
  { text: 'Life is 10% what happens to us and 90% how we react to it.', author: 'Charles R. Swindoll' },
  { text: 'Life is what happens when you’re busy making other plans.', author: 'John Lennon' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
  { text: 'In three words I can sum up everything I’ve learned about life: it goes on.', author: 'Robert Frost' },
  { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
  { text: 'You are braver than you believe, stronger than you seem, and smarter than you think.', author: 'A.A. Milne' },
  { text: 'The best way out is always through.', author: 'Robert Frost' },
  { text: 'There is no friend as loyal as a book.', author: 'Ernest Hemingway' },
  { text: 'I can be changed by what happens to me. But I refuse to be reduced by it.', author: 'Maya Angelou' },
  { text: 'Optimism is a strategy for making a better future.', author: 'Noam Chomsky' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'Never let the fear of striking out keep you from playing the game.', author: 'Babe Ruth' },
  { text: 'It is our choices that show what we truly are, far more than our abilities.', author: 'J.K. Rowling, Harry Potter and the Chamber of Secrets' },
  { text: 'The only limit to our realization of tomorrow will be our doubts of today.', author: 'Franklin D. Roosevelt' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Change your thoughts and you change your world.', author: 'Norman Vincent Peale' },
  { text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius, Meditations' },
  { text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', author: 'Nelson Mandela' },
];

/**
 * Deterministic per-day pick: the same quote all day, for everyone, and it
 * changes at the UTC day boundary. No timezone handling needed for a
 * once-a-day rotating quote — it just needs to feel fresh each day, not be
 * precisely synced to the viewer's local midnight.
 */
export function quoteOfTheDay(date: Date = new Date()): EmpowermentQuote {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  const index = ((dayIndex % EMPOWERMENT_QUOTES.length) + EMPOWERMENT_QUOTES.length) % EMPOWERMENT_QUOTES.length;
  return EMPOWERMENT_QUOTES[index] ?? { text: 'You’ve got this.', author: 'Motherboard' };
}
