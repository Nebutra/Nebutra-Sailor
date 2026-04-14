"use client";

import * as AllIcons from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from "@nebutra/ui/primitives";
import { Check, Search } from "lucide-react";
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 border-l border-t border-border rounded-lg overflow-hidden bg-background">
        {filteredIcons.map(([name, Icon]) => (
          <IconCard key={name} name={name} icon={Icon} />
        ))}
        {filteredIcons.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-r border-b border-border">
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
        <button
          type="button"
          className="group relative flex flex-col items-center justify-center p-4 border-r border-b border-border bg-card/10 hover:bg-card focus-visible:bg-card focus-visible:outline-none focus-visible:relative focus-visible:ring-1 focus-visible:ring-ring focus-visible:z-10 transition-colors h-[120px] outline-none"
          aria-label={`Copy options for ${name}`}
        >
          <div className="flex-1 flex items-center justify-center min-h-0 mb-2">
            <Icon
              size={24}
              className="text-foreground transition-transform group-hover:scale-110 shrink-0"
            />
          </div>
          <span
            className="text-[11px] text-muted-foreground text-center px-1 font-medium truncate w-full"
            title={name}
          >
            {name}
          </span>

          {copied && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <span className="text-xs font-medium flex flex-col items-center gap-2 text-foreground">
                <Check size={16} className="text-green-500" /> Copied {copied}
              </span>
            </div>
          )}
        </button>
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
