"use client";

import { motion } from "framer-motion";
import type * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

export interface AssistedPasswordConfirmationProps {
  /** The original password to match against */
  password: string;
  /** Placeholder text for the confirmation input */
  placeholder?: string;
  /** Callback when password confirmation changes */
  onConfirmChange?: (value: string) => void;
  /** Callback when passwords match */
  onMatch?: () => void;
  /** Additional className for the container */
  className?: string;
  /** Whether to show the password hint */
  showHint?: boolean;
}

/**
 * AssistedPasswordConfirmation - Visual password confirmation with character-by-character feedback
 *
 * Shows real-time visual feedback as the user types their password confirmation.
 * Green highlights for matching characters, red for mismatches.
 *
 * @example
 * ```tsx
 * <AssistedPasswordConfirmation
 *   password={password}
 *   onMatch={() => setIsValid(true)}
 * />
 * ```
 */
export function AssistedPasswordConfirmation({
  password,
  placeholder = "Confirm Password",
  onConfirmChange,
  onMatch,
  className,
  showHint = true,
}: AssistedPasswordConfirmationProps) {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [shake, setShake] = useState(false);

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      confirmPassword.length >= password.length &&
      e.target.value.length > confirmPassword.length
    ) {
      setShake(true);
    } else {
      setConfirmPassword(e.target.value);
      onConfirmChange?.(e.target.value);
    }
  };

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    if (passwordsMatch && confirmPassword.length > 0) {
      onMatch?.();
    }
  }, [passwordsMatch, confirmPassword.length, onMatch]);

  const getLetterStatus = (letter: string, index: number) => {
    if (!confirmPassword[index]) return "";
    return confirmPassword[index] === letter ? "bg-emerald-500/20" : "bg-red-500/20";
  };

  const bounceAnimation = {
    x: shake ? [-10, 10, -10, 10, 0] : 0,
    transition: { duration: 0.5 },
  };

  const matchAnimation = {
    scale: passwordsMatch ? [1, 1.05, 1] : 1,
    transition: { duration: 0.3 },
  };

  const borderAnimation = {
    borderColor: passwordsMatch ? "hsl(var(--primary))" : "",
    transition: { duration: 0.3 },
  };

  return (
    <div className={cn("relative flex w-full flex-col items-start justify-center", className)}>
      {showHint && (
        <span className="text-sm font-semibold text-muted-foreground">→ {password}</span>
      )}
      <motion.div
        className="mb-3 mt-1 h-[52px] w-full rounded-[var(--radius-xl)] border-2 border-border bg-background px-2 py-2"
        animate={{
          ...bounceAnimation,
          ...matchAnimation,
          ...borderAnimation,
        }}
      >
        <div className="relative h-full w-fit overflow-hidden rounded-[var(--radius-lg)]">
          {/* Password dots display */}
          <div className="z-10 flex h-full items-center justify-center bg-transparent px-0 py-1 tracking-[0.15em]">
            {password.split("").map((_, index) => (
              <div key={index} className="flex h-full w-4 shrink-0 items-center justify-center">
                <span className="size-[5px] rounded-full bg-foreground" />
              </div>
            ))}
          </div>
          {/* Character match indicators */}
          <div
            className="absolute bottom-0 left-0 top-0 z-0 flex h-full w-full items-center justify-start"
            aria-hidden="true"
          >
            {password.split("").map((letter, index) => (
              <motion.div
                key={index}
                className={cn(
                  "absolute h-full w-4 transition-all duration-300 ease-out",
                  getLetterStatus(letter, index),
                )}
                style={{
                  left: `${index * 16}px`,
                  scaleX: confirmPassword[index] ? 1 : 0,
                  transformOrigin: "left",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="h-[52px] w-full overflow-hidden rounded-[var(--radius-xl)]"
        animate={matchAnimation}
      >
        <motion.input
          className="h-full w-full rounded-[var(--radius-xl)] border-2 border-border bg-background px-3.5 py-3 tracking-[0.4em] text-foreground outline-none placeholder:tracking-normal focus:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="password"
          placeholder={placeholder}
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          animate={borderAnimation}
          aria-label="Confirm password"
        />
      </motion.div>
    </div>
  );
}
