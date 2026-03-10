import { cn } from "../../lib/utils.js";

export function Table({ className, ...props }) {
  return <table className={cn("ui-table", className)} {...props} />;
}
