import type { Meta, StoryObj } from "@storybook/react";
import { DynamicIslandTOC } from "./dynamic-island-toc";

/* eslint-disable react/no-array-index-key */

const meta: Meta<typeof DynamicIslandTOC> = {
  title: "Primitives/DynamicIslandTOC",
  component: DynamicIslandTOC,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Apple Dynamic Island-style floating Table of Contents. Self-scanning, scroll-spy, " +
          "keyboard accessible (Esc closes, returns focus). " +
          "Carries iOS signature easing `[0.22, 1, 0.36, 1]` as its visual identity; " +
          "all durations are tokenized through the four-rail motion scale.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof DynamicIslandTOC>;

/* -------------------------------------------------------------------------- */
/*  Shared mock article content                                               */
/* -------------------------------------------------------------------------- */

function MockArticle({ withOverrides = false }: { withOverrides?: boolean }) {
  return (
    <article className="prose mx-auto max-w-3xl px-6 py-24 dark:prose-invert">
      <header className="mb-10 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          The Evolution of Web Architecture
        </h1>
        <p className="text-lg text-muted-foreground">
          From static HTML to Edge Computing and Dynamic Islands.
        </p>
      </header>

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
        As the web grew, the need for user-specific content birthed Server-Side Rendering. PHP,
        Perl, and Java stitched HTML together on the fly from relational databases.
      </p>
      <h3>Server-Side Rendering in the 2000s</h3>
      <p>Every click was a full page reload. WordPress was born here.</p>
      <h4>The Database Bottleneck</h4>
      <p>MySQL queries per page load became expensive. Memcached emerged.</p>

      {withOverrides ? (
        <>
          <h2 data-toc-title="The SPA Revolution">
            The Paradigm Shift to Client-Side Rendering and the Era of Single Page Applications
          </h2>
          <p>
            Notice how long that heading is? The <code>data-toc-title</code> attribute shortens it
            to "The SPA Revolution" in the menu.
          </p>

          <div
            data-toc
            data-toc-depth="2"
            data-toc-title="Modern Era: Edge Computing"
            className="my-8 rounded-2xl border border-border bg-foreground/5 p-8"
          >
            <h3 className="mt-0 text-2xl font-bold">This is a DIV, not a Heading</h3>
            <p className="mb-0 mt-4 text-muted-foreground">
              The wrapper carries <code>data-toc data-toc-depth="2"</code> — it registers as a
              level-2 TOC entry without being a real heading.
            </p>
          </div>

          <p>
            Today we move compute closer to the user — Edge Functions, serverless, distributed DBs.
          </p>

          <h2 data-toc-ignore className="text-center">
            Join the Newsletter
          </h2>
          <p className="text-center text-muted-foreground">
            This heading has <code>data-toc-ignore</code> — it is hidden from the TOC.
          </p>
        </>
      ) : (
        <>
          <h2>The SPA Revolution</h2>
          <p>JavaScript engines like V8 enabled browsers to render UI client-side.</p>
          <h3>AJAX Changes Everything</h3>
          <p>Background data fetching made web apps feel native.</p>
          <h2>Modern Era: Edge Computing</h2>
          <p>Compute moves closer to the user.</p>
          <h4>Hydration and Resumability</h4>
          <p>We send only the JavaScript that is necessary.</p>
        </>
      )}

      <div className="mt-32 rounded-xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
        Scroll back up to test the scroll-spy ↑
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stories                                                                   */
/* -------------------------------------------------------------------------- */

export const Default: Story = {
  render: () => (
    <div className="relative min-h-screen bg-background text-foreground">
      <DynamicIslandTOC />
      <MockArticle />
    </div>
  ),
};

export const WithOverrides: Story = {
  name: "Heading Overrides (data-toc / data-toc-title / data-toc-ignore)",
  parameters: {
    docs: {
      description: {
        story:
          "Three escape hatches: `data-toc-title` shortens display text; `data-toc` lets non-heading " +
          "elements register as TOC entries; `data-toc-ignore` hides a real heading.",
      },
    },
  },
  render: () => (
    <div className="relative min-h-screen bg-background text-foreground">
      <DynamicIslandTOC />
      <MockArticle withOverrides />
    </div>
  ),
};

export const CustomLabels: Story = {
  name: "Custom Labels (i18n)",
  parameters: {
    docs: {
      description: {
        story: "All user-visible strings are props. Use this for non-English locales.",
      },
    },
  },
  render: () => (
    <div className="relative min-h-screen bg-background text-foreground">
      <DynamicIslandTOC ariaLabel="目录导航" menuHeading="目录" emptyLabel="目录" />
      <article className="prose mx-auto max-w-3xl px-6 py-24 dark:prose-invert">
        <h1>云端聚合：从单机到边缘</h1>
        <h2>静态时代</h2>
        <p>Web 1.0 时代的故事。</p>
        <h2>服务端渲染兴起</h2>
        <p>PHP、Perl、Java 在数据库上拼装 HTML。</p>
        <h3>缓存层的崛起</h3>
        <p>Memcached / Redis 缓解 DB 压力。</p>
        <h2>SPA 革命</h2>
        <p>V8 引擎释放浏览器算力。</p>
        <h2>边缘计算时代</h2>
        <p>计算靠近用户，部分水合 / 可恢复性 / Islands 架构。</p>
      </article>
    </div>
  ),
};

export const EmptyState: Story = {
  name: "Empty / No Headings",
  parameters: {
    docs: {
      description: {
        story:
          "When no matching headings exist (e.g. landing page without article structure), the pill " +
          "shows the `emptyLabel` and the menu is empty. Scroll-spy stays at 0%.",
      },
    },
  },
  render: () => (
    <div className="relative min-h-screen bg-background text-foreground">
      <DynamicIslandTOC />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold">No article markup here</h1>
        <p className="mt-4 text-muted-foreground">
          The selector finds nothing — pill remains in idle state.
        </p>
      </div>
    </div>
  ),
};

export const KeyboardAndA11y: Story = {
  name: "Keyboard + a11y check",
  parameters: {
    docs: {
      description: {
        story:
          "Tab into the pill, press Enter to expand. Focus jumps to first menu item. Arrow keys / " +
          "Tab navigate items. Esc closes and returns focus to the pill. " +
          'All buttons carry proper ARIA — active item is `aria-current="location"`.',
      },
    },
  },
  render: () => (
    <div className="relative min-h-screen bg-background text-foreground">
      <DynamicIslandTOC />
      <article className="prose mx-auto max-w-3xl px-6 py-24 dark:prose-invert">
        <h1>Keyboard test</h1>
        <h2>Section A</h2>
        <p>Press Tab to reach the pill.</p>
        <h2>Section B</h2>
        <p>Press Enter on the pill to expand.</p>
        <h2>Section C</h2>
        <p>Press Esc to close — focus returns to the pill.</p>
      </article>
    </div>
  ),
};

export const ReducedMotion: Story = {
  name: "Reduced Motion (system pref)",
  parameters: {
    docs: {
      description: {
        story:
          "When the OS reports `prefers-reduced-motion: reduce`, the shape morph + blur + spring " +
          "collapse to opacity-only transitions. Scroll behavior also switches to `auto`.",
      },
    },
  },
  render: () => (
    <div className="relative min-h-screen bg-background text-foreground">
      <DynamicIslandTOC />
      <MockArticle />
    </div>
  ),
};
