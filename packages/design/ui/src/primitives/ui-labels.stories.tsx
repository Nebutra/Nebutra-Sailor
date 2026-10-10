import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ColorPicker } from "./color-picker";
import { ThemeToggle } from "./theme-toggle";
import { type UiLabelMessages, UiLabelsProvider, UiLabelText } from "./ui-labels";

/**
 * In an app these come from `loadUiLabels(locale)` (@nebutra/i18n/ui-labels),
 * i.e. packages/platform/i18n/ui-labels/<locale>.json. Inlined here so the
 * story renders without a catalog.
 */
const SIMPLIFIED_CHINESE: UiLabelMessages = {
  common: { close: "关闭", more: "更多" },
  colorPicker: {
    area: "饱和度与亮度",
    hue: "色相",
    alpha: "不透明度",
    input: "颜色值",
    format: "颜色格式",
    eyeDropper: "从屏幕取色",
  },
  themeToggle: { light: "切换到浅色主题", dark: "切换到深色主题" },
};

const meta = {
  title: "Primitives/UiLabelsProvider",
  component: UiLabelsProvider,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The labels contract: every string @nebutra/ui renders on its own reads English ← this provider ← the component's own `labels` prop. Mount it once at the app root with the request's translations.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof UiLabelsProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function Showcase() {
  const [color, setColor] = useState("#2e65ee");
  return (
    <div className="flex flex-col items-start gap-4">
      <ColorPicker value={color} onChange={setColor} />
      <ThemeToggle />
      <p className="text-sm text-muted-foreground">
        common.close → <UiLabelText section="common" name="close" />
      </p>
    </div>
  );
}

export const English: Story = {
  args: { labels: null, children: null },
  render: () => (
    <UiLabelsProvider labels={null}>
      <Showcase />
    </UiLabelsProvider>
  ),
};

export const SimplifiedChinese: Story = {
  args: { labels: SIMPLIFIED_CHINESE, children: null },
  render: (args) => (
    <UiLabelsProvider labels={args.labels}>
      <Showcase />
    </UiLabelsProvider>
  ),
};
