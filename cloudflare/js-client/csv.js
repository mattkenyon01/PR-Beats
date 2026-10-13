export const DISPLAY_COLUMNS = [
  {
    key: "gameTitle",
    label: "Game Title",
    perGame: true,
    aliases: ["title", "title:", "game title", "game"],
  },
  {
    key: "announcementTitle",
    label: "Announcement Title",
    aliases: [
      "campaign name",
      "campaign",
      "campaign title",
      "announcement title",
      "announcement",
    ],
  },
  {
    key: "date",
    label: "Date",
    aliases: ["date", "published", "published date", "publish date"],
  },
  {
    key: "month",
    label: "Month",
    derived: true,
    aliases: [],
  },
  {
    key: "platforms",
    label: "Platforms",
    aliases: ["platforms", "platform", "systems", "system"],
  },
  {
    key: "trailer",
    label: "Trailer",
    aliases: ["trailer", "trailer link", "trailer url", "video"],
  },
  {
    key: "pressReleasePdf",
    label: "Press Release PDF Space",
    aliases: [
      "press release pdf space",
      "press release pdf",
      "press release",
      "press kit",
      "pdf",
      "pdf space",
    ],
  },
  {
    key: "estimatedReach",
    label: "Estimated Reach",
    aliases: ["estimated reach", "est reach", "est. reach", "reach"],
  },
  {
    key: "highlights",
    label: "Highlights",
    hiddenInTable: true,
    aliases: [
      "highlights",
      "important notes",
      "notes",
      "note",
      "comments",
    ],
  },
  {
    key: "totalWishlists",
    label: "Total Wishlists",
    aliases: [
      "total wishlists",
      "total wishlist",
      "wishlists",
      "wishlist",
      "wishlist delta",
    ],
  },
  {
    key: "coverageLinks",
    label: "Coverage Links",
    linkSection: true,
    aliases: [
      "coverage links",
      "coverage link",
      "links",
      "link",
      "urls",
      "url",
      "press links",
      "coverage urls",
    ],
  },
  {
    key: "mediaCoverage",
    label: "Media Coverage",
    perGame: true,
    hiddenInTable: true,
    optionalInStatus: true,
    aliases: [
      "media coverage",
      "media",
      "influencer coverage",
      "creators",
      "creator coverage",
    ],
  },
  {
    key: "gameImage",
    label: "Game Image",
    perGame: true,
    aliases: [
      "game image",
      "cover",
      "cover image",
      "image",
      "game cover",
      "artwork",
    ],
  },
];

export const DEFAULT_MEDIA_COVERAGE_TITLE = "Media Coverage";

/** Single per-game media coverage table columns. */
export const MEDIA_COVERAGE_COLUMNS = [
  {
    key: "publishedTime",
    label: "Published Time",
    aliases: ["published time", "published", "publish time", "date", "time"],
  },
  {
    key: "game",
    label: "Game",
    aliases: ["game", "game title", "title"],
  },
  {
    key: "type",
    label: "Type",
    aliases: ["type", "media type", "content type"],
  },
  {
    key: "customName",
    label: "Custom Name",
    aliases: [
      "custom name",
      "custom first/last name-field (e.g. \"ben\")",
      "custom first/last name-field",
      "custom first last name",
      "name",
      "first last name",
      "creator name",
      "influencer name",
    ],
  },
  {
    key: "handleId",
    label: "Handle Id",
    aliases: ["handle id", "handle", "id", "creator id"],
  },
  {
    key: "handleUrl",
    label: "Handle Url",
    aliases: ["handle url", "handle link", "profile url", "url", "link"],
  },
  {
    key: "handleLanguage",
    label: "Handle Language",
    aliases: ["handle language", "language", "lang"],
  },
  {
    key: "handleCountry",
    label: "Handle Country",
    aliases: ["handle country", "country", "nation"],
  },
  {
    key: "handleEmail",
    label: "Handle Email",
    aliases: ["handle email", "email", "e-mail", "mail"],
  },
  {
    key: "youtubeViews",
    label: "YouTube Views",
    aliases: ["youtube views", "yt views", "youtube view"],
  },
  {
    key: "youtubeLikes",
    label: "YouTube Likes",
    aliases: ["youtube likes", "yt likes", "youtube like"],
  },
  {
    key: "youtubeComments",
    label: "YouTube Comments",
    aliases: ["youtube comments", "yt comments", "youtube comment"],
  },
  {
    key: "youtubeTitle",
    label: "YouTube Title",
    aliases: ["youtube title", "yt title", "video title"],
  },
  {
    key: "youtubeChannelTitle",
    label: "YouTube Channel Title",
    aliases: [
      "youtube channel title",
      "yt channel title",
      "youtube channel",
      "channel title",
    ],
  },
  {
    key: "bilibiliTitle",
    label: "BiliBili Title",
    aliases: ["bilibili title", "bili bili title", "bili title"],
  },
  {
    key: "bilibiliViews",
    label: "BiliBili Views",
    aliases: ["bilibili views", "bili bili views", "bili views"],
  },
  {
    key: "bilibiliLikes",
    label: "BiliBili Likes",
    aliases: ["bilibili likes", "bili bili likes", "bili likes"],
  },
  {
    key: "bilibiliComments",
    label: "BiliBili Comments",
    aliases: ["bilibili comments", "bili bili comments", "bili comments"],
  },
  {
    key: "twitchAccount",
    label: "Twitch Account",
    aliases: ["twitch account", "twitch", "twitch name", "twitch handle"],
  },
  {
    key: "twitchFollower",
    label: "Twitch Follower",
    aliases: [
      "twitch follower",
      "twitch followers",
      "twitch follows",
    ],
  },
  {
    key: "youtubeSubs",
    label: "YouTube Subs",
    aliases: [
      "youtube subs",
      "youtube subscribers",
      "yt subs",
      "yt subscribers",
    ],
  },
  {
    key: "tiktokViews",
    label: "TikTok Views",
    aliases: ["tiktok views", "tik tok views", "tt views"],
  },
  {
    key: "tiktokFollower",
    label: "TikTok Follower",
    aliases: [
      "tiktok follower",
      "tiktok followers",
      "tik tok follower",
      "tik tok followers",
    ],
  },
  {
    key: "instagramViews",
    label: "Instagram Views",
    aliases: ["instagram views", "ig views", "insta views"],
  },
  {
    key: "instagramLikes",
    label: "Instagram Likes",
    aliases: ["instagram likes", "ig likes", "insta likes"],
  },
  {
    key: "instagramComments",
    label: "Instagram Comments",
    aliases: ["instagram comments", "ig comments", "insta comments"],
  },
  {
    key: "twitchAverageViewers",
    label: "Twitch Average Viewers",
    aliases: [
      "twitch average viewers",
      "twitch avg viewers",
      "twitch average viewer",
      "average viewers",
    ],
  },
  {
    key: "twitchStreamDuration",
    label: "Twitch Stream Duration",
    aliases: ["twitch stream duration", "stream duration"],
  },
  {
    key: "twitchStreamDurationMinutes",
    label: "Twitch Stream Duration (in Minutes)",
    aliases: [
      "twitch stream duration (in minutes)",
      "twitch stream duration in minutes",
      "twitch duration minutes",
      "stream duration minutes",
    ],
  },
  {
    key: "details",
    label: "Details, e.g. an url",
    aliases: [
      "details, e.g. an url",
      "details e.g. an url",
      "details",
      "detail",
      "detail url",
      "details url",
    ],
  },
];

export function emptyMediaCoverageRow() {
  return Object.fromEntries(
    MEDIA_COVERAGE_COLUMNS.map((column) => [column.key, ""])
  );
}

function mediaCoverageRowHasContent(row) {
  return MEDIA_COVERAGE_COLUMNS.some(
    (column) => String(row?.[column.key] || "").trim() !== ""
  );
}

export function parseMediaCoverageValue(value) {
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
          const row = emptyMediaCoverageRow();
          if (typeof item === "string") {
            row.details = item.trim();
            return row;
          }
          MEDIA_COVERAGE_COLUMNS.forEach((column) => {
            row[column.key] = String(item?.[column.key] ?? "").trim();
          });
          return row;
        })
        .filter(mediaCoverageRowHasContent);
    } catch {
      /* fall through */
    }
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const row = emptyMediaCoverageRow();
      row.details = line;
      return row;
    });
}

export function serializeMediaCoverageValue(rows) {
  // Omit empty fields so large CSVs stay compact over the wire / in D1 chunks.
  const cleaned = (Array.isArray(rows) ? rows : [])
    .map((item) => {
      const row = {};
      MEDIA_COVERAGE_COLUMNS.forEach((column) => {
        const value = String(item?.[column.key] ?? "").trim();
        if (value) row[column.key] = value;
      });
      return row;
    })
    .filter((row) => Object.keys(row).length > 0);

  if (!cleaned.length) return "";
  return JSON.stringify({
    sectionTitle: DEFAULT_MEDIA_COVERAGE_TITLE,
    rows: cleaned,
  });
}

function mapMediaCoverageCsvRows(rawRows, mapping) {
  return rawRows
    .map((row) => {
      const record = emptyMediaCoverageRow();
      mapping.forEach((column) => {
        if (column.sourceIndex >= 0) {
          record[column.key] = (row[column.sourceIndex] ?? "").trim();
        }
      });
      return record;
    })
    .filter(mediaCoverageRowHasContent);
}

export function mediaCoverageFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error("This CSV is empty.");
  }

  const headers = rows[0];
  const mapping = MEDIA_COVERAGE_COLUMNS.map((def) => ({
    key: def.key,
    sourceIndex: findSourceIndex(headers, def.aliases),
  }));

  if (!mapping.some((column) => column.sourceIndex >= 0)) {
    throw new Error(
      "Could not find media coverage columns. Need headers like Published Time, Game, Type, Handle Url, or Details."
    );
  }

  const data = mapMediaCoverageCsvRows(rows.slice(1), mapping);

  if (data.length === 0) {
    throw new Error("This CSV has headers but no media coverage rows.");
  }

  return data;
}

/**
 * Parse media coverage CSV in batches so the UI can show progress.
 * onProgress({ phase, current, total, label })
 */
export async function mediaCoverageFromCsvProgressive(
  text,
  { onProgress, batchSize = 120 } = {}
) {
  const report = (payload) => {
    try {
      onProgress?.(payload);
    } catch {
      /* ignore progress handler errors */
    }
  };

  report({
    phase: "read",
    current: 0,
    total: 0,
    label: "Reading CSV…",
  });

  await new Promise((resolve) => requestAnimationFrame(resolve));

  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error("This CSV is empty.");
  }

  const headers = rows[0];
  const mapping = MEDIA_COVERAGE_COLUMNS.map((def) => ({
    key: def.key,
    sourceIndex: findSourceIndex(headers, def.aliases),
  }));

  if (!mapping.some((column) => column.sourceIndex >= 0)) {
    throw new Error(
      "Could not find media coverage columns. Need headers like Published Time, Game, Type, Handle Url, or Details."
    );
  }

  const sourceRows = rows.slice(1);
  const total = sourceRows.length;
  const data = [];
  const size = Math.max(20, Number(batchSize) || 120);

  report({
    phase: "parse",
    current: 0,
    total,
    label: `Parsing rows… 0 / ${total.toLocaleString()}`,
  });

  for (let i = 0; i < sourceRows.length; i += size) {
    const chunk = sourceRows.slice(i, i + size);
    data.push(...mapMediaCoverageCsvRows(chunk, mapping));
    const current = Math.min(i + size, total);
    report({
      phase: "parse",
      current,
      total,
      label: `Parsing rows… ${current.toLocaleString()} / ${total.toLocaleString()}`,
    });
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  if (data.length === 0) {
    throw new Error("This CSV has headers but no media coverage rows.");
  }

  report({
    phase: "parse",
    current: total,
    total,
    label: `Parsed ${data.length.toLocaleString()} row${data.length === 1 ? "" : "s"}`,
  });

  return data;
}

export function mediaCoverageDisplayLabel(row) {
  const name = String(row?.customName || "").trim();
  if (name) return name;
  const handle = String(row?.handleId || "").trim();
  if (handle) return handle;
  const yt = String(row?.youtubeChannelTitle || row?.youtubeTitle || "").trim();
  if (yt) return yt;
  const twitch = String(row?.twitchAccount || "").trim();
  if (twitch) return twitch;
  const url = String(row?.handleUrl || row?.details || "").trim();
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url || "Media coverage";
  }
}

const MEDIA_COVERAGE_TYPE_ORDER = [
  "youtube",
  "yt",
  "twitch",
  "tiktok",
  "tik tok",
  "instagram",
  "ig",
  "bilibili",
  "bili bili",
  "bili",
];

export function mediaCoverageTypeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function mediaCoverageTypeLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Other";
  const key = mediaCoverageTypeKey(raw);
  if (key === "yt" || key === "youtube") return "YouTube";
  if (key === "twitch") return "Twitch";
  if (key === "tiktok" || key === "tik tok") return "TikTok";
  if (key === "instagram" || key === "ig") return "Instagram";
  if (key === "bilibili" || key === "bili bili" || key === "bili") {
    return "BiliBili";
  }
  return raw;
}

/** Shared columns shown on every media-coverage type table. */
const MEDIA_COVERAGE_SHARED_KEYS = new Set([
  "publishedTime",
  "game",
  "type",
  "customName",
  "handleId",
  "handleUrl",
  "handleLanguage",
  "handleCountry",
  "handleEmail",
  "details",
]);

/** Platform-specific metric columns keyed by normalized platform id. */
const MEDIA_COVERAGE_PLATFORM_KEYS = {
  youtube: new Set([
    "youtubeViews",
    "youtubeLikes",
    "youtubeComments",
    "youtubeTitle",
    "youtubeChannelTitle",
    "youtubeSubs",
  ]),
  twitch: new Set([
    "twitchAccount",
    "twitchFollower",
    "twitchAverageViewers",
    "twitchStreamDuration",
    "twitchStreamDurationMinutes",
  ]),
  tiktok: new Set(["tiktokViews", "tiktokFollower"]),
  instagram: new Set([
    "instagramViews",
    "instagramLikes",
    "instagramComments",
  ]),
  bilibili: new Set([
    "bilibiliTitle",
    "bilibiliViews",
    "bilibiliLikes",
    "bilibiliComments",
  ]),
};

/** Normalize a Type value to youtube | twitch | tiktok | instagram | bilibili | "". */
export function mediaCoveragePlatformId(typeValue) {
  const key = mediaCoverageTypeKey(mediaCoverageTypeLabel(typeValue));
  if (key === "yt" || key === "youtube") return "youtube";
  if (key === "twitch") return "twitch";
  if (key === "tiktok" || key === "tik tok") return "tiktok";
  if (key === "instagram" || key === "ig") return "instagram";
  if (key === "bilibili" || key === "bili bili" || key === "bili") {
    return "bilibili";
  }
  return "";
}

/**
 * Columns to show for a given Type section.
 * YouTube tables omit Twitch/TikTok/Instagram/BiliBili headers (and vice versa).
 * Unknown / Other sections only show shared fields.
 */
export function mediaCoverageColumnsForType(typeValue) {
  const platform = mediaCoveragePlatformId(typeValue);
  const platformKeys = platform
    ? MEDIA_COVERAGE_PLATFORM_KEYS[platform]
    : null;
  return MEDIA_COVERAGE_COLUMNS.filter((column) => {
    if (MEDIA_COVERAGE_SHARED_KEYS.has(column.key)) return true;
    return Boolean(platformKeys?.has(column.key));
  });
}

function mediaCoverageTypeSortRank(value) {
  const key = mediaCoverageTypeKey(value);
  if (!key) return MEDIA_COVERAGE_TYPE_ORDER.length + 1;
  const index = MEDIA_COVERAGE_TYPE_ORDER.indexOf(key);
  return index >= 0 ? index : MEDIA_COVERAGE_TYPE_ORDER.length;
}

/** Group media coverage rows by Type (YouTube, Twitch, TikTok, …). */
export function groupMediaCoverageRowsByType(rows) {
  const groups = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const label = mediaCoverageTypeLabel(row?.type);
    const key = mediaCoverageTypeKey(label);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        rows: [],
      });
    }
    groups.get(key).rows.push(row);
  });

  return [...groups.values()].sort((a, b) => {
    const rank =
      mediaCoverageTypeSortRank(a.label) - mediaCoverageTypeSortRank(b.label);
    if (rank !== 0) return rank;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

export function isLinkSectionKey(key) {
  return key === "coverageLinks";
}

export function linkSectionDef(key) {
  if (key === "coverageLinks") {
    return {
      key: "coverageLinks",
      label: "Coverage Links",
      defaultTitle: "Campaign Coverage",
      prefixes: ["coverage", "coverage links", "coverage link", "campaign coverage"],
      optionalInStatus: false,
    };
  }
  return null;
}

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[:]+$/g, "")
    .replace(/[_/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactHeader(value) {
  return normalizeHeader(value).replace(/[\s._-]+/g, "");
}

export function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n" || char === "\r") {
      pushField();
      pushRow();
      if (char === "\r" && source[i + 1] === "\n") {
        i += 1;
      }
    } else {
      field += char;
    }
  }

  pushField();
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function findSourceIndex(headers, aliases) {
  const wanted = aliases.map(normalizeHeader);
  const wantedCompact = aliases.map(compactHeader);

  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const normalized = normalizeHeader(header);
    const compact = compactHeader(header);
    if (wanted.includes(normalized) || wantedCompact.includes(compact)) {
      return index;
    }
  }

  return -1;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_LOOKUP = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function formatMonthYear(date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function parseFlexibleDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  // Excel serial date numbers
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 80000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      return new Date(excelEpoch + Math.round(serial) * 86400000);
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  let match = text.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  // DD/MM/YYYY or DD-MM-YYYY (UK-style — common in CSVs)
  match = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (match) {
    let day = Number(match[1]);
    let month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;

    // If first number can't be a day in US order, treat as MM/DD/YYYY
    if (day > 12 && month <= 12) {
      return new Date(year, month - 1, day);
    }
    // Prefer UK DD/MM/YYYY when day <= 12 as well (PR beats context)
    if (month <= 12 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }

  // Month YYYY / MM/YYYY
  match = text.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1);
    }
  }

  // "6 October 2026" / "6th Oct 2026"
  match = text.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{4})$/i
  );
  if (match) {
    const monthIndex = MONTH_LOOKUP[match[2].toLowerCase()];
    if (monthIndex != null) {
      return new Date(Number(match[3]), monthIndex, Number(match[1]));
    }
  }

  // "October 6, 2026" / "Oct 6 2026"
  match = text.match(
    /^([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i
  );
  if (match) {
    const monthIndex = MONTH_LOOKUP[match[1].toLowerCase()];
    if (monthIndex != null) {
      return new Date(Number(match[3]), monthIndex, Number(match[2]));
    }
  }

  // "October 2026"
  match = text.match(/^([A-Za-z]{3,9})\s+(\d{4})$/i);
  if (match) {
    const monthIndex = MONTH_LOOKUP[match[1].toLowerCase()];
    if (monthIndex != null) {
      return new Date(Number(match[2]), monthIndex, 1);
    }
  }

  const namedMonth = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
  );
  if (namedMonth) {
    const monthIndex = MONTH_LOOKUP[namedMonth[1].toLowerCase()];
    const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
    if (monthIndex != null) {
      const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
      return new Date(year, monthIndex, 1);
    }
  }

  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

export function monthFromDate(value) {
  const date = parseFlexibleDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return formatMonthYear(date);
}

export function dateSortValue(value) {
  const date = parseFlexibleDate(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

export function csvToTable(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error("This CSV is empty.");
  }

  const headers = rows[0].map((header, index) =>
    header.trim() === "" ? `Column ${index + 1}` : header.trim()
  );

  const columns = DISPLAY_COLUMNS.map((def) => ({
    key: def.key,
    label: def.label,
    derived: Boolean(def.derived),
    perGame: Boolean(def.perGame),
    linkSection: Boolean(def.linkSection),
    optionalInStatus: Boolean(def.optionalInStatus),
    hiddenInTable: Boolean(def.hiddenInTable),
    sourceIndex: def.derived ? -1 : findSourceIndex(headers, def.aliases),
  }));

  const matched = columns.filter(
    (column) => !column.derived && column.sourceIndex >= 0
  );
  if (matched.length === 0) {
    throw new Error(
      "Could not find expected columns. Need at least Title or Campaign Name."
    );
  }

  const data = rows.slice(1).map((row) => {
    const record = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    columns.forEach((column) => {
      if (column.derived) {
        record[column.key] = "";
        return;
      }
      record[column.key] =
        column.sourceIndex >= 0 ? (row[column.sourceIndex] ?? "").trim() : "";
    });
    record.month = monthFromDate(record.date);
    return record;
  });

  if (data.length === 0) {
    throw new Error("This CSV has headers but no data rows.");
  }

  // Keep per-game media coverage aligned across announcements for the same game.
  const byGame = new Map();
  for (const row of data) {
    const gameTitle = String(row.gameTitle || "").trim() || "Untitled";
    if (!byGame.has(gameTitle)) byGame.set(gameTitle, []);
    byGame.get(gameTitle).push(row);
  }
  for (const gameRows of byGame.values()) {
    const shared =
      gameRows
        .map((row) => String(row.mediaCoverage || "").trim())
        .find(Boolean) || "";
    for (const row of gameRows) {
      row.mediaCoverage = shared;
    }
  }

  data.sort((a, b) =>
    String(a.gameTitle || "").localeCompare(String(b.gameTitle || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    })
  );

  return { columns, rows: data };
}

export function displayNameFromEmail(email) {
  const local = String(email || "")
    .split("@")[0]
    .trim();

  if (!local) return "Admin";

  return local
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export const COVERAGE_LINK_COLUMNS = [
  {
    key: "outletName",
    label: "Outlet name",
    aliases: ["outlet name", "outlet", "publication", "source", "media outlet"],
  },
  {
    key: "title",
    label: "Title",
    aliases: ["title", "headline", "article title", "story title"],
  },
  {
    key: "url",
    label: "URL",
    aliases: ["url", "link", "article url", "coverage url", "web address"],
  },
  {
    key: "date",
    label: "Date",
    aliases: [
      "date",
      "published",
      "published date",
      "publish date",
      "coverage date",
      "air date",
      "run date",
    ],
  },
  {
    key: "resultType",
    label: "Result type",
    aliases: ["result type", "result", "coverage type"],
  },
  {
    key: "outletCountry",
    label: "Outlet country",
    aliases: ["outlet country", "country", "nation"],
  },
  {
    key: "outletType",
    label: "Outlet type",
    aliases: ["outlet type", "media type", "channel type"],
  },
  {
    key: "outletStats",
    label: "Outlet stats",
    aliases: [
      "outlet stats",
      "outlet statistics",
      "monthly visits",
      "visits",
      "uvpm",
      "unique visitors",
    ],
  },
  {
    key: "globalDomain",
    label: "Global domain",
    aliases: [
      "global domain",
      "global domain rank",
      "global da",
      "domain authority",
      "global",
    ],
  },
  {
    key: "countryDomain",
    label: "Country domain",
    aliases: [
      "country domain",
      "country domain rank",
      "country da",
      "local domain",
    ],
  },
  {
    key: "sentiment",
    label: "Sentiment",
    aliases: ["sentiment", "tone"],
  },
];

export function emptyCoverageLink() {
  return {
    ...Object.fromEntries(
      COVERAGE_LINK_COLUMNS.map((column) => [column.key, ""])
    ),
    coverImage: "",
  };
}

/** Map common country names / codes → ISO 3166-1 alpha-2 for flag images. */
const COUNTRY_FLAG_CODES = {
  us: "us",
  usa: "us",
  "u.s.": "us",
  "u.s.a.": "us",
  "united states": "us",
  "united states of america": "us",
  america: "us",
  uk: "gb",
  "u.k.": "gb",
  gb: "gb",
  "united kingdom": "gb",
  britain: "gb",
  "great britain": "gb",
  england: "gb",
  scotland: "gb",
  wales: "gb",
  ca: "ca",
  canada: "ca",
  au: "au",
  australia: "au",
  nz: "nz",
  "new zealand": "nz",
  de: "de",
  germany: "de",
  deutschland: "de",
  fr: "fr",
  france: "fr",
  es: "es",
  spain: "es",
  it: "it",
  italy: "it",
  nl: "nl",
  netherlands: "nl",
  holland: "nl",
  be: "be",
  belgium: "be",
  se: "se",
  sweden: "se",
  no: "no",
  norway: "no",
  dk: "dk",
  denmark: "dk",
  fi: "fi",
  finland: "fi",
  ie: "ie",
  ireland: "ie",
  pt: "pt",
  portugal: "pt",
  pl: "pl",
  poland: "pl",
  rs: "rs",
  serbia: "rs",
  srbija: "rs",
  vn: "vn",
  vietnam: "vn",
  "viet nam": "vn",
  kw: "kw",
  kuwait: "kw",
  at: "at",
  austria: "at",
  ch: "ch",
  switzerland: "ch",
  jp: "jp",
  japan: "jp",
  kr: "kr",
  "south korea": "kr",
  korea: "kr",
  cn: "cn",
  china: "cn",
  tw: "tw",
  taiwan: "tw",
  hk: "hk",
  "hong kong": "hk",
  sg: "sg",
  singapore: "sg",
  in: "in",
  india: "in",
  br: "br",
  brazil: "br",
  mx: "mx",
  mexico: "mx",
  ar: "ar",
  argentina: "ar",
  cl: "cl",
  chile: "cl",
  za: "za",
  "south africa": "za",
  ae: "ae",
  uae: "ae",
  "united arab emirates": "ae",
  sa: "sa",
  "saudi arabia": "sa",
  il: "il",
  israel: "il",
  tr: "tr",
  turkey: "tr",
  türkiye: "tr",
  ru: "ru",
  russia: "ru",
  cz: "cz",
  "czech republic": "cz",
  czechia: "cz",
  hu: "hu",
  hungary: "hu",
  ro: "ro",
  romania: "ro",
  gr: "gr",
  greece: "gr",
  eu: "eu",
  europe: "eu",
  global: "un",
  worldwide: "un",
  international: "un",
  world: "un",
};

export function countryFlagCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[a-z]{2}$/i.test(raw)) {
    const code = raw.toLowerCase();
    return code === "uk" ? "gb" : code;
  }
  const key = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return COUNTRY_FLAG_CODES[key] || "";
}

export function countryFlagUrl(value) {
  const code = countryFlagCode(value);
  if (!code) return "";
  return `https://flagcdn.com/w80/${code}.png`;
}

function coverageRowHasContent(row) {
  return COVERAGE_LINK_COLUMNS.some(
    (column) => String(row?.[column.key] || "").trim() !== ""
  );
}

export const DEFAULT_COVERAGE_SECTION_TITLE = "Campaign Coverage";

function mapCoverageLinkItems(parsed) {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      const row = emptyCoverageLink();
      if (typeof item === "string") {
        row.url = item.trim();
        return row;
      }
      COVERAGE_LINK_COLUMNS.forEach((column) => {
        row[column.key] = String(item?.[column.key] ?? "").trim();
      });
      row.coverImage = String(item?.coverImage ?? item?.image ?? "").trim();
      return row;
    })
    .filter(coverageRowHasContent);
}

export function parseCoverageSectionTitle(value) {
  const text = String(value || "").trim();
  if (!text) return DEFAULT_COVERAGE_SECTION_TITLE;
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const title = String(
          parsed.sectionTitle ?? parsed.title ?? ""
        ).trim();
        return title || DEFAULT_COVERAGE_SECTION_TITLE;
      }
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_COVERAGE_SECTION_TITLE;
}

export function parseCoverageLinksValue(value) {
  const text = String(value || "").trim();
  if (!text) return [];

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return mapCoverageLinkItems(parsed);
      }
      if (parsed && typeof parsed === "object") {
        return mapCoverageLinkItems(parsed.links ?? parsed.rows ?? []);
      }
    } catch {
      /* fall through to legacy parsing */
    }
  }

  const matches = text.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  const urls = [
    ...new Set(
      matches.map((url) => url.replace(/[.,;:!?)]+$/g, "")).filter(Boolean)
    ),
  ];
  if (urls.length) {
    return urls.map((url) => {
      const row = emptyCoverageLink();
      row.url = url;
      return row;
    });
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const row = emptyCoverageLink();
      row.url = line;
      return row;
    });
}

export function serializeCoverageLinksValue(
  rows,
  sectionTitle = DEFAULT_COVERAGE_SECTION_TITLE
) {
  const cleaned = (Array.isArray(rows) ? rows : [])
    .map((item) => {
      const row = emptyCoverageLink();
      COVERAGE_LINK_COLUMNS.forEach((column) => {
        row[column.key] = String(item?.[column.key] ?? "").trim();
      });
      row.coverImage = String(item?.coverImage ?? item?.image ?? "").trim();
      return row;
    })
    .filter(coverageRowHasContent);

  if (!cleaned.length) return "";

  const title =
    String(sectionTitle || "").trim() || DEFAULT_COVERAGE_SECTION_TITLE;
  return JSON.stringify({
    sectionTitle: title,
    links: cleaned,
  });
}

function coverageColumnAliasesForSection(column, sectionDef) {
  const base = [...(column.aliases || [])];
  if (!sectionDef) return base;
  const prefixed = [];
  for (const prefix of sectionDef.prefixes || []) {
    for (const alias of column.aliases || []) {
      prefixed.push(`${prefix} ${alias}`);
    }
    if (column.key === "url") {
      prefixed.push(`${prefix} link`, `${prefix} url`);
    }
    if (column.key === "outletName") {
      prefixed.push(`${prefix} outlet`, `${prefix} outlet name`);
    }
    if (column.key === "date") {
      prefixed.push(`${prefix} date`);
    }
  }
  // Prefer section-prefixed headers when a section is specified.
  return [...prefixed, ...base];
}

function mapCoverageRowsFromCsv(rows, headers, sectionDef) {
  const mapping = COVERAGE_LINK_COLUMNS.map((def) => ({
    key: def.key,
    sourceIndex: findSourceIndex(
      headers,
      coverageColumnAliasesForSection(def, sectionDef)
    ),
  }));

  if (!mapping.some((column) => column.sourceIndex >= 0)) {
    return { mapping, data: [] };
  }

  const data = rows
    .slice(1)
    .map((row) => {
      const record = emptyCoverageLink();
      mapping.forEach((column) => {
        if (column.sourceIndex >= 0) {
          record[column.key] = (row[column.sourceIndex] ?? "").trim();
        }
      });
      return record;
    })
    .filter(coverageRowHasContent);

  return { mapping, data };
}

export function coverageLinksFromCsv(text, options = {}) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error("This CSV is empty.");
  }

  const headers = rows[0];
  const sectionKey = String(options.sectionKey || "").trim();
  const sectionDef =
    linkSectionDef(sectionKey) ||
    (options.sectionPrefix
      ? {
          prefixes: [String(options.sectionPrefix).trim().toLowerCase()].filter(
            Boolean
          ),
        }
      : null);

  const { mapping, data } = mapCoverageRowsFromCsv(rows, headers, sectionDef);

  if (!mapping.some((column) => column.sourceIndex >= 0)) {
    throw new Error(
      "Could not find coverage columns. Need Outlet name, Title, Link/URL, or Date."
    );
  }

  if (data.length === 0) {
    throw new Error("This CSV has headers but no coverage rows.");
  }

  return data;
}

/** Numeric value for sorting outlet stats (missing/invalid → lowest). */
export function coverageStatSortValue(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/,/g, "");
  if (!cleaned) return Number.NEGATIVE_INFINITY;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return Number.NEGATIVE_INFINITY;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
}

/** Format numeric outlet stats with thousand separators (e.g. 1234567 → 1,234,567). */
export function formatCoverageStat(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const cleaned = raw.replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const negative = cleaned.startsWith("-");
    const [intPart, decPart] = cleaned.replace(/^-/, "").split(".");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formatted = decPart != null ? `${grouped}.${decPart}` : grouped;
    return negative ? `-${formatted}` : formatted;
  }

  return raw.replace(/\d{4,}/g, (digits) =>
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
}

export function coverageLinkDisplayLabel(row) {
  const title = String(row?.title || "").trim();
  if (title) return title;

  const outlet = String(row?.outletName || "").trim();
  if (outlet) return outlet;

  const url = String(row?.url || "").trim();
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url || "Coverage link";
  }
}

export function coverageLinkUrls(value) {
  return [
    ...new Set(
      parseCoverageLinksValue(value)
        .map((row) => String(row.url || "").trim())
        .filter((url) => /^https?:\/\//i.test(url))
    ),
  ];
}
