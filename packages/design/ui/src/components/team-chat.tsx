"use client";

import { Check, CheckCheck, MoreHorizontal, Send, SmilePlus, Users } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useState } from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface ChatSender {
  /** Display name */
  name: string;
  /** Avatar URL */
  avatar: string;
  /** Online status */
  isOnline: boolean;
}

export interface ChatReaction {
  /** Emoji character */
  emoji: string;
  /** Number of reactions */
  count: number;
  /** Whether current user has reacted */
  reacted: boolean;
}

export interface ChatMessage {
  /** Unique message identifier */
  id: string;
  /** Message text content */
  content: string;
  /** Sender information */
  sender: ChatSender;
  /** Display timestamp */
  timestamp: string;
  /** Delivery status */
  status: "sent" | "delivered" | "read";
  /** Optional reactions */
  reactions?: ChatReaction[];
}

export interface TeamChatProps {
  /** Chat/channel name */
  chatName: string;
  /** Optional tagline under the name */
  tagline?: string;
  /** Array of messages to display */
  messages: ChatMessage[];
  /** Placeholder text for input */
  inputPlaceholder?: string;
  /** Callback when send button clicked */
  onSendMessage?: (message: string) => void;
  /** Callback when reaction clicked */
  onReactionClick?: (messageId: string, emoji: string) => void;
  /** Callback when more options clicked */
  onMoreOptions?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

interface AvatarProps {
  src: string;
  alt: string;
  isOnline?: boolean;
  size?: "sm" | "md";
}

function Avatar({ src, alt, isOnline, size = "md" }: AvatarProps) {
  const sizeClasses = size === "sm" ? "w-10 h-10" : "w-10 h-10";

  return (
    <div className="relative">
      <Image
        src={src}
        alt={alt}
        className={cn(
          sizeClasses,
          "rounded-full ring-1 ring-gray-400 dark:ring-gray-600 object-cover",
        )}
        width={400}
        height={400}
      />
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-black",
            isOnline ? "bg-green-500" : "bg-[var(--neutral-8)]",
          )}
        />
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * TeamChat - Team messaging interface with participant sidebar
 *
 * @description
 * A full-featured team chat UI component with participant list,
 * message display with reactions, and message input.
 *
 * @example
 * ```tsx
 * <TeamChat
 *   chatName="Engineering Team"
 *   tagline="Ship fast, ship often"
 *   messages={[
 *     {
 *       id: "1",
 *       content: "Hey team! Ready for standup?",
 *       sender: { name: "Alice", avatar: "/alice.jpg", isOnline: true },
 *       timestamp: "10:00 AM",
 *       status: "read",
 *     },
 *   ]}
 *   onSendMessage={(msg) => console.log(msg)}
 * />
 * ```
 */
export function TeamChat({
  chatName,
  tagline = "Collaborate creatively, deliver clearly.",
  messages,
  inputPlaceholder = "Write your message...",
  onSendMessage,
  onReactionClick,
  onMoreOptions,
  className,
}: TeamChatProps) {
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Get unique senders from messages
  const uniqueSenders = Array.from(
    new Map(messages.map((m) => [m.sender.name, m.sender])).values(),
  );

  // Filter messages by selected sender or show all
  const filteredMessages = selectedSender
    ? messages.filter((m) => m.sender.name === selectedSender)
    : messages;

  const handleSend = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-5xl mx-auto p-6 bg-white dark:bg-black rounded-[var(--radius-3xl)] shadow-lg flex flex-col h-[550px] border border-[var(--neutral-7)]",
        className,
      )}
    >
      {/* Header */}
      <header className="flex justify-between items-center border-b border-[var(--neutral-7)] pb-3 mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-black dark:text-white" />
          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-white">{chatName}</h2>
            {tagline && <p className="italic text-sm text-[var(--neutral-10)]">{tagline}</p>}
          </div>
        </div>
        <button
          type="button"
          aria-label="More options"
          onClick={onMoreOptions}
          className="p-2 rounded-[var(--radius-lg)] hover:bg-[var(--neutral-3)] transition"
        >
          <MoreHorizontal className="w-6 h-6 text-[var(--neutral-10)]" />
        </button>
      </header>

      {/* Body */}
      <main className="flex flex-1 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--neutral-7)]">
        {/* Participants List */}
        <aside className="w-56 bg-[var(--neutral-2)] border-r border-[var(--neutral-7)] p-4 overflow-y-auto">
          {uniqueSenders.map((sender) => {
            const isSelected = selectedSender === sender.name;
            return (
              <button
                type="button"
                key={sender.name}
                onClick={() => setSelectedSender(isSelected ? null : sender.name)}
                className={cn(
                  "flex items-center gap-3 w-full p-3 mb-3 rounded-[var(--radius-lg)] transition-colors",
                  isSelected
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "hover:bg-[var(--neutral-4)] text-[var(--neutral-12)]",
                )}
              >
                <Avatar src={sender.avatar} alt={sender.name} isOnline={sender.isOnline} />
                <span className="text-left font-medium truncate">{sender.name}</span>
              </button>
            );
          })}
        </aside>

        {/* Messages */}
        <section className="flex-1 p-6 overflow-y-auto bg-white dark:bg-black">
          {filteredMessages.length === 0 ? (
            <p className="text-center text-[var(--neutral-9)]">No messages to display.</p>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className="mb-6 last:mb-0 group border-b border-[var(--neutral-6)] pb-4"
              >
                <div className="flex items-center gap-4 mb-2">
                  <Avatar src={message.sender.avatar} alt={message.sender.name} />
                  <div>
                    <p className="font-semibold text-black dark:text-white">
                      {message.sender.name}
                    </p>
                    <span className="text-xs text-[var(--neutral-9)]">{message.timestamp}</span>
                  </div>
                </div>
                <p className="text-[var(--neutral-12)] text-lg mb-1">{message.content}</p>
                <div className="flex items-center justify-between text-sm text-[var(--neutral-10)]">
                  <div className="flex items-center gap-1">
                    {message.status === "read" && <CheckCheck className="w-5 h-5 text-green-500" />}
                    {message.status === "delivered" && <Check className="w-5 h-5" />}
                    <span>{message.timestamp}</span>
                  </div>
                  <div className="flex gap-2">
                    {message.reactions?.map((reaction) => (
                      <button
                        type="button"
                        key={reaction.emoji}
                        onClick={() => onReactionClick?.(message.id, reaction.emoji)}
                        className={cn(
                          "px-2 py-1 rounded-[var(--radius-md)] text-sm transition-colors",
                          reaction.reacted
                            ? "bg-[var(--neutral-5)] text-black dark:text-white"
                            : "bg-[var(--neutral-3)] text-[var(--neutral-11)]",
                          "hover:bg-[var(--neutral-4)]",
                        )}
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-6 flex items-center gap-4 border-t border-[var(--neutral-7)] pt-4">
        <button
          type="button"
          aria-label="Add emoji"
          className="p-3 rounded-full bg-[var(--neutral-3)] hover:bg-[var(--neutral-4)] transition"
        >
          <SmilePlus className="w-6 h-6 text-[var(--neutral-10)]" />
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          className={cn(
            "flex-1 px-5 py-3 rounded-full border border-[var(--neutral-7)]",
            "bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition",
          )}
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={handleSend}
          className="p-3 rounded-full bg-black dark:bg-white text-white dark:text-black hover:brightness-90 transition"
        >
          <Send className="w-6 h-6" />
        </button>
      </footer>
    </div>
  );
}
