'use client';

export interface EmptyStateProps {
  /** Decorative icon — rendered aria-hidden. */
  icon?: React.ReactNode;
  message: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      {icon && (
        <span className="ui-empty__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div>{message}</div>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}
