export const DISPLAY_COLUMNS = [
  {
    key: "gameTitle",
    label: "Game Title",
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
