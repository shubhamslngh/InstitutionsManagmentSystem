"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils.js";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className, sideOffset = 8, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn("z-50 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)}
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-muted", className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }) {
  return <DropdownMenuPrimitive.Label className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }) {
  return <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-muted", className)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}
