import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils.js";
import { buttonVariants } from "./button.variants.js";

export function Button({ asChild = false, className, variant, size, type = "button", ...props }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}

export { buttonVariants };
