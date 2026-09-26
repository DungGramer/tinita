'use client';

import type { ReactNode } from 'react';
import './Ping.css';

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

export const Ping = ({ count, prefix, onClick, theme, className = '' }: PingProps) => {
  const Wrapper = onClick ? 'a' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`tnt-ping ${className}`.trim()}
      data-theme={theme}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {prefix}
      <div className={`tnt-ping__body${prefix ? ' tnt-ping__body--offset' : ''}`}>
        <div className="tnt-ping__dot-wrap">
          <span className="tnt-ping__pulse" aria-hidden="true" />
          <span className="tnt-ping__dot" aria-hidden="true" />
        </div>
        {count !== undefined && <span className="tnt-ping__count">{count}</span>}
      </div>
    </Wrapper>
  );
};
