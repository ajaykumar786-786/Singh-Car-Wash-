import { AnalyticsEventType } from '../db/schema.ts';

export const DEFAULT_WHATSAPP_NUMBER = '919855953842';
export const DEFAULT_PHONE_E164 = '+919855953842';
export const DEFAULT_PHONE_DISPLAY = '+91 98559 53842';

export type ContextualEnquiryType =
  | 'Booking enquiry'
  | 'Service enquiry'
  | 'Pricing enquiry'
  | 'Availability enquiry'
  | 'Accessories enquiry'
  | 'Lighting enquiry'
  | 'Fragrance enquiry'
  | 'Showpiece enquiry';

export function buildContextualWhatsAppMessage(
  type: ContextualEnquiryType,
  detail?: string
): string {
  switch (type) {
    case 'Booking enquiry':
      return `Hello Singh Car Wash,\n\nI would like to enquire about booking a car care slot${
        detail ? ` for ${detail}` : ''
      }.\n\nPlease share available timings.\nThank you.`;
    case 'Service enquiry':
      return `Hello Singh Car Wash,\n\nI would like to enquire about your ${
        detail || 'car care and detailing'
      } service.\n\nPlease share details and availability.\nThank you.`;
    case 'Pricing enquiry':
      return `Hello Singh Car Wash,\n\nI would like to enquire about the service details and pricing${
        detail ? ` for ${detail}` : ''
      }.\n\nPlease share more information.\nThank you.`;
    case 'Availability enquiry':
      return `Hello Singh Car Wash,\n\nI would like to check today's slot availability at Banga City.\n\nPlease confirm when I can visit.\nThank you.`;
    case 'Accessories enquiry':
      return `Hello Singh Car Wash,\n\nI would like to enquire about automotive accessories${
        detail ? ` (${detail})` : ''
      } available at your studio.\n\nThank you.`;
    case 'Lighting enquiry':
      return `Hello Singh Car Wash,\n\nI would like to enquire about automotive LED and lighting upgrades${
        detail ? ` for ${detail}` : ''
      }.\n\nPlease share available options.\nThank you.`;
    case 'Fragrance enquiry':
      return `Hello Singh Car Wash,\n\nI would like to enquire about car fragrances and cabin perfumes available at Singh Car Wash.\n\nThank you.`;
    case 'Showpiece enquiry':
      return `Hello Singh Car Wash,\n\nI would like to enquire about dashboard showpieces and cabin decor available at Singh Car Wash.\n\nThank you.`;
  }
}

export function buildBookingWhatsAppMessage(booking: {
  client_name: string;
  phone: string;
  vehicle_registration: string;
  car_model: string;
  service_name: string;
  preferred_date: string;
  preferred_time: string;
  additional_notes: string;
}): string {
  return `Hello Singh Car Wash,

I would like to request a booking.

Name: ${booking.client_name}
Phone: ${booking.phone}
Vehicle Registration: ${booking.vehicle_registration}
Car Model: ${booking.car_model}
Service Required: ${booking.service_name}
Preferred Date: ${booking.preferred_date}
Preferred Time: ${booking.preferred_time}
Additional Notes: ${booking.additional_notes || 'None'}

Please confirm availability.

Thank you.`;
}

export function buildWhatsAppUrl(message: string, whatsappNumber = DEFAULT_WHATSAPP_NUMBER): string {
  const cleanNumber = whatsappNumber.replace(/\D/g, '') || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export async function trackAnalyticsEvent(
  eventType: AnalyticsEventType,
  metadata = '',
  pathStr = typeof window !== 'undefined' ? window.location.pathname : '/'
): Promise<void> {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        metadata,
        path: pathStr,
      }),
    });
  } catch {
    // Non-blocking analytics failure
  }
}
