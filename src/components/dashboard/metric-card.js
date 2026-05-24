import { Card, CardContent } from "../ui/card.js";
import { cn } from "../../lib/utils.js";

const toneStyles = {
  default: {
    icon: "border-sky-200/70 bg-sky-50 text-sky-700",
    glow: "from-sky-500/12",
  },
  success: {
    icon: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
    glow: "from-emerald-500/12",
  },
  warning: {
    icon: "border-amber-200/70 bg-amber-50 text-amber-700",
    glow: "from-amber-500/14",
  },
  danger: {
    icon: "border-rose-200/70 bg-rose-50 text-rose-700",
    glow: "from-rose-500/12",
  },
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}) {
  const style = toneStyles[tone] || toneStyles.default;

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-80",
          style.glow
        )}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      <CardContent className="relative flex items-start justify-between gap-5 p-6">
        <div className="min-w-0 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>

          <p className="text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>

          {hint ? (
            <p className="max-w-[220px] text-sm leading-5 text-slate-500">
              {hint}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-105",
              style.icon
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}