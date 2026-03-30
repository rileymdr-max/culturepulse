"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ConversationCategory } from "@/lib/platforms/types";
import { formatNumber } from "@/lib/utils";

const TREND_COLORS: Record<string, string> = {
  up: "#34d399",   // emerald
  down: "#f87171", // red
  flat: "#60a5fa", // blue
};

interface CategoryChartProps {
  categories: ConversationCategory[];
}

export function CategoryChart({ categories }: CategoryChartProps) {
  const sorted = [...categories].sort((a, b) => b.volume - a.volume);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <XAxis
          type="number"
          tickFormatter={formatNumber}
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "hsl(224 71% 4%)",
            border: "1px solid hsl(216 34% 17%)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e2e8f0",
          }}
          formatter={(value: number) => [formatNumber(value), "Volume"]}
        />
        <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, i) => (
            <Cell key={i} fill={TREND_COLORS[entry.trend] ?? "#60a5fa"} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
