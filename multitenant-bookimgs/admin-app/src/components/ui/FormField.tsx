'use client';

import { Children, cloneElement, isValidElement, useId } from 'react';
import { cx } from './cx';

/* ── Label ─────────────────────────────────────────────────── */

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Appends a muted "(optional)" marker. */
  optional?: boolean;
  /** Appends a red asterisk. Mutually exclusive with `optional`. */
  required?: boolean;
}

export function Label({ optional, required, className, children, ...rest }: LabelProps) {
  return (
    <label className={cx('ui-label', className)} {...rest}>
      {children}
      {required && <span className="ui-label__required" aria-hidden="true">*</span>}
      {optional && <span className="ui-label__optional">(optional)</span>}
    </label>
  );
}

/* ── Hint ──────────────────────────────────────────────────── */

export function Hint({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('ui-hint', className)} {...rest} />;
}

/* ── FormField ─────────────────────────────────────────────── */

export interface FormFieldProps {
  label: React.ReactNode;
  /** Helper text rendered below the control and wired up via aria-describedby. */
  hint?: React.ReactNode;
  optional?: boolean;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Label + control + hint, with `htmlFor`/`id`/`aria-describedby` wired up.
 *
 * The control is expected to be a single element; its `id` is injected so
 * clicking the label focuses it. Pass your own `id` to opt out.
 */
export function FormField({ label, hint, optional, required, className, style, children }: FormFieldProps) {
  const autoId = useId();
  const hintId = hint ? `${autoId}-hint` : undefined;

  const only =
    Children.count(children) === 1 && isValidElement<{ id?: string; 'aria-describedby'?: string }>(children)
      ? children
      : null;

  // Respect a caller-supplied id so `htmlFor` still points at the real control.
  const controlId = only?.props.id ?? autoId;
  const control = only
    ? cloneElement(only, {
        id: controlId,
        'aria-describedby': cx(only.props['aria-describedby'], hintId) || undefined,
      })
    : children;

  return (
    <div className={className} style={style}>
      <Label htmlFor={only ? controlId : undefined} optional={optional} required={required}>
        {label}
      </Label>
      {control}
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </div>
  );
}
