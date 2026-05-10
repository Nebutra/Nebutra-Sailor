"use client";

import { motion, type Variants } from "framer-motion";
import { CheckCircle2, PlayCircle } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "../primitives/dialog";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface ChecklistItem {
  /** Unique identifier for the item */
  id: number | string;
  /** Main text content */
  text: string;
  /** Optional helper text displayed below */
  helperText?: string;
  /** Optional link displayed after helper text */
  helperLink?: {
    href: string;
    text: string;
  };
}

export interface OnboardingChecklistProps {
  /** Main heading for the checklist */
  title: string;
  /** Description displayed below the title */
  description: string;
  /** Array of checklist items to display */
  items: ChecklistItem[];
  /** URL for the video thumbnail image */
  videoThumbnailUrl: string;
  /** Embed URL for the video (YouTube, Vimeo, etc.) */
  videoUrl: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Animation Variants
// =============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * OnboardingChecklist - Animated checklist with video guide
 *
 * @description
 * A responsive onboarding component that displays a checklist of items
 * alongside a video thumbnail that opens in a modal dialog.
 *
 * @example Basic usage
 * ```tsx
 * <OnboardingChecklist
 *   title="Get Started"
 *   description="Complete these steps to set up your account"
 *   items={[
 *     { id: 1, text: "Create your profile" },
 *     { id: 2, text: "Add your first project" },
 *     {
 *       id: 3,
 *       text: "Invite team members",
 *       helperText: "Need help?",
 *       helperLink: { href: "/docs", text: "Read the guide" }
 *     },
 *   ]}
 *   videoThumbnailUrl="https://example.com/thumbnail.jpg"
 *   videoUrl="https://youtube.com/embed/xxx"
 * />
 * ```
 */
export function OnboardingChecklist({
  title,
  description,
  items,
  videoThumbnailUrl,
  videoUrl,
  className,
}: OnboardingChecklistProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={cn(
        "w-full max-w-4xl mx-auto bg-card text-card-foreground border rounded-[var(--radius-2xl)] shadow-sm p-8 overflow-hidden",
        className,
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Side: Title and Checklist */}
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {items.map((item) => (
              <motion.li key={item.id} variants={itemVariants} className="flex flex-col">
                <div className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="ml-3 text-sm font-medium">{item.text}</span>
                </div>
                {item.helperText && item.helperLink && (
                  <div className="ml-8 mt-1 text-xs text-muted-foreground">
                    {item.helperText}{" "}
                    <a
                      href={item.helperLink.href}
                      className="text-primary underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-[var(--radius-sm)]"
                    >
                      {item.helperLink.text}
                    </a>
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Right Side: Video Thumbnail */}
        <motion.div
          variants={itemVariants}
          className="relative group rounded-[var(--radius-lg)] overflow-hidden cursor-pointer w-full aspect-video"
        >
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="w-full h-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-[var(--radius-lg)]"
              >
                <Image
                  src={videoThumbnailUrl}
                  alt="Video guide thumbnail"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  fill
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <PlayCircle className="h-16 w-16 text-white/80 transform transition-all duration-300 group-hover:scale-110 group-hover:text-white" />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 border-0">
              <div className="aspect-video">
                <iframe
                  src={videoUrl}
                  title="Onboarding Video Guide"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-[var(--radius-lg)]"
                />
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </motion.div>
  );
}
