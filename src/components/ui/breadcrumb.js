import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="flex items-center gap-1" key={item.href || item.label}>
              {isLast ? (
                <span className="font-medium text-foreground">{item.label}</span>
              ) : (
                <Link className="transition-colors hover:text-foreground" href={item.href}>
                  {item.label}
                </Link>
              )}
              {!isLast ? <ChevronRight className="h-4 w-4" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
