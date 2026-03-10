"use client";

import * as React from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { cn } from "../../lib/utils.js";

const FormFieldContext = React.createContext({});

export const Form = FormProvider;

export function FormField(props) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function FormItem({ className, ...props }) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function FormLabel({ className, ...props }) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

export function FormControl({ ...props }) {
  return <div {...props} />;
}

export function FormDescription({ className, ...props }) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function FormMessage({ className, children, ...props }) {
  if (!children) {
    return null;
  }

  return (
    <p className={cn("text-sm font-medium text-destructive", className)} {...props}>
      {children}
    </p>
  );
}

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    name: fieldContext.name,
    ...fieldState
  };
}
