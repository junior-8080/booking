'use client';

import { forwardRef } from 'react';
import { cx } from './cx';

export type FieldSize = 'sm' | 'md';

interface FieldStyleProps {
  size?: FieldSize;
  /** Recess the field against a raised card instead of matching it. */
  inset?: boolean;
  /** Shrink to content instead of filling the row (inline time pickers, etc.). */
  auto?: boolean;
}

function fieldClass(
  { size = 'md', inset, auto }: FieldStyleProps,
  className: string | undefined,
  ...extra: Array<string | false | undefined>
) {
  return cx(
    'ui-field',
    size === 'sm' && 'ui-field--sm',
    inset && 'ui-field--inset',
    auto && 'ui-field--auto',
    ...extra,
    className,
  );
}

/* ── Input ─────────────────────────────────────────────────── */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldStyleProps {
  /** Trailing unit rendered inside the field, e.g. "min", "%", "GHS". */
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size, inset, auto, suffix, className, ...rest },
  ref,
) {
  const input = <input ref={ref} className={fieldClass({ size, inset, auto }, className)} {...rest} />;
  if (!suffix) return input;
  return (
    <div className="ui-field-wrap">
      {input}
      <span className="ui-field-suffix">{suffix}</span>
    </div>
  );
});

/* ── Textarea ──────────────────────────────────────────────── */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldStyleProps {
  /** Disable the resize grabber (for short, fixed-height notes). */
  fixed?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { size, inset, auto, fixed, className, ...rest },
  ref,
) {
  return (
    <textarea ref={ref} className={fieldClass({ size, inset, auto }, className, fixed && 'ui-field--fixed')} {...rest} />
  );
});

/* ── Select ────────────────────────────────────────────────── */

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    FieldStyleProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size, inset, auto, className, ...rest },
  ref,
) {
  return <select ref={ref} className={fieldClass({ size, inset, auto }, className)} {...rest} />;
});
