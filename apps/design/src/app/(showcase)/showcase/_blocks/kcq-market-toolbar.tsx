"use client";

import { MagnifyingGlass, RefreshClockwise } from "@nebutra/icons";
import {
  Button,
  Input,
  Kbd,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@nebutra/ui/primitives";
import { useRef, useState } from "react";

const INTERVALS = ["1m", "5m", "15m", "1h", "1D"];

/** A quote screen's controls sit in one row: what to look at, how often, and whether it is live. */
export function KcqMarketToolbar() {
  const search = useRef<HTMLInputElement>(null);
  const [interval, setInterval] = useState("5m");
  const [feed, setFeed] = useState("live");

  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <Select defaultValue="cn">
        <SelectTrigger aria-label="Market" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cn">A-shares</SelectItem>
          <SelectItem value="hk">Hong Kong</SelectItem>
          <SelectItem value="us">US equities</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative min-w-48 flex-1">
        <Input
          aria-label="Search symbols"
          placeholder="Search symbol or name"
          prefix={<MagnifyingGlass aria-hidden="true" />}
          ref={search}
          type="search"
        />
        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center">
          <Kbd small>/</Kbd>
        </span>
      </div>

      <ToggleGroup
        aria-label="Candle interval"
        onValueChange={(value) =>
          typeof value === "string" && value ? setInterval(value) : undefined
        }
        type="single"
        value={interval}
      >
        {INTERVALS.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {value}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Switch name="feed" onValueChange={setFeed} size="small" value={feed}>
        <Switch.Control label="Live" value="live" />
        <Switch.Control label="Paused" value="paused" />
      </Switch>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button aria-label="Refresh quotes" iconSize="md" shape="square" variant="outline">
            <RefreshClockwise aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh quotes</TooltipContent>
      </Tooltip>
    </div>
  );
}
