"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";

export function SelectDemo() {
  return (
    <div className="grid w-full max-w-[var(--select-demo-width)] gap-1.5 [--select-demo-width:240px]">
      <label
        id="framework-label"
        className="font-medium text-foreground text-sm"
        htmlFor="framework-trigger"
      >
        Framework
      </label>
      <Select>
        <SelectTrigger id="framework-trigger" aria-labelledby="framework-label">
          <SelectValue placeholder="Select a framework" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Frameworks</SelectLabel>
            <SelectItem value="nextjs">Next.js</SelectItem>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="sveltekit">SvelteKit</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
