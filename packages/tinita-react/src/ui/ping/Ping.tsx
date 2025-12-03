import type { ReactNode } from 'react';

export const Ping = ({
  count,
  prefix,
  onClick,
}: {
  count?: number;
  prefix?: ReactNode;
  onClick?: () => void;
}) => {
  const Wrapper = onClick ? 'a' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 shadow-none transition-colors"
    >
      {prefix}
      <div className={"inline-flex items-center gap-1 text-muted-foreground" + (prefix ? ' ml-2' : '')}>
        <div className="relative inline-flex">
          <span className="absolute size-2 animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </div>
        {count && <span className="min-w-8 text-xs font-medium tabular-nums">{count}</span>}
      </div>
    </Wrapper>
  );
};
