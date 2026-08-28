/** Mirrors the seeded rows in quick_reply_options (0002_chat.sql). */
export interface QuickReplyOption {
  key: string;
  label: string;
  emoji: string;
}

export const DEFAULT_QUICK_REPLIES: QuickReplyOption[] = [
  { key: 'im_okay', label: "I'm okay", emoji: '🙂' },
  { key: 'need_help', label: 'I need help', emoji: '🆘' },
  { key: 'im_home', label: "I'm home", emoji: '🏠' },
  { key: 'im_hungry', label: "I'm hungry", emoji: '🍎' },
];
