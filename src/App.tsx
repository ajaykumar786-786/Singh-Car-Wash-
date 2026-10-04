import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton.tsx';
import {
  AccessoryCategoryRecord,
  BusinessSettingsRecord,
  FaqRecord,
  GalleryCategory,
  GalleryRecord,
  ReviewRecord,
  ServiceWithItems,
} from './db/schema.ts';
import {
  buildBookingWhatsAppMessage,
  buildContextualWhatsAppMessage,
  buildWhatsAppUrl,
  ContextualEnquiryType,
  DEFAULT_PHONE_DISPLAY,
  DEFAULT_PHONE_E164,
  DEFAULT_WHATSAPP_NUMBER,
  trackAnalyticsEvent,
} from './lib/whatsapp.ts';

const HERO_IMAGE = '/src/assets/images/hero_automotive_studio_1791089795811.jpg';

const PREMIUM_CARE_CATEGORIES = [
  {
    id: 'care_1',
    title: 'Gloss & Finish Care',
    subtitle: 'Wash & Foam Care · Full Detailing',
    description:
      'Safe exterior washing, high-foaming surface preparation, and finish care tailored for daily drivers and enthusiasts.',
    image: '/src/assets/images/care_gloss_finish_1791089808896.jpg',
    enquiryTopic: 'Service enquiry' as ContextualEnquiryType,
  },
  {
    id: 'care_2',
    title: 'Cabin Detail',
    subtitle: 'Interior Deep Clean · Steam Wash',
    description:
      'Thorough interior vacuuming, dashboard cleaning, seat care, and targeted steam sanitisation.',
    image: '/src/assets/images/care_cabin_detail_1791089820407.jpg',
    enquiryTopic: 'Service enquiry' as ContextualEnquiryType,
  },
  {
    id: 'care_3',
    title: 'Protection & Shine',
    subtitle: 'Coating · Protection · Gloss',
    description:
      'Protective surface treatments focused on preserving paintwork gloss and simplifying ongoing vehicle care.',
    image: '/src/assets/images/care_protection_shine_1791089833465.jpg',
    enquiryTopic: 'Service enquiry' as ContextualEnquiryType,
  },
  {
    id: 'care_4',
    title: 'Automotive Accessories',
    subtitle: 'LED · Perfumes · Showpieces',
    description:
      'Selected cabin fragrances, LED lighting upgrades, dashboard showpieces, and practical driving accessories.',
    image: '/src/assets/images/care_auto_accessories_1791089844506.jpg',
    enquiryTopic: 'Accessories enquiry' as ContextualEnquiryType,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title: 'Inspect',
    description: 'Understand the vehicle and identify the appropriate level of care.',
  },
  {
    number: '02',
    title: 'Prepare',
    description: 'Prepare exterior and interior surfaces.',
  },
  {
    number: '03',
    title: 'Clean',
    description: 'Remove dirt and refresh surfaces.',
  },
  {
    number: '04',
    title: 'Detail',
    description: 'Give additional attention to important areas.',
  },
  {
    number: '05',
    title: 'Finish',
    description: 'Complete final presentation and quality check.',
  },
  {
    number: '06',
    title: 'Handover',
    description: 'Hand the vehicle back to the customer.',
  },
];

const CONTEXTUAL_ENQUIRIES: {
  type: ContextualEnquiryType;
  label: string;
  sublabel: string;
}[] = [
  { type: 'Booking enquiry', label: 'Booking Enquiry', sublabel: 'Request a slot on WhatsApp' },
  { type: 'Service enquiry', label: 'Service Enquiry', sublabel: 'Ask about wash & detailing' },
  { type: 'Pricing enquiry', label: 'Pricing Enquiry', sublabel: 'Enquire about service rates' },
  {
    type: 'Availability enquiry',
    label: 'Availability Enquiry',
    sublabel: 'Check today’s studio slots',
  },
  {
    type: 'Accessories enquiry',
    label: 'Accessories Enquiry',
    sublabel: 'Ask about cabin & utility gear',
  },
  {
    type: 'Lighting enquiry',
    label: 'Lighting Enquiry',
    sublabel: 'Ask about automotive LED upgrades',
  },
  {
    type: 'Fragrance enquiry',
    label: 'Fragrance Enquiry',
    sublabel: 'Ask about car perfumes & scents',
  },
  {
    type: 'Showpiece enquiry',
    label: 'Showpiece Enquiry',
    sublabel: 'Ask about dashboard showpieces',
  },
];

const GALLERY_FILTER_TABS: ('All' | GalleryCategory)[] = [
  'All',
  'Accessories',
  'Interior',
  'Premium Collection',
  'Lighting & Upgrades',
  'Cabin Style',
];

const TIME_SLOTS = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
];

const FALLBACK_SETTINGS: BusinessSettingsRecord = {
  id: 'settings_default',
  business_name: 'SINGH CAR WASH',
  tagline: 'Premium Car Care · Car Wash · Detailing · Automotive Accessories',
  positioning: 'Complete Car Care Under One Roof',
  city: 'Banga City',
  district: 'District Shaheed Bhagat Singh Nagar',
  state: 'Punjab',
  country: 'India',
  full_location: 'Banga City, District Shaheed Bhagat Singh Nagar, Punjab, India',
  phone_display: DEFAULT_PHONE_DISPLAY,
  phone_e164: DEFAULT_PHONE_E164,
  whatsapp_e164: DEFAULT_WHATSAPP_NUMBER,
  hours_days: 'Open Daily',
  hours_time: '10 AM — 5 PM',
  hours_note: 'Booking subject to confirmation.',
  google_maps_url:
    'https://www.google.com/maps/search/?api=1&query=Singh+Car+Wash+Banga+City+Shaheed+Bhagat+Singh+Nagar+Punjab+India',
  updated_at: '',
};

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  loading?: 'lazy' | 'eager';
}

const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  loading = 'lazy',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#161922] via-[#12141A] to-[#0A0B0E] text-slate-400 p-6 text-center ${className}`}
      >
        <Sparkles className="w-6 h-6 text-amber-500/70 mb-2" />
        <span className="text-xs font-medium text-slate-300">{fallbackLabel || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

export default function App() {
  const [isAdminView, setIsAdminView] = useState(false);

  // Studio Bootstrap Data
  const [settings, setSettings] = useState<BusinessSettingsRecord>(FALLBACK_SETTINGS);
  const [services, setServices] = useState<ServiceWithItems[]>([]);
  const [accessoryCategories, setAccessoryCategories] = useState<AccessoryCategoryRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  // Booking Request Form State
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [carModel, setCarModel] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState('10:00 AM');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [hasTrackedBookingStart, setHasTrackedBookingStart] = useState(false);

  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [preparedBooking, setPreparedBooking] = useState<{
    whatsappUrl: string;
    messageText: string;
    clientName: string;
    serviceName: string;
  } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Gallery Filter & Lightbox
  const [galleryFilter, setGalleryFilter] = useState<'All' | GalleryCategory>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // FAQ Accordion
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq_1');

  // Genuine Customer Review Submission Modal/Drawer
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [custReviewName, setCustReviewName] = useState('');
  const [custReviewText, setCustReviewText] = useState('');
  const [custReviewRating, setCustReviewRating] = useState(5);
  const [reviewSubmitFeedback, setReviewSubmitFeedback] = useState<string | null>(null);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadBootstrapData = useCallback(async () => {
    setBootstrapError(null);
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Unable to load studio data.');
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      if (Array.isArray(data.services)) {
        setServices(data.services);
        if (data.services.length > 0 && !selectedServiceId) {
          setSelectedServiceId(data.services[0].id);
        }
      }
      if (Array.isArray(data.accessoryCategories)) {
        setAccessoryCategories(data.accessoryCategories);
      }
      if (Array.isArray(data.gallery)) {
        setGallery(data.gallery);
      }
      if (Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
      if (Array.isArray(data.faqs)) {
        setFaqs(data.faqs);
      }
    } catch (err: unknown) {
      setBootstrapError(
        err instanceof Error
          ? err.message
          : 'Network error while connecting to Singh Car Wash server.'
      );
    } finally {
      setIsBootstrapping(false);
    }
  }, [selectedServiceId]);

  useEffect(() => {
    loadBootstrapData();
    trackAnalyticsEvent('Page View', 'Home Studio View', '/');
  }, [loadBootstrapData]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectServiceForBooking = (service: ServiceWithItems) => {
    setSelectedServiceId(service.id);
    trackAnalyticsEvent('Service Viewed', service.name, '/#services');
    scrollToSection('booking');
  };

  const handleBookingInputFocus = () => {
    if (!hasTrackedBookingStart) {
      setHasTrackedBookingStart(true);
      trackAnalyticsEvent('Booking Started', 'Booking Form Engaged', '/#booking');
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    const trimmedName = clientName.trim();
    const trimmedPhone = phone.trim();
    const digitsPhone = trimmedPhone.replace(/\D/g, '');
    const trimmedReg = vehicleReg.trim().toUpperCase();
    const trimmedModel = carModel.trim();

    if (trimmedName.length < 2) {
      setBookingError('Please enter your full Client Name.');
      return;
    }
    if (digitsPhone.length < 10 || digitsPhone.length > 15) {
      setBookingError('Please enter a valid 10-digit Phone Number.');
      return;
    }
    if (trimmedReg.length < 4) {
      setBookingError('Please enter a valid Vehicle Registration (e.g., PB01AB1234).');
      return;
    }
    if (trimmedModel.length < 2) {
      setBookingError('Please enter your Car Model (e.g., Creta).');
      return;
    }
    if (!selectedServiceId) {
      setBookingError('Please select a Service Required.');
      return;
    }
    if (!preferredDate) {
      setBookingError('Please select a Preferred Date.');
      return;
    }
    if (!preferredTime) {
      setBookingError('Please select a Preferred Time.');
      return;
    }

    const chosenService =
      services.find((s) => s.id === selectedServiceId)?.name || selectedServiceId;

    setIsSubmittingBooking(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: trimmedName,
          phone: trimmedPhone,
          vehicle_registration: trimmedReg,
          car_model: trimmedModel,
          service_id: selectedServiceId,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          additional_notes: additionalNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBookingError(data.error || 'Please check your booking details and try again.');
        return;
      }

      const messageText = buildBookingWhatsAppMessage({
        client_name: trimmedName,
        phone: trimmedPhone,
        vehicle_registration: trimmedReg,
        car_model: trimmedModel,
        service_name: chosenService,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        additional_notes: additionalNotes.trim(),
      });

      const whatsappUrl = buildWhatsAppUrl(messageText, settings.whatsapp_e164);

      setPreparedBooking({
        whatsappUrl,
        messageText,
        clientName: trimmedName,
        serviceName: chosenService,
      });
    } catch {
      // Even if offline/network error, prepare the WhatsApp message so the customer can still book via WhatsApp
      const messageText = buildBookingWhatsAppMessage({
        client_name: trimmedName,
        phone: trimmedPhone,
        vehicle_registration: trimmedReg,
        car_model: trimmedModel,
        service_name: chosenService,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        additional_notes: additionalNotes.trim(),
      });
      const whatsappUrl = buildWhatsAppUrl(messageText, settings.whatsapp_e164);
      setPreparedBooking({
        whatsappUrl,
        messageText,
        clientName: trimmedName,
        serviceName: chosenService,
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleCopyPreparedMessage = async () => {
    if (!preparedBooking) return;
    try {
      await navigator.clipboard.writeText(preparedBooking.messageText);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  const handleCustomerReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitError(null);
    setReviewSubmitFeedback(null);
    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: custReviewName,
          review: custReviewText,
          rating: custReviewRating,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewSubmitError(data.error || 'Could not submit review.');
        return;
      }
      setReviewSubmitFeedback(
        data.message ||
          'Thank you. Your review has been submitted for verification before publication.'
      );
      setCustReviewName('');
      setCustReviewText('');
      setCustReviewRating(5);
    } catch {
      setReviewSubmitError('Network error while submitting review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filteredGallery = gallery.filter(
    (item) => galleryFilter === 'All' || item.category === galleryFilter
  );

  const handleOpenLightbox = (idx: number, title: string) => {
    setLightboxIndex(idx);
    trackAnalyticsEvent('Gallery Opened', title, '/#gallery');
  };

  const handleLightboxPrev = () => {
    if (lightboxIndex === null || filteredGallery.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + filteredGallery.length) % filteredGallery.length);
  };

  const handleLightboxNext = () => {
    if (lightboxIndex === null || filteredGallery.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % filteredGallery.length);
  };

  if (isAdminView) {
    return (
      <AdminDashboard
        onExitAdmin={() => setIsAdminView(false)}
        onDataMutated={loadBootstrapData}
      />
    );
  }

  const generalWhatsAppUrl = buildWhatsAppUrl(
    buildContextualWhatsAppMessage('Booking enquiry'),
    settings.whatsapp_e164
  );

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#F4F4F6] flex flex-col pb-16 md:pb-0">
      <OfflineIndicator />

      {/* 2. TOP BAR CONTRACT: Strictly 1 row, 3 zones (Brand wordmark | 5 Nav Links | Primary Actions) */}
      <header className="sticky top-0 z-30 h-14 bg-[#0A0B0E]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          className="text-base sm:text-lg font-extrabold font-display tracking-tight text-[#F4F4F6] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          {settings.business_name}
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300"
        >
          <a
            href="#services"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Services
          </a>
          <a
            href="#accessories"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Accessories
          </a>
          <a
            href="#process"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Process
          </a>
          <a
            href="#gallery"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Gallery
          </a>
          <a
            href="#contact"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Contact
          </a>
        </nav>

        {/* Zone 3: 1–2 primary actions */}
        <div className="flex items-center gap-2.5">
          <PWAInstallButton />
          <a
            href="#booking"
            onClick={() => trackAnalyticsEvent('Booking Started', 'Header CTA', '/')}
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Book Your Slot
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-white/[0.08] py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Editorial Proposition & Primary Actions */}
            <div className="lg:col-span-7 space-y-6">
              {/* Zero-Pill Metadata Discipline: Clean unboxed text with · separators */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="text-amber-400 font-medium">Banga City, Punjab</span>
                <span aria-hidden="true">·</span>
                <span>Open Daily 10 AM — 5 PM</span>
                <span aria-hidden="true">·</span>
                <span>Car Wash, Detailing &amp; Accessories</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-[#F4F4F6] leading-[1.08]">
                Complete Car Care Under One Roof
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Premium car care, detailing, protection and automotive accessories in Banga City, Punjab.
              </p>

              {/* Primary & Secondary Action Group */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#booking"
                  onClick={() => trackAnalyticsEvent('Booking Started', 'Hero Primary CTA', '/')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors whitespace-nowrap min-h-[48px] focus-visible:outline-2 focus-visible:outline-amber-400"
                >
                  <span>Book Your Slot</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </a>

                <a
                  href={generalWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackAnalyticsEvent('WhatsApp Click', 'Hero Chat on WhatsApp', '/')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#12141A] hover:bg-white/10 px-5 py-3.5 text-sm font-medium text-[#F4F4F6] transition-colors whitespace-nowrap min-h-[48px]"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Chat on WhatsApp</span>
                </a>

                <a
                  href={`tel:${settings.phone_e164}`}
                  onClick={() => trackAnalyticsEvent('Call Click', 'Hero Call Us', '/')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#12141A] hover:bg-white/10 px-5 py-3.5 text-sm font-medium text-[#F4F4F6] transition-colors whitespace-nowrap min-h-[48px]"
                >
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Call Us</span>
                </a>

                <a
                  href={settings.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackAnalyticsEvent('Google Maps Click', 'Hero Open Google Maps', '/')
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent hover:bg-white/5 px-4 py-3.5 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap min-h-[48px]"
                >
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Open Google Maps</span>
                </a>
              </div>

              {/* Unboxed Location & Contact Bar */}
              <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
                <span>{settings.full_location}</span>
                <span aria-hidden="true" className="hidden sm:inline">
                  ·
                </span>
                <span className="font-mono tabular-nums text-slate-300">
                  Phone / WhatsApp: {settings.phone_display}
                </span>
              </div>
            </div>

            {/* Right Column: Dominant 16:9 Automotive Studio Visual */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#12141A] aspect-video lg:aspect-[16/11]">
                <ResilientImage
                  src={HERO_IMAGE}
                  alt="Singh Car Wash — Complete Car Care Under One Roof in Banga City, Punjab"
                  loading="eager"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-5">
                  <p className="text-xs text-amber-400 font-medium">
                    SINGH CAR WASH · BANGA CITY
                  </p>
                  <p className="text-sm font-medium text-white mt-0.5">
                    Car Wash · Interior Deep Clean · Steam Wash · Detailing · Protection · Accessories
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Network Error Fallback Banner if Bootstrap Failed */}
        {bootstrapError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-6">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{bootstrapError} Showing verified baseline studio details.</span>
              </div>
              <button
                type="button"
                onClick={loadBootstrapData}
                className="underline font-medium ml-4 whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* 4. PREMIUM CARE CATEGORIES (Visual Architecture) */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 border-b border-white/[0.08]">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs text-amber-500 font-medium mb-2">
                  STUDIO DISCIPLINES · BANGA CITY
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold font-display">
                  Premium Care Categories
                </h2>
              </div>
              <p className="text-sm text-slate-400 max-w-md">
                Dedicated exterior finishing, cabin hygiene, surface protection, and curated automotive enhancements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PREMIUM_CARE_CATEGORIES.map((cat) => {
                const waUrl = buildWhatsAppUrl(
                  buildContextualWhatsAppMessage(cat.enquiryTopic, cat.title),
                  settings.whatsapp_e164
                );
                return (
                  <div
                    key={cat.id}
                    className="group rounded-2xl border border-white/[0.08] bg-[#12141A] overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="relative aspect-[4/3] overflow-hidden bg-[#0A0B0E]">
                        <ResilientImage
                          src={cat.image}
                          alt={cat.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-transparent" />
                      </div>
                      <div className="p-5 space-y-2">
                        <p className="text-xs text-slate-400">{cat.subtitle}</p>
                        <h3 className="text-lg font-bold font-display text-[#F4F4F6]">
                          {cat.title}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-white/[0.06] mt-2">
                      <a
                        href="#services"
                        className="text-xs font-medium text-amber-400 hover:underline whitespace-nowrap"
                      >
                        Explore Services
                      </a>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackAnalyticsEvent('WhatsApp Click', `Category: ${cat.title}`, '/')
                        }
                        className="text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap"
                      >
                        WhatsApp →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. SERVICES (Six Premium Service Categories) */}
        <section
          id="services"
          className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 border-b border-white/[0.08]"
        >
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs text-amber-500 font-medium mb-2">
                  COMPLETE CAR CARE MENU
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold font-display">
                  Car Care &amp; Detailing Services
                </h2>
              </div>
              <p className="text-sm text-slate-400 max-w-md">
                Select a service below to request a slot or enquire directly via WhatsApp for availability and custom vehicle requirements.
              </p>
            </div>

            {isBootstrapping ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-64 rounded-2xl border border-white/[0.08] bg-[#12141A] animate-pulse p-6"
                  />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-12 text-center">
                <p className="text-sm font-medium text-slate-300">
                  Services are currently being updated
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Please contact Singh Car Wash directly on WhatsApp at {settings.phone_display}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service, idx) => {
                  const serviceWaUrl = buildWhatsAppUrl(
                    buildContextualWhatsAppMessage('Service enquiry', service.name),
                    settings.whatsapp_e164
                  );
                  return (
                    <article
                      key={service.id}
                      className="rounded-2xl border border-white/[0.08] bg-[#12141A] p-6 flex flex-col justify-between hover:border-white/20 transition-colors"
                    >
                      <div className="space-y-4">
                        {/* Unboxed Metadata Kicker */}
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-mono tabular-nums text-amber-500">
                            0{idx + 1}. {service.category_tag}
                          </span>
                          <span>Banga City Studio</span>
                        </div>

                        <h3 className="text-xl font-bold font-display text-[#F4F4F6]">
                          {service.name}
                        </h3>

                        <p className="text-sm text-slate-300 leading-relaxed">
                          {service.short_description}
                        </p>

                        {/* Included Items: Clean unboxed list with subtle separators */}
                        <div className="pt-3 border-t border-white/[0.06]">
                          <p className="text-xs text-slate-400 mb-2">Included Care:</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#F4F4F6]">
                            {service.items.map((item, i) => (
                              <React.Fragment key={item.id}>
                                <span>{item.name}</span>
                                {i < service.items.length - 1 && (
                                  <span aria-hidden="true" className="text-amber-500">
                                    ·
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 mt-6 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectServiceForBooking(service)}
                          className="inline-flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors whitespace-nowrap min-h-[44px]"
                        >
                          Book Your Slot
                        </button>
                        <a
                          href={serviceWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackAnalyticsEvent(
                              'WhatsApp Click',
                              `Service Enquiry: ${service.name}`,
                              '/#services'
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/10 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap min-h-[44px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>WhatsApp Enquiry</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 5. ACCESSORIES DISCOVERY SECTION */}
        <section
          id="accessories"
          className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 border-b border-white/[0.08] bg-[#0D0F14]"
        >
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs text-amber-500 font-medium">
                  IN-STUDIO DISCOVERY · ENQUIRY BASED
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold font-display">
                  Automotive Accessories
                </h2>
                <p className="text-sm text-slate-300 max-w-2xl">
                  Explore interior and exterior accessories at Singh Car Wash in Banga City. Enquire directly on WhatsApp to ask about specific accessories for your car model.
                </p>
              </div>

              <a
                href={buildWhatsAppUrl(
                  buildContextualWhatsAppMessage('Accessories enquiry'),
                  settings.whatsapp_e164
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackAnalyticsEvent(
                    'Accessory Enquiry',
                    'Primary CTA: Ask About Accessories on WhatsApp',
                    '/#accessories'
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors whitespace-nowrap self-start lg:self-auto min-h-[48px]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Ask About Accessories on WhatsApp</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accessoryCategories.map((acc, index) => {
                const enquiryType = (
                  ['Lighting enquiry', 'Fragrance enquiry', 'Showpiece enquiry'].includes(
                    acc.enquiry_topic
                  )
                    ? acc.enquiry_topic
                    : 'Accessories enquiry'
                ) as ContextualEnquiryType;

                const accWaUrl = buildWhatsAppUrl(
                  buildContextualWhatsAppMessage(enquiryType, acc.name),
                  settings.whatsapp_e164
                );

                return (
                  <div
                    key={acc.id}
                    className={`rounded-2xl border border-white/[0.08] bg-[#12141A] p-6 flex flex-col justify-between ${
                      index === 0 ? 'lg:col-span-2' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400">
                        <span className="font-mono text-amber-500">0{index + 1}.</span> Studio Accessory Category
                      </div>
                      <h3 className="text-xl font-bold font-display text-[#F4F4F6]">
                        {acc.name}
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {acc.description}
                      </p>
                      <div className="pt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        {acc.highlights.map((h, i) => (
                          <React.Fragment key={h}>
                            <span>{h}</span>
                            {i < acc.highlights.length - 1 && (
                              <span aria-hidden="true" className="text-amber-500">
                                ·
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 mt-5 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-xs text-slate-400">In-studio inspection available</span>
                      <a
                        href={accWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackAnalyticsEvent(
                            'Accessory Enquiry',
                            `Accessory Category: ${acc.name}`,
                            '/#accessories'
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap min-h-[40px]"
                      >
                        <span>Enquire on WhatsApp</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 10. HOW IT WORKS (Six-Step Studio Process) */}
        <section
          id="process"
          className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 border-b border-white/[0.08]"
        >
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs text-amber-500 font-medium mb-2">
                  SYSTEMATIC CARE PROTOCOL
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold font-display">
                  How It Works
                </h2>
              </div>
              <p className="text-sm text-slate-400 max-w-md">
                Every vehicle visiting Singh Car Wash moves through a structured six-stage care workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {HOW_IT_WORKS_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-white/[0.08] bg-[#12141A] p-6 space-y-3"
                >
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-500">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-bold font-display text-[#F4F4F6]">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. BOOKING SYSTEM & 7. CONTEXTUAL WHATSAPP ENQUIRIES */}
        <section
          id="booking"
          className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 border-b border-white/[0.08] bg-[#0D0F14]"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            {/* Left 7 Cols: Booking Request Form */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-6 sm:p-8">
                <div className="space-y-2 mb-6">
                  <p className="text-xs text-amber-500 font-medium">
                    OPEN DAILY 10 AM — 5 PM · SUBJECT TO CONFIRMATION
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold font-display">
                    Book Your Slot
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Complete your vehicle and service details below to prepare a booking request for Singh Car Wash.
                  </p>
                </div>

                {bookingError && (
                  <div
                    role="alert"
                    className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200 flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {preparedBooking ? (
                  <div className="space-y-6 py-4" role="status" aria-live="polite">
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
                      <div className="flex items-center gap-2.5 text-emerald-300 font-semibold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span>Booking Request Prepared</span>
                      </div>
                      <p className="text-sm text-[#F4F4F6] leading-relaxed font-medium">
                        Your booking request has been prepared. Please send the WhatsApp message. Singh Car Wash will confirm availability.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[#0A0B0E] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">
                          Prepared Message for {settings.phone_display}:
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyPreparedMessage}
                          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline min-h-[36px] px-2"
                        >
                          {copiedMessage ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {preparedBooking.messageText}
                      </pre>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <a
                        href={preparedBooking.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackAnalyticsEvent(
                            'WhatsApp Click',
                            `Send Booking Request: ${preparedBooking.serviceName}`,
                            '/#booking'
                          )
                        }
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors min-h-[48px]"
                      >
                        <MessageCircle className="w-4 h-4 shrink-0" />
                        <span>Send Booking Request on WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setPreparedBooking(null)}
                        className="rounded-xl border border-white/15 px-5 py-3.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors min-h-[48px]"
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleBookingSubmit}
                    onFocus={handleBookingInputFocus}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="booking-client-name"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Client Name *
                        </label>
                        <input
                          id="booking-client-name"
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="booking-phone"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Phone Number *
                        </label>
                        <input
                          id="booking-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98559 53842"
                          className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-4 py-3 text-sm font-mono text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="booking-reg"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Vehicle Registration *
                        </label>
                        <input
                          id="booking-reg"
                          type="text"
                          required
                          value={vehicleReg}
                          onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                          placeholder="PB01AB1234"
                          className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-4 py-3 text-sm font-mono uppercase text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="booking-model"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Car Model *
                        </label>
                        <input
                          id="booking-model"
                          type="text"
                          required
                          value={carModel}
                          onChange={(e) => setCarModel(e.target.value)}
                          placeholder="Creta"
                          className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="booking-service"
                        className="block text-xs font-medium text-slate-300 mb-1.5"
                      >
                        Service Required *
                      </label>
                      <select
                        id="booking-service"
                        required
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none min-h-[44px]"
                      >
                        {services.map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name} ({srv.items.map((i) => i.name).join(', ')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="booking-date"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Preferred Date *
                        </label>
                        <input
                          id="booking-date"
                          type="date"
                          required
                          value={preferredDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-4 py-3 text-sm font-mono text-white focus:border-amber-500 focus:outline-none min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="booking-time"
                          className="block text-xs font-medium text-slate-300 mb-1.5"
                        >
                          Preferred Time (10 AM — 5 PM) *
                        </label>
                        <select
                          id="booking-time"
                          required
                          value={preferredTime}
                          onChange={(e) => setPreferredTime(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-4 py-3 text-sm font-mono text-white focus:border-amber-500 focus:outline-none min-h-[44px]"
                        >
                          {TIME_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="booking-notes"
                        className="block text-xs font-medium text-slate-300 mb-1.5"
                      >
                        Additional Notes
                      </label>
                      <textarea
                        id="booking-notes"
                        rows={3}
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="Any specific area of attention or accessory enquiry..."
                        className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] p-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingBooking}
                      className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 py-3.5 px-6 text-sm font-semibold text-white transition-colors min-h-[48px] flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>
                        {isSubmittingBooking
                          ? 'Preparing Booking Request...'
                          : 'Generate VIP Booking & WhatsApp'}
                      </span>
                    </button>

                    <p className="text-xs text-slate-400 text-center">
                      Creates a booking request only. Singh Car Wash will confirm availability via WhatsApp.
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Right 5 Cols: 7. Contextual WhatsApp Enquiries Hub & Business Hours */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-5">
                <div>
                  <p className="text-xs text-amber-500 font-medium mb-1">
                    DIRECT WHATSAPP CONCIERGE
                  </p>
                  <h3 className="text-xl font-bold font-display">
                    Quick WhatsApp Enquiries
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tap any topic below to launch a pre-filled WhatsApp message to {settings.phone_display}.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CONTEXTUAL_ENQUIRIES.map((enq) => {
                    const url = buildWhatsAppUrl(
                      buildContextualWhatsAppMessage(enq.type),
                      settings.whatsapp_e164
                    );
                    const isAccessory = [
                      'Accessories enquiry',
                      'Lighting enquiry',
                      'Fragrance enquiry',
                      'Showpiece enquiry',
                    ].includes(enq.type);

                    return (
                      <a
                        key={enq.type}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackAnalyticsEvent(
                            isAccessory ? 'Accessory Enquiry' : 'WhatsApp Click',
                            enq.type,
                            '/#booking'
                          )
                        }
                        className="rounded-xl border border-white/[0.08] bg-[#0A0B0E] hover:border-amber-500/40 hover:bg-white/[0.03] p-3.5 flex flex-col justify-between transition-colors min-h-[64px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#F4F4F6]">
                            {enq.label}
                          </span>
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1">{enq.sublabel}</span>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* 9. BUSINESS HOURS CARD */}
              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-500 font-medium">STUDIO HOURS</p>
                    <h3 className="text-lg font-bold font-display mt-0.5">
                      {settings.hours_days}
                    </h3>
                  </div>
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>

                <div className="py-3 border-y border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-slate-300">Operating Timings</span>
                  <span className="text-base font-bold font-mono tabular-nums text-white">
                    {settings.hours_time}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{settings.hours_note}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 11. GALLERY SECTION */}
        <section
          id="gallery"
          className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 border-b border-white/[0.08]"
        >
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs text-amber-500 font-medium mb-2">
                  STUDIO PORTFOLIO
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold font-display">
                  Singh Car Wash Gallery
                </h2>
              </div>

              {/* Interactive Filter Controls */}
              <div
                role="tablist"
                aria-label="Gallery categories"
                className="flex items-center gap-1 p-1 rounded-xl bg-[#12141A] border border-white/10 overflow-x-auto"
              >
                {GALLERY_FILTER_TABS.map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={galleryFilter === tab}
                    type="button"
                    onClick={() => setGalleryFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                      galleryFilter === tab
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {filteredGallery.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#12141A] p-12 text-center max-w-2xl mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-amber-500">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {galleryFilter === 'All'
                    ? 'Genuine Studio Photographs Will Appear Here'
                    : `No photographs in ${galleryFilter} yet`}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We display only authentic photographs from Singh Car Wash in Banga City. Studio photographs can be uploaded and managed anytime through the Admin Panel.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGallery.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenLightbox(idx, item.title)}
                    className="group text-left rounded-2xl border border-white/[0.08] bg-[#12141A] overflow-hidden focus-visible:outline-2 focus-visible:outline-amber-500"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-[#0A0B0E]">
                      <ResilientImage
                        src={item.image_url}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-amber-400">{item.category}</p>
                      <h3 className="text-sm font-semibold text-white mt-0.5">{item.title}</h3>
                      {item.caption && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.caption}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Lightbox Modal with Mobile Swipe Support */}
        {lightboxIndex !== null && filteredGallery[lightboxIndex] && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Gallery Lightbox"
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const deltaX = e.changedTouches[0].clientX - touchStartX.current;
              if (deltaX > 50) handleLightboxPrev();
              if (deltaX < -50) handleLightboxNext();
              touchStartX.current = null;
            }}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 rounded-xl bg-white/10 p-3 text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
              aria-label="Close lightbox"
            >
              <X className="w-5 h-5" />
            </button>

            {filteredGallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handleLightboxPrev}
                  className="absolute left-4 rounded-xl bg-white/10 p-3 text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleLightboxNext}
                  className="absolute right-4 rounded-xl bg-white/10 p-3 text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="max-w-4xl w-full space-y-4">
              <img
                src={filteredGallery[lightboxIndex].image_url}
                alt={filteredGallery[lightboxIndex].title}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto mx-auto rounded-2xl object-contain"
              />
              <div className="text-center space-y-1">
                <p className="text-xs text-amber-400">
                  {filteredGallery[lightboxIndex].category}
                </p>
                <h4 className="text-base font-semibold text-white">
                  {filteredGallery[lightboxIndex].title}
                </h4>
                {filteredGallery[lightboxIndex].caption && (
                  <p className="text-xs text-slate-300">
                    {filteredGallery[lightboxIndex].caption}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 12. GENUINE REVIEWS SECTION */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 border-b border-white/[0.08] bg-[#0D0F14]">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs text-amber-500 font-medium mb-2">
                  VERIFIED CUSTOMER FEEDBACK
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold font-display">
                  Customer Reviews
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowReviewForm((prev) => !prev)}
                className="rounded-xl border border-white/15 bg-[#12141A] hover:bg-white/10 px-4 py-2.5 text-xs font-medium text-slate-200 transition-colors self-start sm:self-auto min-h-[44px]"
              >
                {showReviewForm ? 'Close Review Form' : 'Submit a Customer Review'}
              </button>
            </div>

            {showReviewForm && (
              <form
                onSubmit={handleCustomerReviewSubmit}
                className="rounded-2xl border border-white/10 bg-[#12141A] p-6 max-w-2xl space-y-4"
              >
                <h3 className="text-base font-semibold">Share Your Experience at Singh Car Wash</h3>
                <p className="text-xs text-slate-400">
                  All customer reviews are verified by Singh Car Wash before publication.
                </p>

                {reviewSubmitFeedback && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
                    {reviewSubmitFeedback}
                  </div>
                )}
                {reviewSubmitError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
                    {reviewSubmitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={custReviewName}
                      onChange={(e) => setCustReviewName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5">Rating *</label>
                    <select
                      value={custReviewRating}
                      onChange={(e) => setCustReviewRating(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white min-h-[42px]"
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} / 5
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">Your Review *</label>
                  <textarea
                    rows={3}
                    required
                    value={custReviewText}
                    onChange={(e) => setCustReviewText(e.target.value)}
                    placeholder="Share details of the service you received..."
                    className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] p-3.5 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-xs font-semibold text-white min-h-[42px]"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#12141A] p-12 text-center">
                <p className="text-base font-medium text-slate-300">
                  Customer reviews will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-2xl border border-white/[0.08] bg-[#12141A] p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1 text-amber-400 font-mono">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{rev.rating}.0 / 5.0</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">“{rev.review}”</p>
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-white">{rev.customer_name}</span>
                      <span>{rev.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 13. FAQ SECTION */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 border-b border-white/[0.08]">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <p className="text-xs text-amber-500 font-medium mb-2">
                COMMON QUESTIONS
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold font-display">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-white/[0.08] bg-[#12141A] overflow-hidden"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 text-sm sm:text-base font-semibold text-[#F4F4F6] hover:bg-white/[0.02] transition-colors min-h-[56px]"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-amber-500 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-white/[0.06] pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8. CONTACT & 14. LOCATION SECTION */}
        <section
          id="contact"
          className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 bg-[#0D0F14]"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Contact Card */}
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#12141A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p className="text-xs text-amber-500 font-medium">
                  VISIT OR CONTACT STUDIO
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold font-display">
                  Singh Car Wash
                </h2>
                <p className="text-sm sm:text-base text-slate-300">
                  {settings.full_location}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.08]">
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <a
                      href={`tel:${settings.phone_e164}`}
                      onClick={() => trackAnalyticsEvent('Call Click', 'Contact Section Phone', '/')}
                      className="text-base font-mono tabular-nums font-semibold text-white hover:text-amber-400 mt-1 inline-block"
                    >
                      {settings.phone_display}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">WhatsApp</p>
                    <a
                      href={generalWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackAnalyticsEvent('WhatsApp Click', 'Contact Section WhatsApp', '/')
                      }
                      className="text-base font-mono tabular-nums font-semibold text-emerald-400 hover:underline mt-1 inline-block"
                    >
                      {settings.phone_display}
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/[0.08]">
                <a
                  href={`tel:${settings.phone_e164}`}
                  onClick={() => trackAnalyticsEvent('Call Click', 'Contact Button Call Us', '/')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-3 text-xs font-semibold text-white transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>Call Us</span>
                </a>

                <a
                  href={generalWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackAnalyticsEvent('WhatsApp Click', 'Contact Button Chat on WhatsApp', '/')
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3 text-xs font-medium text-white transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Chat on WhatsApp</span>
                </a>

                <a
                  href="#booking"
                  onClick={() => trackAnalyticsEvent('Booking Started', 'Contact Section CTA', '/')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3 text-xs font-medium text-white transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Book Your Slot</span>
                </a>

                <a
                  href={settings.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackAnalyticsEvent('Google Maps Click', 'Contact Button Google Maps', '/')
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3 text-xs font-medium text-white transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Open Google Maps</span>
                </a>
              </div>
            </div>

            {/* Location Destination Card */}
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#12141A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <p className="text-xs text-amber-500 font-medium">LOCATION DESTINATION</p>
                <h3 className="text-xl font-bold font-display">Singh Car Wash</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Banga City, District Shaheed Bhagat Singh Nagar, Punjab, India
                </p>
                <p className="text-xs text-slate-400 pt-2">
                  Open Daily: 10 AM — 5 PM · Booking subject to confirmation.
                </p>
              </div>

              <a
                href={settings.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackAnalyticsEvent('Google Maps Click', 'Location Card Open Google Maps', '/')
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#0A0B0E] hover:bg-slate-200 px-5 py-3.5 text-xs font-bold transition-colors min-h-[48px]"
              >
                <span>Open Google Maps</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-white/[0.08] bg-[#0A0B0E] py-10 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-bold font-display text-white">
              {settings.business_name}
            </p>
            <p className="text-xs text-slate-400">
              {settings.tagline} · {settings.full_location}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
            <a href="#services" className="hover:text-white transition-colors">
              Services
            </a>
            <a href="#accessories" className="hover:text-white transition-colors">
              Accessories
            </a>
            <a href="#booking" className="hover:text-white transition-colors">
              Book Slot
            </a>
            <button
              type="button"
              onClick={() => setIsAdminView(true)}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-amber-400 transition-colors min-h-[36px]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 15. STICKY MOBILE BOTTOM BAR: Call | WhatsApp | Book (Compact 56px height to honor 15% Sticky Cap) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#0A0B0E]/95 backdrop-blur-md border-t border-white/15 px-3 grid grid-cols-3 gap-2 items-center">
        <a
          href={`tel:${settings.phone_e164}`}
          onClick={() => trackAnalyticsEvent('Call Click', 'Mobile Sticky Bar Call', '/')}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#12141A] text-xs font-semibold text-white min-h-[44px] active:scale-[0.98] transition-transform"
        >
          <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Call</span>
        </a>

        <a
          href={generalWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackAnalyticsEvent('WhatsApp Click', 'Mobile Sticky Bar WhatsApp', '/')}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-600/20 text-xs font-semibold text-emerald-300 min-h-[44px] active:scale-[0.98] transition-transform"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>WhatsApp</span>
        </a>

        <a
          href="#booking"
          onClick={() => trackAnalyticsEvent('Booking Started', 'Mobile Sticky Bar Book', '/')}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 text-xs font-semibold text-white min-h-[44px] active:scale-[0.98] transition-transform"
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Book</span>
        </a>
      </div>
    </div>
  );
}
