import { cn } from "../../lib/utils.js";

export function Select({ className, children, ...props }) {
  const normalizedProps =
    Object.prototype.hasOwnProperty.call(props, "value") && props.value === null
      ? { ...props, value: "" }
      : props;

  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm shadow-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...normalizedProps}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
        ▼
      </span>
    </div>
  );
}
