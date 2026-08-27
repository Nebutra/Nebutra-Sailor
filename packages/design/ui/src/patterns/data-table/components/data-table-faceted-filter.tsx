"use client";

import { Check, Filter } from "@nebutra/icons";
import { useState } from "react";
import { Badge } from "../../../primitives/badge";
import { Button } from "../../../primitives/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../../primitives/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../../primitives/popover";
import { cn } from "../../../utils/cn";

export interface FacetedFilterOption {
  value: string;
  label: string;
  group?: string;
}

type DataTableTranslation = (key: string, values?: Record<string, string | number>) => string;

interface DataTableFacetedFilterProps {
  /** Filter title shown on button */
  title: string;
  /** Available options */
  options: FacetedFilterOption[];
  /** Currently selected values */
  selected: Set<string>;
  /** Callback when selection changes */
  onSelectionChange: (value: string, checked: boolean) => void;
  /** i18n translation function */
  t: DataTableTranslation;
}

export function DataTableFacetedFilter({
  title,
  options,
  selected,
  onSelectionChange,
  t,
}: DataTableFacetedFilterProps) {
  const [open, setOpen] = useState(false);
  const selectedCount = selected.size;

  const grouped = new Map<string, FacetedFilterOption[]>();
  const ungrouped: FacetedFilterOption[] = [];
  for (const opt of options) {
    if (opt.group) {
      const group = grouped.get(opt.group);
      if (group) {
        group.push(opt);
      } else {
        grouped.set(opt.group, [opt]);
      }
    } else {
      ungrouped.push(opt);
    }
  }

  function handleToggle(value: string) {
    onSelectionChange(value, !selected.has(value));
  }

  function handleSelectAllGroup(opts: FacetedFilterOption[], allSelected: boolean) {
    for (const opt of opts) {
      onSelectionChange(opt.value, !allSelected);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs">
          <Filter className="size-3.5" />
          {title}
          {selectedCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 min-w-[20px] rounded-full px-1.5 text-2xs font-medium"
            >
              {selectedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("common.table.filterPlaceholder", { title })} />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>{t("common.table.noMatches")}</CommandEmpty>

            {/* Grouped options */}
            {Array.from(grouped.entries()).map(([groupName, opts]) => {
              const allSelected = opts.every((o) => selected.has(o.value));
              return (
                <CommandGroup key={groupName} heading={groupName}>
                  {/* Select All for group */}
                  <CommandItem
                    onSelect={() => handleSelectAllGroup(opts, allSelected)}
                    className="text-xs font-medium"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
                        allSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {allSelected && <Check className="size-3" />}
                    </div>
                    <span>
                      {t("common.table.selectAll")} ({opts.length})
                    </span>
                  </CommandItem>
                  {opts.map((option) => {
                    const isSelected = selected.has(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => handleToggle(option.value)}
                        className="items-start gap-2 text-xs"
                        title={option.label}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40",
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                        <span
                          className="flex-1 whitespace-normal break-words leading-tight"
                          title={option.label}
                        >
                          {option.label}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}

            {/* Ungrouped options */}
            {ungrouped.length > 0 && (
              <CommandGroup>
                {ungrouped.map((option) => {
                  const isSelected = selected.has(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleToggle(option.value)}
                      className="items-start gap-2 text-xs"
                      title={option.label}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                      <span
                        className="flex-1 whitespace-normal break-words leading-tight"
                        title={option.label}
                      >
                        {option.label}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer: clear selection */}
          {selectedCount > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    for (const opt of options) {
                      if (selected.has(opt.value)) {
                        onSelectionChange(opt.value, false);
                      }
                    }
                  }}
                  className="justify-center text-center text-xs text-muted-foreground"
                >
                  {t("common.table.clearSelection")}
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
