import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

const meta: Meta = {
  title: 'Styles/Animations',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Comprehensive test suite for all animations and transitions defined in animations.css. Includes transition utilities, keyframe animations, backdrop effects, and accessibility features.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component for interactive animations
const AnimationDemo = ({
  className,
  label,
  children,
  onClick,
}: {
  className: string;
  label: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
        {label}
      </div>
      <div
        className={className}
        onClick={onClick}
        style={{
          padding: '1.5rem',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          cursor: onClick ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80px',
        }}
      >
        {children || <div style={{ color: '#374151' }}>Click to trigger</div>}
      </div>
    </div>
  );
};

// ============================================
// 2. Component-Specific Transitions
// ============================================

export const ComponentTransitions: Story = {
  render: () => {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 600 }}>
          Component-Specific Transitions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              Button Press Effect (.tinita-btn)
            </div>
            <button
              className="tinita-btn"
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Press Me
            </button>
          </div>

          <div>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              Card Hover Lift (.tinita-card)
            </div>
            <div
              className="tinita-card"
              style={{
                padding: '2rem',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                maxWidth: '300px',
              }}
            >
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Card Title</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Hover to see lift effect</p>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// ============================================
// 4. Navigation Animations
// ============================================

export const NavigationAnimations: Story = {
  render: () => {
    const [trigger, setTrigger] = useState(0);

    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 600 }}>Navigation Animations</h2>

        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setTrigger((prev) => prev + 1)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Trigger Navigation
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              Push In (Right to Left)
            </div>
            <div style={{ position: 'relative', height: '200px', overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <div
                key={`push-in-${trigger}`}
                className="animate-push-in"
                style={{
                  background: '#2563eb',
                  color: 'white',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 500,
                }}
              >
                Push In
              </div>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              Pop In (Left to Right)
            </div>
            <div style={{ position: 'relative', height: '200px', overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <div
                key={`pop-in-${trigger}`}
                className="animate-pop-in"
                style={{
                  background: '#10b981',
                  color: 'white',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 500,
                }}
              >
                Pop In
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// ============================================
// 5. Backdrop Effects
// ============================================

export const BackdropEffects: Story = {
  render: () => {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 600 }}>Backdrop Effects (Frosted Glass)</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              Standard Backdrop (.tinita-backdrop)
            </div>
            <div
              style={{
                position: 'relative',
                height: '200px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                className="tinita-backdrop"
                style={{
                  padding: '2rem',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a1a1a',
                  fontWeight: 600,
                  fontSize: '1.25rem',
                }}
              >
                Standard Backdrop
              </div>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              Heavy Backdrop (.tinita-backdrop-heavy)
            </div>
            <div
              style={{
                position: 'relative',
                height: '200px',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                className="tinita-backdrop-heavy"
                style={{
                  padding: '2rem',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a1a1a',
                  fontWeight: 600,
                  fontSize: '1.25rem',
                }}
              >
                Heavy Backdrop
              </div>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
              Overlay Backdrop (.tinita-backdrop-overlay)
            </div>
            <div
              style={{
                position: 'relative',
                height: '200px',
                background: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800") center/cover',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                className="tinita-backdrop-overlay"
                style={{
                  padding: '2rem',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.25rem',
                }}
              >
                Overlay Backdrop
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// ============================================
// 7. All Animations Overview
// ============================================

export const AllAnimations: Story = {
  render: () => {
    const [trigger, setTrigger] = useState(0);

    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 700 }}>All Animations Overview</h1>

        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setTrigger((prev) => prev + 1)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Trigger All Animations
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div
            key={`fade-${trigger}`}
            className="animate-fade-in"
            style={{
              padding: '1.5rem',
              background: '#2563eb',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Fade In
          </div>

          <div
            key={`sheet-${trigger}`}
            className="animate-sheet-up"
            style={{
              padding: '1.5rem',
              background: '#10b981',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Sheet Up
          </div>

          <div
            key={`alert-${trigger}`}
            className="animate-alert-in"
            style={{
              padding: '1.5rem',
              background: '#f59e0b',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Alert
          </div>

          <div
            key={`modal-${trigger}`}
            className="animate-modal-in"
            style={{
              padding: '1.5rem',
              background: '#8b5cf6',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Modal
          </div>

          <div
            key={`popover-${trigger}`}
            className="animate-popover-in"
            style={{
              padding: '1.5rem',
              background: '#ec4899',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Popover
          </div>

          <div
            key={`slide-up-${trigger}`}
            className="animate-slide-up"
            style={{
              padding: '1.5rem',
              background: '#ef4444',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Slide Up
          </div>

          <div
            key={`slide-down-${trigger}`}
            className="animate-slide-down"
            style={{
              padding: '1.5rem',
              background: '#06b6d4',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Slide Down
          </div>

          <div
            key={`slide-left-${trigger}`}
            className="animate-slide-left"
            style={{
              padding: '1.5rem',
              background: '#14b8a6',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Slide Left
          </div>

          <div
            key={`slide-right-${trigger}`}
            className="animate-slide-right"
            style={{
              padding: '1.5rem',
              background: '#6366f1',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Slide Right
          </div>
        </div>
      </div>
    );
  },
};
