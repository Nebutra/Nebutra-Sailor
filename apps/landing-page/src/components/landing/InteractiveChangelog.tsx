"use client";

import { AnimateIn } from "@nebutra/ui/components";
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
import { Dithering, MeshGradient } from "@paper-design/shaders-react";
import { Copy, ExternalLink, GitPullRequest, Maximize2 } from "lucide-react";
import Image from "next/image";
import type * as React from "react";
import { toast } from "sonner";

export interface Release {
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
  const getVersionSlug = (title: string) => {
    return title.split(":")[0].replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase() || "latest";
  };

  const handleCopyLink = (title: string) => {
    if (typeof navigator !== "undefined") {
      const slug = getVersionSlug(title);
      navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}#${slug}`,
      );
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-white dark:bg-black">
      {/* shader header full-width */}
      <div className="relative w-full overflow-hidden">
        <MeshGradient
          colors={["#5b00ff", "#00ffa3", "#ff9a00", "#ea00ff"]}
          swirl={0.55}
          distortion={0.85}
          speed={0.1}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <Dithering style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/30 w-full" />

        <div className="relative container mx-auto px-4 py-12 text-left">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <GitPullRequest className="size-4" />
              <p>Changelog</p>
            </div>
            <h1 className="text-4xl font-semibold text-white leading-snug">
              Latest Enhancements
              <br /> & Platform News
            </h1>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="container mx-auto grid justify-center px-4 border-x border-border">
        {releases.map((item, idx) => {
          const slug = getVersionSlug(item.title);
          return (
            <Dialog key={slug || idx}>
              <AnimateIn preset="fadeUp" inView>
                <article
                  id={slug}
                  className="relative flex w-full flex-col gap-6 py-16 lg:flex-row lg:gap-0 scroll-mt-24"
                >
                  <div className="h-fit lg:sticky lg:top-2">
                    <time className="w-36 text-sm font-medium text-muted-foreground lg:absolute">
                      {item.date}
                    </time>
                  </div>

                  <div className="flex max-w-prose flex-col gap-4 lg:mx-auto">
                    <h3 className="text-3xl font-medium lg:pt-10 lg:text-3xl">{item.title}</h3>
                    <DialogTrigger asChild>
                      <div className="relative cursor-pointer group">
                        <Image
                          src={
                            item.image ||
                            `https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200`
                          }
                          alt={item.title}
                          width={1200}
                          height={700}
                          className="max-h-96 w-full rounded-lg border border-border object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.01]"
                        />
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-transparent to-black/50 opacity-100" />
                      </div>
                    </DialogTrigger>
                    <p className="text-muted-foreground text-sm font-medium">
                      {item.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {item.contributors && item.contributors.length > 0 && (
                          <div className="flex items-center -space-x-2">
                            {item.contributors.slice(0, 3).map((src, id) => (
                              <Image
                                key={id}
                                src={src}
                                alt="Contributor"
                                width={96}
                                height={96}
                                className="size-6 rounded-full border border-border object-cover"
                              />
                            ))}
                          </div>
                        )}
                        {item.contributors && item.contributors.length > 3 && (
                          <span className="ml-1 text-sm font-medium text-muted-foreground">
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyLink(item.title)}
                              >
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
                                <a
                                  href={`#${slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
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
                </article>
              </AnimateIn>

              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-prose">
                <DialogHeader>
                  <DialogTitle className="text-left">{item.title}</DialogTitle>
                  <DialogDescription className="text-left">
                    {item.excerpt}
                  </DialogDescription>
                </DialogHeader>
                <Image
                  src={
                    item.image ||
                    `https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200`
                  }
                  alt={item.title}
                  width={1200}
                  height={700}
                  className="max-h-96 w-full rounded-lg border border-border object-cover"
                />
                {item.content}
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
    </section>
  );
};
