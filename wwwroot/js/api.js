/**
 * Talks to the Cloudflare Worker /api routes.
 * Empty string = same-origin /api (when the site is served from the Worker).
 */
const API_BASE = "https://prbeats.matthew-d60.workers.dev";

async function api(path, { token, method = "GET", body } = {}) {
  const headers = {
    ...(body ? { "Content-Type": "application/json" } : {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export function loadAnnouncements(token) {
  return api("/api/announcements", { token });
}

export function loadPublicAnnouncements(search = "") {
  const query =
    typeof search === "string"
      ? search
      : search instanceof URLSearchParams
        ? `?${search.toString()}`
        : "";
  const suffix = query
    ? query.startsWith("?")
      ? query
      : `?${query}`
    : "";
  return api(`/api/public/announcements${suffix}`, { method: "GET" });
}

export function saveAnnouncements(token, rows) {
  return api("/api/announcements", {
    token,
    method: "POST",
    body: { rows },
  });
}

export function createShare(token, { games = [], month = "" } = {}) {
  return api("/api/shares", {
    token,
    method: "POST",
    body: { games, month },
  });
}
