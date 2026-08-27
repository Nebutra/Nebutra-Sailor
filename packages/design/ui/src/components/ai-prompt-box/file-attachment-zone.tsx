"use client";

import { Cross as X } from "@nebutra/icons";
import Image from "next/image";
import type React from "react";
import { Dialog, DialogContent, DialogTitle } from "../../primitives/dialog";
import { m, useReducedMotion } from "../../shared/animation/motion";

export const isImageFile = (file: File) => file.type.startsWith("image/");

export const getFilePreviewKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export const preventDragDefaults = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

// ImageViewDialog Component
export interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewDialog: React.FC<ImageViewDialogProps> = ({ imageUrl, onClose }) => {
  const shouldReduceMotion = useReducedMotion();

  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <m.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, ...(shouldReduceMotion ? {} : { scale: 1 }) }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
          className="relative bg-background rounded-[var(--radius-2xl)] overflow-hidden shadow-2xl"
        >
          <Image
            src={imageUrl}
            alt="Full preview"
            className="w-full max-h-[80vh] object-contain rounded-[var(--radius-2xl)]"
            fill
            sizes="(max-width: 768px) 90vw, 800px"
          />
        </m.div>
      </DialogContent>
    </Dialog>
  );
};
ImageViewDialog.displayName = "ImageViewDialog";

// PromptAttachmentPreviews Component
export type PromptAttachmentPreviewsProps = {
  files: File[];
  filePreviews: Record<string, string>;
  isRecording: boolean;
  onPreview: (imageUrl: string) => void;
  onRemove: (file: File) => void;
};

export function PromptAttachmentPreviews({
  files,
  filePreviews,
  isRecording,
  onPreview,
  onRemove,
}: PromptAttachmentPreviewsProps) {
  if (files.length === 0 || isRecording) return null;

  return (
    <div className="flex flex-wrap gap-2 p-0 pb-1 transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-300 motion-reduce:transition-none">
      {files.map((file) => {
        const previewKey = getFilePreviewKey(file);
        const preview = filePreviews[previewKey];
        return (
          <div key={previewKey} className="relative group h-16 w-16">
            {isImageFile(file) && preview && (
              <>
                <button
                  type="button"
                  aria-label={`Preview ${file.name}`}
                  className="relative h-16 w-16 rounded-[var(--radius-xl)] overflow-hidden cursor-pointer transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-300 motion-reduce:transition-none"
                  onClick={() => onPreview(preview)}
                >
                  <Image
                    src={preview}
                    alt={file.name}
                    className="h-full w-full object-cover"
                    fill
                    sizes="64px"
                  />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(file);
                  }}
                  className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 opacity-100 transition-opacity motion-reduce:transition-none"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
