/** Tiny regex-based JSON / code highlighter — dependency-free stand-in for
 * shiki so code blocks in modals stay lightweight. */

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const JSON_RULES: Array<[RegExp, string]> = [
  [/"(?:[^"\\]|\\.)*"(?=\s*:)/, "tok-key"],
  [/"(?:[^"\\]|\\.)*"/, "tok-string"],
  [/\b(?:true|false|null)\b/, "tok-bool"],
  [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "tok-number"],
];

const CODE_RULES: Array<[RegExp, string]> = [
  [/"(?:[^"\\]|\\.)*"/, "tok-string"],
  [/\b(?:pub|fn|struct|enum|type|interface|const|let|var|func|package|import|export|class|data|return|mut|case|object|val|string|int|float|bool|any|interface|implements)\b/, "tok-kw"],
  [/-?\d+(?:\.\d+)?/, "tok-number"],
  [/\b[A-Z][A-Za-z0-9_]*\b/, "tok-type"],
];

export function highlight(text: string, lang: "json" | "code" = "json"): string {
  const rules = lang === "json" ? JSON_RULES : CODE_RULES;
  const pattern = new RegExp(
    rules.map(([re]) => `(${re.source})`).join("|"),
    "g"
  );
  const classes = rules.map(([, cls]) => cls);

  let out = "";
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const idx = match.index!;
    out += escapeHtml(text.slice(last, idx));
    const groupIndex = match.slice(1).findIndex(g => g !== undefined);
    out += `<span class="${classes[groupIndex]}">${escapeHtml(match[0])}</span>`;
    last = idx + match[0].length;
  }
  out += escapeHtml(text.slice(last));
  return out;
}
