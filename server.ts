import crypto from 'crypto';
import * as dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import zlib from 'zlib';
import { AnalyticsEventType, BookingStatus, GalleryCategory } from './src/db/schema.ts';
import { dbStore } from './src/db/store.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Parse JSON bodies (up to 6MB to support genuine gallery image uploads from Admin)
app.use(express.json({ limit: '6mb' }));

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Generate solid branded PNG icons for PWA compliance if missing
function ensurePwaPngIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const createPngBuffer = (width: number, height: number, maskable: boolean): Buffer => {
    // Creates a valid RGB PNG with obsidian background (#0A0B0E) and warm amber center emblem (#D97706)
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const crc32 = (buf: Buffer): number => {
      let crc = 0xffffffff;
      for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
      }
      return (crc ^ 0xffffffff) >>> 0;
    };

    const makeChunk = (type: string, data: Buffer): Buffer => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length, 0);
      const typeBuf = Buffer.from(type, 'ascii');
      const crcBuf = Buffer.alloc(4);
      crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
      return Buffer.concat([len, typeBuf, data, crcBuf]);
    };

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // color type: truecolor RGB
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const rowSize = width * 3 + 1;
    const rawData = Buffer.alloc(rowSize * height);
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = (width / 2) * (maskable ? 0.34 : 0.4);
    const innerRadius = outerRadius * 0.72;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * rowSize;
      rawData[rowOffset] = 0; // filter type 0
      for (let x = 0; x < width; x++) {
        const pxOffset = rowOffset + 1 + x * 3;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= outerRadius && dist >= innerRadius) {
          // Amber Gold Ring (#D97706)
          rawData[pxOffset] = 217;
          rawData[pxOffset + 1] = 119;
          rawData[pxOffset + 2] = 6;
        } else if (
          Math.abs(dy - outerRadius * 0.15) < outerRadius * 0.16 &&
          Math.abs(dx) < outerRadius * 0.52
        ) {
          // Sleek automotive horizontal bar (#F4F4F6)
          rawData[pxOffset] = 244;
          rawData[pxOffset + 1] = 244;
          rawData[pxOffset + 2] = 246;
        } else {
          // Obsidian Background (#0A0B0E)
          rawData[pxOffset] = 10;
          rawData[pxOffset + 1] = 11;
          rawData[pxOffset + 2] = 14;
        }
      }
    }

    const compressed = zlib.deflateSync(rawData);
    return Buffer.concat([
      signature,
      makeChunk('IHDR', ihdr),
      makeChunk('IDAT', compressed),
      makeChunk('IEND', Buffer.alloc(0)),
    ]);
  };

  const iconsToCreate = [
    { file: 'pwa-192x192.png', size: 192, maskable: false },
    { file: 'pwa-512x512.png', size: 512, maskable: false },
    { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    { file: 'apple-touch-icon.png', size: 180, maskable: false },
  ];

  for (const icon of iconsToCreate) {
    const filePath = path.join(publicDir, icon.file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, createPngBuffer(icon.size, icon.size, icon.maskable));
    }
  }
}

ensurePwaPngIcons();

// Input sanitization helper
function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

// Simple in-memory rate limiter per IP
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
      });
    }

    bucket.count += 1;
    return next();
  };
}

// Admin Session Token Management
const activeAdminSessions = new Map<string, { username: string; role: string; expiresAt: number }>();
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const session = activeAdminSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
  return next();
}

// SEO Routes: /robots.txt & /sitemap.xml
app.get('/robots.txt', (req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const nowIso = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  res.type('application/xml').send(xml);
});

// Public Bootstrap Endpoint
app.get('/api/bootstrap', (_req: Request, res: Response) => {
  try {
    res.json({
      settings: dbStore.getBusinessSettings(),
      services: dbStore.getServices(true),
      accessoryCategories: dbStore.getAccessoryCategories(true),
      gallery: dbStore.getGallery(true),
      reviews: dbStore.getReviews(true),
      faqs: dbStore.getFaqs(true),
    });
  } catch (err) {
    console.error('Failed to load bootstrap data:', err);
    res.status(500).json({ error: 'Unable to load studio data right now.' });
  }
});

// Public Analytics Endpoint
const VALID_EVENTS: AnalyticsEventType[] = [
  'Page View',
  'Service Viewed',
  'Booking Started',
  'Booking Submitted',
  'WhatsApp Click',
  'Call Click',
  'Google Maps Click',
  'Accessory Enquiry',
  'Gallery Opened',
];

app.post('/api/analytics', rateLimit(120, 60_000), (req: Request, res: Response) => {
  try {
    const eventType = sanitizeText(req.body?.event_type, 60) as AnalyticsEventType;
    if (!VALID_EVENTS.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid analytics event type.' });
    }
    const metadata = sanitizeText(req.body?.metadata, 200);
    const pathStr = sanitizeText(req.body?.path || '/', 100);
    const recorded = dbStore.logAnalyticsEvent(eventType, metadata, pathStr);
    return res.status(201).json({ ok: true, event: recorded });
  } catch (err) {
    console.error('Analytics logging error:', err);
    return res.status(500).json({ error: 'Failed to log event.' });
  }
});

// Public Booking Request Submission
app.post('/api/bookings', rateLimit(20, 60_000), (req: Request, res: Response) => {
  try {
    const client_name = sanitizeText(req.body?.client_name, 100);
    const phone = sanitizeText(req.body?.phone, 25);
    const vehicle_registration = sanitizeText(req.body?.vehicle_registration, 25).toUpperCase();
    const car_model = sanitizeText(req.body?.car_model, 80);
    const service_id = sanitizeText(req.body?.service_id, 80);
    const preferred_date = sanitizeText(req.body?.preferred_date, 30);
    const preferred_time = sanitizeText(req.body?.preferred_time, 30);
    const additional_notes = sanitizeText(req.body?.additional_notes, 500);

    const digitsOnlyPhone = phone.replace(/\D/g, '');
    if (!client_name || client_name.length < 2) {
      return res.status(400).json({ error: 'Please enter a valid Client Name.' });
    }
    if (!digitsOnlyPhone || digitsOnlyPhone.length < 10 || digitsOnlyPhone.length > 15) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Phone Number.' });
    }
    if (!vehicle_registration || vehicle_registration.length < 4) {
      return res.status(400).json({ error: 'Please enter a valid Vehicle Registration (e.g., PB01AB1234).' });
    }
    if (!car_model || car_model.length < 2) {
      return res.status(400).json({ error: 'Please enter your Car Model (e.g., Creta).' });
    }
    if (!service_id) {
      return res.status(400).json({ error: 'Please select a Service Required.' });
    }
    if (!preferred_date) {
      return res.status(400).json({ error: 'Please select a Preferred Date.' });
    }
    if (!preferred_time) {
      return res.status(400).json({ error: 'Please select a Preferred Time.' });
    }

    const booking = dbStore.createBooking({
      client_name,
      phone,
      vehicle_registration,
      car_model,
      service_id,
      preferred_date,
      preferred_time,
      additional_notes,
    });

    dbStore.logAnalyticsEvent(
      'Booking Submitted',
      `${booking.service_name} · ${booking.car_model}`,
      '/#booking'
    );

    return res.status(201).json({ booking });
  } catch (err) {
    console.error('Booking creation error:', err);
    return res.status(500).json({ error: 'Unable to process booking request right now.' });
  }
});

// Public Customer Review Submission (Requires Admin verification before publication)
app.post('/api/reviews', rateLimit(10, 60_000), (req: Request, res: Response) => {
  try {
    const customer_name = sanitizeText(req.body?.customer_name, 80);
    const review = sanitizeText(req.body?.review, 600);
    const rating = Number(req.body?.rating);

    if (!customer_name || customer_name.length < 2) {
      return res.status(400).json({ error: 'Please provide your name.' });
    }
    if (!review || review.length < 10) {
      return res.status(400).json({ error: 'Please write a brief review (at least 10 characters).' });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please select a rating between 1 and 5.' });
    }

    const created = dbStore.createReview({
      customer_name,
      review,
      rating,
      source: 'Website Customer Submission',
      is_verified: false,
      is_published: false,
    });

    return res.status(201).json({
      review: created,
      message:
        'Thank you. Your review has been submitted and will appear once verified by Singh Car Wash.',
    });
  } catch (err) {
    console.error('Review submission error:', err);
    return res.status(500).json({ error: 'Unable to submit review at this time.' });
  }
});

// Admin Authentication Endpoints
app.post('/api/admin/login', rateLimit(15, 60_000), (req: Request, res: Response) => {
  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
  if (!passcode) {
    return res.status(400).json({ error: 'Please enter the admin passcode.' });
  }

  const admin = dbStore.verifyAdminCredentials(passcode);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid admin passcode.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  activeAdminSessions.set(token, {
    username: admin.username,
    role: admin.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return res.json({
    token,
    admin: {
      username: admin.username,
      role: admin.role,
      last_login_at: admin.last_login_at,
    },
  });
});

app.post('/api/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.slice('Bearer '.length).trim();
  activeAdminSessions.delete(token);
  return res.json({ ok: true });
});

app.post('/api/admin/change-passcode', requireAdmin, (req: Request, res: Response) => {
  const newPasscode = typeof req.body?.newPasscode === 'string' ? req.body.newPasscode.trim() : '';
  if (newPasscode.length < 6) {
    return res.status(400).json({ error: 'New passcode must be at least 6 characters.' });
  }
  const updated = dbStore.updateAdminPasscode(newPasscode);
  if (!updated) {
    return res.status(400).json({ error: 'Could not update passcode.' });
  }
  return res.json({ ok: true, message: 'Admin passcode updated.' });
});

// Protected Admin Dashboard Payload
app.get('/api/admin/dashboard', requireAdmin, (_req: Request, res: Response) => {
  const bookings = dbStore.getBookings();
  const services = dbStore.getServices(false);
  const accessoryCategories = dbStore.getAccessoryCategories(false);
  const gallery = dbStore.getGallery(false);
  const reviews = dbStore.getReviews(false);
  const faqs = dbStore.getFaqs(false);
  const settings = dbStore.getBusinessSettings();
  const analyticsEvents = dbStore.getAnalyticsEvents();
  const usersCount = dbStore.getUsersCount();

  return res.json({
    bookings,
    services,
    accessoryCategories,
    gallery,
    reviews,
    faqs,
    settings,
    analyticsEvents,
    usersCount,
  });
});

// Admin Booking Management
const VALID_BOOKING_STATUSES: BookingStatus[] = [
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

app.patch('/api/admin/bookings/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const status = req.body?.status as BookingStatus | undefined;
  const additional_notes =
    typeof req.body?.additional_notes === 'string'
      ? sanitizeText(req.body.additional_notes, 500)
      : undefined;

  if (status && !VALID_BOOKING_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid booking status.' });
  }

  const updated = dbStore.updateBooking(id, { status, additional_notes });
  if (!updated) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  return res.json({ booking: updated });
});

app.delete('/api/admin/bookings/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = dbStore.deleteBooking(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Booking not found.' });
  return res.json({ ok: true });
});

// Admin Services Management
app.post('/api/admin/services', requireAdmin, (req: Request, res: Response) => {
  const name = sanitizeText(req.body?.name, 100);
  const short_description = sanitizeText(req.body?.short_description, 400);
  const category_tag = sanitizeText(req.body?.category_tag, 80);
  const items = Array.isArray(req.body?.items)
    ? req.body.items.map((i: unknown) => sanitizeText(i, 80)).filter(Boolean)
    : [];

  if (!name || !short_description) {
    return res.status(400).json({ error: 'Service name and short description are required.' });
  }
  const service = dbStore.createService({ name, short_description, category_tag, items });
  return res.status(201).json({ service });
});

app.put('/api/admin/services/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const name = req.body?.name !== undefined ? sanitizeText(req.body.name, 100) : undefined;
  const short_description =
    req.body?.short_description !== undefined
      ? sanitizeText(req.body.short_description, 400)
      : undefined;
  const category_tag =
    req.body?.category_tag !== undefined ? sanitizeText(req.body.category_tag, 80) : undefined;
  const is_active = typeof req.body?.is_active === 'boolean' ? req.body.is_active : undefined;
  const items = Array.isArray(req.body?.items)
    ? req.body.items.map((i: unknown) => sanitizeText(i, 80)).filter(Boolean)
    : undefined;

  const updated = dbStore.updateService(id, {
    name,
    short_description,
    category_tag,
    is_active,
    items,
  });
  if (!updated) return res.status(404).json({ error: 'Service not found.' });
  return res.json({ service: updated });
});

app.delete('/api/admin/services/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = dbStore.deleteService(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Service not found.' });
  return res.json({ ok: true });
});

// Admin Accessory Categories Management
app.put('/api/admin/accessories/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const name = req.body?.name !== undefined ? sanitizeText(req.body.name, 100) : undefined;
  const description =
    req.body?.description !== undefined ? sanitizeText(req.body.description, 400) : undefined;
  const enquiry_topic =
    req.body?.enquiry_topic !== undefined ? sanitizeText(req.body.enquiry_topic, 100) : undefined;
  const is_active = typeof req.body?.is_active === 'boolean' ? req.body.is_active : undefined;
  const highlights = Array.isArray(req.body?.highlights)
    ? req.body.highlights.map((h: unknown) => sanitizeText(h, 80)).filter(Boolean)
    : undefined;

  const updated = dbStore.updateAccessoryCategory(id, {
    name,
    description,
    enquiry_topic,
    is_active,
    highlights,
  });
  if (!updated) return res.status(404).json({ error: 'Accessory category not found.' });
  return res.json({ category: updated });
});

// Admin Gallery Management
const VALID_GALLERY_CATEGORIES: GalleryCategory[] = [
  'Accessories',
  'Interior',
  'Premium Collection',
  'Lighting & Upgrades',
  'Cabin Style',
];

app.post('/api/admin/gallery', requireAdmin, (req: Request, res: Response) => {
  const title = sanitizeText(req.body?.title, 120);
  const caption = sanitizeText(req.body?.caption, 250);
  const category = sanitizeText(req.body?.category, 60) as GalleryCategory;
  const image_url = typeof req.body?.image_url === 'string' ? req.body.image_url.trim() : '';

  if (!title) {
    return res.status(400).json({ error: 'Photo title is required.' });
  }
  if (!VALID_GALLERY_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid gallery category.' });
  }
  const isDataImage = /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image_url);
  const isHttpImage = /^https?:\/\/.+/i.test(image_url) || image_url.startsWith('/');
  if (!image_url || (!isDataImage && !isHttpImage)) {
    return res.status(400).json({ error: 'Please upload a valid image file (JPG, PNG, WebP).' });
  }

  const item = dbStore.createGalleryItem({
    title,
    caption,
    category,
    image_url,
    is_active: true,
  });
  return res.status(201).json({ item });
});

app.patch('/api/admin/gallery/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  if (req.body?.reorderDirection === 'up' || req.body?.reorderDirection === 'down') {
    const gallery = dbStore.reorderGalleryItem(id, req.body.reorderDirection);
    return res.json({ gallery });
  }

  const title = req.body?.title !== undefined ? sanitizeText(req.body.title, 120) : undefined;
  const caption = req.body?.caption !== undefined ? sanitizeText(req.body.caption, 250) : undefined;
  const category =
    req.body?.category !== undefined ? (sanitizeText(req.body.category, 60) as GalleryCategory) : undefined;
  const is_active = typeof req.body?.is_active === 'boolean' ? req.body.is_active : undefined;

  const updated = dbStore.updateGalleryItem(id, { title, caption, category, is_active });
  if (!updated) return res.status(404).json({ error: 'Gallery item not found.' });
  return res.json({ item: updated });
});

app.delete('/api/admin/gallery/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = dbStore.deleteGalleryItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Gallery item not found.' });
  return res.json({ ok: true });
});

// Admin Reviews Management (Verification before publication)
app.post('/api/admin/reviews', requireAdmin, (req: Request, res: Response) => {
  const customer_name = sanitizeText(req.body?.customer_name, 80);
  const review = sanitizeText(req.body?.review, 600);
  const rating = Number(req.body?.rating) || 5;
  const source = sanitizeText(req.body?.source || 'Verified In-Studio Customer', 80);
  const is_verified = Boolean(req.body?.is_verified ?? true);
  const is_published = Boolean(req.body?.is_published ?? true);

  if (!customer_name || !review) {
    return res.status(400).json({ error: 'Customer name and review text are required.' });
  }

  const created = dbStore.createReview({
    customer_name,
    review,
    rating,
    source,
    is_verified,
    is_published,
  });
  return res.status(201).json({ review: created });
});

app.patch('/api/admin/reviews/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const is_verified = typeof req.body?.is_verified === 'boolean' ? req.body.is_verified : undefined;
  const is_published =
    typeof req.body?.is_published === 'boolean' ? req.body.is_published : undefined;
  const customer_name =
    req.body?.customer_name !== undefined ? sanitizeText(req.body.customer_name, 80) : undefined;
  const review = req.body?.review !== undefined ? sanitizeText(req.body.review, 600) : undefined;
  const source = req.body?.source !== undefined ? sanitizeText(req.body.source, 80) : undefined;
  const rating = req.body?.rating !== undefined ? Number(req.body.rating) : undefined;

  const updated = dbStore.updateReview(id, {
    is_verified,
    is_published,
    customer_name,
    review,
    source,
    rating,
  });
  if (!updated) return res.status(404).json({ error: 'Review not found.' });
  return res.json({ review: updated });
});

app.delete('/api/admin/reviews/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = dbStore.deleteReview(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Review not found.' });
  return res.json({ ok: true });
});

// Admin FAQs Management
app.post('/api/admin/faqs', requireAdmin, (req: Request, res: Response) => {
  const question = sanitizeText(req.body?.question, 200);
  const answer = sanitizeText(req.body?.answer, 600);
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required.' });
  }
  const faq = dbStore.createFaq({ question, answer });
  return res.status(201).json({ faq });
});

app.put('/api/admin/faqs/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const question =
    req.body?.question !== undefined ? sanitizeText(req.body.question, 200) : undefined;
  const answer = req.body?.answer !== undefined ? sanitizeText(req.body.answer, 600) : undefined;
  const is_active = typeof req.body?.is_active === 'boolean' ? req.body.is_active : undefined;

  const updated = dbStore.updateFaq(id, { question, answer, is_active });
  if (!updated) return res.status(404).json({ error: 'FAQ not found.' });
  return res.json({ faq: updated });
});

app.delete('/api/admin/faqs/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = dbStore.deleteFaq(req.params.id);
  if (!ok) return res.status(404).json({ error: 'FAQ not found.' });
  return res.json({ ok: true });
});

// Admin Business Settings Management
app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const patch = {
    business_name:
      req.body?.business_name !== undefined
        ? sanitizeText(req.body.business_name, 100)
        : undefined,
    tagline: req.body?.tagline !== undefined ? sanitizeText(req.body.tagline, 150) : undefined,
    positioning:
      req.body?.positioning !== undefined ? sanitizeText(req.body.positioning, 150) : undefined,
    full_location:
      req.body?.full_location !== undefined ? sanitizeText(req.body.full_location, 200) : undefined,
    phone_display:
      req.body?.phone_display !== undefined ? sanitizeText(req.body.phone_display, 30) : undefined,
    phone_e164:
      req.body?.phone_e164 !== undefined ? sanitizeText(req.body.phone_e164, 20) : undefined,
    whatsapp_e164:
      req.body?.whatsapp_e164 !== undefined ? sanitizeText(req.body.whatsapp_e164, 20) : undefined,
    hours_days:
      req.body?.hours_days !== undefined ? sanitizeText(req.body.hours_days, 60) : undefined,
    hours_time:
      req.body?.hours_time !== undefined ? sanitizeText(req.body.hours_time, 60) : undefined,
    hours_note:
      req.body?.hours_note !== undefined ? sanitizeText(req.body.hours_note, 150) : undefined,
    google_maps_url:
      req.body?.google_maps_url !== undefined
        ? sanitizeText(req.body.google_maps_url, 400)
        : undefined,
  };
  // Filter out undefined keys
  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([_, v]) => v !== undefined && v !== '')
  );
  const settings = dbStore.updateBusinessSettings(cleanPatch);
  return res.json({ settings });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Singh Car Wash server listening on http://localhost:${PORT}`);
  });
}

startServer();
