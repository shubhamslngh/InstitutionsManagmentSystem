"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils.js";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function DialogPortal(props) {
  return <DialogPrimitive.Portal {...props} />;
}

function DialogOverlay({ className, ...props }) {
  return <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-slate-950/40", className)} {...props} />;
}

function DialogContent({ className, children, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border bg-card p-6 shadow-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-muted-foreground transition-opacity hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle
};
