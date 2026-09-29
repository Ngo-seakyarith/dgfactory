"use client";

import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Input } from "./input";
import { Select } from "./select";
import { Textarea } from "./textarea";

const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

function useControl<T>() {
  const field = useFieldContext<T>();
  const id = useId();
  const errors = field.state.meta.isTouched ? field.state.meta.errors.flatMap((error) => {
    if (typeof error === "string") return [error];
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return [error.message];
    return [];
  }) : [];
  return {
    field, id, errors,
    accessibility: { id, name: field.name, "aria-invalid": errors.length > 0, "aria-describedby": errors.length ? `${id}-error` : undefined },
  };
}

function FieldFrame({ id, label, errors, children }: { id: string; label: string; errors: string[]; children: ReactNode }) {
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
    {children}
    {errors.length ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{[...new Set(errors)].join(" ")}</p> : null}
  </div>;
}

type InputProps = Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "onBlur" | "id" | "name">;

function TextField({ label, ...props }: InputProps & { label: string }) {
  const control = useControl<string>();
  return <FieldFrame {...control} label={label}><Input {...props} {...control.accessibility} value={control.field.state.value} onBlur={control.field.handleBlur} onChange={(event) => control.field.handleChange(event.target.value)} /></FieldFrame>;
}

function NumberField({ label, ...props }: InputProps & { label: string }) {
  const control = useControl<number | null>();
  return <FieldFrame {...control} label={label}><Input {...props} {...control.accessibility} type="number" value={control.field.state.value ?? ""} onBlur={control.field.handleBlur} onChange={(event) => control.field.handleChange(event.target.value === "" ? null : event.target.valueAsNumber)} /></FieldFrame>;
}

function DateField({ label, ...props }: InputProps & { label: string }) {
  const control = useControl<string | null | undefined>();
  return <FieldFrame {...control} label={label}><Input {...props} {...control.accessibility} type="date" value={control.field.state.value ?? ""} onBlur={control.field.handleBlur} onChange={(event) => control.field.handleChange(event.target.value || null)} /></FieldFrame>;
}

function SelectField({ label, children, ...props }: Omit<ComponentProps<typeof Select>, "value" | "defaultValue" | "onChange" | "onBlur" | "id" | "name"> & { label: string }) {
  const control = useControl<string>();
  return <FieldFrame {...control} label={label}><Select {...props} {...control.accessibility} value={control.field.state.value} onBlur={control.field.handleBlur} onChange={(event) => control.field.handleChange(event.target.value)}>{children}</Select></FieldFrame>;
}

function TextareaField({ label, ...props }: Omit<ComponentProps<typeof Textarea>, "value" | "defaultValue" | "onChange" | "onBlur" | "id" | "name"> & { label: string }) {
  const control = useControl<string>();
  return <FieldFrame {...control} label={label}><Textarea {...props} {...control.accessibility} value={control.field.state.value} onBlur={control.field.handleBlur} onChange={(event) => control.field.handleChange(event.target.value)} /></FieldFrame>;
}

export const { useAppForm, withForm } = createFormHook({
  fieldContext, formContext,
  fieldComponents: { TextField, NumberField, DateField, SelectField, TextareaField },
  formComponents: {},
});
