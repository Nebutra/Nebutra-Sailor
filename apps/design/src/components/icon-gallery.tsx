"use client";

import * as AllIcons from "@nebutra/icons";
import { Check, MagnifyingGlass as Search } from "@nebutra/icons";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from "@nebutra/ui/primitives";
import * as React from "react";

// Filter out types or non-components
const iconsList = Object.entries(AllIcons).filter(([name]) => name !== "IconProps");

export function IconGallery() {
  const [query, setQuery] = React.useState("");

  const filteredIcons = iconsList.filter(([name]) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col w-full my-8">
      <div className="sticky top-[72px] z-10 bg-background/80 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center justify-between border-b pb-4 mb-4">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Search size={16} />
          </div>
          <Input
            placeholder="Search icons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 h-10 bg-background text-foreground"
          />
        </div>
        <div className="text-sm text-muted-foreground hidden sm:block">
          {filteredIcons.length} icons
        </div>
      </div>

      {/* Cell seams are the 1px gap over the border colour, so every line is one
          hairline — never two adjacent borders doubling up at the joins. */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
        {filteredIcons.map(([name, Icon]) => (
          <IconCard key={name} name={name} icon={Icon} />
        ))}
        {filteredIcons.length === 0 && (
          <div className="col-span-full bg-card py-16 text-center text-muted-foreground">
            No icons found matching "{query}"
          </div>
        )}
      </div>
    </div>
  );
}

function IconCard({
  name,
  icon: Icon,
}: {
  name: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}) {
  const [copied, setCopied] = React.useState<"Name" | "Import" | "JSX" | null>(null);
  const [open, setOpen] = React.useState(false);

  const copyToClipboard = React.useCallback((text: string, type: "Name" | "Import" | "JSX") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group relative h-28 flex-col gap-0 rounded-none bg-card p-3 text-foreground focus-visible:z-10"
          aria-label={`Copy options for ${name}`}
        >
          <div className="flex-1 flex items-center justify-center min-h-0 mb-2">
            <Icon size={20} className="shrink-0" />
          </div>
          <span
            className="text-2xs text-muted-foreground text-center px-1 font-medium truncate w-full transition-colors group-hover:text-current"
            title={name}
          >
            {name}
          </span>

          {copied && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <span className="text-xs font-medium flex flex-col items-center gap-2 text-foreground">
                <Check size={16} className="text-success-strong" /> Copied {copied}
              </span>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-40">
        <DropdownMenuItem
          onClick={() => copyToClipboard(`import { ${name} } from "@nebutra/icons";`, "Import")}
        >
          Copy Import
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyToClipboard(name, "Name")}>Copy Name</DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyToClipboard(`<${name} />`, "JSX")}>
          Copy JSX
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
