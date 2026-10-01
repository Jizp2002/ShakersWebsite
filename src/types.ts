export type Role = 'member' | 'leader' | 'admin';
export type Status = 'pending' | 'approved' | 'rejected' | 'suspended';
export interface Profile {
  id: string;
  name: string;
  age_group: '13-17' | '18+';
  interests: string;
  avatar_url: string | null;
}
export interface Membership {
  id: string;
  role: Role;
  status: Status;
  guardian_confirmed: boolean;
  created_at: string;
}
export interface Event {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string;
  category: string;
  capacity: number | null;
  visibility: 'public' | 'private';
  status: 'draft' | 'published' | 'cancelled' | 'finished';
  image_url: string;
  owner_id: string;
}
export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
}
export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  present: boolean;
}
export interface Team {
  id: string;
  name: string;
  description: string;
  leader_id: string;
}
export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
}
export interface Assignment {
  id: string;
  team_id: string;
  event_id: string;
  user_id: string;
  task: string;
  status: 'pending' | 'confirmed' | 'declined';
}
export interface Announcement {
  id: string;
  title: string;
  body: string;
  team_id: string | null;
  expires_at: string;
  featured: boolean;
  status: 'draft' | 'published';
  owner_id: string;
}
export interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  kind: 'video' | 'article' | 'pdf';
  url: string;
  body: string;
  image_url: string;
  status: 'draft' | 'published';
  visibility: 'public' | 'private';
  owner_id: string;
}
export interface Prayer {
  id: string;
  user_id: string | null;
  body: string;
  visibility: 'private' | 'community';
  anonymous: boolean;
  author_label: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
export interface PrayerReaction {
  id: string;
  prayer_id: string;
  user_id: string;
}
export interface PrayerReport {
  id: string;
  prayer_id: string;
  user_id: string;
  reason: string;
  resolved: boolean;
}
export interface Poll {
  id: string;
  question: string;
  options: string[];
  closes_at: string;
  status: 'draft' | 'published';
  owner_id: string;
}
export interface Vote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
}
export interface LeaderProfile {
  id: string;
  name: string;
  function: string;
  bio: string;
  image_url: string;
  published: boolean;
  consent: boolean;
}
export interface Audit {
  id: string;
  actor_id: string;
  action: string;
  created_at: string;
}
export interface InboxNotification {
  id: string;
  user_id: string;
  event_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
}
export interface GalleryPhoto {
  id: string;
  event_id: string;
  owner_id: string;
  image_url: string;
  caption: string;
  consent: boolean;
  published: boolean;
  created_at: string;
}
export interface Data {
  gallery_photos: GalleryPhoto[];
  notifications: InboxNotification[];
  profiles: Profile[];
  memberships: Membership[];
  events: Event[];
  registrations: Registration[];
  attendance: Attendance[];
  teams: Team[];
  team_members: TeamMember[];
  assignments: Assignment[];
  announcements: Announcement[];
  resources: Resource[];
  prayers: Prayer[];
  prayer_reactions: PrayerReaction[];
  prayer_reports: PrayerReport[];
  polls: Poll[];
  votes: Vote[];
  leader_profiles: LeaderProfile[];
  audit_log: Audit[];
}
export type Table = keyof Data;
export type Row<T extends Table> = Data[T][number];
export const tables: Table[] = [
  'gallery_photos',
  'notifications',
  'profiles',
  'memberships',
  'events',
  'registrations',
  'attendance',
  'teams',
  'team_members',
  'assignments',
  'announcements',
  'resources',
  'prayers',
  'prayer_reactions',
  'prayer_reports',
  'polls',
  'votes',
  'leader_profiles',
  'audit_log',
];
export const emptyData = (): Data =>
  Object.fromEntries(tables.map((t) => [t, []])) as unknown as Data;
