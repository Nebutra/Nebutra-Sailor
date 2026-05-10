"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  BrainCog,
  FolderCode,
  Globe,
  Mic,
  Paperclip,
  Square,
  StopCircle,
  X,
} from "lucide-react";
import Image from "next/image";
import React from "react";
import { Dialog, DialogContent, DialogTitle } from "../primitives/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../primitives/tooltip";

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");
// Embedded CSS for minimal custom styles
const styles = `
  *:focus-visible {
    outline-offset: 0 !important;
    --ring-offset: 0 !important;
  }
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-track {
    background: transparent;
  }
  textarea::-webkit-scrollbar-thumb {
    background-color: hsl(var(--border));
    border-radius: 3px;
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground));
  }
`;
// Inject styles into document
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground",
        className,
      )}
      ref={ref}
      rows={1}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-primary hover:bg-primary/90 text-primary-foreground",
      outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    };
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
// VoiceRecorder Component
interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (duration: number) => void;
  visualizerBars?: number;
}
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 32,
}) => {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  React.useEffect(() => {
    if (isRecording) {
      onStartRecording();
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      onStopRecording(time);
      setTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, time, onStartRecording, onStopRecording]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full transition-all duration-300 py-3",
        isRecording ? "opacity-100" : "opacity-0 h-0",
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-white/80">{formatTime(time)}</span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {[...Array(visualizerBars)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-white/50 animate-pulse"
            style={{
              height: `${Math.max(15, Math.random() * 100)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
// ImageViewDialog Component
interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}
const ImageViewDialog: React.FC<ImageViewDialogProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-background rounded-2xl overflow-hidden shadow-2xl"
        >
          <Image
            src={imageUrl}
            alt="Full preview"
            className="w-full max-h-[80vh] object-contain rounded-2xl"
            fill
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
// PromptInput Context and Components
interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: (() => void) | undefined;
  disabled?: boolean | undefined;
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});
function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) throw new Error("usePromptInput must be used within a PromptInput");
  return context;
}
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
}
const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
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
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };
    return (
      <TooltipProvider>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: value ?? internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled,
          }}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-drop zone uses div intentionally */}
          <div
            ref={ref}
            className={cn(
              "rounded-3xl border border-input bg-background p-2 shadow-lg transition-all duration-300",
              isLoading && "border-destructive/70",
              className,
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  },
);
PromptInput.displayName = "PromptInput";
interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}
const PromptInputTextarea: React.FC<
  PromptInputTextareaProps & React.ComponentProps<typeof Textarea>
> = ({ className, onKeyDown, disableAutosize = false, placeholder, ...props }) => {
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
      className={cn("text-base", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
};
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
// Custom Divider Component
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
// Main PromptInputBox Component
interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}
export const PromptInputBox = React.forwardRef(
  (props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
    const {
      onSend = () => {},
      isLoading = false,
      placeholder = "Type your message here...",
      className,
    } = props;
    const [input, setInput] = React.useState("");
    const [files, setFiles] = React.useState<File[]>([]);
    const [filePreviews, setFilePreviews] = React.useState<{ [key: string]: string }>({});
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
    const [isRecording, setIsRecording] = React.useState(false);
    const [showSearch, setShowSearch] = React.useState(false);
    const [showThink, setShowThink] = React.useState(false);
    const [showCanvas, setShowCanvas] = React.useState(false);
    const uploadInputRef = React.useRef<HTMLInputElement>(null);
    const promptBoxRef = React.useRef<HTMLDivElement>(null);
    const handleToggleChange = (value: string) => {
      if (value === "search") {
        setShowSearch((prev) => !prev);
        setShowThink(false);
      } else if (value === "think") {
        setShowThink((prev) => !prev);
        setShowSearch(false);
      }
    };
    const handleCanvasToggle = () => setShowCanvas((prev) => !prev);
    const isImageFile = React.useCallback((file: File) => file.type.startsWith("image/"), []);
    const processFile = React.useCallback(
      (file: File) => {
        if (!isImageFile(file)) {
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          return;
        }
        setFiles([file]);
        const reader = new FileReader();
        reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string });
        reader.readAsDataURL(file);
      },
      [isImageFile],
    );
    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);
    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);
    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter((file) => isImageFile(file));
        const firstFile = imageFiles[0];
        if (firstFile) processFile(firstFile);
      },
      [isImageFile, processFile],
    );
    const handleRemoveFile = (index: number) => {
      const fileToRemove = files[index];
      if (fileToRemove && filePreviews[fileToRemove.name]) {
        const newPreviews = { ...filePreviews };
        delete newPreviews[fileToRemove.name];
        setFilePreviews(newPreviews);
      }
      setFiles([]);
    };
    const openImageModal = (imageUrl: string) => setSelectedImage(imageUrl);
    const handlePaste = React.useCallback(
      (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item && item.type.indexOf("image") !== -1) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              processFile(file);
              break;
            }
          }
        }
      },
      [processFile],
    );
    React.useEffect(() => {
      document.addEventListener("paste", handlePaste);
      return () => document.removeEventListener("paste", handlePaste);
    }, [handlePaste]);
    const handleSubmit = () => {
      if (input.trim() || files.length > 0) {
        let messagePrefix = "";
        if (showSearch) messagePrefix = "[Search: ";
        else if (showThink) messagePrefix = "[Think: ";
        else if (showCanvas) messagePrefix = "[Canvas: ";
        const formattedInput = messagePrefix ? `${messagePrefix}${input}]` : input;
        onSend(formattedInput, files);
        setInput("");
        setFiles([]);
        setFilePreviews({});
      }
    };
    const handleStartRecording = () => {};
    const handleStopRecording = (duration: number) => {
      setIsRecording(false);
      onSend(`[Voice message - ${duration} seconds]`, []);
    };
    const hasContent = input.trim() !== "" || files.length > 0;
    return (
      <>
        <PromptInput
          value={input}
          onValueChange={setInput}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          className={cn(
            "w-full bg-background border-input shadow-lg transition-all duration-300 ease-in-out",
            isRecording && "border-destructive/70",
            className,
          )}
          disabled={isLoading || isRecording}
          ref={ref || promptBoxRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {files.length > 0 && !isRecording && (
            <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
              {files.map((file, index) => (
                <div key={index} className="relative group">
                  {file.type.startsWith("image/") && filePreviews[file.name] && (
                    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          const preview = filePreviews[file.name];
                          if (preview) openImageModal(preview);
                        }
                      }}
                      className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                      onClick={() => {
                        const preview = filePreviews[file.name];
                        if (preview) openImageModal(preview);
                      }}
                    >
                      <Image
                        src={filePreviews[file.name] ?? ""}
                        alt={file.name}
                        className="h-full w-full object-cover"
                        fill
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div
            className={cn(
              "transition-all duration-300",
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
          {isRecording && (
            <VoiceRecorder
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          )}
          <PromptInputActions className="flex items-center justify-between gap-2 p-0 pt-2">
            <div
              className={cn(
                "flex items-center gap-1 transition-opacity duration-300",
                isRecording ? "opacity-0 invisible h-0" : "opacity-100 visible",
              )}
            >
              <PromptInputAction tooltip="Upload image">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex h-8 w-8 text-muted-foreground cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
                  disabled={isRecording}
                >
                  <Paperclip className="h-5 w-5 transition-colors" />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processFile(file);
                      if (e.target) e.target.value = "";
                    }}
                    accept="image/*"
                  />
                </button>
              </PromptInputAction>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleToggleChange("search")}
                  className={cn(
                    "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                    showSearch
                      ? "bg-info/15 border-info text-info"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{ rotate: showSearch ? 360 : 0, scale: showSearch ? 1.1 : 1 }}
                      whileHover={{
                        rotate: showSearch ? 360 : 15,
                        scale: 1.1,
                        transition: { type: "spring", stiffness: 300, damping: 10 },
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    >
                      <Globe className={cn("w-4 h-4", showSearch ? "text-info" : "text-inherit")} />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showSearch && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs overflow-hidden whitespace-nowrap text-info flex-shrink-0"
                      >
                        Search
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <CustomDivider />
                <button
                  type="button"
                  onClick={() => handleToggleChange("think")}
                  className={cn(
                    "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                    showThink
                      ? "bg-indigo-500/15 border-indigo-500 text-indigo-500"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{ rotate: showThink ? 360 : 0, scale: showThink ? 1.1 : 1 }}
                      whileHover={{
                        rotate: showThink ? 360 : 15,
                        scale: 1.1,
                        transition: { type: "spring", stiffness: 300, damping: 10 },
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    >
                      <BrainCog
                        className={cn("w-4 h-4", showThink ? "text-indigo-500" : "text-inherit")}
                      />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showThink && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs overflow-hidden whitespace-nowrap text-indigo-500 flex-shrink-0"
                      >
                        Think
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <CustomDivider />
                <button
                  type="button"
                  onClick={handleCanvasToggle}
                  className={cn(
                    "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                    showCanvas
                      ? "bg-warning/15 border-warning text-warning"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{ rotate: showCanvas ? 360 : 0, scale: showCanvas ? 1.1 : 1 }}
                      whileHover={{
                        rotate: showCanvas ? 360 : 15,
                        scale: 1.1,
                        transition: { type: "spring", stiffness: 300, damping: 10 },
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    >
                      <FolderCode
                        className={cn("w-4 h-4", showCanvas ? "text-warning" : "text-inherit")}
                      />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showCanvas && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs overflow-hidden whitespace-nowrap text-warning flex-shrink-0"
                      >
                        Canvas
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
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
                  "h-8 w-8 rounded-full transition-all duration-200",
                  isRecording
                    ? "bg-transparent hover:bg-accent text-destructive hover:text-destructive/80"
                    : hasContent
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  if (isRecording) setIsRecording(false);
                  else if (hasContent) handleSubmit();
                  else setIsRecording(true);
                }}
                disabled={isLoading && !hasContent}
              >
                {isLoading ? (
                  <Square className="h-4 w-4 fill-primary-foreground animate-pulse" />
                ) : isRecording ? (
                  <StopCircle className="h-5 w-5 text-destructive" />
                ) : hasContent ? (
                  <ArrowUp className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Mic className="h-5 w-5 text-primary-foreground transition-colors" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
        <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </>
    );
  },
);
PromptInputBox.displayName = "PromptInputBox";
