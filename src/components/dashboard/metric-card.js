import { Card, CardContent } from "../ui/card.js";
import { cn } from "../../lib/utils.js";

export function MetricCard({ label, value, hint, icon: Icon, tone = "default" }) {
  return (
    <Card className="border-border/80">
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-md border",
              tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-600",
              tone === "warning" && "border-amber-200 bg-amber-50 text-amber-600",
              tone === "danger" && "border-red-200 bg-red-50 text-red-600",
              tone === "default" && "border-blue-200 bg-blue-50 text-primary"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
