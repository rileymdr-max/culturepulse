"use client";

import { useState, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "reddit", label: "Reddit", color: "text-orange-400" },
  { id: "twitter", label: "X / Twitter", color: "text-slate-300" },
  { id: "substack", label: "Substack", color: "text-amber-400" },
  { id: "tiktok", label: "TikTok", color: "text-pink-400" },
  { id: "instagram", label: "Instagram", color: "text-purple-400" },
  { id: "facebook", label: "Facebook", color: "text-blue-400" },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

interface SearchBarProps {
  onSearch: (query: string, platforms: PlatformId[]) => void;
  isLoading?: boolean;
  defaultQuery?: string;
  defaultPlatforms?: PlatformId[];
}

export function SearchBar({
  onSearch,
  isLoading = false,
  defaultQuery = "",
  defaultPlatforms = PLATFORMS.map((p) => p.id),
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [selected, setSelected] = useState<Set<PlatformId>>(new Set(defaultPlatforms));
  const inputRef = useRef<HTMLInputElement>(null);

  function togglePlatform(id: PlatformId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow deselecting all
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === PLATFORMS.length) {
      setSelected(new Set([PLATFORMS[0].id]));
    } else {
      setSelected(new Set(PLATFORMS.map((p) => p.id)));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), [...selected] as PlatformId[]);
  }

  function clearQuery() {
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div className="w-full space-y-3">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any micro-community, subculture, or niche…"
            className="w-full h-12 rounded-xl border border-input bg-muted pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="h-12 px-6 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{isLoading ? "Searching…" : "Search"}</span>
        </button>
      </form>

      {/* Platform filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Platforms:</span>
        <button
          onClick={toggleAll}
          className={cn(
            "text-xs rounded-full border px-2.5 py-0.5 transition",
            selected.size === PLATFORMS.length
              ? "border-blue-700 bg-blue-900/30 text-blue-400"
              : "border-border text-muted-foreground hover:border-blue-700 hover:text-blue-400"
          )}
        >
          All
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => togglePlatform(p.id)}
            className={cn(
              "text-xs rounded-full border px-2.5 py-0.5 transition",
              selected.has(p.id)
                ? `border-current ${p.color} opacity-100`
                : "border-border text-muted-foreground opacity-50 hover:opacity-75"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
