"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

import { cn } from "../../lib/utils.js";

const ChartContext = React.createContext(null);

export function ChartContainer({ config, className, children, style, ...props }) {
  const colorVariables = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [`--color-${key}`, value.color])
  );

  return (
    <ChartContext.Provider value={config}>
      <div className={cn("flex w-full justify-center text-xs", className)} style={{ ...colorVariables, ...style }} {...props}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsTooltip;

export function ChartTooltipContent({ active, payload, label, formatter }) {
  const config = React.useContext(ChartContext);

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="min-w-36 rounded-xl border border-slate-100 bg-white p-3 shadow-xl">
      <p className="mb-2 max-w-56 text-xs font-medium text-slate-500">
        {payload[0]?.payload?.label || label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const key = String(entry.dataKey || entry.name);
          const itemConfig = config?.[key];

          return (
            <div className="flex items-center justify-between gap-5 text-xs" key={key}>
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color || itemConfig?.color }}
                />
                {itemConfig?.label || entry.name}
              </span>
              <span className="font-semibold tabular-nums text-slate-950">
                {formatter ? formatter(entry.value) : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
