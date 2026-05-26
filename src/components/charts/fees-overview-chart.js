"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis
} from "recharts";
import { formatCurrency } from "../../lib/currency.js";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "../ui/chart.js";

const chartConfig = {
  paid: {
    label: "Paid",
    color: "#10B981"
  },
  pending: {
    label: "Pending",
    color: "#EF4444"
  }
};

export function FeesOverviewChart({ data }) {
  return (
    <ChartContainer className="h-64 w-full sm:h-80" config={chartConfig}>
      <BarChart accessibilityLayer data={data} margin={{ left: -18, right: 2, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="shortLabel" tickLine={false} axisLine={false} fontSize={11} tickMargin={8} />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={88}
        />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />}
          cursor={{ fill: "#F8FAFC" }}
        />
        <Bar dataKey="paid" fill="var(--color-paid)" radius={[5, 5, 0, 0]} />
        <Bar dataKey="pending" fill="var(--color-pending)" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
