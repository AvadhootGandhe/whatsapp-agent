const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetch wrapper with credentials (cookies) for auth.
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  getMe: () => apiFetch("/api/auth/me"),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),

  // Google OAuth redirect (full page redirect, not fetch)
  getGoogleLoginUrl: () => `${API_BASE}/api/auth/google`,

  // Services
  getServices: () => apiFetch("/api/services"),
  getCalendarBuddyStatus: () => apiFetch("/api/services/calendar-buddy/status"),
  getCalendarAuthorizeUrl: () => `${API_BASE}/api/services/calendar-buddy/authorize`,
  activateCalendarBuddy: (phone) =>
    apiFetch("/api/services/calendar-buddy/activate", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  // Health
  health: () => apiFetch("/api/health"),
};

export default api;
