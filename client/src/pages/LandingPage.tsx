import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Palette, Users, Cloud, MousePointer2, ArrowRight, Infinity } from 'lucide-react';
import { p } from '@/styles/palette';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const features = [
    { icon: Zap,           label: 'Real-time sync',   desc: 'Y.js CRDT under the hood. Changes merge instantly, no conflicts, no lag.' },
    { icon: MousePointer2, label: 'Live cursors',      desc: "See every collaborator's cursor and strokes in real time." },
    { icon: Palette,       label: 'Drawing tools',     desc: "Pen, shapes, text, selection. Everything you need, nothing you don't." },
    { icon: Users,         label: 'Role permissions',  desc: 'Owner, editor, viewer. Invite anyone with a shareable link.' },
    { icon: Infinity,      label: 'Infinite canvas',   desc: "Pan and zoom without limits. Your ideas don't fit in a box." },
    { icon: Cloud,         label: 'Auto-saved',        desc: 'Backed by Supabase. Every stroke persists, every session restores.' },
  ];

  return (
    <div style={{ fontFamily: p.sans, background: p.bg, color: p.text, minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${p.border}` }}>
        <div className="max-w-6xl mx-auto px-8" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <Logo />
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'transparent', color: p.muted, border: `1px solid ${p.border}`, padding: '7px 16px', fontSize: 13, fontFamily: p.mono, cursor: 'pointer', transition: 'color .15s, border-color .15s' }}
            onMouseOver={e => { e.currentTarget.style.color = p.text; e.currentTarget.style.borderColor = p.border2 }}
            onMouseOut={e =>  { e.currentTarget.style.color = p.muted; e.currentTarget.style.borderColor = p.border }}
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8" style={{ paddingTop: 112, paddingBottom: 112 }}>
        <div style={{ fontFamily: p.mono, fontSize: 11, letterSpacing: '0.12em', color: p.dim, textTransform: 'uppercase', marginBottom: 36 }}>
          Collaborative whiteboard
        </div>
        <h1 style={{ fontFamily: p.serif, fontSize: 'clamp(52px, 7.5vw, 104px)', fontWeight: 400, lineHeight: 1.02, letterSpacing: '-0.025em', color: p.text, maxWidth: 860, marginBottom: 44 }}>
          Draw together,<br />
          <em style={{ color: p.muted }}>think together.</em>
        </h1>
        <p style={{ fontSize: 17, color: p.muted, maxWidth: 460, lineHeight: 1.7, marginBottom: 52, fontWeight: 300 }}>
          A real-time whiteboard for teams. Infinite canvas, live cursors,
          and persistent state — built for actual work.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button
            onClick={() => navigate('/login')}
            style={{ background: p.accent, color: p.bg, border: 'none', padding: '14px 28px', fontSize: 14, fontWeight: 500, fontFamily: p.sans, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em', transition: 'background .15s' }}
            onMouseOver={e => (e.currentTarget.style.background = p.accentH)}
            onMouseOut={e =>  (e.currentTarget.style.background = p.accent)}
          >
            Get started free <ArrowRight size={14} />
          </button>
          <span style={{ fontFamily: p.mono, fontSize: 12, color: p.dim }}>No credit card</span>
        </div>
      </section>

      <div style={{ borderTop: `1px solid ${p.border}` }} />

      {/* Features */}
      <section className="max-w-6xl mx-auto" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            const col = i % 3;
            const row = Math.floor(i / 3);
            return (
              <div key={i} style={{ padding: '40px 36px', borderRight: col < 2 ? `1px solid ${p.border}` : 'none', borderBottom: row === 0 ? `1px solid ${p.border}` : 'none' }}>
                <Icon size={17} style={{ color: p.dim, marginBottom: 22 }} />
                <div style={{ fontFamily: p.mono, fontSize: 12, color: p.text, marginBottom: 10, letterSpacing: '0.01em' }}>{f.label}</div>
                <div style={{ fontSize: 13, color: p.muted, lineHeight: 1.65, fontWeight: 300 }}>{f.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ borderTop: `1px solid ${p.border}` }} />

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-8" style={{ paddingTop: 96, paddingBottom: 96 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: p.mono, fontSize: 11, letterSpacing: '0.12em', color: p.dim, textTransform: 'uppercase', marginBottom: 24 }}>Open to everyone</div>
            <h2 style={{ fontFamily: p.serif, fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.02em', color: p.text, marginBottom: 20 }}>
              Start a workspace,<br /><em style={{ color: p.muted }}>invite your team.</em>
            </h2>
            <p style={{ fontSize: 15, color: p.muted, lineHeight: 1.65, fontWeight: 300, marginBottom: 36 }}>
              Sign in with Google. Your whiteboards are waiting.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{ background: 'transparent', color: p.text, border: `1px solid ${p.border}`, padding: '13px 24px', fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: p.sans, letterSpacing: '-0.01em', transition: 'border-color .15s, color .15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = p.accent; e.currentTarget.style.color = p.accent }}
              onMouseOut={e =>  { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.color = p.text }}
            >
              Sign in with Google <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ borderLeft: `1px solid ${p.border}`, paddingLeft: 48 }}>
            <div style={{ fontFamily: p.mono, fontSize: 11, letterSpacing: '0.12em', color: p.dim, textTransform: 'uppercase', marginBottom: 20 }}>Built with</div>
            {[['Y.js', 'CRDT real-time sync'], ['Supabase', 'Postgres + Auth'], ['React', 'Frontend'], ['Node.js', 'Collab server']].map(([tech, desc]) => (
              <div key={tech} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: `1px solid ${p.border}` }}>
                <span style={{ fontFamily: p.mono, fontSize: 12, color: p.muted }}>{tech}</span>
                <span style={{ fontSize: 12, color: p.dim, fontWeight: 300 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${p.border}` }}>
        <div className="max-w-6xl mx-auto px-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52 }}>
          <span style={{ fontFamily: p.mono, fontSize: 12, color: p.dim }}>syncspace</span>
          <span style={{ fontFamily: p.mono, fontSize: 12, color: p.dim }}>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, background: p.accent, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={p.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>
      <span style={{ fontFamily: p.mono, fontSize: 14, color: p.text, letterSpacing: '-0.01em' }}>syncspace</span>
    </div>
  );
}

export default LandingPage;
