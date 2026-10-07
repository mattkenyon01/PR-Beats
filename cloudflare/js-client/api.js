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

export function fetchLinkPreview(url) {
  const query = new URLSearchParams({ url: String(url || "") });
  return api(`/api/link-preview?${query.toString()}`, { method: "GET" });
}

export function linkPreviewImageUrl(imageUrl) {
  const src = String(imageUrl || "").trim();
  if (!src) return "";
  const query = new URLSearchParams({ url: src });
  return `${API_BASE}/api/link-preview/image?${query.toString()}`;
}

export async function uploadGameImage(token, file, gameTitle = "") {
  if (!file) throw new Error("Choose an image file.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG, JPG, WebP, etc.).");
  }

  const form = new FormData();
  form.append("file", file);
  if (gameTitle) form.append("gameTitle", gameTitle);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/api/game-images`, {
    method: "POST",
    headers,
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Upload failed (${response.status})`);
  }
  return data.url;
}

export function isPersistedCoverUrl(url) {
  return /\/api\/(?:game-images|coverage-covers)\//i.test(String(url || "").trim());
}

/** Fetch a remote cover image into R2 and return the stable Worker URL. */
export async function storeCoverageCover(token, imageUrl, pageUrl = "") {
  const src = String(imageUrl || "").trim();
  if (!src) throw new Error("Missing cover image url.");
  if (isPersistedCoverUrl(src)) return src;

  const data = await api("/api/coverage-covers", {
    token,
    method: "POST",
    body: {
      imageUrl: src,
      pageUrl: String(pageUrl || "").trim(),
    },
  });
  return data.url;
}
