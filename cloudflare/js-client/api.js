/**
 * Talks to the Cloudflare Worker /api routes.
 * Empty string = same-origin /api (when the site is served from the Worker).
 */
const API_BASE = "https://prbeats.matthew-d60.workers.dev";

/** Turn `/api/...` paths into absolute Worker URLs when the admin page is on another host. */
export function absoluteApiUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^(?:https?:|blob:|data:)/i.test(raw)) return raw;
  if (raw.startsWith("//")) {
    return `${typeof location !== "undefined" ? location.protocol : "https:"}${raw}`;
  }
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return raw;
}

async function api(path, { token, method = "GET", body, headers: extraHeaders } = {}) {
  const headers = {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(extraHeaders || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 304) {
    return {
      unchanged: true,
      status: 304,
      etag: response.headers.get("ETag") || extraHeaders?.["If-None-Match"] || "",
    };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  const etag = response.headers.get("ETag");
  if (etag && data && typeof data === "object" && !Array.isArray(data)) {
    return { ...data, etag, unchanged: false };
  }
  return data;
}

function normalizeEtag(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith('"') ? raw : `"${raw.replace(/"/g, "")}"`;
}

export function loadAnnouncements(token) {
  return api("/api/announcements", { token });
}

/**
 * Lightweight poll: one-row revision (+ editors when changed).
 * Pass the last ETag / revision to get 304 when unchanged.
 */
export function loadAnnouncementsRevision(token, etagOrRevision = "") {
  const etag = normalizeEtag(etagOrRevision);
  return api("/api/announcements/revision", {
    token,
    headers: etag ? { "If-None-Match": etag } : undefined,
  });
}

/** Load media coverage JSON for one game title. */
export function loadMediaCoverage(token, gameTitle) {
  const query = new URLSearchParams({
    game: String(gameTitle || "").trim() || "Untitled",
  });
  return api(`/api/media-coverage?${query.toString()}`, { token });
}

/** Replace media coverage JSON for one game title. */
export function saveMediaCoverage(token, gameTitle, mediaCoverage) {
  return api("/api/media-coverage", {
    token,
    method: "PUT",
    body: {
      gameTitle: String(gameTitle || "").trim() || "Untitled",
      mediaCoverage: String(mediaCoverage ?? ""),
    },
  });
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

/** Load media coverage for one game on the public homepage (share-gated). */
export function loadPublicMediaCoverage(gameTitle, search = "") {
  const params = new URLSearchParams();
  params.set("game", String(gameTitle || "").trim() || "Untitled");
  const raw =
    typeof search === "string"
      ? search.replace(/^\?/, "")
      : search instanceof URLSearchParams
        ? search.toString()
        : "";
  if (raw) {
    const fromPage = new URLSearchParams(raw);
    const shareId = String(fromPage.get("s") || "").trim();
    if (shareId) params.set("s", shareId);
    fromPage.getAll("game").forEach((value) => {
      const next = String(value || "").trim();
      if (next) params.append("game", next);
    });
    fromPage.getAll("games").forEach((value) => {
      const next = String(value || "").trim();
      if (next) params.append("games", next);
    });
  }
  return api(`/api/public/media-coverage?${params.toString()}`, {
    method: "GET",
  });
}

export function saveAnnouncements(token, rows, revision = "") {
  return api("/api/announcements", {
    token,
    method: "POST",
    body: { rows, revision },
  });
}

export function saveAnnouncementRow(token, row) {
  const id = encodeURIComponent(String(row?.id || "").trim());
  if (!id) throw new Error("Row id is required.");
  return api(`/api/announcements/${id}`, {
    token,
    method: "PATCH",
    body: { row },
  });
}

export function deleteAnnouncementRow(token, id) {
  const rowId = encodeURIComponent(String(id || "").trim());
  if (!rowId) throw new Error("Row id is required.");
  return api(`/api/announcements/${rowId}`, {
    token,
    method: "DELETE",
  });
}

/** Mark the signed-in admin as actively editing (last 5 minutes). */
export function pingPresence(token) {
  return api("/api/presence", {
    token,
    method: "POST",
    body: {},
  });
}

export function createShare(token, { games = [], months = [], month = "" } = {}) {
  const monthList = Array.isArray(months) && months.length
    ? months
    : month
      ? [month]
      : [];
  return api("/api/shares", {
    token,
    method: "POST",
    body: { games, months: monthList, month: monthList[0] || "" },
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

/**
 * Downscale large key-art before upload so table/card thumbs decode cheaper.
 * Skips GIFs (animation) and already-small files.
 */
async function prepareImageForUpload(
  file,
  { maxEdge = 1280, quality = 0.82, skipUnderBytes = 350_000 } = {}
) {
  if (!(file instanceof Blob)) return file;
  const type = String(file.type || "").toLowerCase();
  if (!type.startsWith("image/") || type === "image/gif") return file;
  if (typeof file.size === "number" && file.size <= skipUnderBytes) {
    // Still clamp absurd pixel dimensions even when file weight is low.
  }

  if (typeof createImageBitmap !== "function") return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  if (
    scale >= 1 &&
    typeof file.size === "number" &&
    file.size <= skipUnderBytes
  ) {
    bitmap.close?.();
    return file;
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
  if (!blob) return file;

  const baseName = String(file.name || "cover")
    .replace(/\.[^.]+$/, "")
    .slice(0, 80);
  return new File([blob], `${baseName || "cover"}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

/**
 * Resize an image blob/file to fit inside maxEdge (longest side), keeping aspect ratio.
 * Never upscales. Returns a WebP File.
 */
export async function compressImageToMaxEdge(
  source,
  { maxEdge = 1280, quality = 0.85, fileName = "key-art" } = {}
) {
  if (source == null) {
    throw new Error("Image data is missing.");
  }
  if (typeof createImageBitmap !== "function") {
    throw new Error("Image compression is not supported in this browser.");
  }

  let bitmap;
  try {
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
      bitmap = source;
    } else {
      bitmap = await createImageBitmap(source);
    }
  } catch {
    throw new Error("Could not read that image.");
  }

  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const longest = Math.max(srcW, srcH);
  const edge = Math.max(1, Number(maxEdge) || 1280);
  const scale = longest > edge ? edge / longest : 1;
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Could not compress that image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
  if (!blob) throw new Error("Could not compress that image.");

  const base = String(fileName || "key-art")
    .replace(/\.[^.]+$/, "")
    .slice(0, 80);
  return {
    file: new File([blob], `${base || "key-art"}-${width}x${height}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    }),
    width,
    height,
    sourceWidth: srcW,
    sourceHeight: srcH,
  };
}

export function sizedCoverDimensions(sourceWidth, sourceHeight, maxEdge) {
  const srcW = Math.max(0, Number(sourceWidth) || 0);
  const srcH = Math.max(0, Number(sourceHeight) || 0);
  const edge = Math.max(1, Number(maxEdge) || 1);
  if (srcW <= 0 || srcH <= 0) return null;
  const longest = Math.max(srcW, srcH);
  const scale = longest > edge ? edge / longest : 1;
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
    maxEdge: edge,
    scale,
  };
}

export async function uploadGameImage(
  token,
  file,
  gameTitle = "",
  { skipPrepare = false, maxEdge = 1280, quality = 0.82 } = {}
) {
  if (!file) throw new Error("Choose an image file.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG, JPG, WebP, etc.).");
  }

  const prepared = skipPrepare
    ? file
    : await prepareImageForUpload(file, { maxEdge, quality });

  const form = new FormData();
  form.append("file", prepared);
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

export function loadGames(token) {
  return api("/api/games", { token });
}

export function createGame(token, game) {
  return api("/api/games", {
    token,
    method: "POST",
    body: game,
  });
}

export function updateGame(token, id, patch) {
  const gameId = encodeURIComponent(String(id || "").trim());
  if (!gameId) throw new Error("Game id is required.");
  return api(`/api/games/${gameId}`, {
    token,
    method: "PATCH",
    body: patch,
  });
}

export function deleteGame(token, id) {
  const gameId = encodeURIComponent(String(id || "").trim());
  if (!gameId) throw new Error("Game id is required.");
  return api(`/api/games/${gameId}`, {
    token,
    method: "DELETE",
  });
}

export async function uploadPressKit(token, file, gameTitle = "") {
  if (!file) throw new Error("Choose a press kit file.");
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "");
  const looksLikeKit =
    type === "application/pdf" ||
    type === "application/x-pdf" ||
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    type === "application/octet-stream" ||
    /\.(pdf|zip)$/i.test(name);
  if (!looksLikeKit) {
    throw new Error("Please choose a PDF or ZIP press kit.");
  }

  const form = new FormData();
  form.append("file", file);
  if (gameTitle) form.append("gameTitle", gameTitle);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/api/press-kits`, {
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

export async function uploadPressReleasePdf(token, file, label = "") {
  if (!file) throw new Error("Choose a PDF file.");
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "");
  const looksLikePdf =
    type === "application/pdf" ||
    type === "application/x-pdf" ||
    /\.pdf$/i.test(name);
  if (!looksLikePdf) {
    throw new Error("Please choose a PDF file.");
  }

  const form = new FormData();
  form.append("file", file);
  if (label) form.append("label", label);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/api/press-release-pdfs`, {
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
