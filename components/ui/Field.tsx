"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

function fieldClasses(error?: boolean) {
  return cn(
    "w-full rounded-md border bg-surface px-3.5 py-2.5 text-body-md text-charcoal placeholder:text-ink-muted",
    "focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage",
    error ? "border-danger" : "border-border-strong"
  );
}

function Wrapper({
  label,
  error,
  children,
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-label-md text-charcoal">{label}</span>}
      {children}
      {error && <span className="mt-1 block text-caption text-danger">{error}</span>}
    </label>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, ...props },
  ref
) {
  return (
    <Wrapper label={label} error={error}>
      <input ref={ref} className={cn(fieldClasses(Boolean(error)), className)} {...props} />
    </Wrapper>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, children, ...props },
  ref
) {
  return (
    <Wrapper label={label} error={error}>
      <select ref={ref} className={cn(fieldClasses(Boolean(error)), className)} {...props}>
        {children}
      </select>
    </Wrapper>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, ...props },
  ref
) {
  return (
    <Wrapper label={label} error={error}>
      <textarea ref={ref} className={cn(fieldClasses(Boolean(error)), className)} {...props} />
    </Wrapper>
  );
});
