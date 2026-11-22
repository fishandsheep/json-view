/**
 * Lossless-where-possible JSON ↔ CSV conversion.
 *
 * CSV is a flat table format, so a document is projected onto one table:
 *
 *   { fruits: [ { name, details: { type } } ] }
 *     → fruits[].name,fruits[].details.type
 *
 * The path notation is used on the way back (`[]` marks the array that became
 * rows, `.` nests objects). A root array is simply `[].name`; a root object
 * with a single array property becomes `fruits[].name`. Arrays and empty
 * objects that cannot become columns are stored as JSON text in a quoted cell.
 *
 * Values keep their type where CSV allows: numbers/booleans/null are written
 * unquoted, strings are always quoted (so "52" stays a string), and blank
 * unquoted cells mean "key absent" while quoted `""` means an empty string.
 *
 * We implement RFC 4180 parsing/serializing here instead of using json-2-csv:
 * that library auto-expands dotted headers and escapes "[" in headers in ways
 * that corrupted this path notation (and silently dropped nested fields).
 */

type CsvCell = { text: string; quoted: boolean };
type CsvTable = { headers: CsvCell[]; rows: CsvCell[][] };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const ARRAY_MARKER = "[]";
/** Header used when the whole document has to live in a single cell. */
const ROOT_VALUE_HEADER = "$jsoncrack$root";

/** Escape a single key so structural dots and brackets survive a round-trip. */
const escapeKey = (key: string) =>
  key.replace(/\\/g, "\\\\").replace(/\./g, "\\.").replace(/\[/g, "\\[").replace(/\]/g, "\\]");

const appendKey = (base: string, key: string) =>
  base ? `${base}.${escapeKey(key)}` : escapeKey(key);

const appendArrayMarker = (base: string) => `${base}${ARRAY_MARKER}`;

/** Reverse `escapeKey` / dot-path parsing for one segment or a whole key. */
const unescapeText = (text: string) => {
  let result = "";
  for (let index = 0; index < text.length; index++) {
    if (text[index] === "\\" && index + 1 < text.length) result += text[++index];
    else result += text[index];
  }
  return result;
};

/** Split an escaped field path (`a.b\.c`) into `["a", "b.c"]`. */
const parseFieldPath = (path: string) => {
  const fields: string[] = [];
  let current = "";
  for (let index = 0; index < path.length; index++) {
    const char = path[index];
    if (char === "\\" && index + 1 < path.length) current += path[++index];
    else if (char === ".") {
      fields.push(current);
      current = "";
    } else current += char;
  }
  fields.push(current);
  return fields;
};

type ParsedHeader = {
  /** `null` for a plain object column; `""` for a root array. */
  group: string | null;
  /** Path under the table row; empty for a scalar table. */
  fields: string[];
};

/**
 * Recognise the optional table prefix. The marker is always the first
 * component: `[]` (root array) or `fruits[]` (array under one root key).
 */
const parseHeader = (header: string): ParsedHeader => {
  for (let index = 0; index < header.length; index++) {
    if (header[index] === "\\") {
      index++;
      continue;
    }
    if (header[index] === "[" && header[index + 1] === "]") {
      const after = index + 2;
      if (after !== header.length && header[after] !== ".") continue;
      return {
        group: unescapeText(header.slice(0, index)),
        fields: after === header.length ? [] : parseFieldPath(header.slice(after + 1)),
      };
    }
  }
  return { group: null, fields: parseFieldPath(header) };
};

type TableShape = { base: string; elements: unknown[] };

/**
 * A document becomes a table when it is an array, or an object whose *only*
 * property is an array. Anything else is flattened into a single row.
 */
const detectTable = (root: unknown): TableShape | null => {
  if (Array.isArray(root)) return { base: ARRAY_MARKER, elements: root };
  if (isPlainObject(root)) {
    const keys = Object.keys(root);
    if (keys.length === 1 && Array.isArray(root[keys[0]])) {
      return { base: appendArrayMarker(escapeKey(keys[0])), elements: root[keys[0]] as unknown[] };
    }
  }
  return null;
};

const flattenValue = (out: Map<string, unknown>, value: unknown, path: string) => {
  // Empty objects cannot produce a column, so keep them as a JSON leaf.
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    for (const [key, nested] of Object.entries(value)) {
      flattenValue(out, nested, appendKey(path, key));
    }
    return;
  }
  out.set(path, value);
};

type TableData = { headers: string[]; rows: Map<string, unknown>[] };

const buildTable = (root: unknown): TableData => {
  const shape = detectTable(root);

  if (shape) {
    const rows = shape.elements.map(element => {
      const row = new Map<string, unknown>();
      flattenValue(row, element, shape.base);
      return row;
    });
    const headers: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      for (const header of row.keys()) {
        if (seen.has(header)) continue;
        seen.add(header);
        headers.push(header);
      }
    }
    // An empty array still needs its marker so `[]`/`{ fruits: [] }` can be
    // reconstructed from the header-only file.
    if (headers.length === 0) headers.push(shape.base);
    return { headers, rows };
  }

  if (isPlainObject(root) && Object.keys(root).length > 0) {
    const row = new Map<string, unknown>();
    // `$.` marks object-mode headers, so they cannot collide with the
    // root-value fallback header below.
    flattenValue(row, root, "$");
    return { headers: [...row.keys()], rows: [row] };
  }

  // Scalars, empty objects and anything else: one lossless JSON cell under a
  // reserved header (unlikely to collide with a real document key).
  return { headers: [ROOT_VALUE_HEADER], rows: [new Map([[ROOT_VALUE_HEADER, root]])] };
};

const needsQuotes = (text: string) =>
  /[",\r\n]/.test(text) || text.trim() !== text;
const quote = (text: string) => `"${text.replace(/"/g, '""')}"`;
const formatHeader = (header: string) => (needsQuotes(header) ? quote(header) : header);

const formatCell = (value: unknown): string => {
  if (value === undefined) return "";
  if (value === null) return "null";
  // Always quote strings: `"52"` must stay a string on the way back.
  if (typeof value === "string") return quote(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return quote(JSON.stringify(value));
};

/** Serialize a parsed JSON value into CSV. The BOM is added on download so
 * the editor never shows a stray U+FEFF glyph on the first line. */
export const jsonToCsv = (value: unknown): string => {
  const { headers, rows } = buildTable(value);
  const lines = [headers.map(formatHeader).join(",")];
  for (const row of rows) {
    lines.push(headers.map(header => formatCell(row.get(header))).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
};

/** RFC 4180 parser that also records whether a field was quoted. */
const parseCsvTable = (input: string): CsvTable => {
  const text = input.startsWith("\uFEFF") ? input.slice(1) : input;
  const rows: CsvCell[][] = [];
  let row: CsvCell[] = [];
  let cell = "";
  let cellQuoted = false;
  let cellStarted = false;
  let inQuotes = false;

  const pushCell = () => {
    row.push({ text: cell, quoted: cellQuoted });
    cell = "";
    cellQuoted = false;
    cellStarted = false;
  };

  const pushRow = () => {
    pushCell();
    // Ignore blank lines (including the trailing newline), but keep `,` rows.
    if (!(row.length === 1 && row[0].text === "" && !row[0].quoted)) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index++;
        } else inQuotes = false;
      } else cell += char;
      continue;
    }

    if (char === '"' && !cellStarted) {
      inQuotes = true;
      cellQuoted = true;
      cellStarted = true;
      continue;
    }

    if (char === ",") {
      pushCell();
      continue;
    }

    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      pushRow();
      continue;
    }

    cell += char;
    cellStarted = true;
  }

  if (cellStarted || row.length > 0) pushRow();

  const [headerRow, ...dataRows] = rows;
  return headerRow ? { headers: headerRow, rows: dataRows } : { headers: [], rows: [] };
};

const NUMERIC = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * Decode one cell. Quoted cells are always strings unless they contain a JSON
 * container (arrays/objects are stored that way) — so `"52"` stays a string,
 * while an unquoted `52` becomes a number.
 */
const decodeCell = (cell: CsvCell | undefined): unknown => {
  if (!cell) return undefined;
  const { text, quoted } = cell;

  if (!quoted) {
    if (text === "") return undefined;
    if (text === "null") return null;
    if (text === "true") return true;
    if (text === "false") return false;
    if (NUMERIC.test(text)) return Number(text);
  }

  if (text !== "" && (text[0] === "{" || text[0] === "[")) {
    try {
      return JSON.parse(text);
    } catch {
      // Not JSON: fall through and keep the literal string.
    }
  }

  return text;
};

const assignPath = (
  target: Record<string, unknown>,
  fields: string[],
  value: unknown
) => {
  let current = target;
  for (let index = 0; index < fields.length - 1; index++) {
    const key = fields[index];
    if (!isPlainObject(current[key])) current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  current[fields[fields.length - 1]] = value;
};

/** Decode a CSV document back into JSON. */
export const csvToJson = (input: string): unknown => {
  const table = parseCsvTable(input);
  if (table.headers.length === 0) return {};

  const headerTexts = table.headers.map(header => header.text);
  if (
    headerTexts.length === 1 &&
    headerTexts[0] === ROOT_VALUE_HEADER &&
    table.rows.length <= 1
  ) {
    return decodeCell(table.rows[0]?.[0]);
  }

  const parsedHeaders = headerTexts.map(text =>
    parseHeader(text.startsWith("$.") ? text.slice(2) : text)
  );
  const groups = parsedHeaders.map(header => header.group);
  const firstGroup = groups[0];
  const hasGroup = groups.some(group => group !== null);
  const uniformGroup = hasGroup && groups.every(group => group === firstGroup);

  // Unusual mixed file (some marked columns, some not): keep the raw headers
  // instead of guessing at a shape.
  if (hasGroup && !uniformGroup) {
    const rows = table.rows.map(row =>
      Object.fromEntries(table.headers.map((header, index) => [header.text, decodeCell(row[index])]))
    );
    return rows.length === 1 ? rows[0] : rows;
  }

  if (hasGroup) {
    const fields = parsedHeaders.map(header => header.fields);
    const baseIndex = fields.findIndex(field => field.length === 0);
    const rows: unknown[] = [];

    for (const row of table.rows) {
      const cells = table.headers.map((_, index) => decodeCell(row[index]));
      const hasFieldValue = fields.some(
        (field, index) => field.length > 0 && cells[index] !== undefined
      );

      if (!hasFieldValue) {
        // Scalar table row (e.g. an array of strings).
        if (baseIndex >= 0 && cells[baseIndex] !== undefined) rows.push(cells[baseIndex]);
        continue;
      }

      const object: Record<string, unknown> = {};
      fields.forEach((field, index) => {
        if (field.length > 0 && cells[index] !== undefined) {
          assignPath(object, field, cells[index]);
        }
      });
      rows.push(object);
    }

    // `""` is the marker for a root array; a named marker wraps the rows.
    return firstGroup === "" ? rows : { [firstGroup as string]: rows };
  }

  // Plain object / table imported from elsewhere.
  const rows = table.rows.map(row => {
    const object: Record<string, unknown> = {};
    parsedHeaders.forEach((header, index) => {
      const value = decodeCell(row[index]);
      if (value !== undefined) assignPath(object, header.fields, value);
    });
    return object;
  });

  // A single row is a single document; multiple rows are a collection.
  return rows.length === 1 ? rows[0] : rows;
};
