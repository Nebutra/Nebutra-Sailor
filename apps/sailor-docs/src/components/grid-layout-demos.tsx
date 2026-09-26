"use client";

import {
  Layout as LayoutDashboard,
  SidebarLeft as LayoutPanelLeft,
  Lightning as Rocket,
} from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import { GridCell, GridDemo } from "@/components/grid-demos";

export function StandardGridDemo() {
  return (
    <div className="w-full flex flex-col gap-4 my-6">
      <h4 className="text-sm font-medium text-fd-muted-foreground w-full text-center">
        Desktop / 12 Columns
      </h4>
      <GridDemo columns={12} gap={6} showGuides={true} guidesConfig="all" className="py-8 bg-muted">
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          1
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          2
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          3
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          4
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          5
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          6
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          7
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          8
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          9
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          10
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          11
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden lg:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          12
        </GridCell>

        {/* Visual fallback for narrow screens viewing docs */}
        <div className="col-span-12 lg:hidden text-center text-xs text-fd-muted-foreground bg-muted rounded-md p-4">
          [12 columns visible on desktop breakpoints]
        </div>
      </GridDemo>

      <h4 className="text-sm font-medium text-fd-muted-foreground w-full text-center mt-4">
        Tablet / 8 Columns
      </h4>
      <GridDemo columns={8} gap={4} showGuides={true} guidesConfig="all" className="py-8 bg-muted">
        <GridCell
          colSpan={1}
          className="h-16 hidden md:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          1
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden md:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          2
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden md:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          3
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden md:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          4
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden md:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          5
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden md:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          6
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden md:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          7
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 hidden md:flex bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          8
        </GridCell>

        {/* Visual fallback for narrow screens viewing docs */}
        <div className="col-span-12 md:hidden text-center text-xs text-fd-muted-foreground bg-muted rounded-md p-4">
          [8 columns visible on tablet breakpoints]
        </div>
      </GridDemo>

      <h4 className="text-sm font-medium text-fd-muted-foreground w-full text-center mt-4">
        Mobile / 4 Columns
      </h4>
      <GridDemo columns={4} gap={4} showGuides={true} guidesConfig="all" className="py-8 bg-muted">
        <GridCell
          colSpan={1}
          className="h-16 bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          1
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          2
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          3
        </GridCell>
        <GridCell
          colSpan={1}
          className="h-16 bg-neutral-11 text-neutral-1 shadow-sm border border-neutral-11/20"
        >
          4
        </GridCell>
      </GridDemo>
    </div>
  );
}

export function DashboardGridDemo() {
  return (
    <div className="w-full my-6 p-6 rounded-xl border border-border bg-muted overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/50">
        <LayoutDashboard className="w-4 h-4 text-fd-muted-foreground" />
        <span className="text-sm font-semibold text-fd-muted-foreground">Admin View</span>
      </div>

      {/* Stats row - 4 cols on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card shadow-sm p-4 rounded-lg border border-border flex flex-col gap-2 h-24 justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-chart-1/5 rounded-bl-full transition-transform group-hover:scale-110 motion-reduce:group-hover:scale-100"></div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Sales
          </span>
          <span className="text-2xl font-bold tracking-tight">$24,000</span>
        </div>
        <div className="bg-card shadow-sm p-4 rounded-lg border border-border flex flex-col gap-2 h-24 justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-chart-2/5 rounded-bl-full transition-transform group-hover:scale-110 motion-reduce:group-hover:scale-100"></div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Users
          </span>
          <span className="text-2xl font-bold tracking-tight">+1,245</span>
        </div>
        <div className="bg-card shadow-sm p-4 rounded-lg border border-border flex flex-col gap-2 h-24 justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-chart-3/5 rounded-bl-full transition-transform group-hover:scale-110 motion-reduce:group-hover:scale-100"></div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Conversion
          </span>
          <span className="text-2xl font-bold tracking-tight">4.2%</span>
        </div>
        <div className="bg-card shadow-sm p-4 rounded-lg border border-border flex flex-col gap-2 h-24 justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-chart-4/5 rounded-bl-full transition-transform group-hover:scale-110 motion-reduce:group-hover:scale-100"></div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Churn Rate
          </span>
          <span className="text-2xl font-bold tracking-tight">1.1%</span>
        </div>
      </div>

      {/* Split layout: 2/3 Main Content + 1/3 Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card shadow-sm p-6 rounded-lg border border-border min-h-[300px]">
          <div className="w-full h-8 flex items-center mb-6">
            <span className="font-semibold text-sm">Revenue Overview (lg:col-span-2)</span>
          </div>
          {/* Fake Chart Lines */}
          <div className="w-full h-48 border-b border-l border-border relative">
            <svg
              aria-hidden="true"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <path
                d="M0,80 L20,60 L40,70 L60,40 L80,50 L100,20"
                fill="none"
                stroke="currentColor"
                className="text-chart-1"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0,90 L20,80 L40,85 L60,65 L80,75 L100,50"
                fill="none"
                stroke="currentColor"
                className="text-muted-foreground"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="4,4"
              />
            </svg>
          </div>
        </div>
        <div className="bg-card shadow-sm p-6 rounded-lg border border-border min-h-[300px] flex flex-col gap-4">
          <span className="font-semibold text-sm">Recent Activity (lg:col-span-1)</span>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-muted shrink-0"></div>
            <div className="flex flex-col gap-1 w-full">
              <div className="h-3 bg-neutral-4 rounded w-3/4"></div>
              <div className="h-2 bg-neutral-3 rounded w-1/2"></div>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-muted shrink-0"></div>
            <div className="flex flex-col gap-1 w-full">
              <div className="h-3 bg-neutral-4 rounded w-full"></div>
              <div className="h-2 bg-neutral-3 rounded w-1/3"></div>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-muted shrink-0"></div>
            <div className="flex flex-col gap-1 w-full">
              <div className="h-3 bg-neutral-4 rounded w-2/3"></div>
              <div className="h-2 bg-neutral-3 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground">
          grid-cols-1 lg:grid-cols-3
        </Badge>
      </div>
    </div>
  );
}

export function SplitLayoutDemo() {
  return (
    <div className="w-full my-6 rounded-xl border border-border bg-background overflow-hidden shadow-sm flex flex-col h-[500px]">
      <div className="p-3 border-b border-border bg-muted flex items-center justify-between">
        <span className="text-xs font-semibold text-fd-muted-foreground flex items-center gap-2">
          <LayoutPanelLeft className="w-3.5 h-3.5" /> Authentication Split Layout
        </span>
        <Badge variant="outline" className="font-mono text-[10px]">
          lg:grid-cols-2
        </Badge>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 h-full">
        {/* Left Side (Hidden on Mobile) */}
        {/* allow-palette: this mock auth panel has its own fixed decorative gradient background, independent of the site theme — white overlays and ink are literal by design */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-[linear-gradient(135deg,#6366f1_0%,#a855f7_100%)] p-12 relative overflow-hidden">
          {/* Decorative backrgound circles */}
          {/* allow-palette: fixed gradient panel, see note above */}
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          {/* allow-palette: fixed gradient panel, see note above */}
          <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

          {/* allow-palette: fixed gradient panel, see note above */}
          <Rocket className="w-16 h-16 text-white mb-6 opacity-90" />
          {/* allow-palette: fixed gradient panel, see note above */}
          <h2 className="text-3xl font-bold text-white text-center mb-2">Welcome Aboard</h2>
          {/* allow-palette: fixed gradient panel, see note above */}
          <p className="text-white/80 text-center max-w-sm">
            Sign in to access your dashboard, settings, and team environments.
          </p>
        </div>

        {/* Right Side (Form Area) */}
        <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-background">
          <div className="w-full max-w-[360px] mx-auto space-y-6">
            <div className="space-y-2 text-center">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Log In</h3>
              <p className="text-sm text-muted-foreground">Enter your credentials below</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-12 bg-neutral-4 rounded"></div>
                <div className="h-10 w-full bg-muted border border-border rounded-md"></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-neutral-4 rounded"></div>
                  <div className="h-4 w-24 bg-chart-4/15 rounded"></div>
                </div>
                <div className="h-10 w-full bg-muted border border-border rounded-md"></div>
              </div>
              <div className="h-10 w-full bg-primary rounded-md shadow-sm mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
