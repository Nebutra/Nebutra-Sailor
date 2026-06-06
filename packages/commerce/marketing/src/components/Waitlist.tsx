"use client";

import { Input } from "@nebutra/ui/primitives";
import Image from "next/image";
import type React from "react";
import { useState } from "react";

export interface WaitlistProps {
  title?: string;
  description?: string;
  buttonText?: string;
  placeholder?: string;
  socialProofCount?: number;
  loadingText?: string;
  successText?: string;
  successMessage?: string;
  socialProofPrefix?: string;
  socialProofSuffix?: string;
}

export function Waitlist({
  title = "Join the waitlist",
  description = "Leave an email and we will send the launch note when it is ready.",
  buttonText = "Join the list",
  placeholder = "name@example.com",
  socialProofCount = 1205,
  loadingText = "Joining...",
  successText = "Joined",
  successMessage = "You're on the list. We'll be in touch soon.",
  socialProofPrefix = "Join",
  socialProofSuffix = "others on the list",
}: WaitlistProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    // Fake simulation of API request
    setTimeout(() => {
      setStatus("success");
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-lg text-center font-sans">
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        {title}
      </h2>
      <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">{description}</p>

      <form onSubmit={handleSubmit} className="mt-8 sm:flex sm:max-w-md sm:mx-auto">
        <label htmlFor="email-address" className="sr-only">
          Email address
        </label>
        <Input
          type="email"
          name="email-address"
          id="email-address"
          autoComplete="email"
          required
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status !== "idle"}
        />
        <div className="mt-3 rounded-md sm:mt-0 sm:ml-3 sm:flex-shrink-0">
          <button
            type="submit"
            disabled={status !== "idle"}
            className="flex w-full items-center justify-center rounded-lg border border-transparent bg-blue-600 px-5 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-75 sm:w-auto"
          >
            {status === "loading" ? loadingText : status === "success" ? successText : buttonText}
          </button>
        </div>
      </form>

      {status === "success" && (
        <p className="mt-3 text-sm text-green-600 dark:text-green-400">{successMessage}</p>
      )}

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex -space-x-2">
          {/* Fake avatars for FOMO */}
          {[...Array(4)].map((_, i) => (
            <Image
              key={i}
              className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900"
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=e2e8f0`}
              alt="Avatar"
              width={32}
              height={32}
            />
          ))}
        </div>
        <p>
          {socialProofPrefix}{" "}
          <strong className="text-slate-900 dark:text-white">
            {socialProofCount.toLocaleString()}+
          </strong>{" "}
          {socialProofSuffix}
        </p>
      </div>
    </div>
  );
}
