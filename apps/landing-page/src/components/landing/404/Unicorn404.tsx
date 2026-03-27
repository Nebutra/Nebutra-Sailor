"use client";

import { ArrowRight, BookOpen } from "lucide-react";
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

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center flex flex-col items-center">
        {/* Kinetic Studio Dumbar "404" */}
        <AnimateIn preset="fadeUp" delay={100}>
          <h1 className="text-[12rem] sm:text-[18rem] md:text-[24rem] lg:text-[30rem] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/5 dark:from-white dark:to-white/5 select-none drop-shadow-2xl">
            404
          </h1>
        </AnimateIn>

        {/* Messaging */}
        <AnimateIn
          preset="fadeUp"
          delay={300}
          className="mt-[-2rem] sm:mt-[-4rem] md:mt-[-6rem] lg:mt-[-8rem] bg-background/80 backdrop-blur-md px-8 py-6 rounded-3xl border border-border/50 shadow-2xl"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground dark:text-white mb-3">
            {title}
          </h2>
          <p className="text-muted-foreground dark:text-zinc-400 text-base sm:text-lg max-w-lg mx-auto">
            {desc}
          </p>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="group relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-foreground px-8 text-sm font-medium text-background transition-transform hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">{homeText}</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-[var(--cyan-9)] to-[var(--blue-9)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>

            <Link
              href="/docs"
              className="group flex h-12 items-center justify-center gap-2 rounded-full border border-border px-8 text-sm font-medium text-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              {docsText}
            </Link>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
