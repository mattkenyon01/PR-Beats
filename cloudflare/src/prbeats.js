/**
 * PR Beats Worker — single-file entry (no local imports).
 * Bindings: DB (D1), ASSETS (optional static)
 * Optional var: FIREBASE_PROJECT_ID (falls back to DEFAULT below)
 */

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
          },
        })
      );
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
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
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
  };
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
            highlights, total_wishlists, sort_order, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
