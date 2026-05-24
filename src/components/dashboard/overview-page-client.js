import Link from "next/link";
import { ArrowRight, Building2, CreditCard, GraduationCap, PlusCircle, Users } from "lucide-react";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Badge } from "../ui/badge.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table.js";
import { MetricCard } from "./metric-card.js";
import { StatusBadge } from "./status-badge.js";
import { formatCurrency } from "../../lib/currency.js";

export function OverviewPageClient({ snapshot, userRole }) {
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const institutionName = snapshot.context?.institutionName || "Current institution";
  const setupSteps = [];

  if (snapshot.totals.institutions === 0) {
    setupSteps.push({
      id: "institutions",
      title: "Register institutions",
      description: "Create the organizations that will own classes, students, and billing.",
      href: "/institutions"
    });
  }

  if (snapshot.totals.classes === 0) {
    setupSteps.push({
      id: "classes",
      title: "Set up classes",
      description: "Add the academic classes that students will be enrolled into.",
      href: "/classes"
    });
  }

  if (snapshot.totals.classes > 0 && snapshot.totals.feeStructures === 0) {
    setupSteps.push({
      id: "fees",
      title: "Add fee structures",
      description: "Attach tuition rules to each class before you start billing students.",
      href: "/fees?tab=structures"
    });
  }

  if (snapshot.totals.students === 0) {
    setupSteps.push({
      id: "students",
      title: "Enroll students",
      description: "Once classes and fees exist, student enrollment becomes straightforward.",
      href: "/students"
    });
  }

  const nextStep = setupSteps[0] || null;
  const showSetupFlow = setupSteps.length > 0;

  const summaryCards = isSuperAdmin
    ? [
        {
          icon: Building2,
          label: "Total Institutions",
          value: snapshot.totals.institutions,
          tone: "default"
        },
        {
          icon: GraduationCap,
          label: "Total Classes",
          value: snapshot.totals.classes,
          tone: "success"
        },
        {
          icon: Users,
          label: "Total Students",
          value: snapshot.totals.students,
          tone: "warning"
        },
        {
          icon: CreditCard,
          label: "Collections",
          value: formatCurrency(snapshot.totals.collections),
          tone: "default"
        }
      ]
    : [
        {
          icon: Building2,
          label: "Institution",
          value: institutionName,
          hint: "Your active workspace"
        },
        {
          icon: GraduationCap,
          label: "Classes Set Up",
          value: snapshot.totals.classes,
          tone: "success"
        },
        {
          icon: Users,
          label: "Total Students",
          value: snapshot.totals.students,
          tone: "warning"
        },
        {
          icon: CreditCard,
          label: "Fee Structures",
          value: snapshot.totals.feeStructures,
          tone: "default"
        }
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {isSuperAdmin ? "Global overview" : "Institution overview"}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {isSuperAdmin ? "All institutions at a glance" : institutionName}
          </h2>
          {!isSuperAdmin ? (
            <p className="text-sm text-muted-foreground">
              Setup and student flow for this institution.
            </p>
          ) : null}
        </div>
        <Badge variant={isSuperAdmin ? "default" : "outline"}>
          {isSuperAdmin ? "Super Admin" : "Institution User"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            icon={card.icon}
            hint={card.hint}
            label={card.label}
            tone={card.tone}
            value={card.value}
          />
        ))}
      </div>

      {showSetupFlow ? (
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Remaining Setup</CardTitle>
              <p className="text-sm text-muted-foreground">
                Only the missing steps are shown here so the dashboard stays practical.
              </p>
            </div>
            <Button asChild>
              <Link className="flex items-center gap-2" href={nextStep.href}>
                Continue Setup
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {setupSteps.map((step, index) => {
              const isNext = nextStep ? nextStep.id === step.id : false;

              return (
                <div className="rounded-md border bg-white p-4" key={step.id}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Badge variant={isNext ? "default" : "outline"}>
                      {isNext ? "Next" : `Step ${index + 1}`}
                    </Badge>
                  </div>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  <Button asChild className="mt-4 w-full" variant={isNext ? "default" : "outline"}>
                    <Link href={step.href}>{isNext ? "Open next step" : "Open"}</Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="dashboard-grid">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Recent Invoices</CardTitle>
              <p className="text-sm text-muted-foreground">Latest fee movement across institutions.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/fees/invoices">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {snapshot.recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoice records yet.</p>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Student</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="py-3 font-medium">
                          {invoice.first_name} {invoice.last_name || ""}
                        </TableCell>
                        <TableCell className="max-w-[11rem] truncate py-3 text-muted-foreground">
                          {invoice.institution_name || "NA"}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate py-3">
                          {invoice.title || "Invoice"}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild>
              <Link className="flex items-center gap-2" href="/institutions">
                <PlusCircle className="h-4 w-4" />
                Manage Institutions
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link className="flex items-center gap-2" href="/students">
                <PlusCircle className="h-4 w-4" />
                Open Student Desk
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link className="flex items-center gap-2" href="/fees">
                <PlusCircle className="h-4 w-4" />
                Open Fees Dashboard
              </Link>
            </Button>
            {nextStep ? (
              <Button asChild variant="outline">
                <Link className="flex items-center gap-2" href={nextStep.href}>
                  <PlusCircle className="h-4 w-4" />
                  Start with {nextStep.title}
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
