import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AccessoryCategoryRecord,
  AnalyticsEventRecord,
  AnalyticsEventType,
  BookingRecord,
  BookingStatus,
  BusinessSettingsRecord,
  FaqRecord,
  GalleryCategory,
  GalleryRecord,
  POSTGRES_SCHEMA_DDL,
  ReviewRecord,
  ServiceWithItems,
} from '../db/schema.ts';
import { buildWhatsAppUrl } from '../lib/whatsapp.ts';

type AdminTab =
  | 'dashboard'
  | 'bookings'
  | 'services'
  | 'accessories'
  | 'gallery'
  | 'reviews'
  | 'faqs'
  | 'business'
  | 'analytics'
  | 'settings';

const BOOKING_STATUSES: BookingStatus[] = [
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

const GALLERY_CATEGORIES: GalleryCategory[] = [
  'Accessories',
  'Interior',
  'Premium Collection',
  'Lighting & Upgrades',
  'Cabin Style',
];

const ANALYTICS_EVENT_TYPES: AnalyticsEventType[] = [
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

interface AdminDashboardProps {
  onExitAdmin: () => void;
  onDataMutated: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onExitAdmin,
  onDataMutated,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Admin Data State
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [services, setServices] = useState<ServiceWithItems[]>([]);
  const [accessoryCategories, setAccessoryCategories] = useState<AccessoryCategoryRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [settings, setSettings] = useState<BusinessSettingsRecord | null>(null);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRecord[]>([]);

  // Filter / Form states
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [bookingSearch, setBookingSearch] = useState('');

  // New Service Form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Gloss & Finish Care');
  const [newServiceItems, setNewServiceItems] = useState('');

  // Editing Service ID
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceDesc, setEditServiceDesc] = useState('');
  const [editServiceCategory, setEditServiceCategory] = useState('');
  const [editServiceItems, setEditServiceItems] = useState('');

  // New Gallery Upload Form
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>('Premium Collection');
  const [galleryImageData, setGalleryImageData] = useState('');

  // New Verified Review Form
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSource, setReviewSource] = useState('In-Studio Customer');

  // New FAQ Form
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');

  // Settings Passcode Form
  const [newPasscode, setNewPasscode] = useState('');

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const fetchAdminData = useCallback(
    async (currentToken: string) => {
      setIsLoading(true);
      setNetworkError(null);
      try {
        const res = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (res.status === 401) {
          setToken(null);
          setSessionExpired(true);
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load admin dashboard data.');
        }
        const data = await res.json();
        setBookings(data.bookings || []);
        setServices(data.services || []);
        setAccessoryCategories(data.accessoryCategories || []);
        setGallery(data.gallery || []);
        setReviews(data.reviews || []);
        setFaqs(data.faqs || []);
        setSettings(data.settings || null);
        setAnalyticsEvents(data.analyticsEvents || []);
      } catch (err: unknown) {
        setNetworkError(
          err instanceof Error ? err.message : 'Network error loading admin data.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (token) {
      fetchAdminData(token);
    }
  }, [token, fetchAdminData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSessionExpired(false);
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Unauthorized access.');
        return;
      }
      setToken(data.token);
      setPasscodeInput('');
    } catch {
      setAuthError('Network error while connecting to authentication server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    setToken(null);
  };

  const adminFetch = async (url: string, options: RequestInit = {}) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) {
      setToken(null);
      setSessionExpired(true);
      throw new Error('Session expired. Please sign in again.');
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Operation failed');
    }
    return data;
  };

  // Booking status update
  const handleUpdateBookingStatus = async (id: string, status: BookingStatus) => {
    try {
      await adminFetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await fetchAdminData(token!);
      onDataMutated();
      showToast(`Booking status updated to ${status}`);
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      await adminFetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
      await fetchAdminData(token!);
      showToast('Booking request removed');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Services CRUD
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = newServiceItems
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await adminFetch('/api/admin/services', {
        method: 'POST',
        body: JSON.stringify({
          name: newServiceName,
          short_description: newServiceDesc,
          category_tag: newServiceCategory,
          items,
        }),
      });
      setNewServiceName('');
      setNewServiceDesc('');
      setNewServiceItems('');
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Service created');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Could not create service');
    }
  };

  const startEditingService = (srv: ServiceWithItems) => {
    setEditingServiceId(srv.id);
    setEditServiceName(srv.name);
    setEditServiceDesc(srv.short_description);
    setEditServiceCategory(srv.category_tag);
    setEditServiceItems(srv.items.map((i) => i.name).join(', '));
  };

  const handleSaveServiceEdit = async (id: string) => {
    try {
      const items = editServiceItems
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await adminFetch(`/api/admin/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editServiceName,
          short_description: editServiceDesc,
          category_tag: editServiceCategory,
          items,
        }),
      });
      setEditingServiceId(null);
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Service updated');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to update service');
    }
  };

  const handleToggleServiceActive = async (srv: ServiceWithItems) => {
    try {
      await adminFetch(`/api/admin/services/${srv.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !srv.is_active }),
      });
      await fetchAdminData(token!);
      onDataMutated();
      showToast(`Service ${!srv.is_active ? 'activated' : 'deactivated'}`);
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to update service');
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await adminFetch(`/api/admin/services/${id}`, { method: 'DELETE' });
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Service deleted');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  // Gallery file upload reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setNetworkError('Image size must be under 4.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGalleryImageData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/api/admin/gallery', {
        method: 'POST',
        body: JSON.stringify({
          title: galleryTitle,
          caption: galleryCaption,
          category: galleryCategory,
          image_url: galleryImageData,
        }),
      });
      setGalleryTitle('');
      setGalleryCaption('');
      setGalleryImageData('');
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Genuine photograph added to gallery');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to upload gallery item');
    }
  };

  const handleToggleGalleryActive = async (item: GalleryRecord) => {
    try {
      await adminFetch(`/api/admin/gallery/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Gallery visibility updated');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleReorderGallery = async (id: string, direction: 'up' | 'down') => {
    try {
      await adminFetch(`/api/admin/gallery/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ reorderDirection: direction }),
      });
      await fetchAdminData(token!);
      onDataMutated();
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Reorder failed');
    }
  };

  const handleDeleteGallery = async (id: string) => {
    try {
      await adminFetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Gallery photograph deleted');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Reviews verification & publishing
  const handleAddVerifiedReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/api/admin/reviews', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: reviewName,
          review: reviewText,
          rating: reviewRating,
          source: reviewSource,
          is_verified: true,
          is_published: true,
        }),
      });
      setReviewName('');
      setReviewText('');
      setReviewRating(5);
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Verified customer review published');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Could not add review');
    }
  };

  const handleToggleReviewVerifyPublish = async (rev: ReviewRecord) => {
    try {
      const nextState = !(rev.is_verified && rev.is_published);
      await adminFetch(`/api/admin/reviews/${rev.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_verified: nextState,
          is_published: nextState,
        }),
      });
      await fetchAdminData(token!);
      onDataMutated();
      showToast(nextState ? 'Review verified & published' : 'Review unpublished');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Could not update review');
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await adminFetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Review deleted');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Could not delete review');
    }
  };

  // FAQs CRUD
  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/api/admin/faqs', {
        method: 'POST',
        body: JSON.stringify({ question: faqQuestion, answer: faqAnswer }),
      });
      setFaqQuestion('');
      setFaqAnswer('');
      await fetchAdminData(token!);
      onDataMutated();
      showToast('FAQ added');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to create FAQ');
    }
  };

  const handleToggleFaqActive = async (faq: FaqRecord) => {
    try {
      await adminFetch(`/api/admin/faqs/${faq.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !faq.is_active }),
      });
      await fetchAdminData(token!);
      onDataMutated();
      showToast('FAQ visibility updated');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to update FAQ');
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      await adminFetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
      await fetchAdminData(token!);
      onDataMutated();
      showToast('FAQ removed');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to delete FAQ');
    }
  };

  // Business Settings Save
  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      await fetchAdminData(token!);
      onDataMutated();
      showToast('Business settings saved');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  // Passcode update
  const handlePasscodeChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/api/admin/change-passcode', {
        method: 'POST',
        body: JSON.stringify({ newPasscode }),
      });
      setNewPasscode('');
      showToast('Admin passcode updated');
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : 'Failed to change passcode');
    }
  };

  // Unauthorized / Login Gate
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-[#F4F4F6] flex flex-col justify-between p-6">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onExitAdmin}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Singh Car Wash Studio</span>
          </button>
          <span className="text-xs text-slate-500">Protected Management Console</span>
        </div>

        <div className="max-w-md w-full mx-auto my-12 rounded-2xl border border-white/10 bg-[#12141A] p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-amber-500 font-medium mb-1">SINGH CAR WASH · BANGA CITY</p>
              <h1 className="text-2xl font-bold font-display">Admin Authentication</h1>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          {sessionExpired && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Your admin session has expired. Please sign in again to continue.</span>
            </div>
          )}

          {authError && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-passcode"
                className="block text-xs font-medium text-slate-300 mb-2"
              >
                Studio Admin Passcode
              </label>
              <input
                id="admin-passcode"
                type="password"
                required
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter admin passcode"
                className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 py-3 px-4 text-sm font-semibold text-white transition-colors min-h-[48px]"
            >
              {isLoggingIn ? 'Verifying Access...' : 'Sign In to Admin Dashboard'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Default studio passcode:</span>
            <button
              type="button"
              onClick={() => setPasscodeInput('singh98559')}
              className="font-mono text-amber-400 hover:underline min-h-[36px] px-2"
            >
              Use singh98559
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-600">
          Authorized access only · Singh Car Wash Management System
        </div>
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = bookingFilter === 'ALL' || b.status === bookingFilter;
    const q = bookingSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      b.client_name.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      b.vehicle_registration.toLowerCase().includes(q) ||
      b.car_model.toLowerCase().includes(q) ||
      (b.service_name || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const eventCountsByType = ANALYTICS_EVENT_TYPES.map((type) => ({
    type,
    count: analyticsEvents.filter((ev) => ev.event_type === type).length,
  }));

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'bookings', label: 'Booking Requests', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'services', label: 'Services', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'accessories', label: 'Accessories', icon: <Package className="w-4 h-4" /> },
    { id: 'gallery', label: 'Gallery', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'reviews', label: 'Reviews', icon: <Star className="w-4 h-4" /> },
    { id: 'faqs', label: 'FAQs', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'business', label: 'Business Info', icon: <Building2 className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#F4F4F6] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#12141A] p-4 lg:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-mono text-amber-500">STUDIO CONSOLE</span>
              <h2 className="text-lg font-bold font-display tracking-tight">SINGH CAR WASH</h2>
            </div>
            <button
              type="button"
              onClick={onExitAdmin}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white min-h-[40px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap min-h-[42px] ${
                  activeTab === item.id
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-2 pt-6 border-t border-white/10 mt-6">
          <button
            type="button"
            onClick={onExitAdmin}
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors min-h-[42px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Live Website</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors min-h-[42px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-5 lg:p-10 max-w-6xl w-full mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-white/10">
          <div>
            <p className="text-xs text-slate-400">
              Banga City · District Shaheed Bhagat Singh Nagar · Punjab
            </p>
            <h1 className="text-2xl font-bold font-display mt-0.5 capitalize">
              {navItems.find((i) => i.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => token && fetchAdminData(token)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#12141A] px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors min-h-[42px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {networkError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{networkError}</span>
            </div>
            <button
              type="button"
              onClick={() => setNetworkError(null)}
              className="text-xs underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionFeedback && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-5">
                <p className="text-xs text-slate-400">Total Booking Requests</p>
                <p className="text-3xl font-bold font-mono tabular-nums mt-2">{bookings.length}</p>
                <p className="text-xs text-amber-400 mt-2 font-mono tabular-nums">
                  {bookings.filter((b) => b.status === 'NEW').length} NEW ·{' '}
                  {bookings.filter((b) => b.status === 'CONFIRMED').length} CONFIRMED
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-5">
                <p className="text-xs text-slate-400">Active Studio Services</p>
                <p className="text-3xl font-bold font-mono tabular-nums mt-2">
                  {services.filter((s) => s.is_active).length}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Across {accessoryCategories.length} accessory categories
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-5">
                <p className="text-xs text-slate-400">Verified Customer Reviews</p>
                <p className="text-3xl font-bold font-mono tabular-nums mt-2">
                  {reviews.filter((r) => r.is_verified && r.is_published).length}
                </p>
                <p className="text-xs text-slate-400 mt-2 font-mono tabular-nums">
                  {reviews.filter((r) => !r.is_verified).length} awaiting verification
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-5">
                <p className="text-xs text-slate-400">Real Tracked Events</p>
                <p className="text-3xl font-bold font-mono tabular-nums mt-2">
                  {analyticsEvents.length}
                </p>
                <p className="text-xs text-slate-400 mt-2 font-mono tabular-nums">
                  {
                    analyticsEvents.filter((e) => e.event_type === 'WhatsApp Click')
                      .length
                  }{' '}
                  WhatsApp clicks
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#12141A] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Recent Booking Requests</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs text-amber-400 hover:underline"
                >
                  View all requests →
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  No booking requests submitted yet. New customer slot requests will appear here in real time.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="py-3 pr-4 font-medium">Customer</th>
                        <th className="py-3 px-4 font-medium">Vehicle</th>
                        <th className="py-3 px-4 font-medium">Service</th>
                        <th className="py-3 px-4 font-medium">Preferred Slot</th>
                        <th className="py-3 pl-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bookings.slice(0, 5).map((b) => (
                        <tr key={b.id}>
                          <td className="py-3 pr-4">
                            <div className="font-medium text-white">{b.client_name}</div>
                            <div className="font-mono text-slate-400">{b.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-amber-300">{b.vehicle_registration}</div>
                            <div className="text-slate-400">{b.car_model}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-200">{b.service_name}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-300">
                            {b.preferred_date} · {b.preferred_time}
                          </td>
                          <td className="py-3 pl-4 font-mono text-amber-400">{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BOOKING REQUESTS */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#12141A] p-1.5 border border-white/10">
                {(['ALL', ...BOOKING_STATUSES] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setBookingFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      bookingFilter === status
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <input
                type="search"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search customer, phone, reg no, car..."
                className="w-full sm:w-64 rounded-xl border border-white/10 bg-[#12141A] px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-12 text-center">
                <p className="text-sm text-slate-300 font-medium">No matching booking requests</p>
                <p className="text-xs text-slate-500 mt-1">
                  Booking requests submitted from the public booking form will be listed here.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#12141A] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 bg-white/[0.02]">
                        <th className="py-3.5 px-4 font-medium">Customer</th>
                        <th className="py-3.5 px-4 font-medium">Phone</th>
                        <th className="py-3.5 px-4 font-medium">Vehicle Reg</th>
                        <th className="py-3.5 px-4 font-medium">Car Model</th>
                        <th className="py-3.5 px-4 font-medium">Service</th>
                        <th className="py-3.5 px-4 font-medium">Date &amp; Time</th>
                        <th className="py-3.5 px-4 font-medium">Notes</th>
                        <th className="py-3.5 px-4 font-medium">Status</th>
                        <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredBookings.map((b) => {
                        const confirmMsg = `Hello ${b.client_name},\n\nThis is Singh Car Wash, Banga City. Regarding your booking request for ${b.service_name} (${b.car_model} - ${b.vehicle_registration}) on ${b.preferred_date} at ${b.preferred_time}:\n\nYour slot is confirmed. We look forward to welcoming you.`;
                        const customerWaUrl = buildWhatsAppUrl(
                          confirmMsg,
                          b.phone.replace(/\D/g, '').length === 10
                            ? `91${b.phone.replace(/\D/g, '')}`
                            : b.phone.replace(/\D/g, '')
                        );
                        return (
                          <tr key={b.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 font-medium text-white">{b.client_name}</td>
                            <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300">
                              <a href={`tel:${b.phone}`} className="hover:text-amber-400">
                                {b.phone}
                              </a>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-amber-300">
                              {b.vehicle_registration}
                            </td>
                            <td className="py-3.5 px-4 text-slate-200">{b.car_model}</td>
                            <td className="py-3.5 px-4 text-slate-200">{b.service_name}</td>
                            <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300">
                              <div>{b.preferred_date}</div>
                              <div className="text-slate-500">{b.preferred_time}</div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 max-w-[180px] truncate">
                              {b.additional_notes || '—'}
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                aria-label={`Status for ${b.client_name}`}
                                value={b.status}
                                onChange={(e) =>
                                  handleUpdateBookingStatus(b.id, e.target.value as BookingStatus)
                                }
                                className="rounded-lg border border-white/15 bg-[#0A0B0E] px-2.5 py-1.5 text-xs font-mono text-white focus:border-amber-500 focus:outline-none"
                              >
                                {BOOKING_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <a
                                  href={customerWaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-600/30"
                                  title="Message Customer on WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                  aria-label="Delete booking"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SERVICES */}
        {activeTab === 'services' && (
          <div className="space-y-8">
            <form
              onSubmit={handleCreateService}
              className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-4"
            >
              <h3 className="text-base font-semibold">Add Service Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Service Name</label>
                  <input
                    type="text"
                    required
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="e.g., Wash & Foam Care"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Care Category</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="Gloss & Finish Care">Gloss &amp; Finish Care</option>
                    <option value="Cabin Detail">Cabin Detail</option>
                    <option value="Protection & Shine">Protection &amp; Shine</option>
                    <option value="Automotive Accessories">Automotive Accessories</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Short Description</label>
                <input
                  type="text"
                  required
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Describe the service without unverified claims or prices"
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Included Service Items (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={newServiceItems}
                  onChange={(e) => setNewServiceItems(e.target.value)}
                  placeholder="Foam Wash, Pressure Wash, Body Clean"
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Service</span>
              </button>
            </form>

            <div className="space-y-4">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-4"
                >
                  {editingServiceId === srv.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editServiceName}
                          onChange={(e) => setEditServiceName(e.target.value)}
                          className="rounded-xl border border-white/15 bg-[#0A0B0E] px-3 py-2 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={editServiceCategory}
                          onChange={(e) => setEditServiceCategory(e.target.value)}
                          className="rounded-xl border border-white/15 bg-[#0A0B0E] px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <input
                        type="text"
                        value={editServiceDesc}
                        onChange={(e) => setEditServiceDesc(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-3 py-2 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={editServiceItems}
                        onChange={(e) => setEditServiceItems(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-[#0A0B0E] px-3 py-2 text-xs text-white"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveServiceEdit(srv.id)}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingServiceId(null)}
                          className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-slate-400">
                          {srv.category_tag} · {srv.is_active ? 'Active' : 'Hidden'}
                        </div>
                        <h4 className="text-base font-semibold text-white mt-0.5">{srv.name}</h4>
                        <p className="text-xs text-slate-300 mt-1">{srv.short_description}</p>
                        <p className="text-xs text-amber-400 mt-2">
                          Included: {srv.items.map((i) => i.name).join(' · ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditingService(srv)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleServiceActive(srv)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                        >
                          {srv.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                          aria-label="Delete service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ACCESSORIES */}
        {activeTab === 'accessories' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Enquiry-based automotive accessory discovery categories. Do not add unverified prices, brands, or stock numbers.
            </p>
            {accessoryCategories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-white/10 bg-[#12141A] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs text-slate-400">
                    {cat.enquiry_topic} · {cat.is_active ? 'Active' : 'Hidden'}
                  </div>
                  <h4 className="text-base font-semibold text-white mt-0.5">{cat.name}</h4>
                  <p className="text-xs text-slate-300 mt-1">{cat.description}</p>
                  <p className="text-xs text-amber-400 mt-2">
                    {cat.highlights.join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await adminFetch(`/api/admin/accessories/${cat.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ is_active: !cat.is_active }),
                    });
                    await fetchAdminData(token!);
                    onDataMutated();
                  }}
                  className="rounded-xl border border-white/10 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/5 self-start sm:self-center shrink-0"
                >
                  {cat.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: GALLERY */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            <form
              onSubmit={handleAddGalleryItem}
              className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-semibold">Upload Genuine Singh Car Wash Photograph</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload only authentic photographs from Singh Car Wash, Banga City. Do not upload AI-generated images as business photographs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Photograph Title</label>
                  <input
                    type="text"
                    required
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    placeholder="e.g., Interior Cabin Detailing"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Category</label>
                  <select
                    value={galleryCategory}
                    onChange={(e) => setGalleryCategory(e.target.value as GalleryCategory)}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                  >
                    {GALLERY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Select Image File (JPG/PNG/WebP)
                  </label>
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#0A0B0E] px-4 py-3 text-xs text-slate-300 cursor-pointer hover:border-amber-500/50">
                    <Upload className="w-4 h-4 text-amber-500" />
                    <span>{galleryImageData ? 'Image Selected Ready to Upload' : 'Choose Image File'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Caption (Optional)</label>
                  <input
                    type="text"
                    value={galleryCaption}
                    onChange={(e) => setGalleryCaption(e.target.value)}
                    placeholder="Brief description of work performed"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!galleryImageData || !galleryTitle}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 px-4 py-2.5 text-xs font-semibold text-white min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Publish to Gallery</span>
              </button>
            </form>

            {gallery.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-12 text-center">
                <p className="text-sm text-slate-300 font-medium">Gallery is currently empty</p>
                <p className="text-xs text-slate-500 mt-1">
                  Upload genuine Singh Car Wash photographs above to display them in the public gallery.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gallery.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#12141A] p-4 flex gap-4 items-center"
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-24 h-20 rounded-xl object-cover bg-[#0A0B0E] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-amber-400">
                        {item.category} · {item.is_active ? 'Active' : 'Hidden'}
                      </div>
                      <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                      {item.caption && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{item.caption}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => handleToggleGalleryActive(item)}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5"
                        >
                          {item.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleReorderGallery(item.id, 'up')}
                          className="p-1 rounded-lg border border-white/10 text-slate-400 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === gallery.length - 1}
                          onClick={() => handleReorderGallery(item.id, 'down')}
                          className="p-1 rounded-lg border border-white/10 text-slate-400 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGallery(item.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 ml-auto"
                          aria-label="Delete photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-8">
            <form
              onSubmit={handleAddVerifiedReview}
              className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-semibold">Publish Verified Customer Review</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only publish genuine, verified customer reviews. Never invent testimonials.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Customer full name"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Rating (1–5)</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Stars
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Review Source</label>
                  <input
                    type="text"
                    required
                    value={reviewSource}
                    onChange={(e) => setReviewSource(e.target.value)}
                    placeholder="e.g., WhatsApp Feedback / In-Studio"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Customer Review</label>
                <textarea
                  rows={3}
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Enter exact feedback shared by the customer"
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] p-3.5 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white min-h-[42px]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Publish Review</span>
              </button>
            </form>

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#12141A] p-12 text-center">
                <p className="text-sm text-slate-300 font-medium">No customer reviews recorded yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted customer reviews require verification here before appearing on the website.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-2xl border border-white/10 bg-[#12141A] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs text-slate-400">
                        {rev.customer_name} · {rev.rating}/5 Rating · Source: {rev.source} ·{' '}
                        <span
                          className={
                            rev.is_verified && rev.is_published
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }
                        >
                          {rev.is_verified && rev.is_published
                            ? 'Verified & Published'
                            : 'Pending Verification'}
                        </span>
                      </div>
                      <p className="text-sm text-white mt-2">{rev.review}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleReviewVerifyPublish(rev)}
                        className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
                      >
                        {rev.is_verified && rev.is_published
                          ? 'Unpublish'
                          : 'Verify & Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-red-400"
                        aria-label="Delete review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: FAQS */}
        {activeTab === 'faqs' && (
          <div className="space-y-8">
            <form
              onSubmit={handleCreateFaq}
              className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-4"
            >
              <h3 className="text-base font-semibold">Add Frequently Asked Question</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Question</label>
                <input
                  type="text"
                  required
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Answer</label>
                <textarea
                  rows={2}
                  required
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] p-3.5 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add FAQ</span>
              </button>
            </form>

            <div className="space-y-4">
              {faqs.map((f) => (
                <div
                  key={f.id}
                  className="rounded-2xl border border-white/10 bg-[#12141A] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{f.question}</h4>
                    <p className="text-xs text-slate-300 mt-1">{f.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFaqActive(f)}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300"
                    >
                      {f.is_active ? 'Active' : 'Hidden'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(f.id)}
                      className="p-2 text-slate-500 hover:text-red-400"
                      aria-label="Delete FAQ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: BUSINESS INFORMATION */}
        {activeTab === 'business' && settings && (
          <form
            onSubmit={handleSaveBusinessSettings}
            className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-5"
          >
            <h3 className="text-base font-semibold">Verified Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={settings.business_name}
                  onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Core Positioning</label>
                <input
                  type="text"
                  value={settings.positioning}
                  onChange={(e) => setSettings({ ...settings, positioning: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Phone / WhatsApp Display</label>
                <input
                  type="text"
                  value={settings.phone_display}
                  onChange={(e) => setSettings({ ...settings, phone_display: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Location</label>
                <input
                  type="text"
                  value={settings.full_location}
                  onChange={(e) => setSettings({ ...settings, full_location: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Operating Days</label>
                <input
                  type="text"
                  value={settings.hours_days}
                  onChange={(e) => setSettings({ ...settings, hours_days: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Operating Hours</label>
                <input
                  type="text"
                  value={settings.hours_time}
                  onChange={(e) => setSettings({ ...settings, hours_time: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Google Maps Destination URL</label>
              <input
                type="url"
                value={settings.google_maps_url}
                onChange={(e) => setSettings({ ...settings, google_maps_url: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-xs font-semibold text-white min-h-[42px]"
            >
              Save Business Information
            </button>
          </form>
        )}

        {/* TAB 9: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {eventCountsByType.map((item) => (
                <div
                  key={item.type}
                  className="rounded-2xl border border-white/10 bg-[#12141A] p-4 flex items-center justify-between"
                >
                  <span className="text-xs text-slate-300">{item.type}</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-amber-400">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#12141A] p-6">
              <h3 className="text-base font-semibold mb-4">Real-Time Event Stream</h3>
              {analyticsEvents.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  No events recorded yet. Real customer interactions are logged here automatically.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="py-2.5 pr-4 font-medium">Event</th>
                        <th className="py-2.5 px-4 font-medium">Context / Metadata</th>
                        <th className="py-2.5 pl-4 font-medium text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {analyticsEvents.slice(0, 50).map((ev) => (
                        <tr key={ev.id}>
                          <td className="py-2.5 pr-4 font-medium text-amber-300">{ev.event_type}</td>
                          <td className="py-2.5 px-4 text-slate-300">{ev.metadata || '—'}</td>
                          <td className="py-2.5 pl-4 font-mono tabular-nums text-slate-500 text-right">
                            {new Date(ev.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 10: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <form
              onSubmit={handlePasscodeChange}
              className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-4 max-w-md"
            >
              <h3 className="text-base font-semibold">Update Admin Passcode</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  New Studio Admin Passcode (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white min-h-[42px]"
              >
                Update Passcode
              </button>
            </form>

            <div className="rounded-2xl border border-white/10 bg-[#12141A] p-6 space-y-3">
              <h3 className="text-base font-semibold">PostgreSQL Relational Schema Reference</h3>
              <p className="text-xs text-slate-400">
                Production relational schema covering all 11 core tables (users, admin_users, bookings, services, service_items, accessory_categories, gallery, reviews, faqs, business_settings, analytics_events).
              </p>
              <pre className="rounded-xl bg-[#0A0B0E] border border-white/10 p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-80">
                {POSTGRES_SCHEMA_DDL.trim()}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
