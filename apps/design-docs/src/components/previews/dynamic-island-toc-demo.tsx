"use client";

import { DynamicIslandTOC } from "@nebutra/ui/primitives";

export function DynamicIslandTocDemo() {
  return (
    <div className="relative h-[600px] overflow-y-auto rounded-xl border border-border bg-background text-foreground">
      <DynamicIslandTOC />
      <article className="prose mx-auto max-w-2xl px-6 py-12 dark:prose-invert">
        <h1>The Evolution of Web Architecture</h1>

        <h2>The Early Days: Static HTML</h2>
        <p>
          In the beginning, the web was read-only. Servers hosted flat HTML files and served them on
          request — no interactivity, no user accounts, no dynamic content.
        </p>

        <h3>The Role of Webmasters</h3>
        <p>
          The Webmaster was a legendary figure — part designer, part sysadmin, part content creator.
          They uploaded files via FTP and prayed nothing broke.
        </p>

        <h2>The Rise of Dynamic Content</h2>
        <p>
          As the web grew, user-specific content birthed Server-Side Rendering. PHP, Perl, and Java
          stitched HTML together on the fly from relational databases.
        </p>

        <h3>Server-Side Rendering</h3>
        <p>Every click was a full page reload. WordPress was born here.</p>

        <h4>The Database Bottleneck</h4>
        <p>MySQL queries per page load became expensive. Memcached emerged.</p>

        <h2 data-toc-title="The SPA Revolution">The Paradigm Shift to Client-Side Rendering</h2>
        <p>
          That long heading shows up as "The SPA Revolution" in the TOC thanks to{" "}
          <code>data-toc-title</code>.
        </p>

        <h3>AJAX Changes Everything</h3>
        <p>Background data fetching made web apps feel native.</p>

        <div
          data-toc
          data-toc-depth="2"
          data-toc-title="Modern Era: Edge Computing"
          className="my-8 rounded-2xl border border-border bg-foreground/5 p-6"
        >
          <h3 className="mt-0">A DIV behaving as a heading</h3>
          <p className="mb-0 mt-3 text-sm text-muted-foreground">
            <code>data-toc data-toc-depth="2"</code> registers this whole block as a level-2 TOC
            entry.
          </p>
        </div>

        <p>
          Today we move compute closer to the user — Edge Functions, serverless, distributed DBs.
        </p>

        <h2 data-toc-ignore className="text-center">
          Hidden from TOC
        </h2>
        <p className="text-center text-muted-foreground">
          This heading carries <code>data-toc-ignore</code> — not in the menu.
        </p>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Scroll inside this preview frame to test scroll-spy ↑
        </p>
      </article>
    </div>
  );
}
