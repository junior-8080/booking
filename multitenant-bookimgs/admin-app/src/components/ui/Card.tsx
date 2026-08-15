'use client';

import { cx } from './cx';

// `title` is redefined as a heading node, so the HTML tooltip attribute is dropped.
export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Section heading rendered above the content. */
  title?: React.ReactNode;
  /** Supporting line under the title. */
  subtitle?: React.ReactNode;
  /** Denser padding, for list rows rather than form sections. */
  tight?: boolean;
  /** Lift off the page with a shadow. */
  raised?: boolean;
  as?: 'div' | 'section';
}

export function Card({
  title,
  subtitle,
  tight,
  raised,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag className={cx('ui-card', tight && 'ui-card--tight', raised && 'ui-card--raised', className)} {...rest}>
      {title && <h2 className="ui-card__title">{title}</h2>}
      {subtitle && <p className="ui-card__sub">{subtitle}</p>}
      {children}
    </Tag>
  );
}
