import { cn } from "../../lib/utils.js";

export function Textarea({ className, ...props }) {
  const normalizedProps =
    Object.prototype.hasOwnProperty.call(props, "value") && props.value === null
      ? { ...props, value: "" }
      : props;

  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...normalizedProps}
    />
  );
}
