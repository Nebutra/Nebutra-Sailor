const fs = require("fs");
const path = require("path");

const writeSkeleton = (filePath, moduleName, description, content) => {
  const comment = `/**
 * [${moduleName}]
 * ${description} — 2026 best practice reference implementation.
 * Customize or replace. See: https://sailor.nebutra.com/modules/${moduleName.toLowerCase()}
 */\n\n`;
  fs.writeFileSync(path.join(__dirname, "..", filePath), comment + content);
};

// Landing
writeSkeleton(
  "apps/landing-page/src/components/landing/Header.tsx",
  "LANDING-HEADER",
  "Sticky header with Logo, Nav, and CTA",
  `export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="hidden font-bold sm:inline-block">Nebutra</span>
          </a>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a className="transition-colors hover:text-foreground/80 text-foreground" href="/features">Features</a>
            <a className="transition-colors hover:text-foreground/80 text-foreground" href="/pricing">Pricing</a>
          </nav>
        </div>
      </div>
    </header>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/Hero.tsx",
  "LANDING-HERO",
  "Hero Section",
  `export function Hero() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
          Build faster with Nebutra Sailor.
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          The ultimate AI-Native SaaS template for 2026.
        </p>
      </div>
      <div className="flex gap-4">
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2">Get Started</button>
      </div>
    </section>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/LogoBar.tsx",
  "LANDING-LOGOBAR",
  "Customer Logo Wall",
  `export function LogoBar() {
  return (
    <div className="py-12 bg-muted/50">
      <div className="container mx-auto text-center">
        <p className="text-sm text-muted-foreground mb-8">Trusted by innovative teams worldwide</p>
        <div className="flex justify-center gap-8 opacity-50 grayscale">
          {/* Add SVGs here */}
        </div>
      </div>
    </div>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/Features.tsx",
  "LANDING-FEATURES",
  "Bento Grid Features",
  `export function Features() {
  return (
    <section className="container py-8 md:py-12 lg:py-24">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
        <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Capabilities</h2>
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          Everything you need to ship your SaaS.
        </p>
      </div>
    </section>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/Comparison.tsx",
  "LANDING-COMPARISON",
  "Competitor Comparison Table",
  `export function Comparison() {
  return (
    <section className="container py-8">
      <h2 className="text-2xl font-bold text-center">Why choose us?</h2>
    </section>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/Testimonials.tsx",
  "LANDING-TESTIMONIALS",
  "User Testimonials",
  `export function Testimonials() {
  return (
    <section className="container py-8">
      <h2 className="text-2xl font-bold text-center">Wall of Love</h2>
    </section>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/Pricing.tsx",
  "LANDING-PRICING",
  "3-Column Pricing",
  `export function Pricing() {
  return (
    <section className="container py-8">
      <h2 className="text-2xl font-bold text-center">Pricing</h2>
    </section>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/FAQ.tsx",
  "LANDING-FAQ",
  "Frequently Asked Questions",
  `export function FAQ() {
  return (
    <section className="container py-8">
      <h2 className="text-2xl font-bold text-center">FAQ</h2>
    </section>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/FinalCTA.tsx",
  "LANDING-FINAL-CTA",
  "Bottom Call to Action",
  `export function FinalCTA() {
  return (
    <section className="bg-primary text-primary-foreground py-24 text-center">
      <h2 className="text-4xl font-bold mb-4">Ready to ship?</h2>
      <button className="bg-background text-foreground px-8 py-3 rounded-md font-medium">Get Started</button>
    </section>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/landing/Footer.tsx",
  "LANDING-FOOTER",
  "Multi-column Footer with Legal",
  `export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built by the Nebutra Team.
        </p>
      </div>
    </footer>
  );
}`,
);

writeSkeleton(
  "apps/landing-page/src/components/common/ICPBadge.tsx",
  "LANDING-ICP",
  "China ICP Compliance Badge",
  `export function ICPBadge() {
  return (
    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline">
      {process.env.NEXT_PUBLIC_ICP_NUMBER ?? 'ICP Header'}
    </a>
  );
}`,
);

// Dashboard
writeSkeleton(
  "apps/web/src/components/shell/Topbar.tsx",
  "DASHBOARD-TOPBAR",
  "Global Top Navigation",
  `export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
      <div className="w-full flex-1">
        <input type="search" placeholder="Search..." className="w-full max-w-[300px] pl-8 rounded-md border" />
      </div>
    </header>
  );
}`,
);

writeSkeleton(
  "apps/web/src/components/shell/Sidebar.tsx",
  "DASHBOARD-SIDEBAR",
  "Main Sidebar Navigation",
  `export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-muted/40 hidden md:block">
      <nav className="flex flex-col gap-2 p-4">
        {/* Nav Items */}
      </nav>
    </aside>
  );
}`,
);

writeSkeleton(
  "apps/web/src/components/shell/CommandPalette.tsx",
  "DASHBOARD-CMDK",
  "CmdK Interface",
  `export function CommandPalette() {
  return null; // Mounts globally via context/portal
}`,
);

writeSkeleton(
  "apps/web/src/components/shell/PageHeader.tsx",
  "DASHBOARD-PAGEHEADER",
  "Title and Breadcrumbs",
  `export function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between space-y-2 mb-8">
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}`,
);

writeSkeleton(
  "apps/web/src/components/dashboard/KPICards.tsx",
  "DASHBOARD-KPI",
  "KPI Metric Cards",
  `export function KPICards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Cards */}
    </div>
  );
}`,
);

writeSkeleton(
  "apps/web/src/components/data/DataTable.tsx",
  "DASHBOARD-DATATABLE",
  "Advanced Data Table",
  `export function DataTable() {
  return (
    <div className="rounded-md border">
      {/* TanStack Table rendering */}
    </div>
  );
}`,
);

writeSkeleton(
  "apps/web/src/components/common/EmptyState.tsx",
  "DASHBOARD-HOLLOW",
  "Empty State Feedback",
  `export function EmptyState({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}`,
);

writeSkeleton(
  "apps/web/src/components/common/Skeleton.tsx",
  "DASHBOARD-SKELETON",
  "Loading State",
  `export function Skeleton({ className }: { className?: string }) {
  return <div className={\`animate-pulse rounded-md bg-muted \${className}\`} />;
}`,
);

writeSkeleton(
  "apps/web/src/components/common/ErrorState.tsx",
  "DASHBOARD-ERROR",
  "Error Recovery UI",
  `export function ErrorState({ error, retry }: { error: Error, retry: () => void }) {
  return (
    <div className="p-4 border border-destructive/50 text-destructive">{error.message}</div>
  );
}`,
);

writeSkeleton(
  "apps/web/src/components/common/Toast.tsx",
  "DASHBOARD-TOAST",
  "Sonner Toast Implementation",
  `import { Toaster as Sonner } from "sonner";
export function Toast() { return <Sonner />; }`,
);

writeSkeleton(
  "apps/web/src/components/onboarding/Checklist.tsx",
  "DASHBOARD-ONBOARDING",
  "New User Onboarding flow",
  `export function Checklist() { return <div>Welcome Checklist</div>; }`,
);
