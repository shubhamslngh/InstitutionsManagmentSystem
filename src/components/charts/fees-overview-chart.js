"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCurrency } from "../../lib/currency.js";

export function FeesOverviewChart({ data }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickFormatter={(value) => formatCurrency(value)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={100}
          />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="paid" fill="#10B981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" fill="#EF4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
