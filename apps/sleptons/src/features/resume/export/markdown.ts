import type { ResumeContentV1 } from "@nebutra/contracts/sleptons";
import { type DocumentModel, toDocumentModel } from "../render/model";

/** Markdown export from the shared document model (spec §5). */
export function toMarkdown(content: ResumeContentV1, opts: { hideContact?: boolean } = {}): string {
  return modelToMarkdown(toDocumentModel(content, opts));
}

export function modelToMarkdown(m: DocumentModel): string {
  const out: string[] = [];
  out.push(`# ${m.name}${m.nameEn ? ` (${m.nameEn})` : ""}`);
  if (m.headline) out.push("", `> ${m.headline}`);
  const contactLine = [...m.contact, ...m.links.map((l) => `[${l.label}](${l.href})`)];
  if (contactLine.length) out.push("", contactLine.join(" · "));
  if (m.advantageTags.length) out.push("", m.advantageTags.map((t) => `\`${t}\``).join(" "));

  for (const s of m.sections) {
    out.push("", `## ${s.title}`);
    if (s.text) out.push("", s.text);
    for (const g of s.groups ?? []) out.push(`- **${g.label}:** ${g.values.join(", ")}`);
    for (const e of s.entries) {
      const head = [`**${e.title}**`, e.subtitle, e.meta ? `_${e.meta}_` : undefined]
        .filter(Boolean)
        .join(" · ");
      out.push("", e.link ? `${head} ([link](${e.link}))` : head);
      for (const b of e.bullets) out.push(`- ${b}`);
      if (e.tags?.length) out.push(`  <sub>${e.tags.join(" · ")}</sub>`);
    }
  }
  return `${out.join("\n").trim()}\n`;
}
