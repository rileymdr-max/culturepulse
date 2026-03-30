"use client";

import { useMutation } from "@tanstack/react-query";
import type { SpikeContentItem } from "@/app/api/spike-content/route";

export type { SpikeContentItem };

export function useSpikeContent() {
  return useMutation<
    { items: SpikeContentItem[]; live: boolean },
    Error,
    { platform: string; communityId: string; topic: string }
  >({
    mutationFn: async (data) => {
      const res = await fetch("/api/spike-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to fetch spike content");
      return res.json();
    },
  });
}
