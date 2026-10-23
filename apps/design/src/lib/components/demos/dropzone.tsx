"use client";

import { CloudUpload } from "@nebutra/icons";
import { Dropzone } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  ControlButton,
  Controls,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  Row,
  Specimen,
  State,
} from "../demo-kit";

const MB = 1024 * 1024;

/** A zone that lists what it accepted and rejected, so a drop has a visible result. */
function ReportingZone(props: Omit<React.ComponentProps<typeof Dropzone>, "onFiles" | "onReject">) {
  const [accepted, setAccepted] = React.useState<string[]>([]);
  const [rejected, setRejected] = React.useState<string[]>([]);
  return (
    <div className="flex w-80 max-w-full flex-col gap-2">
      <Dropzone
        {...props}
        onFiles={(files) => {
          setAccepted(files.map((file) => file.name));
          setRejected([]);
        }}
        onReject={(rejections) =>
          setRejected(rejections.map((rejection) => `${rejection.file.name} (${rejection.reason})`))
        }
      />
      <p className="m-0 break-words text-muted-foreground text-xs">
        Accepted: {accepted.length > 0 ? accepted.join(", ") : "none yet"}
      </p>
      {rejected.length > 0 ? (
        <p className="m-0 break-words text-muted-foreground text-xs">
          Rejected: {rejected.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function noop() {}

/** Counts a fake upload from 0 to 100 so the progress bar has something to show. */
function useFakeUpload() {
  const [progress, setProgress] = React.useState<number | undefined>(undefined);
  const timer = React.useRef<number | null>(null);

  const stop = React.useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  React.useEffect(() => stop, [stop]);

  const start = () => {
    stop();
    setProgress(0);
    timer.current = window.setInterval(() => {
      setProgress((current) => {
        const next = (current ?? 0) + 10;
        if (next >= 100) stop();
        return Math.min(next, 100);
      });
    }, 300);
  };

  const reset = () => {
    stop();
    setProgress(undefined);
  };

  return { progress, start, reset };
}

export default function DropzoneDemo() {
  const upload = useFakeUpload();
  const [indeterminate, setIndeterminate] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A drop target that only works with a mouse. The file input must be reachable by Tab and open the picker on Enter, because the surface is a label around a real input."
        code={`<Dropzone onFiles={(files) => upload(files)} />`}
        id="default"
        note="Click it, drop a file on it, or Tab to it and press Enter. The line under the zone is this page's own readout."
        title="Default"
      >
        <ReportingZone />
      </State>

      <State
        breaks="The two sizes drifting apart: sm must stay a single inline row and md the tall target, with the same copy and ring."
        code={`<Dropzone size="sm" description="PNG or JPG, up to 5 MB" onFiles={(files) => upload(files)} />`}
        id="sizes"
        title="Sizes"
      >
        <Row align="start">
          <Specimen label="sm">
            <div className="w-80 max-w-full">
              <Dropzone description="PNG or JPG, up to 5 MB" onFiles={noop} size="sm" />
            </div>
          </Specimen>
          <Specimen label="md · default">
            <div className="w-80 max-w-full">
              <Dropzone description="PNG or JPG, up to 5 MB" onFiles={noop} size="md" />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="accept being checked only by file extension or only by MIME type, so a renamed file slips through or a valid one is refused. Drop or pick a .txt file here."
        code={`<Dropzone
  accept="image/png,image/jpeg"
  description="PNG or JPG"
  onFiles={(files) => upload(files)}
/>`}
        id="accept"
        note="accept uses the input attribute syntax. A rejected file is listed with its reason, shown in red under the zone and announced politely."
        title="Accepted types"
      >
        <ReportingZone accept="image/png,image/jpeg" description="PNG or JPG" />
      </State>

      <State
        breaks="A size limit compared in the wrong unit. maxSize is in bytes; the message formats it back to KB or MB."
        code={`<Dropzone maxSize={1024 * 1024} description="Up to 1 MB" onFiles={(files) => upload(files)} />`}
        id="max-size"
        note="Pick a file larger than 1 MB to see the size rejection."
        title="Size limit"
      >
        <ReportingZone description="Up to 1 MB" maxSize={MB} />
      </State>

      <State
        breaks="multiple taking everything it is given, or maxFiles counting rejected files against the limit. Drop four files on the left zone: two are accepted, the rest are rejected as count."
        code={`<Dropzone multiple maxFiles={2} onFiles={(files) => upload(files)} />`}
        id="multiple"
        note="Without multiple only the first file is taken and the rest are rejected as count."
        title="Multiple files and a file limit"
      >
        <Row align="start">
          <Specimen label="multiple + maxFiles 2">
            <ReportingZone maxFiles={2} multiple />
          </Specimen>
          <Specimen label="single (default)">
            <ReportingZone />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A disabled zone that still opens the picker, takes drops, or does not look disabled. The input is disabled, the surface is dimmed and the pointer shows not-allowed."
        code={`<Dropzone disabled onFiles={(files) => upload(files)} />`}
        id="disabled"
        title="Disabled"
      >
        <div className="w-80 max-w-full">
          <Dropzone description="Uploads are paused" disabled onFiles={noop} />
        </div>
      </State>

      <State
        breaks="An upload failure with nowhere to appear, or one shown but not tied to the input. error is red text under the zone, with aria-invalid and aria-describedby on the input."
        code={`<Dropzone error="Upload failed. Check your connection." onFiles={(files) => upload(files)} />`}
        id="error"
        note="error is for failures the zone cannot know about. It takes precedence over a validation message."
        title="External error"
      >
        <div className="w-80 max-w-full">
          <Dropzone
            description="PNG or JPG, up to 5 MB"
            error="Upload failed. Check your connection."
            onFiles={noop}
          />
        </div>
      </State>

      <State
        breaks="A progress bar that never reaches the end, or one that appears when progress is undefined. undefined hides it, a number is determinate and null is indeterminate."
        code={`<Dropzone progress={uploading ? percent : undefined} onFiles={(files) => upload(files)} />`}
        id="progress"
        note="Start the fake upload to count from 0 to 100. The bar is named by progressLabel."
        title="Progress"
      >
        <Controls>
          <ControlButton active={upload.progress !== undefined} onClick={upload.start}>
            start upload
          </ControlButton>
          <ControlButton onClick={upload.reset}>reset</ControlButton>
          <ControlButton active={indeterminate} onClick={() => setIndeterminate((v) => !v)}>
            indeterminate
          </ControlButton>
        </Controls>
        <div className="w-80 max-w-full">
          <Dropzone
            description="report.pdf"
            onFiles={noop}
            progressLabel="Uploading report.pdf"
            size="sm"
            {...(indeterminate
              ? { progress: null }
              : upload.progress === undefined
                ? {}
                : { progress: upload.progress })}
          />
        </div>
      </State>

      <State
        breaks="A custom body that loses the label, so the input has no accessible name. children replaces the icon and copy, so it must carry the name itself."
        code={`<Dropzone onFiles={(files) => upload(files)}>
  <CloudUpload aria-hidden="true" /> Drop a backup here
</Dropzone>`}
        id="children"
        note="children replaces the default icon and copy. The description prop is not wired to the input in this mode."
        title="Custom body"
      >
        <div className="w-80 max-w-full">
          <Dropzone onFiles={noop} size="sm">
            <CloudUpload aria-hidden="true" className="size-4" />
            <span className="text-foreground">Drop a backup here</span>
          </Dropzone>
        </div>
      </State>

      <State
        breaks="Rejection copy that is hard-coded English. messages takes a function per reason, so the copy can be translated and can mention the file."
        code={`<Dropzone
  accept="image/*"
  messages={{ type: (file) => \`\${file.name}: solo se permiten imagenes.\` }}
  onFiles={(files) => upload(files)}
/>`}
        id="messages"
        note="Drop a non-image file to see the custom message."
        title="Translated messages"
      >
        <ReportingZone
          accept="image/*"
          description="Solo imagenes"
          label="Suelta una imagen aqui o examina"
          messages={{ type: (file) => `${file.name}: solo se permiten imagenes.` }}
        />
      </State>

      <State
        breaks="Pasted files ignored, or accepted when paste is off. Click the zone, then paste an image from the clipboard."
        code={`<Dropzone paste onFiles={(files) => upload(files)} />`}
        id="paste"
        note="With paste, files on the clipboard are accepted while focus is inside the zone."
        title="Paste"
      >
        <ReportingZone description="Paste an image while this is focused" paste />
      </State>

      <State
        breaks="A long label or description that stretches the surface past its container. The copy sits in a min-w-0 column, so it wraps inside the zone."
        id="overflow"
        title="Overflow — long label and description"
      >
        <Row align="start">
          <div className="w-72 max-w-full">
            <Dropzone description={LONG_LABEL} label={LONG_LABEL} onFiles={noop} />
          </div>
          <div className="w-72 max-w-full">
            <Dropzone description={LONG_LABEL} label={LONG_LABEL} onFiles={noop} size="sm" />
          </div>
        </Row>
      </State>

      <State
        breaks="Spacing written with physical left and right. The icon and copy sit in a flex row with a gap, so they swap sides with the document direction."
        id="rtl"
        title="Right-to-left"
      >
        <div className="w-80 max-w-full" dir="rtl">
          <Dropzone
            description="PNG أو JPG"
            label="أسقط ملفا هنا أو تصفح"
            onFiles={noop}
            size="sm"
          />
        </div>
      </State>

      <State
        breaks="A keyboard path that stops at the zone. The hidden input has to take focus, show the ring on the surface and open the picker."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "Moves focus to the zone. The surface draws the focus ring." },
            { keys: "Enter or Space", does: "Opens the operating-system file picker." },
            { keys: "Ctrl/Cmd + V", does: "With paste on, adds a file from the clipboard." },
          ]}
        >
          <div className="w-80 max-w-full">
            <Dropzone description="Reachable without a mouse" onFiles={noop} paste size="sm" />
          </div>
        </KeyboardPath>
      </State>

      <Aside title="States that need a real drag">
        <p>
          While a file is dragged over the zone it sets <code>data-dragging</code> (and{" "}
          <code>data-drag-reject</code> when the dragged types cannot match <code>accept</code>).
          Those cannot be forced from a page without faking the event, so they are not rendered
          here: drag a file from your desktop over any zone above to see them.
        </p>
      </Aside>
    </DemoPage>
  );
}
