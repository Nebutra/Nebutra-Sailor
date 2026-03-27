"use client";

import { Check, ImagePlus, Loader2, MessageSquarePlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCharacterLimit } from "@/hooks/use-character-limit";
import { useImageUpload } from "@/hooks/use-image-upload";

const RELATIONSHIPS = [
  { value: "friend", label: "Friend", labelZh: "朋友" },
  { value: "colleague", label: "Colleague", labelZh: "同事" },
  { value: "client", label: "Client", labelZh: "客户" },
  { value: "partner", label: "Partner", labelZh: "合作伙伴" },
  { value: "classmate", label: "Classmate", labelZh: "同学" },
  { value: "mentor", label: "Mentor", labelZh: "导师" },
  { value: "fan", label: "Fan", labelZh: "粉丝" },
  { value: "other", label: "Other", labelZh: "其他" },
] as const;

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed || "guest")}`;
}

interface EndorsementDialogProps {
  onSubmitted?: () => void;
}

export function EndorsementDialog({ onSubmitted }: EndorsementDialogProps) {
  const id = useId();
  const { data: session } = useSession();
  const { track } = useAnalytics();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nickname, setNickname] = useState("");
  const [relationship, setRelationship] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { value, characterCount, handleChange, maxLength } = useCharacterLimit({
    maxLength: 280,
  });

  const {
    previewUrl,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange: rawHandleFileChange,
  } = useImageUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    rawHandleFileChange(e);
    const file = e.target.files?.[0];
    if (file) setAvatarFile(file);
  };

  const isAuthenticated = Boolean(session?.user);
  const displayName = nickname || session?.user?.name || "";

  // Avatar priority: custom upload > OAuth image > DiceBear
  const profileImage =
    previewUrl ??
    (isAuthenticated ? (session?.user?.image ?? null) : null) ??
    dicebearUrl(displayName);

  // Clear pending close timer on unmount
  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  function resetForm() {
    setNickname("");
    setRelationship("");
    setCompany("");
    setTitle("");
    setAvatarFile(null);
    setSubmitted(false);
  }

  async function handleSubmit() {
    if (!value.trim() || !nickname.trim() || !relationship) return;

    setSubmitting(true);
    try {
      let avatarUrl: string | null = isAuthenticated ? (session?.user?.image ?? null) : null;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const uploadRes = await fetch("/api/guestbook/avatar", {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(30_000),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          avatarUrl = uploadData.url;
        }
      } else if (!avatarUrl) {
        // Fallback to DiceBear
        avatarUrl = dicebearUrl(nickname.trim());
      }

      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          message: value.trim(),
          nickname: nickname.trim(),
          relationship,
          company: company.trim() || undefined,
          title: title.trim() || undefined,
          avatar_url: avatarUrl,
        }),
      });

      if (res.ok) {
        track("guestbook_submitted", {
          relationship,
          authenticated: isAuthenticated,
          has_custom_avatar: Boolean(avatarFile),
        });
        setSubmitted(true);
        onSubmitted?.();
        closeTimerRef.current = setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:scale-[1.03] active:scale-[0.97] dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Leave an endorsement
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        {/* Gradient banner */}
        <div
          className="px-6 py-4 h-28"
          style={{
            background: "linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 50%, #fef3c7 100%)",
          }}
        />

        {/* Avatar */}
        <div className="-mt-12 flex justify-center">
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-900 shadow-lg">
              <AvatarImage src={profileImage ?? undefined} alt="Profile" />
              <AvatarFallback className="text-lg font-serif italic">
                {displayName.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={handleThumbnailClick}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label="Change avatar"
            >
              <ImagePlus size={14} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
          </div>
        </div>

        <DialogTitle className="sr-only">Leave an endorsement</DialogTitle>
        <DialogDescription className="sr-only">
          Share your experience working with Tseka Luk
        </DialogDescription>

        {submitted ? (
          <div className="px-6 pb-8 pt-4 flex flex-col items-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">
              {isAuthenticated ? "Published!" : "Submitted for review!"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isAuthenticated
                ? "Your endorsement is now live."
                : "It'll appear once approved. Thanks for taking the time."}
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`${id}-nickname`}>
                    Nickname
                    {!isAuthenticated && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  <Input
                    id={`${id}-nickname`}
                    placeholder={
                      isAuthenticated ? (session?.user?.name ?? "Your name") : "Your name"
                    }
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`${id}-relationship`}>Relationship</Label>
                  <select
                    id={`${id}-relationship`}
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white shadow-sm focus-visible:border-gray-400 dark:focus-visible:border-gray-500 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gray-200/50 dark:focus-visible:ring-gray-700/50"
                  >
                    <option value="">Select...</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} / {r.labelZh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`${id}-company`}>
                    Company/Organization{" "}
                    <span className="text-xs text-gray-500 font-normal ml-1">(Optional)</span>
                  </Label>
                  <Input
                    id={`${id}-company`}
                    placeholder="E.g. Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`${id}-title`}>
                    Title/Profession{" "}
                    <span className="text-xs text-gray-500 font-normal ml-1">(Optional)</span>
                  </Label>
                  <Input
                    id={`${id}-title`}
                    placeholder="E.g. Product Manager"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${id}-message`}>Message</Label>
                <Textarea
                  id={`${id}-message`}
                  placeholder="Share your experience..."
                  value={value}
                  onChange={handleChange}
                  maxLength={maxLength}
                  rows={3}
                />
                <p className="text-xs text-gray-400 text-right">
                  {maxLength - characterCount} characters left
                </p>
              </div>

              {!isAuthenticated && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Anonymous submissions are reviewed before appearing publicly.
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-gray-100 dark:border-gray-800 px-6 py-4">
              <DialogClose asChild>
                <button
                  type="button"
                  className="rounded-full border border-gray-200 dark:border-gray-700 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !value.trim() || !nickname.trim() || !relationship}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isAuthenticated ? "Submit" : "Submit for review"}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
