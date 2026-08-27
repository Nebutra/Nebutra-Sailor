import type { Meta, StoryObj } from "@storybook/react";
import { FileCard, type FileFormat } from "./file-card";

const meta: Meta<typeof FileCard> = {
  title: "Primitives/FileCard",
  component: FileCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Decorative file-format card with colored banner + content placeholder. " +
          "Sibling of Folder (decorative tile family). Distinct from FileAttachment, " +
          "which renders interactive uploaded files in a chat composer.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof FileCard>;

const ALL_FORMATS: FileFormat[] = [
  "txt",
  "doc",
  "pdf",
  "md",
  "mdx",
  "xls",
  "xlsx",
  "csv",
  "zip",
  "rar",
  "tar",
  "gz",
  "ppt",
  "pptx",
  "json",
  "css",
  "code",
  "html",
  "js",
  "jsx",
  "tsx",
  "png",
  "jpg",
  "jpeg",
  "img",
  "video",
];

export const Default: Story = {
  name: "Default — pdf",
  render: () => <FileCard format="pdf" />,
};

export const AllFormats: Story = {
  name: "All 26 formats",
  render: () => (
    <div className="flex max-w-2xl flex-wrap items-center justify-center gap-6 px-6">
      {ALL_FORMATS.map((format) => (
        <FileCard key={format} format={format} />
      ))}
    </div>
  ),
};

export const Documents: Story = {
  name: "Document cluster",
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(["doc", "pdf", "md", "mdx", "txt"] as const).map((format) => (
        <FileCard key={format} format={format} />
      ))}
    </div>
  ),
};

export const Tabular: Story = {
  name: "Spreadsheet / CSV cluster",
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(["xls", "xlsx", "csv"] as const).map((format) => (
        <FileCard key={format} format={format} />
      ))}
    </div>
  ),
};

export const Code: Story = {
  name: "Code cluster (html / js / jsx / tsx / code / css / json)",
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(["html", "js", "jsx", "tsx", "code", "css", "json"] as const).map((format) => (
        <FileCard key={format} format={format} />
      ))}
    </div>
  ),
};

export const Media: Story = {
  name: "Media cluster (image / video)",
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(["png", "jpg", "jpeg", "img", "video"] as const).map((format) => (
        <FileCard key={format} format={format} />
      ))}
    </div>
  ),
};

export const Archives: Story = {
  name: "Archive cluster",
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(["zip", "rar", "tar", "gz"] as const).map((format) => (
        <FileCard key={format} format={format} />
      ))}
    </div>
  ),
};

export const Slides: Story = {
  name: "Slide cluster",
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(["ppt", "pptx"] as const).map((format) => (
        <FileCard key={format} format={format} />
      ))}
    </div>
  ),
};
