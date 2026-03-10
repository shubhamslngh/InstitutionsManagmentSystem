import { cn } from "../../lib/utils.js";

export function Table({ className, ...props }) {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn("border-b transition-colors hover:bg-muted/60 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn("p-4 align-middle text-sm", className)} {...props} />;
}
