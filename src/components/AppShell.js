"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "./ui/badge.js";

const links = [
  { href: "/", label: "Overview" },
  { href: "/institutions", label: "Institutions" },
  { href: "/classes", label: "Classes" },
  { href: "/students", label: "Students" },
  { href: "/fees", label: "Fees" }
];

export default function AppShell({ eyebrow, title, description, children }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-kicker">Maurya Softwares</span>
          <strong>Maurya School Management</strong>
          <p>Operations dashboard for institutions, classes, students, and finance.</p>
          <Badge className="sidebar-badge" variant="secondary">
            Multi-campus admin
          </Badge>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="content-area">
        <header className="page-bar">
          <div className="page-intro">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{description}</p>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
