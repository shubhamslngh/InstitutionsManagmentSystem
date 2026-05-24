"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronFirst,
  ChevronLast,
  CreditCard,
  GraduationCap,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  School,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";

import { Breadcrumb } from "../ui/breadcrumb.js";
import { Button } from "../ui/button.js";
import { Card, CardContent } from "../ui/card.js";
import { LottieLoader } from "../ui/lottie-loader.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.js";
import { cn } from "../../lib/utils.js";
import { canAccessPath } from "../../lib/permissions.js";

const navigation = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/institutions", label: "Institutions", icon: Building2 },
  { href: "/classes", label: "Classes", icon: School },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/users", label: "Users & Roles", icon: ShieldCheck },
  { href: "/fees", label: "Fees Dashboard", icon: LayoutGrid },
  { href: "/fees/invoices", label: "Invoices", icon: CreditCard },
];

const titleMap = {
  "/": "Dashboard Overview",
  "/institutions": "Institutions",
  "/classes": "Classes",
  "/students": "Students",
  "/users": "Users & Roles",
  "/fees": "Fees Dashboard",
  "/fees/invoices": "Invoices",
};

const startFlowStorageKey = "maurya:start-flow-dismissed";

export function DashboardShell({ children, institutions = [], currentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [startFlowOpen, setStartFlowOpen] = useState(false);
  const [startFlowDismissed, setStartFlowDismissed] = useState(false);
  const [routeLoadingLabel, setRouteLoadingLabel] = useState("");
  const [pendingInstitutionRefresh, setPendingInstitutionRefresh] =
    useState(false);

  const currentInstitutionId = searchParams.get("institutionId") || "all";
  const currentSearchString = searchParams.toString();

  const institutionById = useMemo(
    () =>
      new Map(
        institutions.map((institution) => [
          String(institution.id),
          institution,
        ])
      ),
    [institutions]
  );

  const breadcrumbItems = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      return [{ href: "/", label: "Dashboard" }];
    }

    return [
      { href: "/", label: "Dashboard" },
      ...parts.map((part, index) => {
        const href = `/${parts.slice(0, index + 1).join("/")}`;

        return {
          href,
          label: titleMap[href] || part,
        };
      }),
    ];
  }, [pathname]);

  const preservedNavigation = useMemo(() => {
    return navigation
      .filter((item) => canAccessPath(currentUser, item.href))
      .map((item) => {
        const params = new URLSearchParams();

        if (currentInstitutionId !== "all" && item.href !== "/institutions") {
          params.set("institutionId", currentInstitutionId);
        }

        const queryString = params.toString();

        return {
          ...item,
          href: queryString ? `${item.href}?${queryString}` : item.href,
        };
      });
  }, [currentInstitutionId, currentUser]);

  function handleInstitutionChange(value) {
    if (pathname === "/institutions") {
      setRouteLoadingLabel("");
      return;
    }

    const nextValue = value === "all" ? "" : value;

    const params = new URLSearchParams(searchParams.toString());

    if (nextValue) {
      params.set("institutionId", nextValue);
    } else {
      params.delete("institutionId");
    }

    const queryString = params.toString();
    const nextHref = queryString ? `${pathname}?${queryString}` : pathname;

    setRouteLoadingLabel(
      nextValue
        ? institutionById.get(String(nextValue))?.name || "Institution"
        : "All Institutions"
    );

    setPendingInstitutionRefresh(true);

    startTransition(() => {
      router.push(nextHref);
    });
  }

  function handleStartInstitutionSelect(institutionId) {
    window.localStorage.setItem(startFlowStorageKey, "true");
    setStartFlowDismissed(true);
    handleInstitutionChange(String(institutionId));
    setStartFlowOpen(false);
  }

  function handleContinueAllInstitutions() {
    window.localStorage.setItem(startFlowStorageKey, "true");
    setStartFlowDismissed(true);
    setStartFlowOpen(false);
    handleInstitutionChange("all");
  }

  function handleNavigationStart(item) {
    const targetPathname = item.href.split("?")[0];
    const currentHref = currentSearchString
      ? `${pathname}?${currentSearchString}`
      : pathname;

    if (targetPathname === pathname && item.href === currentHref) {
      return;
    }

    setRouteLoadingLabel(item.label);
  }

  useEffect(() => {
    const savedDismissal = window.localStorage.getItem(startFlowStorageKey);

    if (savedDismissal === "true") {
      setStartFlowDismissed(true);
      setStartFlowOpen(false);
    }
  }, []);

  useEffect(() => {
    if (currentInstitutionId !== "all") {
      setStartFlowOpen(false);
      return;
    }

    setStartFlowOpen(!startFlowDismissed && institutions.length > 0);
  }, [currentInstitutionId, institutions.length, startFlowDismissed]);

  useEffect(() => {
    setRouteLoadingLabel("");
  }, [pathname, currentSearchString]);

  useEffect(() => {
    if (!pendingInstitutionRefresh) return;

    setPendingInstitutionRefresh(false);
    router.refresh();
  }, [currentSearchString, pendingInstitutionRefresh, router]);

  useEffect(() => {
    preservedNavigation.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [preservedNavigation, router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fbff,white_42%,#f8fafc)] text-slate-950">
      {routeLoadingLabel ? (
        <div className="fixed inset-x-0 top-0 z-[70]">
          <div className="h-1 overflow-hidden bg-blue-100">
            <div className="h-full w-1/3 animate-route-progress rounded-r-full bg-blue-600" />
          </div>

          <div className="pointer-events-none absolute right-4 top-3 hidden items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-semibold text-blue-700 shadow-lg backdrop-blur sm:flex">
            <LottieLoader ariaLabel="" className="h-7 w-7" name="dataTable" />
            Opening {routeLoadingLabel}
          </div>
        </div>
      ) : null}

      {startFlowOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-in-fade">
          <Card className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.22)] animate-in-rise">
            <CardContent className="space-y-8 p-8">
              <div className="space-y-3 text-center">
                <LottieLoader
                  loop={false}
                  ariaLabel=""
                  className="mx-auto h-52 w-auto"
                  name="school"
                />

                <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
                  Start Flow
                </p>

                <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                  Select Institution
                </h2>

                <p className="mx-auto max-w-xl text-sm leading-6 text-slate-500">
                  Choose an institution before entering the dashboard so only
                  the required data is loaded.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {institutions.map((institution) => (
                  <button
                    className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-xl active:translate-y-0 active:scale-[0.99]"
                    key={institution.id}
                    onClick={() => handleStartInstitutionSelect(institution.id)}
                    type="button"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-slate-950">
                          {institution.name}
                        </p>

                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                          {institution.type}
                          {institution.code ? ` • ${institution.code}` : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-center border-t border-slate-100 pt-6">
                <Button
                  onClick={handleContinueAllInstitutions}
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-slate-200 bg-white px-6 shadow-sm hover:bg-slate-50"
                >
                  Continue With All Institutions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200/70 bg-white/95 shadow-[inset_-1px_0_0_rgba(148,163,184,0.08)] backdrop-blur-xl transition-[width] duration-300 ease-out lg:block",
            collapsed ? "w-20" : "w-72"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-5">
              {!collapsed ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200">
                    <GraduationCap className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">
                      Maurya School
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Institution ERP
                    </p>
                  </div>
                </div>
              ) : null}

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCollapsed((current) => !current)}
                className="rounded-2xl hover:bg-slate-100"
              >
                {collapsed ? (
                  <ChevronLast className="h-4 w-4" />
                ) : (
                  <ChevronFirst className="h-4 w-4" />
                )}
              </Button>
            </div>

            <nav className="flex-1 space-y-2 p-3">
              {preservedNavigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href.split("?")[0];

                return (
                  <Link
                    className={cn(
                      "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300",
                      "text-slate-600 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950 active:translate-y-0",
                      active &&
                      "border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r-full before:bg-blue-600",
                      collapsed && "justify-center px-2"
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => handleNavigationStart(item)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {mobileOpen ? (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200/70 bg-white/95 p-3 shadow-2xl backdrop-blur-xl transition-transform lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-2 pb-4 pt-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-950">
                Maurya School
              </p>
              <p className="text-xs text-slate-500">Institution ERP</p>
            </div>
          </div>

          <nav className="space-y-2 pt-5">
            {preservedNavigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href.split("?")[0];

              return (
                <Link
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300",
                    "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    active &&
                    "border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r-full before:bg-blue-600"
                  )}
                  href={item.href}
                  key={item.href}
                  onClick={() => {
                    handleNavigationStart(item);
                    setMobileOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out",
            collapsed ? "lg:pl-20" : "lg:pl-72"
          )}
        >
          <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
            <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-6 py-4">
              <Button
                className="h-11 w-11 rounded-2xl border-slate-200 bg-white shadow-sm lg:hidden"
                size="icon"
                variant="outline"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>

              <div className="min-w-0 flex-1 space-y-2">
                <Breadcrumb items={breadcrumbItems} />

                <h1 className="truncate text-3xl font-bold tracking-tight text-slate-950">
                  {titleMap[pathname] || "Dashboard"}
                </h1>
              </div>

              {pathname !== "/institutions" ? (
                <div className="hidden min-w-72 xl:block">
                  <Select
                    value={currentInstitutionId}
                    onValueChange={handleInstitutionChange}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white px-4 shadow-sm hover:bg-slate-50">
                      <SelectValue placeholder="All Institutions" />
                    </SelectTrigger>

                    <SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl">
                      <SelectItem value="all">All Institutions</SelectItem>

                      {institutions.map((institution) => (
                        <SelectItem
                          key={institution.id}
                          value={String(institution.id)}
                        >
                          {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl border-slate-200 bg-white px-4 shadow-sm hover:bg-slate-50"
                  >
                    <UserCircle2 className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {currentUser?.name || "Account"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-64 rounded-2xl border-slate-200 bg-white p-2 shadow-xl"
                >
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-bold text-slate-950">Account</p>
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        {currentUser?.email || "No email"}
                      </p>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem disabled className="rounded-xl">
                    Role: {currentUser?.role || "No role"}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="rounded-xl text-red-600 focus:bg-red-50 focus:text-red-700"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      router.push("/login");
                      router.refresh();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1440px] p-6">
              <div className="rounded-[32px] border border-slate-200/70 bg-white/70 p-6 shadow-[0_10px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}