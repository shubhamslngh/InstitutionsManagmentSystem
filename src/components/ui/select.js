"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "../../lib/utils.js";

const EMPTY_OPTION_VALUE = "__radix_select_empty_option__";

function hasLegacyOptions(children) {
  return React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === "option"
  );
}

const Select = React.forwardRef(
  (
    {
      children,
      onChange,
      onValueChange,
      onBlur,
      className,
      value,
      defaultValue,
      name,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const isLegacyMode = hasLegacyOptions(children) || typeof onChange === "function";

    if (isLegacyMode) {
      const mapValue = (nextValue) =>
        nextValue === "" ? EMPTY_OPTION_VALUE : nextValue;
      const handleValueChange = (nextValue) => {
        const nextFormValue =
          nextValue === EMPTY_OPTION_VALUE ? "" : nextValue;

        onValueChange?.(nextFormValue);
        onChange?.({
          target: { name, value: nextFormValue },
          currentTarget: { name, value: nextFormValue },
        });
      };

      return (
        <SelectPrimitive.Root
          defaultValue={mapValue(defaultValue)}
          disabled={disabled}
          name={name}
          onValueChange={handleValueChange}
          required={required}
          value={mapValue(value)}
        >
          <SelectTrigger
            ref={ref}
            className={className}
            onBlur={onBlur}
            {...props}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {React.Children.toArray(children).map((child) => {
              if (!React.isValidElement(child) || child.type !== "option") {
                return child;
              }

              return (
                <SelectItem
                  disabled={child.props.disabled}
                  key={child.key ?? child.props.value}
                  value={mapValue(child.props.value)}
                >
                  {child.props.children}
                </SelectItem>
              );
            })}
          </SelectContent>
        </SelectPrimitive.Root>
      );
    }

    return (
      <SelectPrimitive.Root
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        onValueChange={onValueChange}
        required={required}
        value={value}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    );
  }
);

Select.displayName = "Select";

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200",
        "placeholder:text-slate-400",
        "hover:bg-slate-50",
        "focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}

      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
);

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef((props, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className="flex cursor-default items-center justify-center py-1"
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));

SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef((props, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className="flex cursor-default items-center justify-center py-1"
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));

SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef(
  ({ className, children, position = "popper", ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl animate-in fade-in-80",
          position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />

        <SelectPrimitive.Viewport
          className={cn(
            "p-2",
            position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>

        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
);

SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400",
      className
    )}
    {...props}
  />
));

SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-xl py-3 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition-all",
        "focus:bg-blue-50 focus:text-blue-700",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-blue-600" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
);

SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-slate-100", className)}
    {...props}
  />
));

SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
