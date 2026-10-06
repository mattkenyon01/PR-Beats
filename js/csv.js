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

export function csvToTable(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error("This CSV is empty.");
  }

  const headers = rows[0].map((header, index) =>
    header.trim() === "" ? `Column ${index + 1}` : header.trim()
  );

  const columns = headers.map((label, index) => ({
    key: `col_${index}`,
    label,
    sourceIndex: index,
  }));

  const data = rows.slice(1).map((row, rowIndex) => {
    const record = { id: rowIndex };
    columns.forEach((column) => {
      record[column.key] = (row[column.sourceIndex] ?? "").trim();
    });
    return record;
  });

  if (data.length === 0) {
    throw new Error("This CSV has headers but no data rows.");
  }

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
