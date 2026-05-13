"use client";

import { ArrowRight, BookOpen } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { AnimateIn } from "../AnimateIn";

interface Unicorn404Props {
  title: string;
  desc: string;
  homeText: string;
  docsText: string;
}

export function Unicorn404({ title, desc, homeText, docsText }: Unicorn404Props) {
  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Vercel-style ambient background glow */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--cyan-9)_0%,_transparent_50%)] opacity-20 dark:opacity-10 pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#0000001a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:24px_24px] opacity-20 dark:opacity-5 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        {/* Kinetic Studio Dumbar "404" */}
        <AnimateIn preset="fadeUp" delay={100}>
          <h1
            className="text-[12rem] sm:text-[18rem] md:text-[24rem] lg:text-[30rem] font-semibold leading-none text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/5 dark:from-white dark:to-white/5 select-none"
            style={{ letterSpacing: "var(--tracking-display)" }}
          >
            404
          </h1>
        </AnimateIn>

        {/* Messaging */}
        <AnimateIn
          preset="fadeUp"
          delay={300}
          className="mt-[-2rem] sm:mt-[-4rem] md:mt-[-6rem] lg:mt-[-8rem]"
        >
          <div
            className="bg-background/80 backdrop-blur-md px-8 py-6 rounded-[var(--radius-card)] border border-[var(--neutral-6)]"
            style={{ boxShadow: "var(--ring-hairline)" }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground dark:text-white mb-3">
              {title}
            </h2>
            <p className="text-muted-foreground dark:text-zinc-400 text-base sm:text-lg max-w-lg mx-auto">
              {desc}
            </p>

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild variant="ink" size="lg">
                <Link href="/" className="group">
                  {homeText}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Link
                href="/docs"
                className="group flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--neutral-6)] px-8 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                {docsText}
              </Link>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
