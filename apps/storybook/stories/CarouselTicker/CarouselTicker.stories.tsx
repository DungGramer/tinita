import type { Meta, StoryObj } from '@storybook/react-vite';
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';

const meta: Meta<typeof CarouselTicker> = {
  title: 'UI/CarouselTicker',
  component: CarouselTicker,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'React implementation of Webflow Booster "carousel ticker": Infinite content loop along one axis (horizontal/vertical). Automatically calculates required loop count based on container size. Supports overflow, pause on hover, in-view trigger, and ResizeObserver.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: false,
      description: 'Content to loop infinitely (a single "loop" unit)',
    },
    direction: {
      control: 'select',
      options: ['left', 'right', 'top', 'bottom'],
      description: 'Ticker movement direction',
    },
    delayMs: {
      control: 'number',
      description: 'Delay before starting animation (ms)',
    },
    overflowVisible: {
      control: 'boolean',
      description: 'Allow content to overflow container',
    },
    overflowBufferPx: {
      control: 'number',
      description: 'Overflow size in pixels for seamless transitions',
    },
    pauseOnHover: {
      control: 'boolean',
      description: 'Pause animation on hover/touch',
    },
    speedMs: {
      control: 'number',
      description: 'Duration to complete one cycle (ms)',
    },
    trigger: {
      control: 'select',
      options: ['on-load', 'in-view'],
      description: 'Animation trigger mode',
    },
    className: {
      control: 'text',
      description: 'Custom className for root container',
    },
    contentClassName: {
      control: 'text',
      description: 'Custom className for content wrapper',
    },
    fade: {
      control: 'boolean',
      description: 'Enable fade effect on edges',
    },
    fadeColor: {
      control: 'color',
      description: 'Custom fade color (default: white)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample content components
const BadgeItems = () => (
  <>
    {['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Remix'].map((tech) => (
      <div
        key={tech}
        style={{
          padding: '0.5rem 1.5rem',
          margin: '0 0.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '9999px',
          whiteSpace: 'nowrap',
          fontWeight: 600,
        }}
      >
        {tech}
      </div>
    ))}
  </>
);

const CardItems = () => (
  <>
    {[1, 2, 3, 4, 5].map((num) => (
      <div
        key={num}
        style={{
          width: '200px',
          height: '150px',
          margin: '0 1rem',
          background: `linear-gradient(135deg, hsl(${num * 60}, 70%, 60%) 0%, hsl(${num * 60 + 30}, 70%, 50%) 100%)`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '2rem',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        Card {num}
      </div>
    ))}
  </>
);

const LogoItems = () => (
  <>
    {['🚀', '⚡', '🔥', '💎', '✨', '🎯', '🌟'].map((emoji, idx) => (
      <div
        key={idx}
        style={{
          padding: '1rem 2rem',
          margin: '0 1rem',
          fontSize: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {emoji}
      </div>
    ))}
  </>
);

export const Default: Story = {
  args: {
    children: <BadgeItems />,
    direction: 'left',
    speedMs: 8000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', overflow: 'hidden', padding: '2rem 0', background: '#f9fafb', borderRadius: '8px' }}>
        <Story />
      </div>
    ),
  ],
};

export const AllDirections: Story = {
  args: {
    children: <></>,
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', padding: '2rem' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Left</h3>
        <div style={{ width: '100%', overflow: 'hidden', padding: '1rem 0', background: '#f9fafb', borderRadius: '8px' }}>
          <CarouselTicker direction="left" speedMs={8000}>
            <BadgeItems />
          </CarouselTicker>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Right</h3>
        <div style={{ width: '100%', overflow: 'hidden', padding: '1rem 0', background: '#f9fafb', borderRadius: '8px' }}>
          <CarouselTicker direction="right" speedMs={8000}>
            <BadgeItems />
          </CarouselTicker>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Top</h3>
        <div style={{ height: '200px', overflow: 'hidden', padding: '0 1rem', background: '#f9fafb', borderRadius: '8px' }}>
          <CarouselTicker direction="top" speedMs={6000}>
            <LogoItems />
          </CarouselTicker>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Bottom</h3>
        <div style={{ height: '200px', overflow: 'hidden', padding: '0 1rem', background: '#f9fafb', borderRadius: '8px' }}>
          <CarouselTicker direction="bottom" speedMs={6000}>
            <LogoItems />
          </CarouselTicker>
        </div>
      </div>
    </div>
  ),
};

export const WithCards: Story = {
  args: {
    children: <CardItems />,
    direction: 'left',
    speedMs: 12000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', overflow: 'hidden', padding: '2rem 0', background: '#f9fafb' }}>
        <Story />
      </div>
    ),
  ],
};

export const AnimationSpeeds: Story = {
  args: {
    children: <></>,
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Fast (3s)</h3>
        <div style={{ width: '100%', overflow: 'hidden', padding: '1rem 0', background: '#f9fafb', borderRadius: '8px' }}>
          <CarouselTicker direction="left" speedMs={3000}>
            <BadgeItems />
          </CarouselTicker>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Normal (8s)</h3>
        <div style={{ width: '100%', overflow: 'hidden', padding: '1rem 0', background: '#f9fafb', borderRadius: '8px' }}>
          <CarouselTicker direction="left" speedMs={8000}>
            <BadgeItems />
          </CarouselTicker>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Slow (20s)</h3>
        <div style={{ width: '100%', overflow: 'hidden', padding: '1rem 0', background: '#f9fafb', borderRadius: '8px' }}>
          <CarouselTicker direction="left" speedMs={20000}>
            <BadgeItems />
          </CarouselTicker>
        </div>
      </div>
    </div>
  ),
};

export const WithDelay: Story = {
  args: {
    children: <BadgeItems />,
    direction: 'left',
    delayMs: 2000,
    speedMs: 8000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', overflow: 'hidden', padding: '2rem 0', background: '#f9fafb' }}>
        <Story />
      </div>
    ),
  ],
};

export const PauseOnHover: Story = {
  args: {
    children: <BadgeItems />,
    direction: 'left',
    pauseOnHover: true,
    speedMs: 8000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', overflow: 'hidden', padding: '2rem 0', background: '#f9fafb' }}>
        <div style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Hover over the ticker to pause the animation
        </div>
        <Story />
      </div>
    ),
  ],
};

export const InViewTrigger: Story = {
  args: {
    children: <BadgeItems />,
    direction: 'left',
    trigger: 'in-view',
    speedMs: 8000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', padding: '4rem 0' }}>
        <div style={{ marginBottom: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Scroll down to see the ticker start when it enters the viewport
        </div>
        <div style={{ height: '200vh', background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)' }} />
        <div style={{ width: '100%', overflow: 'hidden', padding: '2rem 0', background: '#f9fafb' }}>
          <Story />
        </div>
        <div style={{ height: '200vh', background: 'linear-gradient(to top, #f3f4f6, #e5e7eb)' }} />
      </div>
    ),
  ],
};

export const WithOverflow: Story = {
  args: {
    children: <BadgeItems />,
    direction: 'left',
    overflowVisible: true,
    overflowBufferPx: 200,
    speedMs: 8000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', padding: '2rem 0', background: '#f9fafb' }}>
        <Story />
      </div>
    ),
  ],
};

export const LongContent: Story = {
  args: {
    children: (
      <>
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            style={{
              padding: '0.5rem 2rem',
              margin: '0 0.5rem',
              background: `hsl(${(i * 18) % 360}, 70%, 60%)`,
              color: 'white',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            Item {i + 1}
          </div>
        ))}
      </>
    ),
    direction: 'left',
    speedMs: 15000,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', overflow: 'hidden', padding: '2rem 0', background: '#f9fafb' }}>
        <Story />
      </div>
    ),
  ],
};

export const WithFadeEdges: Story = {
  args: {
    children: (
      <>
        {[
          'React',
          'Vue',
          'Angular',
          'Svelte',
          'Next.js',
          'Nuxt',
          'Remix',
          'Astro',
          'Solid',
          'Qwik',
        ].map((word) => (
          <span
            key={word}
            style={{
              display: 'inline-block',
              fontSize: '32px',
              lineHeight: 1,
              fontWeight: 400,
              whiteSpace: 'nowrap',
            }}
          >
            {word}
          </span>
        ))}
      </>
    ),
    direction: 'left',
    speedMs: 18000,
    delayMs: 0,
    pauseOnHover: true,
    trigger: 'in-view',
    overflowVisible: false,
    overflowBufferPx: 80,
    className: 'w-full',
    contentClassName: 'flex items-center gap-16 whitespace-nowrap',
    fade: true,
    fadeColor: '#fff',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const WithFadeVertical: Story = {
  args: {
    children: <LogoItems />,
    direction: 'top',
    speedMs: 6000,
    fade: true,
    fadeColor: '#f9fafb',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          height: '300px',
          overflow: 'hidden',
          padding: '0 2rem',
          background: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const WithCustomFadeColor: Story = {
  args: {
    children: <BadgeItems />,
    direction: 'left',
    speedMs: 8000,
    fade: true,
    fadeColor: '#ff0000',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          padding: '2rem 0',
          background: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
