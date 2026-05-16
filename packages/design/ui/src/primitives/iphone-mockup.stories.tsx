import type { Meta, StoryObj } from "@storybook/react";
import { IphoneMockup, Phone } from "./iphone-mockup";

const demoImage = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="white"/>
  <rect x="28" y="52" width="150" height="18" rx="9" fill="black"/>
  <rect x="28" y="92" width="220" height="12" rx="6" fill="gray"/>
  <rect x="28" y="142" width="334" height="124" rx="24" fill="gainsboro"/>
  <rect x="52" y="178" width="128" height="14" rx="7" fill="black"/>
  <rect x="52" y="214" width="216" height="10" rx="5" fill="gray"/>
  <rect x="28" y="294" width="158" height="170" rx="24" fill="whitesmoke"/>
  <rect x="204" y="294" width="158" height="170" rx="24" fill="whitesmoke"/>
  <rect x="28" y="500" width="334" height="246" rx="24" fill="whitesmoke"/>
  <text x="52" y="552" font-family="system-ui" font-size="18" font-weight="700" fill="black">Usage</text>
</svg>
`)}`;

function CapturedMobileScreen() {
  return (
    <div
      role="img"
      aria-label="Nebutra mobile dashboard screenshot showing usage cards and activity rows"
      className="flex size-full flex-col gap-5 bg-[var(--neutral-1)] px-6 py-12 text-[var(--neutral-12)]"
    >
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-[var(--radius-full)] bg-[var(--neutral-12)]" />
        <div className="h-2 w-40 rounded-[var(--radius-full)] bg-[var(--neutral-8)]" />
      </div>
      <div className="rounded-[var(--radius-xl)] border border-border bg-[var(--neutral-2)] p-5">
        <div className="h-3 w-28 rounded-[var(--radius-full)] bg-[var(--neutral-12)]" />
        <div className="mt-5 h-2 w-48 rounded-[var(--radius-full)] bg-[var(--blue-9)]" />
        <div className="mt-3 h-2 w-32 rounded-[var(--radius-full)] bg-[var(--neutral-7)]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {["Deployments", "Credits"].map((label) => (
          <div
            className="rounded-[var(--radius-lg)] border border-border bg-background p-4"
            key={label}
          >
            <div className="h-2 w-16 rounded-[var(--radius-full)] bg-[var(--neutral-8)]" />
            <div className="mt-5 h-4 w-20 rounded-[var(--radius-full)] bg-[var(--neutral-12)]" />
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-3 rounded-[var(--radius-xl)] border border-border bg-background p-4">
        {[0, 1, 2].map((item) => (
          <div className="flex items-center gap-3" key={item}>
            <div className="size-8 rounded-[var(--radius-full)] bg-[var(--neutral-4)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2 rounded-[var(--radius-full)] bg-[var(--neutral-9)]" />
              <div className="h-2 w-2/3 rounded-[var(--radius-full)] bg-[var(--neutral-6)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: "Primitives/Phone",
  component: Phone,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Device chrome for captured mobile screenshots, videos, and docs demos. `Phone` is canonical; `IphoneMockup` is a deprecated compatibility alias.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Phone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-56">
      <Phone address="nebutra.com/mobile" />
    </div>
  ),
};

export const CapturedScreen: Story = {
  render: () => (
    <div className="w-56">
      <Phone>
        <CapturedMobileScreen />
      </Phone>
    </div>
  ),
};

export const ImageMode: Story = {
  render: () => (
    <div className="w-56">
      <Phone
        imageSrc={demoImage}
        imageAlt="Nebutra mobile dashboard screenshot with usage and activity cards"
      />
    </div>
  ),
};

export const ChromeVariants: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-6 md:flex-row">
      {(["graphite", "silver", "titanium"] as const).map((chrome) => (
        <div className="w-44" key={chrome}>
          <Phone chrome={chrome}>
            <CapturedMobileScreen />
          </Phone>
        </div>
      ))}
    </div>
  ),
};

export const LongAddressEdgeCase: Story = {
  render: () => (
    <div className="w-40">
      <Phone address="platform-web-git-feature-redesign-dashboard-navigation.nebutra.dev/projects/mobile-demo" />
    </div>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-xl)] bg-background p-10">
      <div className="w-56">
        <Phone chrome="titanium">
          <CapturedMobileScreen />
        </Phone>
      </div>
    </div>
  ),
};

export const DeprecatedAlias: Story = {
  render: () => (
    <div className="w-56">
      <IphoneMockup
        imageSrc={demoImage}
        imageAlt="Compatibility alias rendering a captured dashboard"
      />
    </div>
  ),
};
