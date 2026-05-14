import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { FileAttachment } from "./file-attachment";

const meta: Meta<typeof FileAttachment> = {
  title: "Primitives/FileAttachment",
  component: FileAttachment,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Chip / thumbnail display for an attached file. Use in chat " +
          "composers, message bubbles, or attachment lists. NOT a chat " +
          "tool-family member — this renders user input, not AI output.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof FileAttachment>;

const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="44" cy="20" r="8" fill="#fff" fill-opacity="0.85"/><path d="M0 50 L20 36 L36 46 L52 30 L64 42 L64 64 L0 64 Z" fill="#000" fill-opacity="0.25"/></svg>`;
const heroImg = `data:image/svg+xml;utf8,${encodeURIComponent(heroSvg)}`;

export const Pdf: Story = {
  name: "Chip — PDF (text icon)",
  render: () => <FileAttachment filename="quarterly-report.pdf" size={245_000} />,
};

export const Code: Story = {
  name: "Chip — code file",
  render: () => <FileAttachment filename="server.ts" size={4_200} />,
};

export const Data: Story = {
  name: "Chip — JSON / YAML",
  render: () => (
    <div className="flex flex-col gap-3">
      <FileAttachment filename="payload.json" size={1_240} />
      <FileAttachment filename="ci.yaml" size={2_100} />
    </div>
  ),
};

export const ImagePreview: Story = {
  name: "Chip — image with thumbnail",
  render: () => <FileAttachment filename="hero.png" size={86_000} isImage url={heroImg} />,
};

export const ImageOnly: Story = {
  name: "Image-only mode (compact grid)",
  render: () => (
    <div className="flex items-center gap-2">
      <FileAttachment display="image-only" filename="hero-1.png" isImage url={heroImg} />
      <FileAttachment display="image-only" filename="hero-2.png" isImage url={heroImg} />
      <FileAttachment display="image-only" filename="hero-3.png" isImage url={heroImg} />
    </div>
  ),
};

export const Removable: Story = {
  name: "Removable (hover OR Tab to reveal)",
  parameters: {
    docs: {
      description: {
        story:
          "The remove button is hidden by default and surfaces on hover, focus-within, OR keyboard focus-visible. Try Tab — keyboard-only users can also remove files (the original 21st.dev hover-only pattern was a11y-broken).",
      },
    },
  },
  render: () => {
    const [files, setFiles] = useState([
      { id: "1", filename: "quarterly-report.pdf", size: 245_000 },
      { id: "2", filename: "server.ts", size: 4_200 },
      { id: "3", filename: "hero.png", size: 86_000, isImage: true, url: heroImg },
    ]);
    return (
      <div className="flex flex-wrap items-center gap-3">
        {files.map((file) => (
          <FileAttachment
            key={file.id}
            filename={file.filename}
            size={file.size}
            isImage={file.isImage}
            url={file.url}
            onRemove={() => setFiles((prev) => prev.filter((f) => f.id !== file.id))}
          />
        ))}
        {files.length === 0 && (
          <span className="text-sm text-muted-foreground">
            All files removed. Refresh story to reset.
          </span>
        )}
      </div>
    );
  },
};

export const NoSize: Story = {
  name: "Without size metadata",
  render: () => <FileAttachment filename="anonymous-attachment.bin" />,
};

export const LongFilename: Story = {
  name: "Long filename truncates",
  render: () => (
    <FileAttachment
      filename="extremely-long-multi-segment-archived-quarterly-report-final-v2-revised.pdf"
      size={1_245_000}
    />
  ),
};
