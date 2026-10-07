/**
 * PR Beats Worker — single-file entry (no local imports).
 * Bindings: DB (D1), IMAGES (R2), ASSETS (optional static)
 * Optional var: FIREBASE_PROJECT_ID (falls back to DEFAULT below)
 */

const MAX_GAME_IMAGE_BYTES = 100 * 1024 * 1024;
const MAX_COVERAGE_COVER_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DEFAULT_FIREBASE_PROJECT_ID = "prbeats-996dd";

const DISPLAY_COLUMNS = [
  { key: "gameTitle", label: "Game Title" },
  { key: "announcementTitle", label: "Announcement Title" },
  { key: "date", label: "Date" },
  { key: "month", label: "Month" },
  { key: "platforms", label: "Platforms" },
  { key: "trailer", label: "Trailer" },
  { key: "pressReleasePdf", label: "Press Release PDF Space" },
  { key: "estimatedReach", label: "Estimated Reach" },
  { key: "highlights", label: "Highlights" },
  { key: "totalWishlists", label: "Total Wishlists" },
  { key: "coverageLinks", label: "Coverage Links" },
  { key: "gameImage", label: "Game Image" },
];

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let cachedJwks = null;
let cachedJwksAt = 0;

function homePage() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PR beats API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; color: #111; }
    code { background: #f3f4f6; padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
    a { color: #1a2330; }
    .ok { color: #0f5132; font-weight: 700; }
  </style>
</head>
<body>
  <h1>PR beats Worker</h1>
  <p class="ok">Worker is running.</p>
  <p>This URL is the <strong>API</strong>, not the full admin website.</p>
  <p>Test the API here:</p>
  <ul>
    <li><a href="/api/health"><code>/api/health</code></a></li>
    <li><code>POST /api/announcements</code> (used by admin Save — needs Firebase token)</li>
  </ul>
  <p>Use your admin page (local / GitHub Pages) to import CSVs. It talks to this Worker in the background.</p>
</body>
</html>`,
    {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Normalize trailing slash: /api/announcements/ → /api/announcements
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    // Cloudflare "Visit" button hits "/" — always answer here first
    if (url.pathname === "/" || url.pathname === "") {
      if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) return assetResponse;
      }
      return homePage();
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return json(
      {
        error: "Not found.",
        hint: "Open / or /api/health",
        path: url.pathname,
        service: "prbeats",
      },
      404
    );
  },
};

async function handleApi(request, env, url) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  try {
    if (url.pathname === "/api" || url.pathname === "/api/health") {
      return withCors(
        request,
        json({
          ok: true,
          service: "prbeats",
          endpoints: {
            health: "GET /api/health",
            public:
              "GET /api/public/announcements?s=token | ?game=&games=&month=",
            createShare: "POST /api/shares",
            load: "GET /api/announcements",
            save: "POST /api/announcements",
            uploadImage: "POST /api/game-images",
            getImage: "GET /api/game-images/:ownerUid/:fileName",
            storeCoverageCover: "POST /api/coverage-covers",
            getCoverageCover: "GET /api/coverage-covers/:ownerUid/:fileName",
            linkPreview: "GET /api/link-preview?url=",
            linkPreviewImage: "GET /api/link-preview/image?url=",
          },
        })
      );
    }

    if (url.pathname === "/api/link-preview/image") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }
      try {
        return withCors(
          request,
          await fetchLinkPreviewImage(url.searchParams.get("url"), request)
        );
      } catch (error) {
        return withCors(
          request,
          json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Could not load preview image.",
            },
            400
          )
        );
      }
    }

    if (url.pathname === "/api/link-preview") {
      if (request.method !== "GET") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }
      try {
        const preview = await fetchLinkPreview(url.searchParams.get("url"));
        return withCors(
          request,
          json(preview, 200, {
            "Cache-Control": "public, max-age=86400",
          })
        );
      } catch (error) {
        return withCors(
          request,
          json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Could not load link preview.",
            },
            400
          )
        );
      }
    }

    const gameImageMatch = url.pathname.match(
      /^\/api\/game-images\/([^/]+)\/([^/]+)$/
    );
    if (gameImageMatch) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }
      return withCors(
        request,
        await serveStoredImage(
          env,
          "game-images",
          gameImageMatch[1],
          gameImageMatch[2],
          request
        )
      );
    }

    if (url.pathname === "/api/game-images") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method !== "POST") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }

      const uploaded = await uploadGameImage(
        env,
        auth.user.uid,
        request,
        url.origin
      );
      return withCors(request, json(uploaded));
    }

    const coverageCoverMatch = url.pathname.match(
      /^\/api\/coverage-covers\/([^/]+)\/([^/]+)$/
    );
    if (coverageCoverMatch) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }
      return withCors(
        request,
        await serveStoredImage(
          env,
          "coverage-covers",
          coverageCoverMatch[1],
          coverageCoverMatch[2],
          request
        )
      );
    }

    if (url.pathname === "/api/coverage-covers") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method !== "POST") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }

      try {
        const body = await request.json();
        const stored = await storeCoverageCover(
          env,
          auth.user.uid,
          body,
          url.origin
        );
        return withCors(request, json(stored));
      } catch (error) {
        return withCors(
          request,
          json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Could not store coverage cover.",
            },
            400
          )
        );
      }
    }

    // Public read-only feed for the homepage (no auth)
    if (url.pathname === "/api/public/announcements") {
      if (request.method !== "GET") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }
      const rows = await listAllAnnouncements(env.DB);
      const filtered = await filterPublicAnnouncements(
        env.DB,
        rows,
        url.searchParams
      );
      if (filtered.error) {
        return withCors(request, filtered.error);
      }
      return withCors(request, json(datasetResponse(filtered.rows)));
    }

    if (url.pathname === "/api/shares") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method !== "POST") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }

      const body = await request.json().catch(() => ({}));
      const share = await createShare(env.DB, auth.user.uid, body);
      return withCors(
        request,
        json({
          id: share.id,
          games: share.games,
          month: share.month,
        })
      );
    }

    if (url.pathname === "/api/announcements") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method === "GET") {
        const rows = await listAnnouncements(env.DB, auth.user.uid);
        return withCors(request, json(datasetResponse(rows)));
      }

      // POST and PUT both replace the dataset (POST avoids asset-server 405s)
      if (request.method === "PUT" || request.method === "POST") {
        const body = await request.json();
        const rows = await replaceAnnouncements(
          env.DB,
          auth.user.uid,
          body.rows ?? []
        );
        return withCors(request, json(datasetResponse(rows)));
      }

      return withCors(
        request,
        json(
          {
            error: "Method not allowed.",
            allowed: ["GET", "POST", "PUT", "OPTIONS"],
            method: request.method,
            path: url.pathname,
          },
          405
        )
      );
    }

    return withCors(request, json({ error: "Not found." }, 404));
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    );
    return withCors(
      request,
      json(
        {
          error:
            error instanceof Error ? error.message : "Unexpected server error.",
        },
        500
      )
    );
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(request, response) {
  const headers = new Headers(response.headers);
  const extra = corsHeaders(request);
  Object.entries(extra).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

async function requireFirebaseUser(request, projectId) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { error: json({ error: "Missing Authorization bearer token." }, 401) };
  }

  const resolvedProjectId = projectId || DEFAULT_FIREBASE_PROJECT_ID;
  if (!resolvedProjectId) {
    return {
      error: json({ error: "FIREBASE_PROJECT_ID is not configured." }, 500),
    };
  }

  try {
    const payload = await verifyFirebaseIdToken(match[1], resolvedProjectId);
    const uid = String(payload.sub || "");
    if (!uid) {
      return { error: json({ error: "Invalid token subject." }, 401) };
    }

    return {
      user: {
        uid,
        email: typeof payload.email === "string" ? payload.email : "",
      },
    };
  } catch {
    return {
      error: json({ error: "Invalid or expired Firebase token." }, 401),
    };
  }
}

async function verifyFirebaseIdToken(token, projectId) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");

  const header = JSON.parse(utf8Decode(base64UrlToBytes(parts[0])));
  const payload = JSON.parse(utf8Decode(base64UrlToBytes(parts[1])));
  const signature = base64UrlToBytes(parts[2]);
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  if (header.alg !== "RS256") throw new Error("Unexpected JWT alg");

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    throw new Error("Token expired");
  }
  if (typeof payload.iat === "number" && payload.iat > now + 60) {
    throw new Error("Token issued in the future");
  }
  if (payload.aud !== projectId) throw new Error("Invalid audience");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Invalid issuer");
  }
  if (!payload.sub) throw new Error("Missing subject");

  const jwk = await getFirebaseJwk(header.kid);
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    data
  );
  if (!valid) throw new Error("Invalid signature");

  return payload;
}

async function getFirebaseJwk(kid) {
  const fresh = Date.now() - cachedJwksAt < 60 * 60 * 1000;
  if (!cachedJwks || !fresh) {
    const response = await fetch(FIREBASE_JWKS_URL);
    if (!response.ok) throw new Error("Failed to fetch Firebase JWKS");
    cachedJwks = await response.json();
    cachedJwksAt = Date.now();
  }

  const jwk = (cachedJwks.keys || []).find((key) => key.kid === kid);
  if (!jwk) {
    // Force refresh once if kid not found
    const response = await fetch(FIREBASE_JWKS_URL);
    if (!response.ok) throw new Error("Failed to fetch Firebase JWKS");
    cachedJwks = await response.json();
    cachedJwksAt = Date.now();
    const retry = (cachedJwks.keys || []).find((key) => key.kid === kid);
    if (!retry) throw new Error("Unknown JWT kid");
    return retry;
  }

  return jwk;
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

function rowFromDb(record) {
  return {
    id: record.id,
    gameTitle: record.game_title ?? "",
    announcementTitle: record.announcement_title ?? "",
    date: record.date ?? "",
    month: record.month ?? "",
    platforms: record.platforms ?? "",
    trailer: record.trailer ?? "",
    pressReleasePdf: record.press_release_pdf ?? "",
    estimatedReach: record.estimated_reach ?? "",
    highlights: record.highlights ?? "",
    totalWishlists: record.total_wishlists ?? "",
    coverageLinks: record.coverage_links ?? "",
    gameImage: record.game_image ?? "",
  };
}

function isPrivateHostname(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0"
  ) {
    return true;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

const PREVIEW_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function metaContent(html, keys) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]*>`,
        "i"
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtmlEntities(match[1].trim());
    }
  }
  return "";
}

function linkImageFromHtml(html, baseHref) {
  const fromMeta = metaContent(html, [
    "og:image:secure_url",
    "og:image",
    "twitter:image",
    "twitter:image:src",
    "image",
  ]);
  if (fromMeta) {
    try {
      return new URL(fromMeta, baseHref).href;
    } catch {
      /* continue */
    }
  }

  const linkMatch = html.match(
    /<link[^>]+rel=["'](?:image_src|thumbnail)["'][^>]+href=["']([^"']+)["'][^>]*>/i
  ) || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:image_src|thumbnail)["'][^>]*>/i
  );
  if (linkMatch?.[1]) {
    try {
      return new URL(decodeHtmlEntities(linkMatch[1].trim()), baseHref).href;
    } catch {
      return "";
    }
  }

  return "";
}

function assertPublicHttpUrl(rawUrl) {
  const target = String(rawUrl || "").trim();
  if (!target) throw new Error("Missing url.");

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    throw new Error("Invalid url.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) urls are allowed.");
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("That url cannot be previewed.");
  }
  return parsed;
}

async function fetchLinkPreviewImage(rawUrl, request) {
  const parsed = assertPublicHttpUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(parsed.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": PREVIEW_USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) {
      throw new Error(`Preview image fetch failed (${response.status}).`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error("Preview url is not an image.");
    }
    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    };
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }
    return new Response(response.body, { status: 200, headers });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLinkPreview(rawUrl) {
  const parsed = assertPublicHttpUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let html = "";
  try {
    const response = await fetch(parsed.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": PREVIEW_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) {
      throw new Error(`Preview fetch failed (${response.status}).`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      // Still allow favicon-only preview for non-HTML pages
      return {
        url: parsed.href,
        title: parsed.hostname.replace(/^www\./, ""),
        description: "",
        image: "",
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=128`,
      };
    }
    html = await response.text();
  } finally {
    clearTimeout(timer);
  }

  if (html.length > 600_000) html = html.slice(0, 600_000);

  const title =
    metaContent(html, ["og:title", "twitter:title"]) ||
    decodeHtmlEntities(
      (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim()
    ) ||
    parsed.hostname.replace(/^www\./, "");

  const description = metaContent(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);

  const image = linkImageFromHtml(html, parsed.href);

  return {
    url: parsed.href,
    title,
    description,
    image,
    favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=128`,
  };
}

function sanitizePathPart(value) {
  return (
    String(value || "game")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "game"
  );
}

function extensionForImageType(contentType, fileName = "") {
  const fromName = String(fileName).split(".").pop()?.toLowerCase() || "";
  if (/^(jpe?g|png|webp|gif)$/.test(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

async function uploadGameImage(env, ownerUid, request, origin) {
  if (!env.IMAGES) {
    throw new Error(
      "Image storage is not configured. Create an R2 bucket and bind it as IMAGES."
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const gameTitle = String(form.get("gameTitle") || "game");

  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error("Choose an image file.");
  }

  const contentType = String(file.type || "").toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Please choose a PNG, JPG, WebP, or GIF image.");
  }

  if (typeof file.size === "number" && file.size > MAX_GAME_IMAGE_BYTES) {
    throw new Error("Image must be 100 MB or smaller.");
  }

  const ext = extensionForImageType(
    contentType,
    typeof file.name === "string" ? file.name : ""
  );
  const fileName = `${sanitizePathPart(gameTitle)}-${crypto.randomUUID()}.${ext}`;
  const key = `game-images/${ownerUid}/${fileName}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      ownerUid,
      gameTitle: String(gameTitle).slice(0, 200),
    },
  });

  return {
    key,
    url: `${origin}/api/game-images/${encodeURIComponent(ownerUid)}/${encodeURIComponent(fileName)}`,
  };
}

function isPersistedImagePath(pathname) {
  return /^\/api\/(?:game-images|coverage-covers)\/[^/]+\/[^/]+$/i.test(
    String(pathname || "")
  );
}

function isPersistedImageUrl(rawUrl, origin = "") {
  const value = String(rawUrl || "").trim();
  if (!value) return false;
  try {
    const parsed = new URL(value, origin || "https://example.invalid");
    return isPersistedImagePath(parsed.pathname);
  } catch {
    return isPersistedImagePath(value);
  }
}

async function storeCoverageCover(env, ownerUid, body, origin) {
  if (!env.IMAGES) {
    throw new Error(
      "Image storage is not configured. Create an R2 bucket and bind it as IMAGES."
    );
  }

  const imageUrl = String(body?.imageUrl || body?.url || "").trim();
  const pageUrl = String(body?.pageUrl || "").trim();
  if (!imageUrl) throw new Error("Missing imageUrl.");

  if (isPersistedImageUrl(imageUrl, origin)) {
    return { url: imageUrl, reused: true };
  }

  const parsed = assertPublicHttpUrl(imageUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let bytes;
  let contentType = "image/jpeg";
  try {
    const response = await fetch(parsed.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": PREVIEW_USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...(pageUrl ? { Referer: pageUrl } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Cover image fetch failed (${response.status}).`);
    }
    contentType = String(response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!contentType.startsWith("image/")) {
      throw new Error("Cover url is not an image.");
    }
    // Normalize odd types like image/jpg
    if (contentType === "image/jpg") contentType = "image/jpeg";
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw new Error("Unsupported cover image type.");
    }
    bytes = await response.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }

  if (!bytes || bytes.byteLength === 0) {
    throw new Error("Cover image was empty.");
  }
  if (bytes.byteLength > MAX_COVERAGE_COVER_BYTES) {
    throw new Error("Cover image must be 8 MB or smaller.");
  }

  const ext = extensionForImageType(contentType, parsed.pathname);
  const label = sanitizePathPart(pageUrl || parsed.hostname || "cover");
  const fileName = `${label}-${crypto.randomUUID()}.${ext}`;
  const key = `coverage-covers/${ownerUid}/${fileName}`;

  await env.IMAGES.put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      ownerUid,
      sourceUrl: parsed.href.slice(0, 500),
      pageUrl: pageUrl.slice(0, 500),
    },
  });

  return {
    key,
    url: `${origin}/api/coverage-covers/${encodeURIComponent(ownerUid)}/${encodeURIComponent(fileName)}`,
  };
}

async function serveStoredImage(env, folder, ownerUid, fileName, request) {
  if (!env.IMAGES) {
    return json({ error: "Image storage is not configured." }, 503);
  }

  const safeOwner = decodeURIComponent(ownerUid);
  const safeName = decodeURIComponent(fileName);
  if (
    safeOwner.includes("/") ||
    safeOwner.includes("..") ||
    safeName.includes("/") ||
    safeName.includes("..") ||
    (folder !== "game-images" && folder !== "coverage-covers")
  ) {
    return json({ error: "Not found." }, 404);
  }

  const key = `${folder}/${safeOwner}/${safeName}`;
  const object =
    request.method === "HEAD"
      ? await env.IMAGES.head(key)
      : await env.IMAGES.get(key);

  if (!object) {
    return json({ error: "Image not found." }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Allow-Origin", "*");

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(object.body, { status: 200, headers });
}

async function listAnnouncements(db, ownerUid) {
  const result = await db
    .prepare(
      `SELECT *
       FROM announcements
       WHERE owner_uid = ?
       ORDER BY sort_order ASC, game_title ASC, date ASC`
    )
    .bind(ownerUid)
    .all();

  return (result.results || []).map(rowFromDb);
}

async function listAllAnnouncements(db) {
  const result = await db
    .prepare(
      `SELECT *
       FROM announcements
       ORDER BY game_title ASC, sort_order ASC, date ASC`
    )
    .all();

  return (result.results || []).map(rowFromDb);
}

/** Normalize labels for URL matching: case-insensitive, spaces/hyphens/underscores equal. */
function normalizeFilterKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function parseListFilters(searchParams, singular, plural) {
  const values = [];
  const single = searchParams.get(singular);
  if (single) values.push(single);
  const multi = searchParams.get(plural);
  if (multi) {
    multi.split(",").forEach((part) => {
      const trimmed = part.trim();
      if (trimmed) values.push(trimmed);
    });
  }
  return [...new Set(values.map(normalizeFilterKey).filter(Boolean))];
}

function shortShareId(length = 8) {
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function createShare(db, ownerUid, body) {
  const games = Array.isArray(body?.games)
    ? [
        ...new Set(
          body.games
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        ),
      ]
    : [];
  const month = String(body?.month || "").trim();

  if (games.length === 0 && !month) {
    throw new Error("Pick at least one game or a month for the share link.");
  }

  let id = shortShareId();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await db
        .prepare(
          `INSERT INTO shares (id, owner_uid, games, month, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))`
        )
        .bind(id, ownerUid, JSON.stringify(games), month)
        .run();
      return { id, games, month };
    } catch (error) {
      // Collision on primary key — try another id
      id = shortShareId();
      if (attempt === 4) throw error;
    }
  }

  throw new Error("Could not create share link.");
}

async function getShare(db, id) {
  const record = await db
    .prepare(`SELECT id, games, month FROM shares WHERE id = ?`)
    .bind(id)
    .first();
  if (!record) return null;

  let games = [];
  try {
    const parsed = JSON.parse(record.games || "[]");
    games = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    games = [];
  }

  return {
    id: record.id,
    games,
    month: String(record.month || ""),
  };
}

async function filterPublicAnnouncements(db, rows, searchParams) {
  let gameKeys = parseListFilters(searchParams, "game", "games");
  let monthKeys = parseListFilters(searchParams, "month", "months");

  const shareId = String(searchParams.get("s") || "").trim();
  if (shareId) {
    const share = await getShare(db, shareId);
    if (!share) {
      return {
        error: json({ error: "Share link not found." }, 404),
      };
    }
    gameKeys = [
      ...new Set(share.games.map(normalizeFilterKey).filter(Boolean)),
    ];
    monthKeys = share.month
      ? [normalizeFilterKey(share.month)].filter(Boolean)
      : [];
  }

  const filtered = rows.filter((row) => {
    if (
      gameKeys.length > 0 &&
      !gameKeys.includes(normalizeFilterKey(row.gameTitle))
    ) {
      return false;
    }
    if (
      monthKeys.length > 0 &&
      !monthKeys.includes(normalizeFilterKey(row.month))
    ) {
      return false;
    }
    return true;
  });

  return { rows: filtered };
}

async function replaceAnnouncements(db, ownerUid, rows) {
  if (!Array.isArray(rows)) {
    throw new Error("Body must include a rows array.");
  }

  const statements = [
    db.prepare(`DELETE FROM announcements WHERE owner_uid = ?`).bind(ownerUid),
  ];

  rows.forEach((row, index) => {
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : crypto.randomUUID();

    statements.push(
      db
        .prepare(
          `INSERT INTO announcements (
            id, owner_uid, game_title, announcement_title, date, month,
            platforms, trailer, press_release_pdf, estimated_reach,
            highlights, total_wishlists, coverage_links, game_image,
            sort_order, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          id,
          ownerUid,
          String(row.gameTitle ?? ""),
          String(row.announcementTitle ?? ""),
          String(row.date ?? ""),
          String(row.month ?? ""),
          String(row.platforms ?? ""),
          String(row.trailer ?? ""),
          String(row.pressReleasePdf ?? ""),
          String(row.estimatedReach ?? ""),
          String(row.highlights ?? ""),
          String(row.totalWishlists ?? ""),
          String(row.coverageLinks ?? ""),
          String(row.gameImage ?? ""),
          index
        )
    );
  });

  await db.batch(statements);
  return listAnnouncements(db, ownerUid);
}

function datasetResponse(rows) {
  return {
    columns: DISPLAY_COLUMNS,
    rows,
  };
}
