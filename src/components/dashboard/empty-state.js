import { Card, CardContent } from "../ui/card.js";

export function EmptyState({ title, description, action }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="space-y-1">
          <p className="text-base font-semibold">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
