/**
 * Relational Schema & Type-Safe Domain Models for Singh Car Wash
 * Covers all 11 core relational tables:
 * - users
 * - admin_users
 * - bookings
 * - services
 * - service_items
 * - accessory_categories
 * - gallery
 * - reviews
 * - faqs
 * - business_settings
 * - analytics_events
 */

export type BookingStatus = 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type GalleryCategory =
  | 'Accessories'
  | 'Interior'
  | 'Premium Collection'
  | 'Lighting & Upgrades'
  | 'Cabin Style';

export type AnalyticsEventType =
  | 'Page View'
  | 'Service Viewed'
  | 'Booking Started'
  | 'Booking Submitted'
  | 'WhatsApp Click'
  | 'Call Click'
  | 'Google Maps Click'
  | 'Accessory Enquiry'
  | 'Gallery Opened';

export interface UserRecord {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUserRecord {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'MANAGER';
  password_hash: string;
  salt: string;
  last_login_at: string | null;
  created_at: string;
}

export interface BookingRecord {
  id: string;
  client_name: string;
  phone: string;
  vehicle_registration: string;
  car_model: string;
  service_id: string;
  service_name?: string;
  preferred_date: string;
  preferred_time: string;
  additional_notes: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceRecord {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  category_tag: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceItemRecord {
  id: string;
  service_id: string;
  name: string;
  display_order: number;
}

export interface ServiceWithItems extends ServiceRecord {
  items: ServiceItemRecord[];
}

export interface AccessoryCategoryRecord {
  id: string;
  name: string;
  description: string;
  enquiry_topic: string;
  highlights: string[];
  display_order: number;
  is_active: boolean;
}

export interface GalleryRecord {
  id: string;
  title: string;
  caption: string;
  category: GalleryCategory;
  image_url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  customer_name: string;
  review: string;
  rating: number;
  source: string;
  is_verified: boolean;
  is_published: boolean;
  created_at: string;
}

export interface FaqRecord {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

export interface BusinessSettingsRecord {
  id: string;
  business_name: string;
  tagline: string;
  positioning: string;
  city: string;
  district: string;
  state: string;
  country: string;
  full_location: string;
  phone_display: string;
  phone_e164: string;
  whatsapp_e164: string;
  hours_days: string;
  hours_time: string;
  hours_note: string;
  google_maps_url: string;
  updated_at: string;
}

export interface AnalyticsEventRecord {
  id: string;
  event_type: AnalyticsEventType;
  metadata: string;
  path: string;
  created_at: string;
}

export interface RelationalDatabaseSchema {
  users: UserRecord[];
  admin_users: AdminUserRecord[];
  bookings: BookingRecord[];
  services: ServiceRecord[];
  service_items: ServiceItemRecord[];
  accessory_categories: AccessoryCategoryRecord[];
  gallery: GalleryRecord[];
  reviews: ReviewRecord[];
  faqs: FaqRecord[];
  business_settings: BusinessSettingsRecord;
  analytics_events: AnalyticsEventRecord[];
}

/**
 * Canonical SQL DDL Reference for PostgreSQL migration/deployment readiness
 */
export const POSTGRES_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  category_tag TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_items (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_registration TEXT NOT NULL,
  car_model TEXT NOT NULL,
  service_id TEXT NOT NULL REFERENCES services(id),
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  additional_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'NEW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accessory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  enquiry_topic TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  review TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  source TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS business_settings (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  positioning TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL,
  full_location TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  whatsapp_e164 TEXT NOT NULL,
  hours_days TEXT NOT NULL,
  hours_time TEXT NOT NULL,
  hours_note TEXT NOT NULL,
  google_maps_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
