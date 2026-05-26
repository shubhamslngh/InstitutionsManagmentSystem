"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "../../lib/utils.js";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(
    ({ className, sideOffset = 8, ...props }, ref) => (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                ref={ref}
                sideOffset={sideOffset}
                className={cn(
                    "z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-2xl animate-in fade-in-80",
                    "data-[side=bottom]:slide-in-from-top-2",
                    "data-[side=top]:slide-in-from-bottom-2",
                    className
                )}
                {...props}
            />
        </TooltipPrimitive.Portal>
    )
);

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider,
};