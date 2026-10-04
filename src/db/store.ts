import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AccessoryCategoryRecord,
  AdminUserRecord,
  AnalyticsEventRecord,
  AnalyticsEventType,
  BookingRecord,
  BookingStatus,
  BusinessSettingsRecord,
  FaqRecord,
  GalleryCategory,
  GalleryRecord,
  RelationalDatabaseSchema,
  ReviewRecord,
  ServiceItemRecord,
  ServiceRecord,
  ServiceWithItems,
  UserRecord,
} from './schema.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'singh_car_wash_db.json');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash, salt: usedSalt };
}

function getInitialDatabase(): RelationalDatabaseSchema {
  const now = new Date().toISOString();
  const defaultPasscode = process.env.ADMIN_PASSCODE || 'singh98559';
  const { hash, salt } = hashPassword(defaultPasscode);

  const adminUsers: AdminUserRecord[] = [
    {
      id: 'admin_1',
      username: 'admin@singhcarwash.in',
      role: 'SUPER_ADMIN',
      password_hash: hash,
      salt,
      last_login_at: null,
      created_at: now,
    },
  ];

  const services: ServiceRecord[] = [
    {
      id: 'srv_wash_foam',
      slug: 'wash-foam-care',
      name: 'Wash & Foam Care',
      short_description:
        'Thorough exterior foam wash, pressure rinse, and body cleaning designed to safely lift road grime and restore surface clarity.',
      category_tag: 'Gloss & Finish Care',
      display_order: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'srv_interior_deep',
      slug: 'interior-deep-clean',
      name: 'Interior Deep Clean',
      short_description:
        'Comprehensive cabin care focusing on vacuuming, dashboard detailing, and seat cleaning for a fresh, hygienic interior environment.',
      category_tag: 'Cabin Detail',
      display_order: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'srv_steam_wash',
      slug: 'steam-wash',
      name: 'Steam Wash',
      short_description:
        'Targeted steam cleaning and sanitisation to deep-clean surfaces and hard-to-reach areas with controlled thermal care.',
      category_tag: 'Cabin Detail',
      display_order: 3,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'srv_full_detailing',
      slug: 'full-detailing',
      name: 'Full Detailing',
      short_description:
        'Complete inside-and-out vehicle care with dedicated attention to surface finish, trim presentation, and comprehensive detailing.',
      category_tag: 'Gloss & Finish Care',
      display_order: 4,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'srv_coating_protection',
      slug: 'coating-protection',
      name: 'Coating & Protection',
      short_description:
        'Surface protection and gloss enhancement treatments formulated to help preserve paintwork finish and ease routine maintenance.',
      category_tag: 'Protection & Shine',
      display_order: 5,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'srv_auto_accessories',
      slug: 'auto-accessories',
      name: 'Auto Accessories',
      short_description:
        'Curated automotive accessories including LED lighting upgrades, cabin perfumes, and dashboard showpieces.',
      category_tag: 'Automotive Accessories',
      display_order: 6,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const serviceItems: ServiceItemRecord[] = [
    // Wash & Foam Care
    { id: 'item_1', service_id: 'srv_wash_foam', name: 'Foam Wash', display_order: 1 },
    { id: 'item_2', service_id: 'srv_wash_foam', name: 'Pressure Wash', display_order: 2 },
    { id: 'item_3', service_id: 'srv_wash_foam', name: 'Body Clean', display_order: 3 },
    // Interior Deep Clean
    { id: 'item_4', service_id: 'srv_interior_deep', name: 'Vacuum', display_order: 1 },
    { id: 'item_5', service_id: 'srv_interior_deep', name: 'Dashboard Cleaning', display_order: 2 },
    { id: 'item_6', service_id: 'srv_interior_deep', name: 'Seat Cleaning', display_order: 3 },
    // Steam Wash
    { id: 'item_7', service_id: 'srv_steam_wash', name: 'Steam', display_order: 1 },
    { id: 'item_8', service_id: 'srv_steam_wash', name: 'Sanitise', display_order: 2 },
    { id: 'item_9', service_id: 'srv_steam_wash', name: 'Deep Clean', display_order: 3 },
    // Full Detailing
    { id: 'item_10', service_id: 'srv_full_detailing', name: 'Full Care', display_order: 1 },
    { id: 'item_11', service_id: 'srv_full_detailing', name: 'Finish', display_order: 2 },
    { id: 'item_12', service_id: 'srv_full_detailing', name: 'Detail', display_order: 3 },
    // Coating & Protection
    { id: 'item_13', service_id: 'srv_coating_protection', name: 'Coating', display_order: 1 },
    { id: 'item_14', service_id: 'srv_coating_protection', name: 'Protection', display_order: 2 },
    { id: 'item_15', service_id: 'srv_coating_protection', name: 'Gloss', display_order: 3 },
    // Auto Accessories
    { id: 'item_16', service_id: 'srv_auto_accessories', name: 'LED', display_order: 1 },
    { id: 'item_17', service_id: 'srv_auto_accessories', name: 'Perfumes', display_order: 2 },
    { id: 'item_18', service_id: 'srv_auto_accessories', name: 'Showpieces', display_order: 3 },
  ];

  const accessoryCategories: AccessoryCategoryRecord[] = [
    {
      id: 'acc_dashboard',
      name: 'Dashboard Accessories',
      description:
        'Clean, well-fitted cabin and dashboard enhancements selected to complement your vehicle interior.',
      enquiry_topic: 'Dashboard Accessories enquiry',
      highlights: ['Cabin trim accents', 'Dashboard mats & organizers', 'Interior utility fittings'],
      display_order: 1,
      is_active: true,
    },
    {
      id: 'acc_lighting',
      name: 'Lighting',
      description:
        'Automotive LED lighting options for improved visibility and refined cabin or exterior illumination.',
      enquiry_topic: 'Lighting enquiry',
      highlights: ['LED lighting upgrades', 'Cabin ambient lighting', 'Exterior illumination options'],
      display_order: 2,
      is_active: true,
    },
    {
      id: 'acc_fragrances',
      name: 'Fragrances / Perfumes',
      description:
        'Automotive cabin fragrances and perfumes to keep your interior welcoming after every wash and detail.',
      enquiry_topic: 'Fragrance enquiry',
      highlights: ['Dashboard fragrances', 'Vent & cabin perfumes', 'Long-lasting interior scents'],
      display_order: 3,
      is_active: true,
    },
    {
      id: 'acc_showpieces',
      name: 'Showpieces',
      description:
        'Tasteful dashboard showpieces and decorative emblems suited for personalising your vehicle cabin.',
      enquiry_topic: 'Showpiece enquiry',
      highlights: ['Dashboard showpieces', 'Hanging & console accents', 'Gift-ready car decor'],
      display_order: 4,
      is_active: true,
    },
    {
      id: 'acc_practical',
      name: 'Practical Automotive Accessories',
      description:
        'Everyday essential automotive accessories focused on convenience, cabin cleanliness, and utility.',
      enquiry_topic: 'Accessories enquiry',
      highlights: ['Daily driving essentials', 'Cabin care accessories', 'Utility add-ons'],
      display_order: 5,
      is_active: true,
    },
  ];

  const faqs: FaqRecord[] = [
    {
      id: 'faq_1',
      question: 'Do I need to book before visiting?',
      answer:
        'Detailing and longer services are recommended to be booked in advance. For quick wash services, customers can confirm availability through WhatsApp.',
      display_order: 1,
      is_active: true,
    },
    {
      id: 'faq_2',
      question: 'What car care services are available?',
      answer:
        'Exterior washing, foam wash, steam wash, interior cleaning, detailing, protection and automotive accessories.',
      display_order: 2,
      is_active: true,
    },
    {
      id: 'faq_3',
      question: 'Can I ask about accessories on WhatsApp?',
      answer:
        'Yes. Customers can enquire through WhatsApp about available accessories, lighting, fragrances and showpieces.',
      display_order: 3,
      is_active: true,
    },
    {
      id: 'faq_4',
      question: 'How is my booking confirmed?',
      answer:
        'The booking form creates a WhatsApp booking request. Singh Car Wash then confirms availability.',
      display_order: 4,
      is_active: true,
    },
  ];

  const businessSettings: BusinessSettingsRecord = {
    id: 'settings_default',
    business_name: 'SINGH CAR WASH',
    tagline: 'Premium Car Care · Car Wash · Detailing · Automotive Accessories',
    positioning: 'Complete Car Care Under One Roof',
    city: 'Banga City',
    district: 'District Shaheed Bhagat Singh Nagar',
    state: 'Punjab',
    country: 'India',
    full_location: 'Banga City, District Shaheed Bhagat Singh Nagar, Punjab, India',
    phone_display: '+91 98559 53842',
    phone_e164: '+919855953842',
    whatsapp_e164: '919855953842',
    hours_days: 'Open Daily',
    hours_time: '10 AM — 5 PM',
    hours_note: 'Booking subject to confirmation.',
    google_maps_url:
      'https://www.google.com/maps/search/?api=1&query=Singh+Car+Wash+Banga+City+Shaheed+Bhagat+Singh+Nagar+Punjab+India',
    updated_at: now,
  };

  return {
    users: [],
    admin_users: adminUsers,
    bookings: [],
    services,
    service_items: serviceItems,
    accessory_categories: accessoryCategories,
    gallery: [], // Genuine Singh Car Wash images only; empty until uploaded by Admin
    reviews: [], // Genuine verified reviews only; empty until verified
    faqs,
    business_settings: businessSettings,
    analytics_events: [],
  };
}

class DatabaseStore {
  private data: RelationalDatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as RelationalDatabaseSchema;
        const initial = getInitialDatabase();
        this.data = {
          ...initial,
          ...parsed,
          business_settings: {
            ...initial.business_settings,
            ...(parsed.business_settings || {}),
          },
        };
      } catch (e) {
        console.error('Error reading DB file, initializing fresh store:', e);
        this.data = getInitialDatabase();
        this.persist();
      }
    } else {
      this.data = getInitialDatabase();
      this.persist();
    }
  }

  private persist(): void {
    try {
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
      console.error('Failed to persist database:', e);
    }
  }

  // Services + Items join
  public getServices(onlyActive = true): ServiceWithItems[] {
    const services = this.data.services
      .filter((s) => (onlyActive ? s.is_active : true))
      .sort((a, b) => a.display_order - b.display_order);

    return services.map((service) => ({
      ...service,
      items: this.data.service_items
        .filter((item) => item.service_id === service.id)
        .sort((a, b) => a.display_order - b.display_order),
    }));
  }

  public getAccessoryCategories(onlyActive = true): AccessoryCategoryRecord[] {
    return this.data.accessory_categories
      .filter((c) => (onlyActive ? c.is_active : true))
      .sort((a, b) => a.display_order - b.display_order);
  }

  public getGallery(onlyActive = true): GalleryRecord[] {
    return this.data.gallery
      .filter((g) => (onlyActive ? g.is_active : true))
      .sort((a, b) => a.display_order - b.display_order);
  }

  public getReviews(onlyVerifiedAndPublished = true): ReviewRecord[] {
    return this.data.reviews
      .filter((r) => (onlyVerifiedAndPublished ? r.is_verified && r.is_published : true))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getFaqs(onlyActive = true): FaqRecord[] {
    return this.data.faqs
      .filter((f) => (onlyActive ? f.is_active : true))
      .sort((a, b) => a.display_order - b.display_order);
  }

  public getBusinessSettings(): BusinessSettingsRecord {
    return this.data.business_settings;
  }

  public updateBusinessSettings(patch: Partial<BusinessSettingsRecord>): BusinessSettingsRecord {
    this.data.business_settings = {
      ...this.data.business_settings,
      ...patch,
      id: 'settings_default',
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.business_settings;
  }

  // Users upsert (relational linkage by phone)
  public upsertUser(name: string, phone: string): UserRecord {
    const now = new Date().toISOString();
    const existing = this.data.users.find((u) => u.phone === phone);
    if (existing) {
      existing.name = name;
      existing.updated_at = now;
      this.persist();
      return existing;
    }
    const created: UserRecord = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      name,
      phone,
      created_at: now,
      updated_at: now,
    };
    this.data.users.push(created);
    this.persist();
    return created;
  }

  // Bookings
  public getBookings(): BookingRecord[] {
    const serviceMap = new Map(this.data.services.map((s) => [s.id, s.name]));
    return this.data.bookings
      .map((b) => ({
        ...b,
        service_name: serviceMap.get(b.service_id) || b.service_name || b.service_id,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createBooking(input: {
    client_name: string;
    phone: string;
    vehicle_registration: string;
    car_model: string;
    service_id: string;
    preferred_date: string;
    preferred_time: string;
    additional_notes: string;
  }): BookingRecord {
    const now = new Date().toISOString();
    this.upsertUser(input.client_name, input.phone);
    const matchedService = this.data.services.find(
      (s) => s.id === input.service_id || s.name === input.service_id
    );
    const booking: BookingRecord = {
      id: `bk_${crypto.randomBytes(6).toString('hex')}`,
      client_name: input.client_name,
      phone: input.phone,
      vehicle_registration: input.vehicle_registration.toUpperCase(),
      car_model: input.car_model,
      service_id: matchedService ? matchedService.id : input.service_id,
      service_name: matchedService ? matchedService.name : input.service_id,
      preferred_date: input.preferred_date,
      preferred_time: input.preferred_time,
      additional_notes: input.additional_notes || '',
      status: 'NEW',
      created_at: now,
      updated_at: now,
    };
    this.data.bookings.push(booking);
    this.persist();
    return booking;
  }

  public updateBooking(
    id: string,
    patch: { status?: BookingStatus; additional_notes?: string }
  ): BookingRecord | null {
    const booking = this.data.bookings.find((b) => b.id === id);
    if (!booking) return null;
    if (patch.status) booking.status = patch.status;
    if (typeof patch.additional_notes === 'string') {
      booking.additional_notes = patch.additional_notes;
    }
    booking.updated_at = new Date().toISOString();
    this.persist();
    return booking;
  }

  public deleteBooking(id: string): boolean {
    const prevLen = this.data.bookings.length;
    this.data.bookings = this.data.bookings.filter((b) => b.id !== id);
    if (this.data.bookings.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Service management
  public createService(input: {
    name: string;
    short_description: string;
    category_tag: string;
    items: string[];
  }): ServiceWithItems {
    const now = new Date().toISOString();
    const id = `srv_${crypto.randomBytes(5).toString('hex')}`;
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const display_order = this.data.services.length + 1;
    const newService: ServiceRecord = {
      id,
      slug,
      name: input.name,
      short_description: input.short_description,
      category_tag: input.category_tag || 'Gloss & Finish Care',
      display_order,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    this.data.services.push(newService);

    const createdItems: ServiceItemRecord[] = input.items
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name, idx) => ({
        id: `item_${crypto.randomBytes(5).toString('hex')}`,
        service_id: id,
        name,
        display_order: idx + 1,
      }));

    this.data.service_items.push(...createdItems);
    this.persist();
    return { ...newService, items: createdItems };
  }

  public updateService(
    id: string,
    patch: {
      name?: string;
      short_description?: string;
      category_tag?: string;
      is_active?: boolean;
      display_order?: number;
      items?: string[];
    }
  ): ServiceWithItems | null {
    const srv = this.data.services.find((s) => s.id === id);
    if (!srv) return null;
    if (typeof patch.name === 'string' && patch.name.trim()) srv.name = patch.name.trim();
    if (typeof patch.short_description === 'string')
      srv.short_description = patch.short_description.trim();
    if (typeof patch.category_tag === 'string') srv.category_tag = patch.category_tag.trim();
    if (typeof patch.is_active === 'boolean') srv.is_active = patch.is_active;
    if (typeof patch.display_order === 'number') srv.display_order = patch.display_order;
    srv.updated_at = new Date().toISOString();

    if (Array.isArray(patch.items)) {
      this.data.service_items = this.data.service_items.filter((i) => i.service_id !== id);
      const newItems: ServiceItemRecord[] = patch.items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((name, idx) => ({
          id: `item_${crypto.randomBytes(5).toString('hex')}`,
          service_id: id,
          name,
          display_order: idx + 1,
        }));
      this.data.service_items.push(...newItems);
    }

    this.persist();
    return {
      ...srv,
      items: this.data.service_items
        .filter((i) => i.service_id === id)
        .sort((a, b) => a.display_order - b.display_order),
    };
  }

  public deleteService(id: string): boolean {
    const prev = this.data.services.length;
    this.data.services = this.data.services.filter((s) => s.id !== id);
    this.data.service_items = this.data.service_items.filter((i) => i.service_id !== id);
    if (this.data.services.length !== prev) {
      this.persist();
      return true;
    }
    return false;
  }

  // Accessory Categories management
  public updateAccessoryCategory(
    id: string,
    patch: Partial<AccessoryCategoryRecord>
  ): AccessoryCategoryRecord | null {
    const cat = this.data.accessory_categories.find((c) => c.id === id);
    if (!cat) return null;
    if (typeof patch.name === 'string' && patch.name.trim()) cat.name = patch.name.trim();
    if (typeof patch.description === 'string') cat.description = patch.description.trim();
    if (typeof patch.enquiry_topic === 'string') cat.enquiry_topic = patch.enquiry_topic.trim();
    if (Array.isArray(patch.highlights)) cat.highlights = patch.highlights;
    if (typeof patch.is_active === 'boolean') cat.is_active = patch.is_active;
    this.persist();
    return cat;
  }

  // Gallery management
  public createGalleryItem(input: {
    title: string;
    caption: string;
    category: GalleryCategory;
    image_url: string;
    is_active?: boolean;
  }): GalleryRecord {
    const item: GalleryRecord = {
      id: `gal_${crypto.randomBytes(5).toString('hex')}`,
      title: input.title,
      caption: input.caption || '',
      category: input.category,
      image_url: input.image_url,
      is_active: input.is_active ?? true,
      display_order: this.data.gallery.length + 1,
      created_at: new Date().toISOString(),
    };
    this.data.gallery.push(item);
    this.persist();
    return item;
  }

  public updateGalleryItem(
    id: string,
    patch: Partial<Pick<GalleryRecord, 'title' | 'caption' | 'category' | 'is_active' | 'display_order'>>
  ): GalleryRecord | null {
    const item = this.data.gallery.find((g) => g.id === id);
    if (!item) return null;
    if (typeof patch.title === 'string') item.title = patch.title;
    if (typeof patch.caption === 'string') item.caption = patch.caption;
    if (typeof patch.category === 'string') item.category = patch.category as GalleryCategory;
    if (typeof patch.is_active === 'boolean') item.is_active = patch.is_active;
    if (typeof patch.display_order === 'number') item.display_order = patch.display_order;
    this.persist();
    return item;
  }

  public reorderGalleryItem(id: string, direction: 'up' | 'down'): GalleryRecord[] {
    const sorted = [...this.data.gallery].sort((a, b) => a.display_order - b.display_order);
    const index = sorted.findIndex((g) => g.id === id);
    if (index === -1) return sorted;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return sorted;

    const tempOrder = sorted[index].display_order;
    sorted[index].display_order = sorted[swapIndex].display_order;
    sorted[swapIndex].display_order = tempOrder;

    // Normalize orders
    sorted
      .sort((a, b) => a.display_order - b.display_order)
      .forEach((item, idx) => {
        item.display_order = idx + 1;
      });

    this.data.gallery = sorted;
    this.persist();
    return this.getGallery(false);
  }

  public deleteGalleryItem(id: string): boolean {
    const prev = this.data.gallery.length;
    this.data.gallery = this.data.gallery.filter((g) => g.id !== id);
    if (this.data.gallery.length !== prev) {
      this.persist();
      return true;
    }
    return false;
  }

  // Reviews management
  public createReview(input: {
    customer_name: string;
    review: string;
    rating: number;
    source: string;
    is_verified?: boolean;
    is_published?: boolean;
  }): ReviewRecord {
    const rev: ReviewRecord = {
      id: `rev_${crypto.randomBytes(5).toString('hex')}`,
      customer_name: input.customer_name,
      review: input.review,
      rating: Math.max(1, Math.min(5, Math.round(input.rating))),
      source: input.source || 'Direct Customer Submission',
      is_verified: input.is_verified ?? false,
      is_published: input.is_published ?? false,
      created_at: new Date().toISOString(),
    };
    this.data.reviews.push(rev);
    this.persist();
    return rev;
  }

  public updateReview(
    id: string,
    patch: Partial<Pick<ReviewRecord, 'customer_name' | 'review' | 'rating' | 'source' | 'is_verified' | 'is_published'>>
  ): ReviewRecord | null {
    const rev = this.data.reviews.find((r) => r.id === id);
    if (!rev) return null;
    if (typeof patch.customer_name === 'string') rev.customer_name = patch.customer_name;
    if (typeof patch.review === 'string') rev.review = patch.review;
    if (typeof patch.rating === 'number') rev.rating = Math.max(1, Math.min(5, Math.round(patch.rating)));
    if (typeof patch.source === 'string') rev.source = patch.source;
    if (typeof patch.is_verified === 'boolean') rev.is_verified = patch.is_verified;
    if (typeof patch.is_published === 'boolean') rev.is_published = patch.is_published;
    this.persist();
    return rev;
  }

  public deleteReview(id: string): boolean {
    const prev = this.data.reviews.length;
    this.data.reviews = this.data.reviews.filter((r) => r.id !== id);
    if (this.data.reviews.length !== prev) {
      this.persist();
      return true;
    }
    return false;
  }

  // FAQs management
  public createFaq(input: { question: string; answer: string }): FaqRecord {
    const faq: FaqRecord = {
      id: `faq_${crypto.randomBytes(5).toString('hex')}`,
      question: input.question,
      answer: input.answer,
      display_order: this.data.faqs.length + 1,
      is_active: true,
    };
    this.data.faqs.push(faq);
    this.persist();
    return faq;
  }

  public updateFaq(
    id: string,
    patch: Partial<Pick<FaqRecord, 'question' | 'answer' | 'is_active' | 'display_order'>>
  ): FaqRecord | null {
    const faq = this.data.faqs.find((f) => f.id === id);
    if (!faq) return null;
    if (typeof patch.question === 'string') faq.question = patch.question;
    if (typeof patch.answer === 'string') faq.answer = patch.answer;
    if (typeof patch.is_active === 'boolean') faq.is_active = patch.is_active;
    if (typeof patch.display_order === 'number') faq.display_order = patch.display_order;
    this.persist();
    return faq;
  }

  public deleteFaq(id: string): boolean {
    const prev = this.data.faqs.length;
    this.data.faqs = this.data.faqs.filter((f) => f.id !== id);
    if (this.data.faqs.length !== prev) {
      this.persist();
      return true;
    }
    return false;
  }

  // Real Analytics Events
  public logAnalyticsEvent(eventType: AnalyticsEventType, metadata = '', pathStr = '/'): AnalyticsEventRecord {
    const ev: AnalyticsEventRecord = {
      id: `ev_${crypto.randomBytes(6).toString('hex')}`,
      event_type: eventType,
      metadata: metadata.slice(0, 250),
      path: pathStr.slice(0, 120),
      created_at: new Date().toISOString(),
    };
    this.data.analytics_events.push(ev);
    // Keep bounded to latest 5,000 real events
    if (this.data.analytics_events.length > 5000) {
      this.data.analytics_events = this.data.analytics_events.slice(-5000);
    }
    this.persist();
    return ev;
  }

  public getAnalyticsEvents(): AnalyticsEventRecord[] {
    return [...this.data.analytics_events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // Admin Users & Auth Verification
  public verifyAdminCredentials(passcode: string): AdminUserRecord | null {
    const envPasscode = process.env.ADMIN_PASSCODE || 'singh98559';
    const admin = this.data.admin_users[0];
    if (!admin) return null;

    // Support either stored hash or environment passcode
    const { hash } = hashPassword(passcode, admin.salt);
    if (hash === admin.password_hash || passcode === envPasscode) {
      admin.last_login_at = new Date().toISOString();
      this.persist();
      return admin;
    }
    return null;
  }

  public updateAdminPasscode(newPasscode: string): boolean {
    const admin = this.data.admin_users[0];
    if (!admin || newPasscode.length < 6) return false;
    const { hash, salt } = hashPassword(newPasscode);
    admin.password_hash = hash;
    admin.salt = salt;
    this.persist();
    return true;
  }

  public getUsersCount(): number {
    return this.data.users.length;
  }
}

export const dbStore = new DatabaseStore();
