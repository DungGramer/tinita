import type { ReactNode } from 'react';

export interface PingProps {
  /**
   * Optional count to display next to the ping indicator
   */
  count?: number;
  /**
   * Optional prefix content (icon, text, etc.)
   */
  prefix?: ReactNode;
  /**
   * Optional click handler - if provided, wrapper becomes an anchor tag
   */
  onClick?: () => void;
  /**
   * Theme variant
   * @default undefined (inherits from parent)
   */
  theme?: 'light' | 'dark';
  /**
   * Custom className for additional styling
   */
  className?: string;
}

export const Ping = ({
  count,
  prefix,
  onClick,
  theme,
  className = '',
}: PingProps) => {
  const Wrapper = onClick ? 'a' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`tinita-ping ${className}`.trim()}
      data-theme={theme}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {prefix}
      <div className={`inline-flex items-center gap-1 text-[var(--tinita-ping)]${prefix ? ' ml-2' : ''}`}>
        <div className="relative inline-flex">
          <span className="absolute size-2 animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </div>
        {count && <span className="min-w-8 text-xs font-medium tabular-nums">{count}</span>}
      </div>
    </Wrapper>
  );
};
