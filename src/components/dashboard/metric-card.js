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
  className,
}) {
  const style = toneStyles[tone] || toneStyles.default;

  return (
    <Card className={cn("group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl sm:rounded-2xl", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-80",
          style.glow
        )}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      <CardContent className="relative flex items-start justify-between gap-2 p-3 sm:gap-5 sm:p-6">
        <div className="min-w-0 space-y-1.5 sm:space-y-3">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">
            {label}
          </p>

          <p className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>

          {hint ? (
            <p className="hidden max-w-[220px] text-sm leading-5 text-slate-500 sm:block">
              {hint}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={cn(
              "hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-105 sm:flex",
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
