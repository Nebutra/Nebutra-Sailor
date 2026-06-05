"use client";

import {
  ArrowUp,
  Brain as BrainCog,
  FolderClosed as FolderCode,
  Globe,
  Microphone as Mic,
  Paperclip,
  StopCircle,
  StopFill,
} from "@nebutra/icons";
import React, { useEffectEvent } from "react";
import { Button } from "../../primitives/button";
import { Textarea } from "../../primitives/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../primitives/tooltip";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "../../shared/animation/motion";
import { cn } from "../../utils/cn";
import {
  getFilePreviewKey,
  ImageViewDialog,
  isImageFile,
  PromptAttachmentPreviews,
  preventDragDefaults,
} from "./file-attachment-zone";
import { VoiceRecorder } from "./voice-visualizer";

type PromptTextareaStyle = React.CSSProperties & {
  "--textarea-min-height"?: string;
};

// PromptInput Context
interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: (() => void) | undefined;
  disabled?: boolean | undefined;
}
const noopSetPromptValue = (_value: string) => {};
const PromptInputIsLoadingContext = React.createContext(false);
const PromptInputValueContext = React.createContext("");
const PromptInputSetValueContext = React.createContext<(value: string) => void>(noopSetPromptValue);
const PromptInputMaxHeightContext = React.createContext<number | string>(240);
const PromptInputSubmitContext = React.createContext<(() => void) | undefined>(undefined);
const PromptInputDisabledContext = React.createContext(false);

function usePromptInput() {
  return {
    isLoading: React.use(PromptInputIsLoadingContext),
    value: React.use(PromptInputValueContext),
    setValue: React.use(PromptInputSetValueContext),
    maxHeight: React.use(PromptInputMaxHeightContext),
    onSubmit: React.use(PromptInputSubmitContext),
    disabled: React.use(PromptInputDisabledContext),
  } satisfies PromptInputContextType;
}

// PromptInput Component
interface PromptInputProps {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  ref?: React.Ref<HTMLDivElement>;
}

const PromptInput: React.FC<PromptInputProps> = ({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
  disabled = false,
  onDragOver,
  onDragLeave,
  onDrop,
  ref,
}) => {
  const [internalValue, setInternalValue] = React.useState(value || "");
  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };
  const promptValue = value ?? internalValue;
  const setPromptValue = onValueChange ?? handleChange;

  return (
    <TooltipProvider>
      <PromptInputIsLoadingContext.Provider value={isLoading}>
        <PromptInputValueContext.Provider value={promptValue}>
          <PromptInputSetValueContext.Provider value={setPromptValue}>
            <PromptInputMaxHeightContext.Provider value={maxHeight}>
              <PromptInputSubmitContext.Provider value={onSubmit}>
                <PromptInputDisabledContext.Provider value={disabled}>
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-drop zone uses div intentionally */}
                  <div
                    ref={ref}
                    className={cn(
                      "rounded-[var(--radius-3xl)] border border-input bg-background p-2 shadow-lg transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-300",
                      isLoading && "border-destructive/70",
                      className,
                    )}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    {children}
                  </div>
                </PromptInputDisabledContext.Provider>
              </PromptInputSubmitContext.Provider>
            </PromptInputMaxHeightContext.Provider>
          </PromptInputSetValueContext.Provider>
        </PromptInputValueContext.Provider>
      </PromptInputIsLoadingContext.Provider>
    </TooltipProvider>
  );
};
PromptInput.displayName = "PromptInput";

// PromptInputTextarea Component
interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const PromptInputTextarea: React.FC<
  PromptInputTextareaProps & React.ComponentProps<typeof Textarea>
> = ({ className, onKeyDown, disableAutosize = false, placeholder, style, ...props }) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [maxHeight, disableAutosize]);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };
  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      rows={1}
      style={{ "--textarea-min-height": "2rem", ...style } as PromptTextareaStyle}
      className={cn("resize-none border-0 shadow-none focus-visible:ring-0", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
};

// PromptInputActions Component
type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>;

const PromptInputActions: React.FC<PromptInputActionsProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

// PromptInputAction Component
interface PromptInputActionProps extends Omit<React.ComponentProps<typeof Tooltip>, "children"> {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const PromptInputAction: React.FC<PromptInputActionProps> = ({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className || ""}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

// CustomDivider Component
const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div
      className="absolute inset-0 bg-gradient-to-t from-transparent via-cyan/40 to-transparent rounded-full"
      style={{
        clipPath:
          "polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)",
      }}
    />
  </div>
);

// PromptModeButton + PromptModeActions
type PromptMode = "search" | "think" | "canvas";
type PromptModeTone = "search" | "think" | "canvas";

const promptModeToneClassName: Record<
  PromptModeTone,
  { active: string; icon: string; label: string }
> = {
  search: {
    active: "bg-info/15 border-info text-info",
    icon: "text-info",
    label: "text-info",
  },
  think: {
    active: "bg-indigo-500/15 border-indigo-500 text-indigo-500",
    icon: "text-indigo-500",
    label: "text-indigo-500",
  },
  canvas: {
    active: "bg-warning/15 border-warning text-warning",
    icon: "text-warning",
    label: "text-warning",
  },
};

function PromptModeIcon({ tone, active }: { tone: PromptModeTone; active: boolean }) {
  const className = cn("w-4 h-4", active ? promptModeToneClassName[tone].icon : "text-inherit");
  if (tone === "search") return <Globe className={className} />;
  if (tone === "think") return <BrainCog className={className} />;
  return <FolderCode className={className} />;
}

function PromptModeButton({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: PromptModeTone;
  onClick: () => void;
}) {
  const toneClassName = promptModeToneClassName[tone];
  const shouldReduceMotion = useReducedMotion();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full transition-[background-color,border-color,box-shadow,color,opacity,transform] flex items-center gap-1 px-2 py-1 border h-8",
        active
          ? toneClassName.active
          : "bg-transparent border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
        <m.div
          animate={
            shouldReduceMotion
              ? { opacity: active ? 1 : 0.82 }
              : { rotate: active ? 360 : 0, scale: active ? 1.1 : 1 }
          }
          whileHover={
            shouldReduceMotion
              ? { opacity: 1 }
              : {
                  rotate: active ? 360 : 15,
                  scale: 1.1,
                  transition: { type: "spring", stiffness: 300, damping: 10 },
                }
          }
          transition={
            shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 25 }
          }
        >
          <PromptModeIcon tone={tone} active={active} />
        </m.div>
      </div>
      <AnimatePresence>
        {active && (
          <m.span
            initial={shouldReduceMotion ? { opacity: 1 } : { width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { width: 0, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className={cn(
              "text-xs overflow-hidden whitespace-nowrap flex-shrink-0",
              toneClassName.label,
            )}
          >
            {label}
          </m.span>
        )}
      </AnimatePresence>
    </button>
  );
}

type PromptModeActionsProps = {
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  isRecording: boolean;
  modes: Record<PromptMode, boolean>;
  onToggleMode: (mode: Exclude<PromptMode, "canvas">) => void;
  onToggleCanvas: () => void;
  onProcessFile: (file: File) => void;
};

function PromptModeActions({
  uploadInputRef,
  isRecording,
  modes,
  onToggleMode,
  onToggleCanvas,
  onProcessFile,
}: PromptModeActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 transition-opacity duration-300",
        isRecording ? "opacity-0 invisible h-0" : "opacity-100 visible",
      )}
    >
      <PromptInputAction tooltip="Upload image">
        <button
          type="button"
          aria-label="Upload image"
          onClick={() => uploadInputRef.current?.click()}
          className="flex h-8 w-8 text-muted-foreground cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
          disabled={isRecording}
        >
          <Paperclip className="h-5 w-5 transition-colors" />
        </button>
      </PromptInputAction>
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onProcessFile(file);
          if (event.target) event.target.value = "";
        }}
        accept="image/*"
        aria-label="Upload image"
      />
      <div className="flex items-center">
        <PromptModeButton
          active={modes.search}
          label="Search"
          tone="search"
          onClick={() => onToggleMode("search")}
        />
        <CustomDivider />
        <PromptModeButton
          active={modes.think}
          label="Think"
          tone="think"
          onClick={() => onToggleMode("think")}
        />
        <CustomDivider />
        <PromptModeButton
          active={modes.canvas}
          label="Canvas"
          tone="canvas"
          onClick={onToggleCanvas}
        />
      </div>
    </div>
  );
}

// PromptSubmitAction Component
type PromptSubmitActionProps = {
  isLoading: boolean;
  isRecording: boolean;
  hasContent: boolean;
  onActivate: () => void;
};

function PromptSubmitAction({
  isLoading,
  isRecording,
  hasContent,
  onActivate,
}: PromptSubmitActionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <PromptInputAction
      tooltip={
        isLoading
          ? "Stop generation"
          : isRecording
            ? "Stop recording"
            : hasContent
              ? "Send message"
              : "Voice message"
      }
    >
      <Button
        variant="default"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-200",
          isRecording
            ? "bg-transparent hover:bg-accent text-destructive hover:text-destructive/80"
            : hasContent
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground",
        )}
        onClick={onActivate}
        disabled={isLoading && !hasContent}
      >
        {isLoading ? (
          <StopFill
            className={cn(
              "h-4 w-4 fill-primary-foreground",
              shouldReduceMotion ? "opacity-100" : "animate-pulse",
            )}
          />
        ) : isRecording ? (
          <StopCircle className="h-5 w-5 text-destructive" />
        ) : hasContent ? (
          <ArrowUp className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Mic className="h-5 w-5 text-primary-foreground transition-colors" />
        )}
      </Button>
    </PromptInputAction>
  );
}

// PromptInputBox — State & Reducer
export interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

type PromptInputBoxState = {
  input: string;
  files: File[];
  filePreviews: Record<string, string>;
  selectedImage: string | null;
  isRecording: boolean;
  recordingTime: number;
  showSearch: boolean;
  showThink: boolean;
  showCanvas: boolean;
};

const promptInputBoxInitialState: PromptInputBoxState = {
  input: "",
  files: [],
  filePreviews: {},
  selectedImage: null,
  isRecording: false,
  recordingTime: 0,
  showSearch: false,
  showThink: false,
  showCanvas: false,
};

type PromptInputBoxAction =
  | { type: "set-input"; value: string }
  | { type: "set-active-file"; file: File }
  | { type: "set-file-preview"; previewKey: string; preview: string }
  | { type: "remove-file"; previewKey: string }
  | { type: "set-selected-image"; imageUrl: string | null }
  | { type: "toggle-mode"; mode: PromptMode }
  | { type: "start-recording" }
  | { type: "tick-recording" }
  | { type: "stop-recording" }
  | { type: "reset-composer" };

function promptInputBoxReducer(
  state: PromptInputBoxState,
  action: PromptInputBoxAction,
): PromptInputBoxState {
  switch (action.type) {
    case "set-input":
      return { ...state, input: action.value };
    case "set-active-file":
      return { ...state, files: [action.file], filePreviews: {} };
    case "set-file-preview":
      return { ...state, filePreviews: { [action.previewKey]: action.preview } };
    case "remove-file": {
      const nextPreviews = { ...state.filePreviews };
      delete nextPreviews[action.previewKey];
      return {
        ...state,
        filePreviews: nextPreviews,
        files: state.files.filter((file) => getFilePreviewKey(file) !== action.previewKey),
      };
    }
    case "set-selected-image":
      return { ...state, selectedImage: action.imageUrl };
    case "toggle-mode":
      if (action.mode === "search") {
        return { ...state, showSearch: !state.showSearch, showThink: false };
      }
      if (action.mode === "think") {
        return { ...state, showSearch: false, showThink: !state.showThink };
      }
      return { ...state, showCanvas: !state.showCanvas };
    case "start-recording":
      return { ...state, recordingTime: 0, isRecording: true };
    case "tick-recording":
      return { ...state, recordingTime: state.recordingTime + 1 };
    case "stop-recording":
      return { ...state, isRecording: false, recordingTime: 0 };
    case "reset-composer":
      return { ...state, input: "", files: [], filePreviews: {} };
  }
}

// PromptInputBox — Main Component
export const PromptInputBox: React.FC<PromptInputBoxProps> = (props) => {
  const {
    onSend = () => {},
    isLoading = false,
    placeholder = "Type your message here...",
    className,
    ref,
  } = props;
  const [state, dispatch] = React.useReducer(promptInputBoxReducer, promptInputBoxInitialState);
  const {
    input,
    files,
    filePreviews,
    selectedImage,
    isRecording,
    recordingTime,
    showSearch,
    showThink,
    showCanvas,
  } = state;
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const promptBoxRef = React.useRef<HTMLDivElement>(null);
  const handleToggleChange = (mode: Exclude<PromptMode, "canvas">) =>
    dispatch({ type: "toggle-mode", mode });
  const handleCanvasToggle = () => dispatch({ type: "toggle-mode", mode: "canvas" });

  const processFile = (file: File) => {
    if (!isImageFile(file)) {
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    const previewKey = getFilePreviewKey(file);
    dispatch({ type: "set-active-file", file });
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result;
      if (typeof preview === "string") {
        dispatch({ type: "set-file-preview", previewKey, preview });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    preventDragDefaults(e);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const firstFile = droppedFiles.find((file) => isImageFile(file));
    if (firstFile) processFile(firstFile);
  };

  const handleRemoveFile = (fileToRemove: File) => {
    const previewKey = getFilePreviewKey(fileToRemove);
    dispatch({ type: "remove-file", previewKey });
  };
  const openImageModal = (imageUrl: string) => dispatch({ type: "set-selected-image", imageUrl });

  const handlePasteEvent = useEffectEvent((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.includes("image")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  });

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => handlePasteEvent(e);
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  React.useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => dispatch({ type: "tick-recording" }), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      let messagePrefix = "";
      if (showSearch) messagePrefix = "[Search: ";
      else if (showThink) messagePrefix = "[Think: ";
      else if (showCanvas) messagePrefix = "[Canvas: ";
      const formattedInput = messagePrefix ? `${messagePrefix}${input}]` : input;
      onSend(formattedInput, files);
      dispatch({ type: "reset-composer" });
    }
  };
  const startRecording = () => dispatch({ type: "start-recording" });
  const stopRecording = () => {
    onSend(`[Voice message - ${recordingTime} seconds]`, []);
    dispatch({ type: "stop-recording" });
  };
  const hasContent = input.trim() !== "" || files.length > 0;
  return (
    <LazyMotion features={domAnimation}>
      <PromptInput
        value={input}
        onValueChange={(value) => dispatch({ type: "set-input", value })}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        className={cn(
          "w-full bg-background border-input shadow-lg transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-300 ease-in-out",
          isRecording && "border-destructive/70",
          className,
        )}
        disabled={isLoading || isRecording}
        ref={ref || promptBoxRef}
        onDragOver={preventDragDefaults}
        onDragLeave={preventDragDefaults}
        onDrop={handleDrop}
      >
        <PromptAttachmentPreviews
          files={files}
          filePreviews={filePreviews}
          isRecording={isRecording}
          onPreview={openImageModal}
          onRemove={handleRemoveFile}
        />
        <div
          className={cn(
            "transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-300",
            isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100",
          )}
        >
          <PromptInputTextarea
            placeholder={
              showSearch
                ? "Search the web..."
                : showThink
                  ? "Think deeply..."
                  : showCanvas
                    ? "Create on canvas..."
                    : placeholder
            }
            className="text-base"
          />
        </div>
        {isRecording && <VoiceRecorder isRecording={isRecording} time={recordingTime} />}
        <PromptInputActions className="flex items-center justify-between gap-2 p-0 pt-2">
          <PromptModeActions
            uploadInputRef={uploadInputRef}
            isRecording={isRecording}
            modes={{ search: showSearch, think: showThink, canvas: showCanvas }}
            onToggleMode={handleToggleChange}
            onToggleCanvas={handleCanvasToggle}
            onProcessFile={processFile}
          />
          <PromptSubmitAction
            isLoading={isLoading}
            isRecording={isRecording}
            hasContent={hasContent}
            onActivate={() => {
              if (isRecording) stopRecording();
              else if (hasContent) handleSubmit();
              else startRecording();
            }}
          />
        </PromptInputActions>
      </PromptInput>
      <ImageViewDialog
        imageUrl={selectedImage}
        onClose={() => dispatch({ type: "set-selected-image", imageUrl: null })}
      />
    </LazyMotion>
  );
};
PromptInputBox.displayName = "PromptInputBox";
