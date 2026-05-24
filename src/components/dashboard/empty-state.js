import { Card, CardContent } from "../ui/card.js";
import { LottieLoader } from "../ui/lottie-loader.js";

export function EmptyState({ title, description, action, animation = "education" }) {
  return (
    <Card className="motion-card border-dashed">
      <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
        <LottieLoader ariaLabel="" className="h-28 w-28 rounded-full bg-blue-50/70 p-2" name={animation} />
        <div className="space-y-1">
          <p className="text-base font-semibold">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
