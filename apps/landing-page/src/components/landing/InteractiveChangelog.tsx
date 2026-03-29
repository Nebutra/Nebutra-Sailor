"use client";

import { MeshGradient, Dithering } from "@paper-design/shaders-react";
import { Copy, ExternalLink, GitPullRequest, Maximize2 } from "lucide-react";
import * as React from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@nebutra/ui/primitives";

export interface Release {
  version: string;
  title: string;
  date: string;
  image?: string;
  excerpt: string;
  contributors?: string[];
  content: React.ReactNode;
}

export interface InteractiveChangelogProps {
  releases: Release[];
}

export const InteractiveChangelog = ({ releases }: InteractiveChangelogProps) => {
  return (
    <section className="relative w-full overflow-hidden bg-white dark:bg-black">
      {/* shader header full-width */}
      <div className="relative w-full overflow-hidden min-h-[400px]">
        <MeshGradient
          colors={["#5b00ff", "#00ffa3", "#ff9a00", "#ea00ff"]}
          swirl={0.55}
          distortion={0.85}
          speed={0.1}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <Dithering
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/30 dark:to-black" />

        <div className="relative container mx-auto px-4 py-32 text-left">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <GitPullRequest className="size-4" />
              <p>Changelog</p>
            </div>
            <h1 className="text-5xl font-semibold tracking-tight text-white leading-snug">
              Every detail matters.
              <br /> See what's new.
            </h1>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="container mx-auto grid justify-center px-4 border-x border-border">
        {releases.map((item, idx) => (
          <Dialog key={item.version || idx}>
            <div className="relative flex w-full flex-col gap-6 py-16 lg:flex-row lg:gap-0">
              <div className="h-fit lg:sticky lg:top-8">
                <time className="w-36 text-sm font-medium text-muted-foreground lg:absolute">
                  {item.date}
                </time>
              </div>

              <div className="flex max-w-prose flex-col gap-6 lg:mx-auto">
                <h3 className="text-3xl font-medium tracking-tight lg:pt-8">{item.title}</h3>
                <DialogTrigger asChild>
                  <div className="relative cursor-pointer group">
                    <img
                      src={
                        item.image ||
                        `https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200`
                      }
                      alt={item.title}
                      className="max-h-96 w-full rounded-2xl border border-border object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent to-black/60 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </DialogTrigger>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                  {item.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {item.contributors && item.contributors.length > 0 && (
                      <div className="flex items-center -space-x-2">
                        {item.contributors.slice(0, 3).map((src, id) => (
                          <img
                            key={id}
                            src={src}
                            alt="Contributor"
                            className="size-8 rounded-full border-2 border-background"
                          />
                        ))}
                      </div>
                    )}
                    {item.contributors && item.contributors.length > 3 && (
                      <span className="ml-2 text-sm font-medium text-muted-foreground">
                        +{item.contributors.length - 3} contributors
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Maximize2 className="size-4" />
                            </Button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Show full release</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => {}}>
                            <Copy className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy link</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`#v${item.version}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open in new tab</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              {/* Dividing line connecting items */}
              <div className="absolute bottom-0 left-0 right-0 h-px w-[200vw] -translate-x-1/2 bg-border" />
            </div>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-left text-2xl font-bold">{item.title}</DialogTitle>
                <DialogDescription className="text-left text-base">
                  {item.excerpt}
                </DialogDescription>
              </DialogHeader>
              <img
                src={
                  item.image ||
                  `https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200`
                }
                alt={item.title}
                className="my-4 max-h-[400px] w-full rounded-xl border border-border object-cover"
              />
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {item.content}
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </section>
  );
};
