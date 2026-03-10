import { cn } from "../../lib/utils.js";

export function Button({ className, variant = "default", size = "default", ...props }) {
  return (
    <button
      className={cn(
        "ui-button",
        variant !== "default" ? `ui-button-${variant}` : "",
        size !== "default" ? `ui-button-${size}` : "",
        className
      )}
      {...props}
    />
  );
}
