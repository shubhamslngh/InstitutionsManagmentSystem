import { cn } from "../../lib/utils.js";

export function Select({ className, children, ...props }) {
  return (
    <div className="ui-select-wrap">
      <select className={cn("ui-select", className)} {...props}>
        {children}
      </select>
    </div>
  );
}
