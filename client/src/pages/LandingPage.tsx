import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Zap,
  Palette,
  Users,
  Cloud,
  MousePointer2,
  ArrowRight,
  Infinity,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const features = [
    {
      icon: Zap,
      label: 'Real-time sync',
      desc: 'Y.js CRDT under the hood. Changes merge instantly, no conflicts, no lag.',
    },
    {
      icon: MousePointer2,
      label: 'Live cursors',
      desc: "See every collaborator's cursor and strokes in real time.",
    },
    {
      icon: Palette,
      label: 'Drawing tools',
      desc: 'Pen, shapes, text, selection. Everything you need, nothing you don't.',
    },
    {
      icon: Users,
      label: 'Role permissions',
      desc: 'Owner, editor, viewer. Invite anyone with a shareable link.',
    },
    {
      icon: Infinity,
      label: 'Infinite canvas',
      desc: 'Pan and zoom without limits. Your ideas don't fit in a box.',
    },
    {
      icon: Cloud,
      label: 'Auto-saved',
      desc: 'Backed by Supabase. Every stroke persists, every session restores.',
    },
  ];

  const dm = "'DM Sans', sans-serif";
  const mono = "'DM Mono', monospace";
  const serif = "'DM Serif Display', serif";

  return (
    <div
      style={{
        fontFamily: dm,
        background: '#0d0d0d',
        color: '#ede9e1',
        minHeight: '100vh',
      }}
    >
      {/* Nav */}
      <nav
        style={{ borderBottom: '1px solid #1c1c1c' }}
      >
        <div
          className="max-w-6xl mx-auto px-8"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 60,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: '#ede9e1',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0d0d0d"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: mono,
                fontSize: 14,
                letterSpacing: '-0.01em',
                color: '#ede9e1',
              }}
            >
              syncspace
            </span>
          </div>

          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent',
              color: '#888',
              border: '1px solid #222',
              padding: '7px 16px',
              fontSize: 13,
              fontFamily: mono,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#ede9e1';
              e.currentTarget.style.borderColor = '#444';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#888';
              e.currentTarget.style.borderColor = '#222';
            }}
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="max-w-6xl mx-auto px-8"
        style={{ paddingTop: 112, paddingBottom: 112 }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            letterSpacing: '0.12em',
            color: '#444',
            textTransform: 'uppercase',
            marginBottom: 36,
          }}
        >
          Collaborative whiteboard
        </div>

        <h1
          style={{
            fontFamily: serif,
            fontSize: 'clamp(52px, 7.5vw, 104px)',
            fontWeight: 400,
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
            color: '#ede9e1',
            maxWidth: 860,
            marginBottom: 44,
          }}
        >
          Draw together,
          <br />
          <em style={{ color: '#555' }}>think together.</em>
        </h1>

        <p
          style={{
            fontSize: 17,
            color: '#666',
            maxWidth: 460,
            lineHeight: 1.7,
            marginBottom: 52,
            fontWeight: 300,
          }}
        >
          A real-time whiteboard for teams. Infinite canvas, live cursors,
          and persistent state — built for actual work.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#ede9e1',
              color: '#0d0d0d',
              border: 'none',
              padding: '14px 28px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: dm,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              letterSpacing: '-0.01em',
              transition: 'background 0.15s',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = '#d8d3cb')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = '#ede9e1')
            }
          >
            Get started free <ArrowRight size={14} />
          </button>
          <span
            style={{
              fontFamily: mono,
              fontSize: 12,
              color: '#333',
            }}
          >
            No credit card
          </span>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1c1c1c' }} />

      {/* Features grid */}
      <section
        className="max-w-6xl mx-auto"
        style={{ paddingTop: 0, paddingBottom: 0 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
          }}
        >
          {features.map((f, i) => {
            const Icon = f.icon;
            const col = i % 3;
            const row = Math.floor(i / 3);
            return (
              <div
                key={i}
                style={{
                  padding: '40px 36px',
                  borderRight: col < 2 ? '1px solid #1c1c1c' : 'none',
                  borderBottom: row === 0 ? '1px solid #1c1c1c' : 'none',
                }}
              >
                <Icon
                  size={17}
                  style={{ color: '#3a3a3a', marginBottom: 22 }}
                />
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    color: '#ede9e1',
                    marginBottom: 10,
                    letterSpacing: '0.01em',
                  }}
                >
                  {f.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#4a4a4a',
                    lineHeight: 1.65,
                    fontWeight: 300,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1c1c1c' }} />

      {/* CTA */}
      <section
        className="max-w-6xl mx-auto px-8"
        style={{ paddingTop: 96, paddingBottom: 96 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 11,
                letterSpacing: '0.12em',
                color: '#333',
                textTransform: 'uppercase',
                marginBottom: 24,
              }}
            >
              Open to everyone
            </div>
            <h2
              style={{
                fontFamily: serif,
                fontSize: 'clamp(32px, 4vw, 52px)',
                fontWeight: 400,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                color: '#ede9e1',
                marginBottom: 20,
              }}
            >
              Start a workspace,
              <br />
              <em style={{ color: '#555' }}>invite your team.</em>
            </h2>
            <p
              style={{
                fontSize: 15,
                color: '#4a4a4a',
                lineHeight: 1.65,
                fontWeight: 300,
                marginBottom: 36,
              }}
            >
              Sign in with Google. Your whiteboards are waiting.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                color: '#ede9e1',
                border: '1px solid #222',
                padding: '13px 24px',
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: dm,
                letterSpacing: '-0.01em',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#555';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#222';
              }}
            >
              Sign in with Google <ArrowRight size={14} />
            </button>
          </div>

          {/* Tech stack note */}
          <div
            style={{
              borderLeft: '1px solid #1c1c1c',
              paddingLeft: 48,
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 11,
                letterSpacing: '0.12em',
                color: '#2a2a2a',
                textTransform: 'uppercase',
                marginBottom: 20,
              }}
            >
              Built with
            </div>
            {[
              ['Y.js', 'CRDT-based real-time sync'],
              ['Supabase', 'Postgres + Auth + Realtime'],
              ['React', 'Frontend'],
              ['Node.js', 'Collaboration server'],
            ].map(([tech, desc]) => (
              <div
                key={tech}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderBottom: '1px solid #171717',
                }}
              >
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    color: '#555',
                  }}
                >
                  {tech}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: '#2e2e2e',
                    fontWeight: 300,
                  }}
                >
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #1c1c1c' }}>
        <div
          className="max-w-6xl mx-auto px-8"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 52,
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: 12,
              color: '#252525',
            }}
          >
            syncspace
          </span>
          <span
            style={{
              fontFamily: mono,
              fontSize: 12,
              color: '#252525',
            }}
          >
            © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
