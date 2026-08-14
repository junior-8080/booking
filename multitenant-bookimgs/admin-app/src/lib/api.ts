// Relative path: routed to the API via the Next.js /api rewrite (next.config.ts)
const API_BASE = '/api';

function getAuth(): { token: string; subdomain: string } | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  const subdomain = localStorage.getItem('subdomain');
  if (!token || !subdomain) return null;
  return { token, subdomain };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = getAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: `Bearer ${auth.token}`, 'X-Tenant-Subdomain': auth.subdomain } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json.data as T;
}

export const adminApi = {
  // Onboarding
  register: (data: {
    business_name: string;
    logo_url?: string;
    description?: string;
    email: string;
    password: string;
    owner_name: string;
    owner_phone: string;
    country: string;
    timezone?: string;
  }) =>
    fetch(`${API_BASE}/onboarding/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  // Auth
  login: (email: string, password: string) =>
    fetch(`${API_BASE}/auth/global-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),

  // Bookings
  listBookings: (status?: string) =>
    request<import('../types').Booking[]>(`/bookings${status ? `?status=${status}` : ''}`),
  getBooking: (id: string) =>
    request<import('../types').Booking>(`/bookings/${id}`),
  confirmBooking: (id: string, paymentId: string) =>
    request<void>(`/bookings/${id}/confirm`, { method: 'POST', body: JSON.stringify({ payment_id: paymentId }) }),
  rejectBooking: (id: string, paymentId: string, reason: string) =>
    request<void>(`/bookings/${id}/reject`, { method: 'POST', body: JSON.stringify({ payment_id: paymentId, rejection_reason: reason }) }),
  cancelBooking: (id: string) =>
    request<void>(`/bookings/${id}/cancel`, { method: 'POST' }),

  // Services
  listServices: () => request<import('../types').Service[]>('/services?include_inactive=true'),
  createService: (data: unknown) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id: string, data: unknown) => request(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteService: (id: string) => request(`/services/${id}`, { method: 'DELETE' }),

  // Availability
  getSchedule: (serviceId: string) => request(`/availability/schedule/${serviceId}`),
  createRange: (serviceId: string, data: unknown) => request(`/availability/schedule/${serviceId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateRange: (id: string, data: unknown) => request(`/availability/schedule/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRange: (id: string) => request(`/availability/schedule/${id}`, { method: 'DELETE' }),
  clearDay: (serviceId: string, dayOfWeek: number) => request(`/availability/schedule/${serviceId}/day/${dayOfWeek}`, { method: 'DELETE' }),
  getExceptions: (serviceId: string) => request(`/availability/exceptions/${serviceId}`),
  addException: (data: unknown) => request('/availability/exceptions', { method: 'POST', body: JSON.stringify(data) }),
  deleteException: (id: string) => request(`/availability/exceptions/${id}`, { method: 'DELETE' }),

  // Customers
  listCustomers: (search?: string) => request<import('../types').Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomerHistory: (id: string) => request(`/customers/${id}/history`),

  // Payment sources
  listPaymentSources: () => request<import('../types').PaymentSource[]>('/payment-sources'),
  createPaymentSource: (data: unknown) => request('/payment-sources', { method: 'POST', body: JSON.stringify(data) }),
  updatePaymentSource: (id: string, data: unknown) => request(`/payment-sources/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  togglePaymentSource: (id: string) => request(`/payment-sources/${id}/toggle`, { method: 'POST' }),
  deletePaymentSource: (id: string) => request(`/payment-sources/${id}`, { method: 'DELETE' }),
  reorderPaymentSources: (ids: string[]) => request('/payment-sources/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Analytics
  getSummary: (from?: string, to?: string) => request(`/analytics/summary${from ? `?from=${from}&to=${to}` : ''}`),
  getRevenueByService: () => request('/analytics/revenue-by-service'),
  getBookingsOverTime: (groupBy = 'day') => request(`/analytics/bookings-over-time?group_by=${groupBy}`),

  // Brands
  listBrands: () => request<import('../types').Brand[]>('/brands'),
  createBrand: (data: { name: string; logo_url?: string | null; description?: string; terms_conditions?: string; whatsapp_number?: string | null; is_primary?: boolean }) =>
    request<import('../types').Brand>('/brands', { method: 'POST', body: JSON.stringify(data) }),
  updateBrand: (id: string, data: Partial<{ name: string; logo_url: string | null; description: string; terms_conditions: string; whatsapp_number: string | null; is_primary: boolean }>) =>
    request<import('../types').Brand>(`/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Auth — current user profile
  getMe: () => request<{ id: string; full_name: string; email: string; role: string }>('/auth/me'),

  // Billing
  getBillingStatus: () => request<{
    subscription_status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
    trial_ends_at: string | null;
    subscription_expires_at: string | null;
    is_trial_expired: boolean;
    needs_payment: boolean;
    current_plan: 'MONTHLY' | 'YEARLY' | null;
  }>('/billing/status'),
  initializePayment: (email: string, plan: 'MONTHLY' | 'YEARLY') =>
    request<{ checkout_url: string }>('/billing/pay', {
      method: 'POST',
      body: JSON.stringify({ email, plan }),
    }),
  verifyPayment: (reference: string) =>
    request<{ activated: boolean }>('/billing/verify', {
      method: 'POST',
      body: JSON.stringify({ reference }),
    }),

  // Subscription plans (public catalog)
  getSubscriptionPlans: (activeOnly = true) =>
    request<import('../types').SubscriptionPlan[]>(`/subscription-plans${activeOnly ? '?active=true' : ''}`),

  // Tenant settings
  getTenantSettings: () => request<import('../types').TenantSettings>('/tenant/settings'),
  updateTenantSettings: (data: unknown) => request<import('../types').TenantSettings>('/tenant/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  listCountries: () =>
    fetch(`${API_BASE}/countries`)
      .then(r => r.json())
      .then(j => (j.data ?? []) as import('../types').CountryOption[]),
};
