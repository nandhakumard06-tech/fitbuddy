"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ProgressTrendChart({
  trend,
}: {
  trend: { date: string; weightKg: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          }
          minTickGap={24}
        />
        <YAxis
          stroke="#64748b"
          fontSize={11}
          domain={["auto", "auto"]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v} kg`}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.75rem",
            fontSize: "0.8rem",
            color: "#e2e8f0",
          }}
          formatter={(value) => [`${Number(value)} kg`, "Weight"]}
        />
        <Line
          type="monotone"
          dataKey="weightKg"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}