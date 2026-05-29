import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  CreditCard,
  GraduationCap,
  PlusCircle,
  ReceiptText,
  Users
} from "lucide-react";
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
  const quickActions = [
    {
      href: "/students",
      icon: Users,
      label: "Students"
    },
    {
      href: "/fees",
      icon: CreditCard,
      label: "Fees"
    },
    {
      href: "/fees/invoices",
      icon: ReceiptText,
      label: "Invoices"
    },
    {
      href: "/institutions",
      icon: Building2,
      label: "Schools"
    }
  ];

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
    <div className="space-y-5 pb-3 md:space-y-6">
      <div className="relative overflow-hidden rounded-md bg-linear-to-br from-indigo-700  via-indigo-600 to-indigo-600 px-5 py-5 text-white  md:rounded-none md:bg-none md:p-0 md:text-slate-950 md:shadow-none">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 md:hidden" />
        <div className="pointer-events-none absolute -bottom-16 right-16 h-28 w-28 rounded-full bg-sky-300/20 md:hidden" />
        <div className="relative flex items-start justify-between gap-3 md:items-center">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.19em] text-blue-100 md:text-sm md:font-normal md:tracking-wide md:text-muted-foreground">
              {isSuperAdmin ? "Global overview" : "Institution overview"}
            </p>
            <h2 className="truncate text-2xl font-semibold tracking-tight md:whitespace-normal">
              {isSuperAdmin ? "All institutions" : institutionName}
            </h2>
            {!isSuperAdmin ? (
              <p className="text-sm text-blue-100 md:text-muted-foreground">
                Setup and student flow for this institution.
              </p>
            ) : null}
          </div>
          <Badge
            className="shrink-0 border-white/15 bg-white/15 px-2.5 py-1 text-[10px] text-white md:border-inherit md:bg-inherit md:px-2.5 md:py-0.5 md:text-xs md:text-inherit"
            variant={isSuperAdmin ? "default" : "outline"}
          >
            {isSuperAdmin ? "Super Admin" : "Institution User"}
          </Badge>
        </div>

        <div className="relative mt-5 flex items-center justify-between rounded-2xl bg-white/12 p-3 backdrop-blur-sm md:hidden">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              {nextStep ? "Up next" : "Status"}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {nextStep ? nextStep.title : "Setup completed"}
            </p>
          </div>
          <Button
            asChild
            className="h-10 rounded-xl bg-white px-4 text-blue-700 hover:bg-blue-50"
          >
            <Link href={nextStep ? nextStep.href : "/students"}>
              {nextStep ? "Continue" : "Open"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[24px] border-slate-100 bg-white shadow-[0_3px_18px_rgba(15,23,42,0.05)] md:hidden">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Summary
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-950">At a glance</h3>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <GraduationCap className="h-5 w-5" />
            </span>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <div
                  className={[
                    "min-w-0 p-3.5",
                    index % 2 === 0 ? "border-r border-slate-100" : "",
                    index < 2 ? "border-b border-slate-100" : ""
                  ].join(" ")}
                  key={card.label}
                >
                  <div className="mb-2.5 flex items-center gap-2 text-slate-500">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em]">
                      {card.label}
                    </p>
                  </div>
                  <p className="truncate text-xl font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="hidden gap-6 md:grid md:grid-cols-2 xl:grid-cols-4">
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

      <section className="md:hidden">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-950">Quick Actions</h3>
          <span className="text-xs font-medium text-slate-400">Shortcuts</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white px-1 py-3 text-center shadow-[0_2px_12px_rgba(15,23,42,0.04)] active:scale-[0.98]"
                href={action.href}
                key={action.label}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="truncate text-[11px] font-semibold text-slate-700">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {showSetupFlow ? (
        <Card className="overflow-hidden rounded-[24px] border-slate-100 bg-gradient-to-br from-slate-50 to-white shadow-sm md:rounded-md md:border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between gap-4 p-4 pb-3 md:p-6">
            <div className="space-y-1">
              <CardTitle>Remaining Setup</CardTitle>
              <p className="hidden text-sm text-muted-foreground md:block">
                Only the missing steps are shown here so the dashboard stays practical.
              </p>
            </div>
            <Button asChild className="hidden md:inline-flex">
              <Link className="flex items-center gap-2" href={nextStep.href}>
                Continue Setup
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2 md:gap-3 md:p-6 md:pt-0 xl:grid-cols-4">
            {setupSteps.map((step, index) => {
              const isNext = nextStep ? nextStep.id === step.id : false;

              return (
                <div
                  className="flex items-center gap-3 rounded-2xl border bg-white p-3 md:block md:rounded-md md:p-4"
                  key={step.id}
                >
                  <div className="shrink-0 md:mb-3 md:flex md:items-center md:justify-between md:gap-3">
                    <Badge variant={isNext ? "default" : "outline"}>
                      {isNext ? "Next" : `Step ${index + 1}`}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium md:text-base">{step.title}</p>
                    <p className="mt-1 hidden text-sm text-muted-foreground md:block">{step.description}</p>
                  </div>
                  <Link
                    aria-label={`Open ${step.title}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 md:hidden"
                    href={step.href}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Button asChild className="mt-4 hidden w-full md:inline-flex" variant={isNext ? "default" : "outline"}>
                    <Link href={step.href}>{isNext ? "Open next step" : "Open"}</Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="dashboard-grid">
        <Card className="overflow-hidden rounded-[24px] border-slate-100 shadow-sm md:rounded-md md:border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 md:p-6">
            <div className="space-y-1">
              <CardTitle>Recent Invoices</CardTitle>
              <p className="hidden text-sm text-muted-foreground sm:block">Latest fee movement across institutions.</p>
            </div>
            <Button asChild className="h-9 rounded-xl px-3 text-xs md:h-10 md:px-4 md:text-sm" variant="outline">
              <Link href="/fees/invoices">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {snapshot.recentInvoices.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-muted-foreground md:bg-transparent md:p-0 md:text-left">
                No invoice records yet.
              </p>
            ) : (
              <>
                <div className="space-y-2 md:hidden">
                  {snapshot.recentInvoices.map((invoice) => (
                    <div
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3"
                      key={invoice.id}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <ReceiptText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {invoice.first_name} {invoice.last_name || ""}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {invoice.title || "Invoice"} - {invoice.institution_name || "NA"}
                        </p>
                      </div>
                      <StatusBadge status={invoice.status} />
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-hidden rounded-md border md:block">
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
              </>
            )}
          </CardContent>
        </Card>
        <Card className="hidden md:block">
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
