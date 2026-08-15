'use client';

import { cx } from './cx';

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** Gap in px. */
  gap?: number;
  as?: 'div' | 'form' | 'section';
  /** Forwarded when `as="form"`. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

/** Vertical flex column — the app's most repeated layout wrapper. */
export function Stack({ gap = 14, as: Tag = 'div', className, style, ...rest }: StackProps) {
  const props = rest as React.HTMLAttributes<HTMLElement>;
  return <Tag className={cx('ui-stack', className)} style={{ gap, ...style }} {...props} />;
}
