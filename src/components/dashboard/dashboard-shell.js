"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronFirst,
  ChevronLast,
  CreditCard,
  GraduationCap,
  Home,
  LayoutGrid,
  Menu,
  School,
  UserCircle2
} from "lucide-react";
import { Breadcrumb } from "../ui/breadcrumb.js";
import { Button } from "../ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu.js";
import { Select } from "../ui/select.js";
import { cn } from "../../lib/utils.js";

const navigation = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/institutions", label: "Institutions", icon: Building2 },
  { href: "/classes", label: "Classes", icon: School },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/fees", label: "Fees Dashboard", icon: LayoutGrid },
  { href: "/fees/invoices", label: "Invoices", icon: CreditCard }
];

const titleMap = {
  "/": "Dashboard Overview",
  "/institutions": "Institutions",
  "/classes": "Classes",
  "/students": "Students",
  "/fees": "Fees Dashboard",
  "/fees/invoices": "Invoices"
};

export function DashboardShell({ children, institutions = [] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const breadcrumbItems = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) {
      return [{ href: "/", label: "Dashboard" }];
    }

    return [
      { href: "/", label: "Dashboard" },
      ...parts.map((part, index) => ({
        href: `/${parts.slice(0, index + 1).join("/")}`,
        label: titleMap[`/${parts.slice(0, index + 1).join("/")}`] || part
      }))
    ];
  }, [pathname]);

  function handleInstitutionChange(value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("institutionId", value);
    } else {
      params.delete("institutionId");
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  const currentInstitutionId = searchParams.get("institutionId") || "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden border-r bg-white lg:block",
            collapsed ? "w-20" : "w-72"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-5">
              <div className={cn("space-y-1", collapsed && "hidden")}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Maurya School
                </p>
                <p className="text-sm text-muted-foreground">Institution ERP</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setCollapsed((current) => !current)}>
                {collapsed ? <ChevronLast className="h-4 w-4" /> : <ChevronFirst className="h-4 w-4" />}
              </Button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
                      active && "bg-blue-50 text-primary",
                      collapsed && "justify-center px-2"
                    )}
                    href={item.href}
                    key={item.href}
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
            className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r bg-white p-3 transition-transform lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav className="space-y-1 pt-14">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
                    active && "bg-blue-50 text-primary"
                  )}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className={cn("flex min-w-0 flex-1 flex-col", collapsed ? "lg:pl-20" : "lg:pl-72")}>
          <header className="sticky top-0 z-20 border-b bg-slate-50/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-6 py-4">
              <Button className="lg:hidden" size="icon" variant="outline" onClick={() => setMobileOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1 space-y-2">
                <Breadcrumb items={breadcrumbItems} />
                <div>
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {titleMap[pathname] || "Dashboard"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Modern multi-institution operations across admissions, fees, and finance.
                  </p>
                </div>
              </div>
              <div className="hidden min-w-56 xl:block">
                <Select value={currentInstitutionId} onChange={(event) => handleInstitutionChange(event.target.value)}>
                  <option value="">All Institutions</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </Select>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <UserCircle2 className="h-4 w-4" />
                    Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Institution Settings</DropdownMenuItem>
                  <DropdownMenuItem>Billing & Plans</DropdownMenuItem>
                  <DropdownMenuItem>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1440px] p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
