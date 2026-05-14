"use client";

import { type SearchResult, SearchTool } from "@nebutra/ui/primitives";

const results: SearchResult[] = [
  {
    title: "United UA837 SFO→NRT · $1,105 economy",
    source: "google.com/flights",
    url: "https://www.google.com/flights",
  },
  {
    title: "SFO–Tokyo · 14 results from $1,089",
    source: "expedia.com",
    date: "Updated 12m ago",
    url: "https://www.expedia.com",
  },
  {
    title: "ANA NH7 Direct SFO→NRT · $1,240 rt",
    source: "google.com/flights",
    url: "https://www.google.com/flights",
  },
];

export function SearchToolDemo() {
  return (
    <div className="w-full max-w-xl">
      <SearchTool query="best flights to Tokyo" results={results} defaultOpen />
    </div>
  );
}
