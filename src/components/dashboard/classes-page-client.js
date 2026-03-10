import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { MetricCard } from "./metric-card.js";

export function ClassesPageClient({ classes, institutions, initialError }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard label="Total Classes" value={classes.length} />
        <MetricCard label="Institutions" value={institutions.length} tone="success" />
        <MetricCard
          label="Sections"
          value={classes.filter((item) => item.section).length}
          tone="warning"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Class Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialError ? (
            <p className="text-sm text-red-600">{initialError}</p>
          ) : classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes available yet.</p>
          ) : (
            classes.map((item) => (
              <div className="flex flex-col gap-2 rounded-md border p-4 md:flex-row md:items-center md:justify-between" key={item.id}>
                <div>
                  <p className="font-medium">
                    {item.name}
                    {item.section ? ` - ${item.section}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.institutionName}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.academicYear || "Academic year NA"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
