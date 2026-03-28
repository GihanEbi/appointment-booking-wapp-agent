// Auto-generated from supabase/schema.sql
// Re-generate with: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type AppointmentStatus = "pending" | "confirmed" | "canceled";
export type ChatRole = "ai" | "user";
export type ChatSessionStatus = "active" | "resolved";
export type AnnouncementStatus = "scheduled" | "sent" | "expired";
export type NotificationType = "success" | "info" | "warning";

export interface Profile {
  id: string;
  business_name: string;
  whatsapp_phone: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessDetails {
  id: string;
  profile_id: string;
  description: string;
  ai_tone: string;
  working_hours: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  id: string;
  profile_id: string;
  label: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface TrainingDoc {
  id: string;
  profile_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  chunk_index: number;
  content: string;
  embedding: number[] | null;
  uploaded_at: string;
}

export interface Appointment {
  id: string;
  profile_id: string;
  customer_phone: string;
  customer_name: string;
  service: string;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  profile_id: string;
  customer_phone: string;
  customer_name: string;
  status: ChatSessionStatus;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  audience: string;
  scheduled_for: string | null;
  status: AnnouncementStatus;
  reach: number;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  profile_id: string;
  title: string;
  discount: string;
  description: string;
  valid_until: string;
  sent_count: number;
  redeemed_count: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

// Supabase Database helper type (used with createClient generic)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at" | "updated_at">; Update: Partial<Profile> };
      business_details: { Row: BusinessDetails; Insert: Omit<BusinessDetails, "id" | "created_at" | "updated_at">; Update: Partial<BusinessDetails> };
      availability_slots: { Row: AvailabilitySlot; Insert: Omit<AvailabilitySlot, "id" | "created_at">; Update: Partial<AvailabilitySlot> };
      training_docs: { Row: TrainingDoc; Insert: Omit<TrainingDoc, "id" | "uploaded_at">; Update: Partial<TrainingDoc> };
      appointments: { Row: Appointment; Insert: Omit<Appointment, "id" | "created_at" | "updated_at">; Update: Partial<Appointment> };
      chat_sessions: { Row: ChatSession; Insert: Omit<ChatSession, "id" | "created_at">; Update: Partial<ChatSession> };
      chat_messages: { Row: ChatMessage; Insert: Omit<ChatMessage, "id" | "created_at">; Update: Partial<ChatMessage> };
      announcements: { Row: Announcement; Insert: Omit<Announcement, "id" | "created_at" | "updated_at">; Update: Partial<Announcement> };
      offers: { Row: Offer; Insert: Omit<Offer, "id" | "created_at" | "updated_at">; Update: Partial<Offer> };
      notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at">; Update: Partial<Notification> };
    };
  };
}
