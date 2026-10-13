/**
 * PR Beats Worker — single-file entry (no local imports).
 * Bindings: DB (D1), IMAGES (R2), ASSETS (optional static)
 * Optional var: FIREBASE_PROJECT_ID (falls back to DEFAULT below)
 */

const MAX_GAME_IMAGE_BYTES = 100 * 1024 * 1024;
const MAX_COVERAGE_COVER_BYTES = 8 * 1024 * 1024;
const MAX_PRESS_RELEASE_PDF_BYTES = 50 * 1024 * 1024;
const MAX_PRESS_KIT_BYTES = 200 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_STORAGE_FOLDERS = new Set([
  "game-images",
  "coverage-covers",
  "press-release-pdfs",
  "press-kits",
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
  { key: "mediaCoverage", label: "Media Coverage", perGame: true },
  { key: "gameImage", label: "Game Image", perGame: true },
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

    // Pretty URLs: /admin and /login serve the .html assets without the extension.
    if (env.ASSETS && (url.pathname === "/admin" || url.pathname === "/login")) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname =
        url.pathname === "/admin" ? "/admin.html" : "/login.html";
      return env.ASSETS.fetch(new Request(assetUrl, request));
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
            revision: "GET /api/announcements/revision",
            save: "POST /api/announcements",
            saveRow: "PATCH /api/announcements/:id",
            deleteRow: "DELETE /api/announcements/:id",
            mediaCoverage: "GET /api/media-coverage?game=",
            presence: "POST /api/presence",
            uploadImage: "POST /api/game-images",
            getImage: "GET /api/game-images/:ownerUid/:fileName",
            storeCoverageCover: "POST /api/coverage-covers",
            getCoverageCover: "GET /api/coverage-covers/:ownerUid/:fileName",
            uploadPressReleasePdf: "POST /api/press-release-pdfs",
            getPressReleasePdf: "GET /api/press-release-pdfs/:ownerUid/:fileName",
            games: "GET|POST /api/games",
            game: "PATCH|DELETE /api/games/:id",
            uploadPressKit: "POST /api/press-kits",
            getPressKit: "GET /api/press-kits/:ownerUid/:fileName",
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

    const pressReleasePdfMatch = url.pathname.match(
      /^\/api\/press-release-pdfs\/([^/]+)\/([^/]+)$/
    );
    if (pressReleasePdfMatch) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }
      return withCors(
        request,
        await serveStoredImage(
          env,
          "press-release-pdfs",
          pressReleasePdfMatch[1],
          pressReleasePdfMatch[2],
          request
        )
      );
    }

    if (url.pathname === "/api/press-release-pdfs") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method !== "POST") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }

      const uploaded = await uploadPressReleasePdf(
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
      // Skip media-coverage chunks until after filter — only load for visible games.
      const rows = await listAllAnnouncements(env.DB, {
        includeMediaCoverage: false,
      });
      const filtered = await filterPublicAnnouncements(
        env.DB,
        rows,
        url.searchParams
      );
      if (filtered.error) {
        return withCors(request, filtered.error);
      }
      const withMedia = await attachMediaCoverageToRows(env.DB, filtered.rows);
      return withCors(request, json(datasetResponse(withMedia)));
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
      const db = instrumentDb(env.DB, "Create share", url.pathname);
      const share = await createShare(db, auth.user.uid, body);
      return withCors(
        request,
        json(
          withD1(
            {
              id: share.id,
              games: share.games,
              months: share.months,
              month: share.month,
            },
            db
          )
        )
      );
    }

    if (url.pathname === "/api/announcements") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method === "GET") {
        // Shared dataset: every signed-in admin sees the same announcements.
        // Media coverage is loaded on demand via /api/media-coverage?game=.
        const db = instrumentDb(env.DB, "Load announcements", url.pathname);
        const rows = await listAllAnnouncements(db, {
          includeMediaCoverage: false,
        });
        const games = await listGames(db);
        const revision = await getDatasetRevision(db);
        const activeEditors = await listActiveEditors(db);
        return withCors(
          request,
          json(
            withD1(
              datasetResponse(rows, revision, activeEditors, games),
              db
            )
          )
        );
      }

      // POST and PUT both replace the dataset (POST avoids asset-server 405s)
      if (request.method === "PUT" || request.method === "POST") {
        const body = await request.json();
        const db = instrumentDb(env.DB, "Save announcements", url.pathname);
        try {
          await touchAdminPresence(db, auth.user);
          const result = await replaceAnnouncements(
            db,
            auth.user.uid,
            body.rows ?? [],
            body.revision
          );
          const games = await listGames(db);
          const activeEditors = await listActiveEditors(db);
          return withCors(
            request,
            json(
              withD1(
                datasetResponse(
                  result.rows,
                  result.revision,
                  activeEditors,
                  games
                ),
                db
              )
            )
          );
        } catch (error) {
          if (error?.code === "REVISION_CONFLICT") {
            return withCors(
              request,
              json(
                withD1(
                  {
                    error:
                      error.message ||
                      "This data was updated elsewhere. Reload and try again.",
                    revision: error.revision || "",
                    rows: error.rows || [],
                    games: error.games || [],
                  },
                  db
                ),
                409
              )
            );
          }
          throw error;
        }
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

    if (url.pathname === "/api/games") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method === "GET") {
        const db = instrumentDb(env.DB, "Load games", url.pathname);
        const games = await listGames(db);
        return withCors(request, json(withD1({ games }, db)));
      }

      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const db = instrumentDb(env.DB, "Create game", url.pathname);
        await touchAdminPresence(db, auth.user);
        const game = await createGame(db, body || {});
        const games = await listGames(db);
        const revision = await getDatasetRevision(db);
        return withCors(
          request,
          json(withD1({ game, games, revision }, db))
        );
      }

      return withCors(
        request,
        json(
          {
            error: "Method not allowed.",
            allowed: ["GET", "POST", "OPTIONS"],
            method: request.method,
            path: url.pathname,
          },
          405
        )
      );
    }

    const gameRowMatch = url.pathname.match(/^\/api\/games\/([^/]+)$/);
    if (gameRowMatch) {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      const gameId = decodeURIComponent(gameRowMatch[1] || "").trim();
      if (!gameId) {
        return withCors(request, json({ error: "Missing game id." }, 400));
      }

      if (request.method === "PATCH" || request.method === "PUT") {
        const body = await request.json().catch(() => ({}));
        const db = instrumentDb(env.DB, "Update game", url.pathname);
        await touchAdminPresence(db, auth.user);
        const game = await updateGame(db, gameId, body || {});
        const games = await listGames(db);
        const revision = await getDatasetRevision(db);
        return withCors(
          request,
          json(withD1({ game, games, revision }, db))
        );
      }

      if (request.method === "DELETE") {
        const db = instrumentDb(env.DB, "Delete game", url.pathname);
        await touchAdminPresence(db, auth.user);
        await deleteGame(db, gameId);
        const games = await listGames(db);
        const rows = await listAllAnnouncements(db, {
          includeMediaCoverage: false,
        });
        const revision = await getDatasetRevision(db);
        return withCors(
          request,
          json(
            withD1(datasetResponse(rows, revision, undefined, games), db)
          )
        );
      }

      return withCors(
        request,
        json(
          {
            error: "Method not allowed.",
            allowed: ["PATCH", "PUT", "DELETE", "OPTIONS"],
            method: request.method,
            path: url.pathname,
          },
          405
        )
      );
    }

    const pressKitMatch = url.pathname.match(
      /^\/api\/press-kits\/([^/]+)\/([^/]+)$/
    );
    if (pressKitMatch) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }
      return withCors(
        request,
        await serveStoredImage(
          env,
          "press-kits",
          pressKitMatch[1],
          pressKitMatch[2],
          request
        )
      );
    }

    if (url.pathname === "/api/press-kits") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method !== "POST") {
        return withCors(request, json({ error: "Method not allowed." }, 405));
      }

      const uploaded = await uploadPressKit(
        env,
        auth.user.uid,
        request,
        url.origin
      );
      return withCors(request, json(uploaded));
    }

    if (url.pathname === "/api/presence") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      if (request.method === "POST") {
        const db = instrumentDb(env.DB, "Presence ping", url.pathname);
        await touchAdminPresence(db, auth.user);
        const activeEditors = await listActiveEditors(db);
        return withCors(
          request,
          json(withD1({ ok: true, activeEditors }, db))
        );
      }

      if (request.method === "GET") {
        const db = instrumentDb(env.DB, "Load presence", url.pathname);
        const activeEditors = await listActiveEditors(db);
        return withCors(request, json(withD1({ activeEditors }, db)));
      }

      return withCors(
        request,
        json(
          {
            error: "Method not allowed.",
            allowed: ["GET", "POST", "OPTIONS"],
            method: request.method,
            path: url.pathname,
          },
          405
        )
      );
    }

    // Cheap poll: revision + presence only (no announcement / media-coverage scans).
    if (url.pathname === "/api/announcements/revision") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);
      if (request.method !== "GET") {
        return withCors(
          request,
          json(
            {
              error: "Method not allowed.",
              allowed: ["GET", "OPTIONS"],
              method: request.method,
              path: url.pathname,
            },
            405
          )
        );
      }
      const db = instrumentDb(env.DB, "Poll revision", url.pathname);
      const revision = await getDatasetRevision(db);
      const etag = revisionEtag(revision);
      if (etagMatches(request.headers.get("If-None-Match"), etag)) {
        return withCors(
          request,
          new Response(null, {
            status: 304,
            headers: {
              ETag: etag,
              "Cache-Control": "no-store",
            },
          })
        );
      }
      const activeEditors = await listActiveEditors(db);
      return withCors(
        request,
        json(withD1({ revision, activeEditors }, db), 200, {
          ETag: etag,
          "Cache-Control": "no-store",
        })
      );
    }

    if (url.pathname === "/api/media-coverage") {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);
      if (request.method !== "GET") {
        return withCors(
          request,
          json(
            {
              error: "Method not allowed.",
              allowed: ["GET", "OPTIONS"],
              method: request.method,
              path: url.pathname,
            },
            405
          )
        );
      }
      const gameTitle =
        String(url.searchParams.get("game") || "").trim() || "Untitled";
      const db = instrumentDb(env.DB, "Load media coverage", url.pathname);
      const mediaCoverage = await loadMediaCoverageValueForGame(db, gameTitle);
      return withCors(
        request,
        json(withD1({ gameTitle, mediaCoverage }, db))
      );
    }

    const announcementRowMatch = url.pathname.match(
      /^\/api\/announcements\/([^/]+)$/
    );
    if (announcementRowMatch) {
      const auth = await requireFirebaseUser(
        request,
        env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
      );
      if (auth.error) return withCors(request, auth.error);

      const rowId = decodeURIComponent(announcementRowMatch[1] || "").trim();
      if (!rowId) {
        return withCors(request, json({ error: "Missing announcement id." }, 400));
      }

      if (request.method === "PATCH" || request.method === "PUT") {
        const body = await request.json();
        const row = body?.row && typeof body.row === "object" ? body.row : body;
        const db = instrumentDb(env.DB, "Save announcement", url.pathname);
        await touchAdminPresence(db, auth.user);
        const result = await upsertAnnouncement(
          db,
          auth.user.uid,
          rowId,
          row || {}
        );
        const activeEditors = await listActiveEditors(db);
        return withCors(
          request,
          json(
            withD1(
              {
                row: result.row,
                revision: result.revision,
                activeEditors,
              },
              db
            )
          )
        );
      }

      if (request.method === "DELETE") {
        const db = instrumentDb(env.DB, "Delete announcement", url.pathname);
        await touchAdminPresence(db, auth.user);
        const result = await deleteAnnouncementById(db, rowId);
        const activeEditors = await listActiveEditors(db);
        return withCors(
          request,
          json(
            withD1(
              { id: rowId, revision: result.revision, activeEditors },
              db
            )
          )
        );
      }

      return withCors(
        request,
        json(
          {
            error: "Method not allowed.",
            allowed: ["PATCH", "PUT", "DELETE", "OPTIONS"],
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

/** Track D1 rows_read / rows_written for admin activity toasts (Steam Search style). */
function createD1Session(query, path) {
  return {
    query: String(query || "D1 query"),
    path: String(path || ""),
    rows_read: 0,
    rows_written: 0,
    duration_ms: 0,
    absorb(meta) {
      if (!meta) return;
      if (typeof meta.rows_read === "number") this.rows_read += meta.rows_read;
      if (typeof meta.rows_written === "number") {
        this.rows_written += meta.rows_written;
      }
      if (typeof meta.duration === "number") this.duration_ms += meta.duration;
    },
    snapshot() {
      return {
        query: this.query,
        path: this.path,
        rows_read: this.rows_read,
        rows_written: this.rows_written,
        duration_ms: this.duration_ms,
      };
    },
  };
}

function instrumentStatement(stmt, session) {
  return {
    _stmt: stmt,
    bind(...args) {
      return instrumentStatement(stmt.bind(...args), session);
    },
    async all(...args) {
      const result = await stmt.all(...args);
      session.absorb(result?.meta);
      return result;
    },
    async run(...args) {
      const result = await stmt.run(...args);
      session.absorb(result?.meta);
      return result;
    },
    async first(...args) {
      // .first() does not expose meta; use .all() so reads are counted.
      const result = await stmt.all(...args);
      session.absorb(result?.meta);
      const rows = result?.results || [];
      return rows.length ? rows[0] : null;
    },
  };
}

function instrumentDb(db, query, path) {
  const session = createD1Session(query, path);
  return {
    _session: session,
    prepare(sql) {
      return instrumentStatement(db.prepare(sql), session);
    },
    async batch(statements) {
      const raw = (statements || []).map((item) => item?._stmt || item);
      const results = await db.batch(raw);
      for (const result of results || []) session.absorb(result?.meta);
      return results;
    },
    getD1() {
      return session.snapshot();
    },
  };
}

function withD1(payload, db) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  const d1 = db?.getD1?.();
  if (!d1) return payload;
  return { ...payload, d1 };
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, If-None-Match",
    "Access-Control-Expose-Headers": "ETag",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function revisionEtag(revision) {
  const value = String(revision || "").trim();
  if (!value) return "";
  return `"${value.replace(/"/g, "")}"`;
}

function etagMatches(ifNoneMatch, etag) {
  if (!ifNoneMatch || !etag) return false;
  return String(ifNoneMatch)
    .split(",")
    .map((part) => part.trim())
    .includes(etag);
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
        name: typeof payload.name === "string" ? payload.name : "",
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
    mediaCoverage: record.media_coverage ?? "",
    gameImage: record.game_image ?? "",
  };
}

async function ensureMediaCoverageColumn(db) {
  try {
    await db
      .prepare(
        `ALTER TABLE announcements ADD COLUMN media_coverage TEXT NOT NULL DEFAULT ''`
      )
      .run();
  } catch {
    // Column already exists.
  }
}

/** Keep each media-coverage chunk well under D1's 2MB row limit. */
const MEDIA_COVERAGE_ROWS_PER_CHUNK = 75;
const MEDIA_COVERAGE_SECTION_TITLE = "Media Coverage";

async function ensureMediaCoverageChunksTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS media_coverage_chunks (
         game_title_key TEXT NOT NULL,
         game_title TEXT NOT NULL DEFAULT '',
         chunk_index INTEGER NOT NULL,
         data_json TEXT NOT NULL DEFAULT '[]',
         updated_at TEXT NOT NULL DEFAULT (datetime('now')),
         PRIMARY KEY (game_title_key, chunk_index)
       )`
    )
    .run();
  try {
    await db
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_media_coverage_chunks_game
         ON media_coverage_chunks (game_title_key, chunk_index)`
      )
      .run();
  } catch {
    // Index already exists.
  }
}

function mediaCoverageGameKey(gameTitle) {
  return normalizeFilterKey(gameTitle) || "untitled";
}

function compactMediaCoverageItem(item) {
  if (!item || typeof item !== "object") return null;
  const out = {};
  for (const [key, value] of Object.entries(item)) {
    const text = String(value ?? "").trim();
    if (text) out[key] = text;
  }
  return Object.keys(out).length ? out : null;
}

function parseMediaCoverageRowsFromValue(value) {
  const text = String(value || "").trim();
  if (!text) return [];

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed)
        ? parsed
        : parsed?.rows ?? parsed?.links ?? [];
      if (!Array.isArray(rows)) return [];
      return rows
        .map((item) => {
          if (typeof item === "string") {
            const details = item.trim();
            return details ? { details } : null;
          }
          return compactMediaCoverageItem(item);
        })
        .filter(Boolean);
    } catch {
      /* fall through */
    }
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ details: line }));
}

function buildMediaCoverageValue(rows) {
  const cleaned = (Array.isArray(rows) ? rows : [])
    .map((item) => compactMediaCoverageItem(item))
    .filter(Boolean);
  if (!cleaned.length) return "";
  return JSON.stringify({
    sectionTitle: MEDIA_COVERAGE_SECTION_TITLE,
    rows: cleaned,
  });
}

async function loadMediaCoverageValueForGame(db, gameTitle) {
  await ensureMediaCoverageChunksTable(db);
  const key = mediaCoverageGameKey(gameTitle);
  const result = await db
    .prepare(
      `SELECT data_json
       FROM media_coverage_chunks
       WHERE game_title_key = ?
       ORDER BY chunk_index ASC`
    )
    .bind(key)
    .all();

  const rows = [];
  for (const row of result.results || []) {
    try {
      const parsed = JSON.parse(String(row.data_json || "[]"));
      if (Array.isArray(parsed)) rows.push(...parsed);
    } catch {
      // Skip corrupt chunks.
    }
  }
  return buildMediaCoverageValue(rows);
}

async function replaceMediaCoverageForGame(db, gameTitle, mediaCoverageValue) {
  await ensureMediaCoverageChunksTable(db);
  const title = String(gameTitle || "").trim() || "Untitled";
  const key = mediaCoverageGameKey(title);
  const rows = parseMediaCoverageRowsFromValue(mediaCoverageValue);
  const nextValue = buildMediaCoverageValue(rows);
  const existingValue = await loadMediaCoverageValueForGame(db, title);
  if (existingValue === nextValue) return;

  await db
    .prepare(`DELETE FROM media_coverage_chunks WHERE game_title_key = ?`)
    .bind(key)
    .run();

  if (rows.length) {
    const statements = [];
    for (let i = 0; i < rows.length; i += MEDIA_COVERAGE_ROWS_PER_CHUNK) {
      const chunk = rows.slice(i, i + MEDIA_COVERAGE_ROWS_PER_CHUNK);
      const chunkIndex = Math.floor(i / MEDIA_COVERAGE_ROWS_PER_CHUNK);
      statements.push(
        db
          .prepare(
            `INSERT INTO media_coverage_chunks (
               game_title_key, game_title, chunk_index, data_json, updated_at
             ) VALUES (?, ?, ?, ?, datetime('now'))`
          )
          .bind(key, title, chunkIndex, JSON.stringify(chunk))
      );
    }
    await db.batch(statements);
  }
  await bumpDatasetRevision(db);
}

async function loadMediaCoverageValueMap(db, gameTitles = null) {
  await ensureMediaCoverageChunksTable(db);

  let result;
  if (Array.isArray(gameTitles)) {
    const keys = [
      ...new Set(
        gameTitles
          .map((title) => mediaCoverageGameKey(title))
          .filter(Boolean)
      ),
    ];
    if (!keys.length) return new Map();
    const placeholders = keys.map(() => "?").join(", ");
    result = await db
      .prepare(
        `SELECT game_title_key, chunk_index, data_json
         FROM media_coverage_chunks
         WHERE game_title_key IN (${placeholders})
         ORDER BY game_title_key ASC, chunk_index ASC`
      )
      .bind(...keys)
      .all();
  } else {
    result = await db
      .prepare(
        `SELECT game_title_key, chunk_index, data_json
         FROM media_coverage_chunks
         ORDER BY game_title_key ASC, chunk_index ASC`
      )
      .all();
  }

  const grouped = new Map();
  for (const row of result.results || []) {
    const key = String(row.game_title_key || "");
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    try {
      const parsed = JSON.parse(String(row.data_json || "[]"));
      if (Array.isArray(parsed)) {
        grouped.get(key).push(...parsed);
      }
    } catch {
      // Skip corrupt chunks.
    }
  }

  const out = new Map();
  for (const [key, rows] of grouped.entries()) {
    out.set(key, buildMediaCoverageValue(rows));
  }
  return out;
}

async function migrateLegacyMediaCoverageRows(db, rows) {
  const list = Array.isArray(rows) ? rows : [];
  const migrated = [];
  const seen = new Set();

  for (const row of list) {
    const legacy = String(row?.mediaCoverage || "").trim();
    if (!legacy) continue;
    const title = String(row.gameTitle || "").trim() || "Untitled";
    const key = mediaCoverageGameKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    migrated.push({ title, key, value: legacy });
  }

  for (const item of migrated) {
    try {
      await replaceMediaCoverageForGame(db, item.title, item.value);
      await db
        .prepare(
          `UPDATE announcements
           SET media_coverage = '', updated_at = datetime('now')
           WHERE lower(trim(game_title)) = lower(trim(?))`
        )
        .bind(item.title)
        .run();
    } catch {
      // Leave legacy value on the row if migration fails.
    }
  }

  return seen.size;
}

async function attachMediaCoverageToRows(db, rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return list;

  await migrateLegacyMediaCoverageRows(db, list);

  const titles = list.map((row) => row.gameTitle);
  const map = await loadMediaCoverageValueMap(db, titles);

  return list.map((row) => {
    const key = mediaCoverageGameKey(row.gameTitle);
    const fromChunks = map.get(key);
    return fromChunks ? { ...row, mediaCoverage: fromChunks } : row;
  });
}

async function replaceAllMediaCoverageFromAnnouncementRows(db, rows) {
  await ensureMediaCoverageChunksTable(db);
  const byGame = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const title = String(row?.gameTitle || "").trim() || "Untitled";
    const key = mediaCoverageGameKey(title);
    if (byGame.has(key)) continue;
    byGame.set(key, {
      title,
      value: String(row?.mediaCoverage || ""),
    });
  }

  await db.prepare(`DELETE FROM media_coverage_chunks`).run();

  for (const { title, value } of byGame.values()) {
    const items = parseMediaCoverageRowsFromValue(value);
    if (!items.length) continue;
    const statements = [];
    const key = mediaCoverageGameKey(title);
    for (let i = 0; i < items.length; i += MEDIA_COVERAGE_ROWS_PER_CHUNK) {
      const chunk = items.slice(i, i + MEDIA_COVERAGE_ROWS_PER_CHUNK);
      const chunkIndex = Math.floor(i / MEDIA_COVERAGE_ROWS_PER_CHUNK);
      statements.push(
        db
          .prepare(
            `INSERT INTO media_coverage_chunks (
               game_title_key, game_title, chunk_index, data_json, updated_at
             ) VALUES (?, ?, ?, ?, datetime('now'))`
          )
          .bind(key, title, chunkIndex, JSON.stringify(chunk))
      );
    }
    if (statements.length) await db.batch(statements);
  }
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

async function uploadPressReleasePdf(env, ownerUid, request, origin) {
  if (!env.IMAGES) {
    throw new Error(
      "File storage is not configured. Create an R2 bucket and bind it as IMAGES."
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const label = String(form.get("label") || form.get("gameTitle") || "press-release");

  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error("Choose a PDF file.");
  }

  const contentType = String(file.type || "").toLowerCase();
  const fileNameHint = typeof file.name === "string" ? file.name : "";
  const looksLikePdf =
    contentType === "application/pdf" ||
    contentType === "application/x-pdf" ||
    /\.pdf$/i.test(fileNameHint);
  if (!looksLikePdf) {
    throw new Error("Please choose a PDF file.");
  }

  if (typeof file.size === "number" && file.size > MAX_PRESS_RELEASE_PDF_BYTES) {
    throw new Error("PDF must be 50 MB or smaller.");
  }

  const baseName = sanitizePathPart(
    fileNameHint.replace(/\.pdf$/i, "") || label
  );
  const fileName = `${baseName}-${crypto.randomUUID()}.pdf`;
  const key = `press-release-pdfs/${ownerUid}/${fileName}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: {
      contentType: "application/pdf",
      contentDisposition: `inline; filename="${fileName}"`,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      ownerUid,
      label: String(label).slice(0, 200),
      originalName: fileNameHint.slice(0, 200),
    },
  });

  return {
    key,
    url: `${origin}/api/press-release-pdfs/${encodeURIComponent(ownerUid)}/${encodeURIComponent(fileName)}`,
  };
}

async function uploadPressKit(env, ownerUid, request, origin) {
  if (!env.IMAGES) {
    throw new Error(
      "File storage is not configured. Create an R2 bucket and bind it as IMAGES."
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const label = String(form.get("label") || form.get("gameTitle") || "press-kit");

  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error("Choose a press kit file (PDF or ZIP).");
  }

  const contentType = String(file.type || "").toLowerCase();
  const fileNameHint = typeof file.name === "string" ? file.name : "";
  const extMatch = fileNameHint.match(/\.([a-z0-9]+)$/i);
  const ext = (extMatch?.[1] || "").toLowerCase();
  const looksLikeKit =
    contentType === "application/pdf" ||
    contentType === "application/x-pdf" ||
    contentType === "application/zip" ||
    contentType === "application/x-zip-compressed" ||
    contentType === "application/octet-stream" ||
    ["pdf", "zip"].includes(ext);
  if (!looksLikeKit) {
    throw new Error("Please choose a PDF or ZIP press kit.");
  }

  if (typeof file.size === "number" && file.size > MAX_PRESS_KIT_BYTES) {
    throw new Error("Press kit must be 200 MB or smaller.");
  }

  const safeExt = ["pdf", "zip"].includes(ext) ? ext : "bin";
  const baseName = sanitizePathPart(
    fileNameHint.replace(/\.[a-z0-9]+$/i, "") || label
  );
  const fileName = `${baseName}-${crypto.randomUUID()}.${safeExt}`;
  const key = `press-kits/${ownerUid}/${fileName}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: {
      contentType:
        safeExt === "pdf"
          ? "application/pdf"
          : contentType || "application/octet-stream",
      contentDisposition: `attachment; filename="${fileName}"`,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      ownerUid,
      label: String(label).slice(0, 200),
      originalName: fileNameHint.slice(0, 200),
    },
  });

  return {
    key,
    url: `${origin}/api/press-kits/${encodeURIComponent(ownerUid)}/${encodeURIComponent(fileName)}`,
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
    !ALLOWED_STORAGE_FOLDERS.has(folder)
  ) {
    return json({ error: "Not found." }, 404);
  }

  const key = `${folder}/${safeOwner}/${safeName}`;
  const object =
    request.method === "HEAD"
      ? await env.IMAGES.head(key)
      : await env.IMAGES.get(key);

  if (!object) {
    return json({ error: "File not found." }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Allow-Origin", "*");
  if (folder === "press-release-pdfs") {
    headers.set("Content-Type", "application/pdf");
    if (!headers.has("Content-Disposition")) {
      headers.set(
        "Content-Disposition",
        `inline; filename="${safeName.replace(/"/g, "")}"`
      );
    }
  }
  if (folder === "press-kits" && !headers.has("Content-Disposition")) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeName.replace(/"/g, "")}"`
    );
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(object.body, { status: 200, headers });
}

/** Fill empty gameImage from any sibling row with the same game title. */
function attachGameImagesToRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return list;

  const imageByGame = new Map();
  for (const row of list) {
    const key = mediaCoverageGameKey(row.gameTitle);
    const image = String(row.gameImage || "").trim();
    if (image && !imageByGame.has(key)) imageByGame.set(key, image);
  }

  return list.map((row) => {
    const key = mediaCoverageGameKey(row.gameTitle);
    const shared = imageByGame.get(key) || "";
    if (!shared) return row;
    if (String(row.gameImage || "").trim() === shared) return row;
    return { ...row, gameImage: shared };
  });
}

/** Persist a cover URL onto every announcement row for that game title. */
async function propagateGameImageToTitle(db, gameTitle, gameImage) {
  const title = String(gameTitle || "").trim() || "Untitled";
  const image = String(gameImage || "").trim();
  await db
    .prepare(
      `UPDATE announcements
       SET game_image = ?, updated_at = datetime('now')
       WHERE lower(trim(game_title)) = lower(trim(?))`
    )
    .bind(image, title)
    .run();
}

async function listAnnouncements(db, ownerUid, options = {}) {
  await ensureMediaCoverageColumn(db);
  const result = await db
    .prepare(
      `SELECT *
       FROM announcements
       WHERE owner_uid = ?
       ORDER BY sort_order ASC, game_title ASC, date ASC`
    )
    .bind(ownerUid)
    .all();

  const mapped = (result.results || []).map(rowFromDb);
  if (options.includeMediaCoverage === false) {
    await migrateLegacyMediaCoverageRows(db, mapped);
    return attachGameImagesToRows(mapped);
  }
  const rows = await attachMediaCoverageToRows(db, mapped);
  return attachGameImagesToRows(rows);
}

async function listAllAnnouncements(db, options = {}) {
  await ensureMediaCoverageColumn(db);
  const result = await db
    .prepare(
      `SELECT *
       FROM announcements
       ORDER BY game_title ASC, sort_order ASC, date ASC`
    )
    .all();

  const mapped = (result.results || []).map(rowFromDb);
  if (options.includeMediaCoverage === false) {
    await migrateLegacyMediaCoverageRows(db, mapped);
    return attachGameImagesToRows(mapped);
  }
  const rows = await attachMediaCoverageToRows(db, mapped);
  return attachGameImagesToRows(rows);
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

function normalizeShareMonths(body) {
  const fromArray = Array.isArray(body?.months)
    ? body.months
    : Array.isArray(body?.month)
      ? body.month
      : null;
  if (fromArray) {
    return [
      ...new Set(
        fromArray.map((value) => String(value || "").trim()).filter(Boolean)
      ),
    ];
  }
  const single = String(body?.month || "").trim();
  return single ? [single] : [];
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
  const months = normalizeShareMonths(body);

  if (games.length === 0 && months.length === 0) {
    throw new Error("Pick at least one game or a month for the share link.");
  }

  // Store as JSON array; older single-string values still work in getShare.
  const monthStored = JSON.stringify(months);

  let id = shortShareId();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await db
        .prepare(
          `INSERT INTO shares (id, owner_uid, games, month, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))`
        )
        .bind(id, ownerUid, JSON.stringify(games), monthStored)
        .run();
      return { id, games, months, month: months[0] || "" };
    } catch (error) {
      // Collision on primary key — try another id
      id = shortShareId();
      if (attempt === 4) throw error;
    }
  }

  throw new Error("Could not create share link.");
}

function parseShareMonths(raw) {
  const value = String(raw || "").trim();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.map((item) => String(item || "").trim()).filter(Boolean))];
    }
  } catch {
    // Legacy plain month string
  }
  return [value];
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

  const months = parseShareMonths(record.month);

  return {
    id: record.id,
    games,
    months,
    month: months[0] || "",
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
    const shareMonths = Array.isArray(share.months)
      ? share.months
      : share.month
        ? [share.month]
        : [];
    monthKeys = [
      ...new Set(shareMonths.map(normalizeFilterKey).filter(Boolean)),
    ];
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

async function ensureDatasetRevisionTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS dataset_revision (
         id INTEGER PRIMARY KEY CHECK (id = 1),
         revision TEXT NOT NULL,
         updated_at TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    )
    .run();
}

function newDatasetRevisionToken() {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

/** One-row revision token — cheap to poll; bump on every dataset write. */
async function getDatasetRevision(db) {
  await ensureDatasetRevisionTable(db);
  const row = await db
    .prepare(`SELECT revision FROM dataset_revision WHERE id = 1`)
    .first();
  if (row?.revision) return String(row.revision);

  const seeded = newDatasetRevisionToken();
  await db
    .prepare(
      `INSERT INTO dataset_revision (id, revision, updated_at)
       VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO NOTHING`
    )
    .bind(seeded)
    .run();
  const again = await db
    .prepare(`SELECT revision FROM dataset_revision WHERE id = 1`)
    .first();
  return String(again?.revision || seeded);
}

async function bumpDatasetRevision(db) {
  await ensureDatasetRevisionTable(db);
  const next = newDatasetRevisionToken();
  await db
    .prepare(
      `INSERT INTO dataset_revision (id, revision, updated_at)
       VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         revision = excluded.revision,
         updated_at = datetime('now')`
    )
    .bind(next)
    .run();
  return next;
}

async function announcementRowCount(db) {
  try {
    const row = await db
      .prepare(`SELECT COUNT(*) AS cnt FROM announcements`)
      .first();
    return Number(row?.cnt ?? 0);
  } catch {
    return 0;
  }
}

async function nextSortOrder(db) {
  const result = await db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM announcements`)
    .first();
  return Number(result?.m ?? -1) + 1;
}

async function upsertAnnouncement(db, ownerUid, id, row) {
  const rowId =
    typeof id === "string" && id.trim()
      ? id.trim()
      : typeof row?.id === "string" && row.id.trim()
        ? row.id.trim()
        : crypto.randomUUID();

  const existing = await db
    .prepare(`SELECT sort_order FROM announcements WHERE id = ?`)
    .bind(rowId)
    .first();
  const sortOrder =
    existing?.sort_order != null
      ? Number(existing.sort_order)
      : await nextSortOrder(db);

  await ensureMediaCoverageColumn(db);
  const gameTitle = String(row.gameTitle ?? "");
  const mediaCoverageValue = String(row.mediaCoverage ?? "");
  const gameImageValue = String(row.gameImage ?? "").trim();
  // Keep announcement row small; large CSVs live in media_coverage_chunks.
  await replaceMediaCoverageForGame(db, gameTitle, mediaCoverageValue);

  await db
    .prepare(
      `INSERT INTO announcements (
        id, owner_uid, game_title, announcement_title, date, month,
        platforms, trailer, press_release_pdf, estimated_reach,
        highlights, total_wishlists, coverage_links, media_coverage,
        game_image, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        owner_uid = excluded.owner_uid,
        game_title = excluded.game_title,
        announcement_title = excluded.announcement_title,
        date = excluded.date,
        month = excluded.month,
        platforms = excluded.platforms,
        trailer = excluded.trailer,
        press_release_pdf = excluded.press_release_pdf,
        estimated_reach = excluded.estimated_reach,
        highlights = excluded.highlights,
        total_wishlists = excluded.total_wishlists,
        coverage_links = excluded.coverage_links,
        media_coverage = excluded.media_coverage,
        game_image = excluded.game_image,
        sort_order = excluded.sort_order,
        updated_at = datetime('now')`
    )
    .bind(
      rowId,
      ownerUid,
      gameTitle,
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
      "",
      gameImageValue,
      sortOrder
    )
    .run();

  // Covers are per-game: copy onto every announcement with this title.
  await propagateGameImageToTitle(db, gameTitle, gameImageValue);

  const saved = await db
    .prepare(`SELECT * FROM announcements WHERE id = ?`)
    .bind(rowId)
    .first();
  const withMedia = await attachMediaCoverageToRows(db, [rowFromDb(saved)]);
  const [attached] = attachGameImagesToRows(withMedia);
  const revision = await bumpDatasetRevision(db);
  return { row: attached || rowFromDb(saved), revision };
}

async function deleteAnnouncementById(db, id) {
  await db.prepare(`DELETE FROM announcements WHERE id = ?`).bind(id).run();
  const revision = await bumpDatasetRevision(db);
  return { revision };
}

async function replaceAnnouncements(db, ownerUid, rows, expectedRevision) {
  if (!Array.isArray(rows)) {
    throw new Error("Body must include a rows array.");
  }

  const currentRevision = await getDatasetRevision(db);
  const expected =
    expectedRevision === undefined || expectedRevision === null
      ? ""
      : String(expectedRevision);
  // Reject stale/missing revisions so an older tab cannot wipe newer shared edits.
  // Empty revision is only OK when there are no announcements yet.
  const dbCount = await announcementRowCount(db);
  const revisionMismatch =
    expected !== currentRevision && (expected !== "" || dbCount > 0);
  if (revisionMismatch) {
    const error = new Error(
      "This data was updated elsewhere. Loaded the latest version."
    );
    error.code = "REVISION_CONFLICT";
    error.revision = currentRevision;
    error.rows = await listAllAnnouncements(db, {
      includeMediaCoverage: false,
    });
    error.games = await listGames(db);
    throw error;
  }

  // Shared dataset: any admin save replaces the full announcement table.
  // owner_uid is retained as the last editor for audit, not as a visibility filter.
  await ensureMediaCoverageColumn(db);
  await replaceAllMediaCoverageFromAnnouncementRows(db, rows);
  const syncedRows = attachGameImagesToRows(rows);
  const statements = [db.prepare(`DELETE FROM announcements`)];

  syncedRows.forEach((row, index) => {
    const rawId = String(row?.id ?? "").trim();
    // Ignore legacy numeric CSV indexes; always persist stable string ids.
    const id = rawId && !/^\d+$/.test(rawId) ? rawId : crypto.randomUUID();

    statements.push(
      db
        .prepare(
          `INSERT INTO announcements (
            id, owner_uid, game_title, announcement_title, date, month,
            platforms, trailer, press_release_pdf, estimated_reach,
            highlights, total_wishlists, coverage_links, media_coverage,
            game_image, sort_order, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
          "",
          String(row.gameImage ?? "").trim(),
          index
        )
    );
  });

  await db.batch(statements);
  // Return rows without re-reading every media-coverage chunk; admin loads per game.
  const nextRows = await listAllAnnouncements(db, {
    includeMediaCoverage: false,
  });
  const revision = await bumpDatasetRevision(db);
  return { rows: nextRows, revision };
}

function datasetResponse(rows, revision, activeEditors, games) {
  const payload = {
    columns: DISPLAY_COLUMNS,
    rows,
  };
  if (revision !== undefined) payload.revision = revision;
  if (activeEditors !== undefined) payload.activeEditors = activeEditors;
  if (games !== undefined) payload.games = games;
  return payload;
}

async function ensureGamesTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL UNIQUE,
        key_art TEXT NOT NULL DEFAULT '',
        press_kit TEXT NOT NULL DEFAULT '',
        store_links TEXT NOT NULL DEFAULT '[]',
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();
}

function parseStoreLinks(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") {
          const url = item.trim();
          return url ? { label: "", url } : null;
        }
        if (!item || typeof item !== "object") return null;
        const url = String(item.url ?? item.href ?? "").trim();
        if (!url) return null;
        return {
          label: String(item.label ?? item.name ?? "").trim(),
          url,
        };
      })
      .filter(Boolean);
  } catch {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((url) => ({ label: "", url }));
  }
}

function serializeStoreLinks(value) {
  if (typeof value === "string") {
    return JSON.stringify(parseStoreLinks(value));
  }
  if (!Array.isArray(value)) return "[]";
  return JSON.stringify(
    value
      .map((item) => {
        if (typeof item === "string") {
          const url = item.trim();
          return url ? { label: "", url } : null;
        }
        if (!item || typeof item !== "object") return null;
        const url = String(item.url ?? item.href ?? "").trim();
        if (!url) return null;
        return {
          label: String(item.label ?? item.name ?? "").trim(),
          url,
        };
      })
      .filter(Boolean)
  );
}

function gameFromDb(record, announcementCount = 0) {
  return {
    id: record.id,
    title: record.title ?? "",
    keyArt: record.key_art ?? "",
    pressKit: record.press_kit ?? "",
    storeLinks: parseStoreLinks(record.store_links),
    sortOrder: Number(record.sort_order) || 0,
    announcementCount: Number(announcementCount) || 0,
  };
}

async function backfillGamesFromAnnouncements(db) {
  // One anti-join for missing titles (not a per-title existence check loop).
  const missing = await db
    .prepare(
      `SELECT DISTINCT trim(a.game_title) AS title
       FROM announcements a
       WHERE trim(a.game_title) != ''
         AND NOT EXISTS (
           SELECT 1
           FROM games g
           WHERE lower(trim(g.title)) = lower(trim(a.game_title))
         )
       ORDER BY title ASC`
    )
    .all();

  const titles = missing.results || [];
  if (!titles.length) return;

  const maxOrder = await db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM games`)
    .first();
  let nextOrder = Number(maxOrder?.m ?? -1) + 1;

  for (const row of titles) {
    const title = String(row.title || "").trim();
    if (!title) continue;

    const imageRow = await db
      .prepare(
        `SELECT game_image
         FROM announcements
         WHERE lower(trim(game_title)) = lower(trim(?))
           AND trim(game_image) != ''
         ORDER BY sort_order ASC
         LIMIT 1`
      )
      .bind(title)
      .first();

    await db
      .prepare(
        `INSERT INTO games (id, title, key_art, press_kit, store_links, sort_order, updated_at)
         VALUES (?, ?, ?, '', '[]', ?, datetime('now'))`
      )
      .bind(
        crypto.randomUUID(),
        title,
        String(imageRow?.game_image || "").trim(),
        nextOrder
      )
      .run();
    nextOrder += 1;
  }
}

async function listGames(db) {
  await ensureGamesTable(db);
  await backfillGamesFromAnnouncements(db);

  const result = await db
    .prepare(
      `SELECT
         g.*,
         COALESCE(c.announcement_count, 0) AS announcement_count
       FROM games g
       LEFT JOIN (
         SELECT lower(trim(game_title)) AS title_key,
                COUNT(*) AS announcement_count
         FROM announcements
         WHERE trim(game_title) != ''
         GROUP BY lower(trim(game_title))
       ) c ON lower(trim(g.title)) = c.title_key
       ORDER BY g.sort_order ASC, g.title ASC`
    )
    .all();

  return (result.results || []).map((row) =>
    gameFromDb(row, row.announcement_count)
  );
}

async function createGame(db, body) {
  await ensureGamesTable(db);
  const title = String(body?.title ?? body?.gameTitle ?? "").trim();
  if (!title) throw new Error("Game name is required.");

  const existing = await db
    .prepare(
      `SELECT id FROM games WHERE lower(trim(title)) = lower(trim(?)) LIMIT 1`
    )
    .bind(title)
    .first();
  if (existing?.id) {
    throw new Error(`A game named “${title}” already exists.`);
  }

  const keyArt = String(body?.keyArt ?? body?.gameImage ?? "").trim();
  const pressKit = String(body?.pressKit ?? "").trim();
  const storeLinks = serializeStoreLinks(body?.storeLinks ?? []);
  const id = String(body?.id || "").trim() || crypto.randomUUID();

  const maxOrder = await db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM games`)
    .first();
  const sortOrder = Number(maxOrder?.max_order ?? -1) + 1;

  await db
    .prepare(
      `INSERT INTO games (id, title, key_art, press_kit, store_links, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, title, keyArt, pressKit, storeLinks, sortOrder)
    .run();

  if (keyArt) {
    await propagateGameImageToTitle(db, title, keyArt);
  }

  await bumpDatasetRevision(db);

  const saved = await db
    .prepare(`SELECT * FROM games WHERE id = ?`)
    .bind(id)
    .first();
  return gameFromDb(saved, 0);
}

async function updateGame(db, gameId, body) {
  await ensureGamesTable(db);
  const existing = await db
    .prepare(`SELECT * FROM games WHERE id = ?`)
    .bind(gameId)
    .first();
  if (!existing) throw new Error("Game not found.");

  const previousTitle = String(existing.title || "").trim();
  const nextTitle =
    body?.title !== undefined || body?.gameTitle !== undefined
      ? String(body?.title ?? body?.gameTitle ?? "").trim()
      : previousTitle;
  if (!nextTitle) throw new Error("Game name is required.");

  if (nextTitle.toLowerCase() !== previousTitle.toLowerCase()) {
    const clash = await db
      .prepare(
        `SELECT id FROM games
         WHERE lower(trim(title)) = lower(trim(?)) AND id != ?
         LIMIT 1`
      )
      .bind(nextTitle, gameId)
      .first();
    if (clash?.id) {
      throw new Error(`A game named “${nextTitle}” already exists.`);
    }
  }

  const keyArt =
    body?.keyArt !== undefined || body?.gameImage !== undefined
      ? String(body?.keyArt ?? body?.gameImage ?? "").trim()
      : String(existing.key_art || "").trim();
  const pressKit =
    body?.pressKit !== undefined
      ? String(body.pressKit ?? "").trim()
      : String(existing.press_kit || "").trim();
  const storeLinks =
    body?.storeLinks !== undefined
      ? serializeStoreLinks(body.storeLinks)
      : String(existing.store_links || "[]");

  await db
    .prepare(
      `UPDATE games
       SET title = ?, key_art = ?, press_kit = ?, store_links = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(nextTitle, keyArt, pressKit, storeLinks, gameId)
    .run();

  if (previousTitle && nextTitle !== previousTitle) {
    await db
      .prepare(
        `UPDATE announcements
         SET game_title = ?, updated_at = datetime('now')
         WHERE lower(trim(game_title)) = lower(trim(?))`
      )
      .bind(nextTitle, previousTitle)
      .run();
  }

  if (keyArt !== String(existing.key_art || "").trim() || nextTitle !== previousTitle) {
    await propagateGameImageToTitle(db, nextTitle, keyArt);
  }

  await bumpDatasetRevision(db);

  const countRow = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM announcements
       WHERE lower(trim(game_title)) = lower(trim(?))`
    )
    .bind(nextTitle)
    .first();
  const saved = await db
    .prepare(`SELECT * FROM games WHERE id = ?`)
    .bind(gameId)
    .first();
  return gameFromDb(saved, countRow?.count);
}

async function deleteGame(db, gameId) {
  await ensureGamesTable(db);
  const existing = await db
    .prepare(`SELECT * FROM games WHERE id = ?`)
    .bind(gameId)
    .first();
  if (!existing) throw new Error("Game not found.");

  const title = String(existing.title || "").trim();
  if (title) {
    const rows = await db
      .prepare(
        `SELECT id FROM announcements
         WHERE lower(trim(game_title)) = lower(trim(?))`
      )
      .bind(title)
      .all();
    for (const row of rows.results || []) {
      await db
        .prepare(`DELETE FROM announcements WHERE id = ?`)
        .bind(row.id)
        .run();
    }
    await replaceMediaCoverageForGame(db, title, "");
  }

  await db.prepare(`DELETE FROM games WHERE id = ?`).bind(gameId).run();
  await bumpDatasetRevision(db);
}

function displayNameFromUser(user) {
  const named = String(user?.name || "").trim();
  if (named) return named;
  const local = String(user?.email || "")
    .split("@")[0]
    .trim();
  if (!local) return "Admin";
  return local
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function initialsFromDisplayName(name, email = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return `${parts[0].charAt(0)}${parts[0].charAt(0)}`.toUpperCase();
  }
  const local = String(email || "").split("@")[0] || "A";
  return local.slice(0, 2).toUpperCase();
}

async function ensureAdminPresenceTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS admin_presence (
        uid TEXT PRIMARY KEY,
        email TEXT NOT NULL DEFAULT '',
        display_name TEXT NOT NULL DEFAULT '',
        last_seen TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();
}

async function touchAdminPresence(db, user) {
  if (!user?.uid) return;
  try {
    await ensureAdminPresenceTable(db);
    const email = String(user.email || "");
    const displayName = displayNameFromUser(user);
    await db
      .prepare(
        `INSERT INTO admin_presence (uid, email, display_name, last_seen)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(uid) DO UPDATE SET
           email = excluded.email,
           display_name = excluded.display_name,
           last_seen = datetime('now')`
      )
      .bind(user.uid, email, displayName)
      .run();
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "warn",
        message:
          error instanceof Error
            ? error.message
            : "Could not update admin presence.",
      })
    );
  }
}

async function listActiveEditors(db) {
  try {
    await ensureAdminPresenceTable(db);
    const result = await db
      .prepare(
        `SELECT uid, email, display_name, last_seen
         FROM admin_presence
         WHERE last_seen >= datetime('now', '-5 minutes')
         ORDER BY last_seen DESC`
      )
      .all();
    return (result.results || []).map((row) => {
      const displayName = String(row.display_name || "").trim() || "Admin";
      const email = String(row.email || "");
      return {
        uid: String(row.uid || ""),
        email,
        displayName,
        initials: initialsFromDisplayName(displayName, email),
        lastSeen: String(row.last_seen || ""),
      };
    });
  } catch {
    return [];
  }
}
