"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { AtSignIcon, ChevronLeftIcon, GithubIcon, Loader2, Sailboat } from "lucide-react";
import React from "react";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { cn } from "../utils/cn";

// Google Icon SVG component
const GoogleIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
  </svg>
);

// Hugging Face Icon SVG component
const HuggingFaceIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 120"
    fill="currentColor"
    {...props}
  >
    <path d="M60.07 8C28.59 8 3.07 33.52 3.07 65s25.52 57 57 57 57-25.52 57-57-25.52-57-57-57zm0 106c-27.02 0-49-21.98-49-49s21.98-49 49-49 49 21.98 49 49-21.98 49-49 49z" />
    <circle cx="40" cy="55" r="8" />
    <circle cx="80" cy="55" r="8" />
    <path d="M60 95c-16.57 0-30-8.95-30-20h10c0 5.52 8.95 10 20 10s20-4.48 20-10h10c0 11.05-13.43 20-30 20z" />
  </svg>
);

// Decorative floating paths component (artistic element - exempt from Primer)
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-foreground/10"
        viewBox="0 0 696 316"
        fill="none"
        aria-hidden="true"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// Visual separator component
const AuthSeparator = () => {
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA headless structure
    // biome-ignore lint/a11y/useFocusableInteractive: Visual separator
    // biome-ignore lint/a11y/useAriaPropsForRole: Visual separator
    <div className="flex w-full items-center justify-center" role="separator">
      <div className="bg-border h-px w-full" />
      <span className="text-muted-foreground px-2 text-xs">OR</span>
      <div className="bg-border h-px w-full" />
    </div>
  );
};

export interface AuthPageProps {
  /** Brand name displayed in header */
  brandName?: string;
  /** Brand icon component */
  brandIcon?: React.ReactNode;
  /** Testimonial quote */
  testimonialQuote?: string;
  /** Testimonial author */
  testimonialAuthor?: string;
  /** Page title */
  title?: string;
  /** Page subtitle */
  subtitle?: string;
  /** Home link URL */
  homeHref?: string;
  /** Terms of service URL */
  termsHref?: string;
  /** Privacy policy URL */
  privacyHref?: string;
  /** Show Google auth button */
  showGoogle?: boolean;
  /** Show GitHub auth button */
  showGithub?: boolean;
  /** Show Hugging Face auth button */
  showHuggingFace?: boolean;
  /** Redirect URL after successful sign in */
  redirectUrl?: string;
  /** Additional className */
  className?: string;
}

export function AuthPage({
  brandName = "Nebutra",
  brandIcon = <Sailboat className="size-6" />,
  testimonialQuote = "Nebutra Sailor helped us ship our SaaS 5x faster. The monorepo architecture and pre-built integrations saved months of development time.",
  testimonialAuthor = "Alex Chen, CTO at TechCorp",
  title = "Sign In or Get Started",
  subtitle = "Login or create your Nebutra account.",
  homeHref = "/",
  termsHref = "/terms",
  privacyHref = "/privacy",
  showGoogle = true,
  showGithub = true,
  showHuggingFace = true,
  redirectUrl = "/dashboard",
  className,
}: AuthPageProps) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // OAuth sign in handler
  const handleOAuthSignIn = async (
    provider: "oauth_google" | "oauth_github" | "oauth_huggingface",
  ) => {
    setIsLoading(provider);
    setError(null);

    try {
      const { error: ssoError } = await signIn.sso({
        strategy: provider,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: redirectUrl,
      });
      if (ssoError) {
        setError("Authentication failed. Please try again.");
        setIsLoading(null);
      }
    } catch {
      setError("Authentication failed. Please try again.");
      setIsLoading(null);
    }
  };

  // Email magic link handler
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading("email");
    setError(null);

    try {
      // Try to sign in with email link
      const { error: createError } = await signIn.create({ identifier: email });

      if (!createError && signIn.status === "needs_first_factor") {
        // User exists, send magic link
        const { error: linkError } = await signIn.emailLink.sendLink({
          verificationUrl: `${window.location.origin}/sso-callback?redirect_url=${redirectUrl}`,
        });
        if (linkError) {
          setError("Failed to send sign-in link. Please try again.");
        } else {
          setError("Check your email for the sign-in link!");
        }
      } else if (createError) {
        // User doesn't exist, create account
        const { error: signUpError } = await signUp.create({ emailAddress: email });
        if (!signUpError) {
          const { error: verifyError } = await signUp.verifications.sendEmailLink({
            verificationUrl: `${window.location.origin}/sso-callback?redirect_url=${redirectUrl}`,
          });
          if (verifyError) {
            setError("Failed to send verification email. Please try again.");
          } else {
            setError("Check your email to verify your account!");
          }
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <main
      className={cn("relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2", className)}
    >
      {/* Left Panel - Testimonial with decorative background */}
      <div className="bg-muted/60 relative hidden h-full flex-col border-r border-border p-10 lg:flex">
        {/* Gradient overlay */}
        <div
          className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent"
          aria-hidden="true"
        />

        {/* Brand */}
        <div className="z-10 flex items-center gap-2">
          {brandIcon}
          <p className="text-xl font-semibold">{brandName}</p>
        </div>

        {/* Testimonial */}
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">&ldquo;{testimonialQuote}&rdquo;</p>
            <footer className="font-mono text-sm font-semibold">~ {testimonialAuthor}</footer>
          </blockquote>
        </div>

        {/* Decorative floating paths (artistic element - exempt from Primer) */}
        <div className="absolute inset-0" aria-hidden="true">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="relative flex min-h-screen flex-col justify-center p-4">
        {/* Background decoration (artistic element) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 isolate contain-strict -z-10 opacity-60"
        >
          <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsl(var(--foreground)/0.06)_0,hsla(0,0%,55%,0.02)_50%,hsl(var(--foreground)/0.01)_80%)] absolute top-0 right-0 h-80 w-36 -translate-y-20 rounded-full" />
          <div className="bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--foreground)/0.04)_0,hsl(var(--foreground)/0.01)_80%,transparent_100%)] absolute top-0 right-0 h-80 w-16 translate-x-[5%] -translate-y-1/2 rounded-full" />
          <div className="bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--foreground)/0.04)_0,hsl(var(--foreground)/0.01)_80%,transparent_100%)] absolute top-0 right-0 h-80 w-16 -translate-y-20 rounded-full" />
        </div>

        {/* Back to Home button */}
        <Button variant="ghost" className="absolute top-7 left-5" asChild>
          <a href={homeHref} aria-label="Back to home page">
            <ChevronLeftIcon className="size-4 me-2" />
            Home
          </a>
        </Button>

        {/* Auth Form Container */}
        <div className="mx-auto space-y-4 w-full max-w-sm">
          {/* Mobile Brand (hidden on desktop) */}
          <div className="flex items-center gap-2 lg:hidden">
            {brandIcon}
            <p className="text-xl font-semibold">{brandName}</p>
          </div>

          {/* Title */}
          <div className="flex flex-col space-y-1">
            <h1 className="text-2xl font-bold tracking-wide">{title}</h1>
            <p className="text-muted-foreground text-base">{subtitle}</p>
          </div>

          {/* Error/Success Message */}
          {error && (
            <div
              className={cn(
                "text-sm p-3 rounded-[var(--radius-md)]",
                error.includes("Check your email")
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-destructive/10 text-destructive",
              )}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          {/* biome-ignore lint/a11y/useSemanticElements: ARIA headless structure */}
          <div className="space-y-2" role="group" aria-label="Social login options">
            {showGoogle && (
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => handleOAuthSignIn("oauth_google")}
                disabled={isLoading !== null}
              >
                {isLoading === "oauth_google" ? (
                  <Loader2 className="size-4 me-2 animate-spin" />
                ) : (
                  <GoogleIcon className="size-4 me-2" />
                )}
                Continue with Google
              </Button>
            )}
            {showGithub && (
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => handleOAuthSignIn("oauth_github")}
                disabled={isLoading !== null}
              >
                {isLoading === "oauth_github" ? (
                  <Loader2 className="size-4 me-2 animate-spin" />
                ) : (
                  <GithubIcon className="size-4 me-2" />
                )}
                Continue with GitHub
              </Button>
            )}
            {showHuggingFace && (
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => handleOAuthSignIn("oauth_huggingface")}
                disabled={isLoading !== null}
              >
                {isLoading === "oauth_huggingface" ? (
                  <Loader2 className="size-4 me-2 animate-spin" />
                ) : (
                  <HuggingFaceIcon className="size-4 me-2" />
                )}
                Continue with Hugging Face
              </Button>
            )}
          </div>

          <AuthSeparator />

          {/* Email Form */}
          <form className="space-y-2" onSubmit={handleEmailSignIn}>
            <p className="text-muted-foreground text-start text-xs">
              Enter your email address to sign in or create an account
            </p>
            <div className="relative h-max">
              <Input
                placeholder="your.email@example.com"
                className="peer ps-9"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
                required
                disabled={isLoading !== null}
              />
              <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <AtSignIcon className="size-4" aria-hidden="true" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading !== null}>
              {isLoading === "email" ? <Loader2 className="size-4 me-2 animate-spin" /> : null}
              <span>Continue With Email</span>
            </Button>
          </form>

          {/* Legal Links */}
          <p className="text-muted-foreground mt-8 text-sm">
            By clicking continue, you agree to our{" "}
            <a
              href={termsHref}
              className="hover:text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href={privacyHref}
              className="hover:text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
