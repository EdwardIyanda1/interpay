export type Category = {
  id: number; name: string; description: string; price_kobo: number; quantity: number; available: number;
  max_per_order: number; state: "AVAILABLE" | "SOLD_OUT" | "NOT_STARTED" | "ENDED"; allowed_modes: string[]; is_hidden: boolean;
  sort_order: number;
};

export type Contact = { name?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null };

export type EventPublic = {
  id: number; slug: string; year: number; canonical_path: string; title: string; description: string; category: string;
  start_at: string; end_at: string; timezone: string; status: string; attendance_mode: "PHYSICAL" | "ONLINE" | "BOTH";
  cancellation_allowed: boolean; cancel_window_hours: number; venue_name?: string | null; venue_address?: string | null;
  map_url?: string | null; online_platform?: string | null; online_url?: string | null; contact: Contact; visibility: string;
  sales_open: boolean; media: { id: number; kind: string; url: string; content_type: string }[]; categories: Category[];
  physical_capacity?: number | null; online_capacity?: number | null; min_checkins: number; stats?: any;
};

export type EventCard = {
  id: number; title: string; slug: string; year: number; canonical_path: string; start_at: string; timezone: string;
  attendance_mode: string; venue_name?: string | null; category: string; from_price_kobo: number | null; image: string | null;
  status?: string; tickets_sold?: number;
};

export type TicketView = {
  id: number; category: string; status: string; attendance_mode: string; guest_name?: string | null; checked_in: boolean;
  qr_token: string | null; qr_url: string | null; join_url: string | null;
};

export type OrderView = {
  id: number; token: string; reference: string; status: string; amount_kobo: number; first_name: string; last_name: string;
  email: string; phone: string; attendance_mode: string; expires_at: string;
  event: { id: number; title: string; slug: string; year: number; canonical_path: string; start_at: string; end_at: string; timezone: string;
    status: string; venue_name?: string | null; venue_address?: string | null; map_url?: string | null; online_platform?: string | null; contact: Contact };
  policy: { cancellation_allowed: boolean; deadline: string; can_cancel: boolean; reason: string };
  tickets: TicketView[];
};
