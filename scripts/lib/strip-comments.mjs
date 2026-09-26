/**
 * Blank out JS/TS/TSX/CSS comments, leaving strings alone.
 *
 * The guards used to strip comments with /\/\*[\s\S]*?\*\//g, which reads a
 * string such as "/api/*" as the start of a block comment and deletes
 * everything up to the next "*\/" in the file. In HeroMockupWindow.tsx that
 * swallowed 3,006 characters of code — raw palette classes included — and
 * every guard built on that regex passed over them.
 *
 * This walks the source once, skipping over string, template and regex
 * literals, and replaces comment characters with spaces so line and column
 * positions stay where they were. It is a scanner, not a parser: a quote or
 * regex it misreads stops at the end of its line, so a mistake stays local.
 */
const REGEX_PREFIX = /[(,=:[!&|?{};+\-*%~^]$/;
const REGEX_KEYWORD = /(?:^|[^\w$])(?:return|typeof|case|do|else|in|of|void|yield|await)$/;

export function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  const blank = (s) => s.replace(/[^\n]/g, " ");

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    // Block comment — not a glob in JSX text (tokens/**, src/*.ts), which
    // follows a word character, and not one that never closes.
    if (c === "/" && next === "*" && !/[\w.*/]/.test(src[i - 1] ?? "")) {
      const end = src.indexOf("*/", i + 2);
      if (end !== -1) {
        out += blank(src.slice(i, end + 2));
        i = end + 2;
        continue;
      }
    }
    // Line comment — not the // of a URL scheme (https://)
    if (c === "/" && next === "/" && src[i - 1] !== ":") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out += blank(src.slice(i, stop));
      i = stop;
      continue;
    }
    // Quoted string — ends at its quote or, if misread, at the line's end
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // Template literal
    if (c === "`") {
      let j = i + 1;
      while (j < n && src[j] !== "`") j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // Regex literal — only where an expression can start. `</` (JSX closing
    // tag) and `>` are excluded; `=>` is the one `>` a regex may follow.
    if (c === "/") {
      const before = out.slice(Math.max(0, out.length - 12)).trimEnd();
      if (
        before === "" ||
        out.endsWith("\n") ||
        REGEX_PREFIX.test(before) ||
        before.endsWith("=>") ||
        REGEX_KEYWORD.test(before)
      ) {
        let j = i + 1;
        let inClass = false;
        while (j < n && src[j] !== "\n") {
          if (src[j] === "\\") {
            j += 2;
            continue;
          }
          if (src[j] === "[") inClass = true;
          else if (src[j] === "]") inClass = false;
          else if (src[j] === "/" && !inClass) break;
          j++;
        }
        out += src.slice(i, j + 1);
        i = j + 1;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}
