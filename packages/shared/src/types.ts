/**
 * Hand-maintained TypeScript types mirroring the core Supabase tables used by
 * the client apps. For exhaustive/generated types run:
 *   pnpm supabase:gen-types
 * which writes packages/shared/src/database.types.ts from the live schema.
 * These hand types are the ergonomic layer app code actually imports.
 */
import type { MemberRole } from './roles';

export interface Household {
  id: string;
  name: string;
  home_type: string | null;
  timezone: string;
  invite_code: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string | null;
  role: MemberRole;
  display_name: string;
  avatar_url: string | null;
  birthdate: string | null;
  points: number;
  is_active: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  screen_time_limit_minutes: number | null;
  joined_at: string | null;
}

export type TaskCategory = 'chore' | 'punishment' | 'reading' | 'responsibility' | 'reminder';
export type TaskStatus = 'assigned' | 'submitted' | 'approved' | 'rejected' | 'overdue';

export interface MotherboardTask {
  id: string;
  household_id: string;
  assigned_to: string;
  assigned_by: string;
  category: TaskCategory;
  title: string;
  description: string | null;
  points: number;
  due_at: string | null;
  recurrence: string | null;
  status: TaskStatus;
  submitted_at: string | null;
  submitted_note: string | null;
  submitted_photo_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

export type ChatKind = 'family' | 'babysitter';
export type MessageKind = 'text' | 'photo' | 'quick_reply' | 'ai_update' | 'location_share' | 'sos';

export interface ChatThread {
  id: string;
  household_id: string;
  kind: ChatKind;
  babysitter_session_id: string | null;
  title: string | null;
  is_archived: boolean;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_member_id: string | null; // null = Motherboard AI system message
  kind: MessageKind;
  body: string | null;
  photo_url: string | null;
  quick_reply_key: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_pinned: boolean;
  created_at: string;
}

export interface SavedLocation {
  id: string;
  household_id: string;
  label: string;
  kind: 'home' | 'school' | 'work' | 'family' | 'activity' | 'custom';
  lat: number;
  lng: number;
  radius_meters: number;
  is_safe_zone: boolean;
}

export interface MemberLocation {
  member_id: string;
  household_id: string;
  lat: number;
  lng: number;
  accuracy_meters: number | null;
  battery_pct: number | null;
  is_sharing: boolean;
  updated_at: string;
}

export interface BabysitterSession {
  id: string;
  household_id: string;
  member_id: string;
  starts_at: string;
  ends_at: string | null;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  status: 'scheduled' | 'active' | 'completed' | 'canceled';
  care_kids: string[];
}

export interface ScheduleEvent {
  id: string;
  household_id: string;
  member_id: string;
  kind: 'practice' | 'game' | 'school_event' | 'homework' | 'project_due' | 'other';
  title: string;
  starts_at: string;
  ends_at: string | null;
  location_label: string | null;
  what_to_bring: string[] | null;
}

export interface MealPlanEntry {
  id: string;
  household_id: string;
  meal_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  dinner_time: string | null;
}

export interface CalendarConnection {
  id: string;
  household_id: string;
  member_id: string;
  provider: 'google' | 'outlook' | 'apple';
  sync_enabled: boolean;
  last_synced_at: string | null;
}

export interface ProactiveNudge {
  id: string;
  household_id: string;
  target_member_id: string | null;
  domain: string;
  message: string;
  status: 'pending' | 'sent' | 'dismissed' | 'actioned' | 'snoozed';
  scheduled_for: string;
}
