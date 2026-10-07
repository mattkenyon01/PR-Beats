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

  const data = rows.slice(1).map((row, rowIndex) => {
    const record = { id: rowIndex };
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

export function parseCoverageLinksValue(value) {
  const text = String(value || "").trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
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
            row.coverImage = String(
              item?.coverImage ?? item?.image ?? ""
            ).trim();
            return row;
          })
          .filter(coverageRowHasContent);
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

export function serializeCoverageLinksValue(rows) {
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

  return cleaned.length ? JSON.stringify(cleaned) : "";
}

export function coverageLinksFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error("This CSV is empty.");
  }

  const headers = rows[0];
  const mapping = COVERAGE_LINK_COLUMNS.map((def) => ({
    key: def.key,
    sourceIndex: findSourceIndex(headers, def.aliases),
  }));

  if (!mapping.some((column) => column.sourceIndex >= 0)) {
    throw new Error(
      "Could not find coverage columns. Need Outlet name, Title, or URL."
    );
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
