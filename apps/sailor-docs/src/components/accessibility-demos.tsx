"use client";

import {
  ariaPatterns,
  Button,
  Checkbox,
  contrastRequirements,
  focusRing,
  Input,
  Label,
  minTouchTarget,
  prefersReducedMotion,
  skipLinkStyle,
  visuallyHidden,
} from "@nebutra/ui/primitives";
import { AlertCircle, CheckCircle as CheckCircleIcon, Loader2, X, XCircle } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { ComponentPreview } from "@/components/component-preview";

export function VisuallyHiddenDemo() {
  const [count, setCount] = useState(0);

  return (
    <ComponentPreview>
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-fd-muted-foreground text-center max-w-[400px]">
          The button below contains visually hidden text for screen readers using the{" "}
          <code className="text-xs">visuallyHidden</code> style object. Inspect the DOM to see it.
        </p>
        <Button onClick={() => setCount((c) => c + 1)} className="gap-2">
          <span>Increment</span>
          <span style={visuallyHidden}>Current count is {count}. Click to add 1.</span>
          <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">{count}</span>
        </Button>
      </div>
    </ComponentPreview>
  );
}

export function FocusRingDemo() {
  return (
    <ComponentPreview>
      <div className="flex flex-col items-center gap-6">
        <p className="text-sm text-fd-muted-foreground text-center">
          Standard interactive elements get this focus ring via{" "}
          <code className="text-xs">&:focus-visible</code>. Use tab to navigate between these
          elements.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Button variant="outline">Tab to me</Button>
          <Input placeholder="Tab to me" className="max-w-[200px]" />
          <div className="flex items-center gap-2">
            <Checkbox>Focus me</Checkbox>
          </div>
          <button
            type="button"
            className="rounded-md border border-fd-border p-3 text-sm focus:outline-none"
            style={focusRing as React.CSSProperties}
          >
            Custom element (Tab to me)
          </button>
        </div>
      </div>
    </ComponentPreview>
  );
}

export function AriaPatternsDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle loading simulation
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <ComponentPreview>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <div className="flex flex-col gap-3 p-4 border border-fd-border rounded-lg bg-fd-card">
          <div className="font-medium text-sm">Loading State</div>
          <p className="text-xs text-fd-muted-foreground mb-2">
            Uses <code className="text-xs">ariaPatterns.loading</code>
          </p>
          <Button
            onClick={() => setIsLoading(true)}
            disabled={isLoading}
            className="w-full"
            {...(isLoading ? ariaPatterns.loading : {})}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing (Wait 2s)
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        <div className="flex flex-col gap-3 p-4 border border-fd-border rounded-lg bg-fd-card">
          <div className="font-medium text-sm">Expandable Section</div>
          <p className="text-xs text-fd-muted-foreground mb-2">
            Uses <code className="text-xs">ariaPatterns.expandable</code>
          </p>
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            {...ariaPatterns.expandable(isExpanded)}
            className="w-full justify-between"
          >
            Show Details
            <span className="text-xs text-fd-muted-foreground bg-fd-muted px-2 py-0.5 rounded">
              aria-expanded="{isExpanded.toString()}"
            </span>
          </Button>
          {isExpanded && (
            <div className="p-3 bg-fd-muted/50 rounded-md text-sm text-fd-muted-foreground animate-in slide-in-from-top-2 fade-in">
              Screen readers know this is tied to the button above.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4 border border-fd-border rounded-lg bg-fd-card">
          <div className="font-medium text-sm">Invalid State</div>
          <p className="text-xs text-fd-muted-foreground mb-2">
            Uses <code className="text-xs">ariaPatterns.invalid</code>
          </p>
          <Input
            defaultValue="wrong-email@"
            className="border-red-500 focus-visible:ring-red-500"
            {...ariaPatterns.invalid("Please enter a valid email address")}
            {...ariaPatterns.required}
          />
          <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Please enter a valid email address
          </div>
        </div>
      </div>
    </ComponentPreview>
  );
}

export function MinTouchTargetDemo() {
  return (
    <ComponentPreview>
      <div className="flex flex-col items-center gap-8 text-center">
        <p className="text-sm text-fd-muted-foreground max-w-[400px]">
          The icon is small (16x16), but the clickable area meets the WCAG 2.5.5 requirement of at
          least 44x44 pixels using <code className="text-xs">minTouchTarget</code>.
        </p>

        <div className="flex flex-col sm:flex-row gap-12 sm:gap-24 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="text-sm font-medium">With minTouchTarget (Correct)</span>
            <div className="relative border border-dashed border-green-500/50 rounded-md bg-green-500/10 p-4">
              {/* This represents the touch area visually */}
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-green-600 font-medium opacity-50">
                44x44
              </div>

              <button
                type="button"
                className="flex items-center justify-center hover:bg-fd-accent rounded-md transition-colors relative z-10 mx-auto"
                style={minTouchTarget}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <span className="text-sm font-medium">Without minTouchTarget (Wrong)</span>
            <div className="relative border border-dashed border-red-500/50 rounded-md bg-red-500/10 p-4">
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-600 font-medium opacity-50">
                16x16
              </div>

              <button
                type="button"
                className="flex items-center justify-center hover:bg-fd-accent rounded-md transition-colors relative z-10 mx-auto"
                aria-label="Close"
                // No minTouchTarget style applied
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ComponentPreview>
  );
}

export function PrefersReducedMotionDemo() {
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState(true);

  // In a real app we'd just use prefersReducedMotion(), but we mock it here to demo it
  useEffect(() => {
    setReduceMotion(prefersReducedMotion());
  }, []);

  return (
    <ComponentPreview>
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        <div className="flex items-center justify-between w-full p-4 border border-fd-border rounded-lg bg-fd-card">
          <div className="flex flex-col gap-1">
            <Label htmlFor="mock-reduced-motion" className="font-medium">
              Simulate Reduced Motion
            </Label>
            <span className="text-xs text-fd-muted-foreground">
              Usually read from OS preference
            </span>
          </div>
          <Checkbox checked={reduceMotion} onChange={setReduceMotion} />
        </div>

        <div className="w-full h-32 flex items-center justify-center border border-dashed border-fd-border rounded-lg relative overflow-hidden bg-fd-muted/30">
          <div
            className="w-12 h-12 bg-primary rounded-full absolute"
            style={{
              transition: reduceMotion ? "none" : "transform 2s ease-in-out",
              transform: isAnimating ? "translateX(100px)" : "translateX(-100px)",
            }}
          />
        </div>

        <p className="text-sm text-fd-muted-foreground text-center">
          When reduced motion is active, CSS transitions and long animations are instantly skipped.
          Try toggling the switch above and see the ball.
        </p>

        <Button variant="outline" onClick={() => setIsAnimating(!isAnimating)}>
          Trigger Animation
        </Button>
      </div>
    </ComponentPreview>
  );
}

export function ContrastRequirementsDemo() {
  return (
    <ComponentPreview>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <div className="flex flex-col gap-4">
          <div className="text-sm font-medium">
            Normal Text (WCAG AA: {contrastRequirements.normalText}:1)
          </div>
          <div className="flex flex-col rounded-lg overflow-hidden border border-fd-border">
            <div className="p-4 bg-white text-slate-800 flex justify-between items-center">
              <span className="text-sm">Pass (8.5:1)</span>
              <CheckCircleIcon />
            </div>
            <div className="p-4 bg-white text-slate-400 flex justify-between items-center bg-stripes-red">
              <span className="text-sm">Fail (2.8:1)</span>
              <XCircle className="text-red-600 w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-sm font-medium">
            Large Text (WCAG AA: {contrastRequirements.largeText}:1)
          </div>
          <div className="flex flex-col rounded-lg overflow-hidden border border-fd-border">
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <span className="text-xl font-bold">Pass (4.8:1)</span>
              <CheckCircleIcon className="text-white" />
            </div>
            <div className="p-4 bg-blue-400 text-white flex justify-between items-center bg-stripes-red">
              <span className="text-xl font-bold">Fail (2.5:1)</span>
              <XCircle className="text-red-900 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </ComponentPreview>
  );
}

export function SkipLinkStyleDemo() {
  return (
    <ComponentPreview>
      <div className="flex flex-col items-center gap-6 text-center w-full relative min-h-[150px]">
        <p className="text-sm text-fd-muted-foreground w-full max-w-lg mb-4">
          The skip link is visually hidden but appears when it receives keyboard focus. Click the
          area below, then press Tab.
        </p>
        <div
          className="w-full h-[150px] border border-dashed border-fd-border rounded-lg bg-fd-muted/30 relative flex items-center justify-center p-4 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all overflow-hidden"
          role="tabpanel"
          aria-label="Skip link demo container"
        >
          <span className="text-xs text-fd-muted-foreground absolute bottom-4">
            Interactive Area Container
          </span>
          <a
            href="#main-content-demo"
            style={skipLinkStyle as React.CSSProperties}
            className="rounded-md bg-fd-background shadow-md border border-fd-border"
          >
            Skip to main content
          </a>

          <button
            type="button"
            className="opacity-0 focus:opacity-100 absolute bottom-4 right-4 text-xs underline"
          >
            Next focusable element
          </button>
        </div>
      </div>
    </ComponentPreview>
  );
}
