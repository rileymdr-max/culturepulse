import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Playfair_Display, DM_Sans } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--lp-serif",
});

const dm = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--lp-sans",
});

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardedAt: true },
    });
    redirect(user?.onboardedAt ? "/dashboard" : "/onboarding");
  }

  return (
    <div className={`lp ${playfair.variable} ${dm.variable}`}>
      <style>{css}</style>

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <Link href="/" className="lp-brand">
            <div className="lp-logo-box">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2.5" fill="white" />
                <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
              </svg>
            </div>
            <div className="lp-brand-words">
              <span className="lp-brand-name">CulturePulse</span>
              <span className="lp-brand-sub">Social Intelligence Platform</span>
            </div>
          </Link>
          <div className="lp-nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="lp-nav-actions">
            <Link href="/login" className="lp-btn-ghost">Sign in</Link>
            <Link href="/login" className="lp-btn-nav">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-left">
            <h1 className="lp-h1">
              Track trends and conversations within subcultures,{" "}
              <span className="lp-h1-accent">before they break.</span>
            </h1>
            <p className="lp-hero-sub">
              CulturePulse surfaces emerging discussions, signals, and momentum inside micro-communities across Reddit, TikTok, Instagram, X, and Substack — so your brand moves first.
            </p>
            <div className="lp-hero-ctas">
              <Link href="/login" className="lp-btn-cta-primary">
                Start for free
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a href="#how" className="lp-btn-cta-outline">See how it works</a>
            </div>
            <p className="lp-hero-note">Free plan available · No credit card required</p>
          </div>

          {/* Browser mock */}
          <div className="lp-browser">
            <div className="lp-b-chrome">
              <div className="lp-b-dots">
                <span className="lp-b-dot lp-r" /><span className="lp-b-dot lp-y" /><span className="lp-b-dot lp-g" />
              </div>
              <div className="lp-b-url">culturepulse.app/dashboard</div>
            </div>
            <div className="lp-b-nav">
              <div className="lp-b-brand">
                <span className="lp-b-brand-dot" /> CulturePulse
              </div>
              <div className="lp-b-tabs">
                <span className="lp-b-tab lp-on">Search</span>
                <span className="lp-b-tab">Library</span>
                <span className="lp-b-tab">Signals</span>
                <span className="lp-b-tab">Briefs</span>
              </div>
            </div>
            <div className="lp-b-body">
              <div className="lp-b-search">
                <span className="lp-b-search-q">quiet luxury fashion</span>
                <span className="lp-b-search-btn">Search</span>
              </div>
              <div className="lp-b-label">↑ Globally Trending</div>
              <div className="lp-b-cards">
                <MockCard tier="brk" badge="BREAKOUT" score="84" name="Quiet luxury fashion" pct={84} platforms="Reddit · TikTok · Instagram · X" />
                <MockCard tier="trn" badge="TRENDING" score="61" name="Dark academia aesthetic" pct={61} platforms="Tumblr · Reddit · X · Substack" />
                <MockCard tier="grw" badge="GROWING" score="47" name="Van life movement" pct={47} platforms="YouTube · Reddit · Instagram" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="lp-stats-band">
        <div className="lp-stats-inner">
          <div className="lp-stat"><div className="lp-stat-num">5,000+</div><div className="lp-stat-label">Communities tracked</div></div>
          <div className="lp-stat"><div className="lp-stat-num">6</div><div className="lp-stat-label">Social platforms</div></div>
          <div className="lp-stat"><div className="lp-stat-num">Real-time</div><div className="lp-stat-label">Signal velocity</div></div>
          <div className="lp-stat"><div className="lp-stat-num">24hr</div><div className="lp-stat-label">Data freshness</div></div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-how" id="how">
        <div className="lp-wrap">
          <div className="lp-eyebrow">How it works</div>
          <h2 className="lp-sec-title">From search to strategy <span className="lp-h1-accent">in minutes</span></h2>
          <p className="lp-sec-sub">Three steps from a cultural hunch to a brief your creative team can act on today.</p>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">01</div>
              <div className="lp-step-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5" stroke="#4f46e5" strokeWidth="1.5" /><path d="M13.5 13.5l3 3" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <div className="lp-step-title">Discover micro-communities</div>
              <p className="lp-step-desc">Search any subculture, niche, or interest. CulturePulse returns live signal data — velocity scores, top voices, platform distribution, and behavioral keywords from across the social web.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">02</div>
              <div className="lp-step-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 10a7 7 0 1014 0A7 7 0 003 10z" stroke="#4f46e5" strokeWidth="1.5" /><path d="M10 6v4l2.5 2.5" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <div className="lp-step-title">Monitor with live signals</div>
              <p className="lp-step-desc">Pin communities to your Signal Board for continuous monitoring. Get breakout alerts, velocity changes, and content shifts — with platform-level context from Reddit, TikTok, and beyond.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">03</div>
              <div className="lp-step-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="2" stroke="#4f46e5" strokeWidth="1.5" /><path d="M7 8h6M7 11h4" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <div className="lp-step-title">Generate strategy briefs</div>
              <p className="lp-step-desc">One click generates a Claude-powered content brief with platform-specific angles, creative hooks, brand fit signals, and urgency scoring — ready for any creative team.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-features" id="features">
        <div className="lp-wrap">
          <div className="lp-eyebrow">Platform capabilities</div>
          <h2 className="lp-sec-title">Everything your brand needs<br />to stay <span className="lp-h1-accent">culturally current</span></h2>
          <div className="lp-feat-grid">
            <div className="lp-feat">
              <div className="lp-feat-icon"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="#4f46e5" strokeWidth="1.5" /><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" /></svg></div>
              <div className="lp-feat-title">Signal Board</div>
              <p className="lp-feat-desc">Track emerging subcultures in real time with velocity scores, breakout alerts, and content shift detection. Know what's accelerating before the headlines do.</p>
              <div className="lp-feat-tags"><span>Velocity scoring</span><span>Breakout alerts</span><span>Trend detection</span></div>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-icon"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" stroke="#4f46e5" strokeWidth="1.5" /><rect x="13" y="3" width="6" height="6" rx="1.5" stroke="#4f46e5" strokeWidth="1.5" /><rect x="3" y="13" width="6" height="6" rx="1.5" stroke="#4f46e5" strokeWidth="1.5" /><rect x="13" y="13" width="6" height="6" rx="1.5" stroke="#4f46e5" strokeWidth="1.5" /></svg></div>
              <div className="lp-feat-title">Subculture Library</div>
              <p className="lp-feat-desc">Deep intelligence profiles covering keywords, vernacular, behavioral patterns, cultural icons, psychographics, and brand fit signals — built from real community data.</p>
              <div className="lp-feat-tags"><span>Psychographics</span><span>Brand fit signals</span><span>Vernacular maps</span></div>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-icon"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 6h12M5 10h8M5 14h10" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" /></svg></div>
              <div className="lp-feat-title">Content Briefs</div>
              <p className="lp-feat-desc">Strategy documents built from live signal context and deep cultural profiles. Each brief includes platform-specific angles, timing hooks, and urgency scoring — in under two minutes.</p>
              <div className="lp-feat-tags"><span>Platform angles</span><span>Creative hooks</span><span>Urgency scoring</span></div>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-icon"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="5" cy="11" r="2" stroke="#4f46e5" strokeWidth="1.5" /><circle cx="17" cy="6" r="2" stroke="#4f46e5" strokeWidth="1.5" /><circle cx="17" cy="16" r="2" stroke="#4f46e5" strokeWidth="1.5" /><path d="M7 10.2l8-3.4M7 11.8l8 3.4" stroke="#4f46e5" strokeWidth="1.5" /></svg></div>
              <div className="lp-feat-title">Multi-platform coverage</div>
              <p className="lp-feat-desc">Reddit communities, TikTok creators, Instagram hashtags, X conversations, Facebook groups, and Substack newsletters — unified into a single cultural intelligence layer.</p>
              <div className="lp-feat-tags"><span>Reddit</span><span>TikTok</span><span>Instagram</span><span>Substack</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-wrap">
          <div className="lp-eyebrow">Pricing</div>
          <h2 className="lp-sec-title">Start free, scale<br /><span className="lp-h1-accent">as your intelligence needs grow</span></h2>
          <div className="lp-plan-grid">
            <div className="lp-plan">
              <div className="lp-plan-name">Free</div>
              <div className="lp-plan-price"><strong>$0</strong></div>
              <div className="lp-plan-desc">Explore the platform and test your first searches — no commitment.</div>
              <div className="lp-plan-hr" />
              <ul className="lp-plan-feats">
                <li>1 active monitor</li>
                <li>15 pre-built subculture profiles</li>
                <li>Signal Board access</li>
                <li>Community search</li>
              </ul>
              <Link href="/login" className="lp-plan-cta">Get started free</Link>
            </div>
            <div className="lp-plan">
              <div className="lp-plan-name">Starter</div>
              <div className="lp-plan-price"><strong>$299</strong><span> /mo</span></div>
              <div className="lp-plan-desc">For brand strategists and in-house teams tracking cultural shifts.</div>
              <div className="lp-plan-hr" />
              <ul className="lp-plan-feats">
                <li>3 active monitors</li>
                <li>10 content briefs / month</li>
                <li>Signal Board + Acceleration scoring</li>
                <li>Weekly digest email</li>
                <li>Pre-built subculture library</li>
              </ul>
              <Link href="/login" className="lp-plan-cta">Start Starter</Link>
            </div>
            <div className="lp-plan lp-plan-featured">
              <div className="lp-plan-popular">MOST POPULAR</div>
              <div className="lp-plan-name">Pro</div>
              <div className="lp-plan-price"><strong>$799</strong><span> /mo</span></div>
              <div className="lp-plan-desc">For agencies and teams who need custom profiles and unlimited briefs.</div>
              <div className="lp-plan-hr" />
              <ul className="lp-plan-feats">
                <li>15 active monitors</li>
                <li>Unlimited content briefs</li>
                <li>Custom subculture creation</li>
                <li>Real-time breakout alerts</li>
                <li>Priority signal processing</li>
                <li>API access</li>
              </ul>
              <Link href="/login" className="lp-plan-cta lp-plan-cta-feat">Start Pro</Link>
            </div>
            <div className="lp-plan">
              <div className="lp-plan-name">Agency</div>
              <div className="lp-plan-price"><strong>$2,500</strong><span> /mo</span></div>
              <div className="lp-plan-desc">White-label intelligence for agencies managing multiple client accounts.</div>
              <div className="lp-plan-hr" />
              <ul className="lp-plan-feats">
                <li>Unlimited monitors</li>
                <li>Unlimited content briefs</li>
                <li>Team workspaces (up to 5)</li>
                <li>White-label branding</li>
                <li>Custom domain support</li>
                <li>Dedicated success manager</li>
              </ul>
              <Link href="/login" className="lp-plan-cta">Contact sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="lp-cta-band">
        <div className="lp-wrap">
          <div className="lp-cta-label">Get started today</div>
          <h2 className="lp-cta-h2">Stop missing the signals<br /><span className="lp-cta-muted">your audience is sending you</span></h2>
          <p className="lp-cta-p">Every week your brand isn&apos;t monitoring subcultures is a week a competitor might be. Start free and see your first cultural signal in minutes.</p>
          <div className="lp-cta-buttons">
            <Link href="/login" className="lp-btn-white">
              Start for free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link href="/login" className="lp-btn-white-outline">Book a demo</Link>
          </div>
          <p className="lp-cta-note">Free plan available · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner lp-wrap">
          <div className="lp-footer-brand">
            <div className="lp-logo-box" style={{ width: 26, height: 26, borderRadius: 7 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" fill="white" /><circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5" fill="none" strokeDasharray="3 2" /></svg>
            </div>
            <div>
              <div className="lp-footer-brand-name">CulturePulse</div>
              <div className="lp-footer-brand-sub">Social Intelligence Platform</div>
            </div>
          </div>
          <div className="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login">Sign in</Link>
          </div>
          <div className="lp-footer-copy">© 2026 CulturePulse. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

function MockCard({ tier, badge, score, name, pct, platforms }: {
  tier: string; badge: string; score: string; name: string; pct: number; platforms: string;
}) {
  return (
    <div className="lp-b-card">
      <div className="lp-b-card-top">
        <span className={`lp-b-badge lp-${tier}`}>{badge}</span>
        <span className={`lp-b-score lp-${tier}`}>{score}</span>
      </div>
      <div className="lp-b-name">{name}</div>
      <div className="lp-b-bar"><div className={`lp-b-fill lp-${tier}`} style={{ width: `${pct}%` }} /></div>
      <div className="lp-b-platforms">{platforms}</div>
    </div>
  );
}

const css = `
.lp {
  font-family: var(--lp-sans, 'DM Sans', system-ui, sans-serif);
  background: #f4f6fb;
  color: #0f172a;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
.lp * { box-sizing: border-box; }
.lp a { text-decoration: none; color: inherit; }

.lp-wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding-left: max(24px, env(safe-area-inset-left, 0px));
  padding-right: max(24px, env(safe-area-inset-right, 0px));
}

/* NAV */
.lp-nav {
  position: sticky;
  top: env(safe-area-inset-top, 0px);
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}
.lp-nav-inner {
  display: flex;
  align-items: center;
  height: 62px;
  gap: 0;
}
.lp-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  margin-right: 28px;
}
.lp-logo-box {
  width: 30px; height: 30px;
  background: #4f46e5;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.lp-brand-words { display: flex; flex-direction: column; line-height: 1; }
.lp-brand-name { font-size: 14px; font-weight: 700; letter-spacing: -.02em; color: #0f172a; }
.lp-brand-sub { font-size: 8.5px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: .07em; margin-top: 2.5px; }
.lp-nav-links { display: flex; gap: 2px; flex: 1; }
.lp-nav-links a { font-size: 13.5px; color: #64748b; padding: 6px 11px; border-radius: 7px; transition: color .15s, background .15s; }
.lp-nav-links a:hover { color: #0f172a; background: #eef2ff; }
.lp-nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: auto; }
.lp-btn-ghost { font-size: 13px; color: #334155; background: none; border: none; padding: 7px 14px; border-radius: 7px; cursor: pointer; transition: color .15s, background .15s; }
.lp-btn-ghost:hover { color: #0f172a; background: #eef2ff; }
.lp-btn-nav { font-size: 13px; font-weight: 600; color: #fff; background: #4f46e5; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; transition: background .15s; }
.lp-btn-nav:hover { background: #3730a3; }
@media (max-width: 640px) { .lp-nav-links, .lp-btn-ghost { display: none; } }

/* HERO */
.lp-hero { padding-block: 72px 56px; }
.lp-hero-grid {
  display: grid;
  grid-template-columns: 1fr 1.08fr;
  gap: 60px;
  align-items: center;
}
.lp-hero-left { min-width: 0; }
.lp-h1 {
  font-family: var(--lp-serif, 'Playfair Display', Georgia, serif);
  font-size: clamp(36px, 4.5vw, 54px);
  line-height: 1.1;
  letter-spacing: -.025em;
  font-weight: 700;
  text-wrap: balance;
  margin: 0 0 20px;
  color: #0f172a;
}
.lp-h1-accent { color: #4f46e5; }
.lp-hero-sub { font-size: 17px; color: #334155; line-height: 1.65; max-width: 44ch; margin-bottom: 32px; }
.lp-hero-ctas { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.lp-btn-cta-primary {
  font-size: 14px; font-weight: 600; color: #fff; background: #4f46e5;
  border: none; padding: 12px 24px; border-radius: 9px;
  display: inline-flex; align-items: center; gap: 6px;
  transition: background .15s, transform .1s;
}
.lp-btn-cta-primary:hover { background: #3730a3; transform: translateY(-1px); }
.lp-btn-cta-outline {
  font-size: 14px; font-weight: 500; color: #334155;
  background: none; border: 1.5px solid #e2e8f0;
  padding: 11px 22px; border-radius: 9px;
  transition: border-color .15s, color .15s, background .15s;
  display: inline-flex; align-items: center;
}
.lp-btn-cta-outline:hover { border-color: #4f46e5; color: #4f46e5; background: #eef2ff; }
.lp-hero-note { font-size: 12px; color: #94a3b8; }

/* BROWSER MOCK */
.lp-browser {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 40px rgba(15,23,42,.12), 0 4px 10px rgba(15,23,42,.06);
  overflow: hidden;
}
.lp-b-chrome {
  background: #f0f3f8;
  border-bottom: 1px solid #e2e8f0;
  padding: 10px 14px;
  display: flex; align-items: center; gap: 10px;
}
.lp-b-dots { display: flex; gap: 5px; }
.lp-b-dot { width: 10px; height: 10px; border-radius: 50%; }
.lp-r { background: #fe5f57; }
.lp-y { background: #febc2e; }
.lp-g { background: #28c840; }
.lp-b-url { flex: 1; font-size: 11px; color: #94a3b8; background: #fff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 3px 8px; text-align: center; }
.lp-b-nav { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 0 12px; display: flex; align-items: center; height: 36px; gap: 12px; }
.lp-b-brand { font-size: 11px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.lp-b-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: #4f46e5; display: inline-block; }
.lp-b-tabs { display: flex; gap: 1px; font-size: 10px; }
.lp-b-tab { padding: 3px 8px; border-radius: 4px; color: #94a3b8; }
.lp-b-tab.lp-on { background: #eef2ff; color: #4f46e5; font-weight: 700; }
.lp-b-body { background: #f4f6fb; padding: 12px; }
.lp-b-search { background: #fff; border: 1.5px solid #c7d2fe; border-radius: 8px; padding: 7px 11px; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; box-shadow: 0 0 0 3px rgba(79,70,229,.06); }
.lp-b-search-q { font-size: 11px; color: #0f172a; flex: 1; }
.lp-b-search-btn { font-size: 10px; font-weight: 600; color: #fff; background: #4f46e5; border-radius: 5px; padding: 4px 9px; }
.lp-b-label { font-size: 9px; font-weight: 700; letter-spacing: .07em; color: #64748b; text-transform: uppercase; margin-bottom: 7px; }
.lp-b-cards { display: flex; flex-direction: column; gap: 6px; }
.lp-b-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 11px; box-shadow: 0 1px 3px rgba(15,23,42,.06); }
.lp-b-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
.lp-b-badge { font-size: 8px; font-weight: 700; letter-spacing: .07em; padding: 2px 5px; border-radius: 3px; }
.lp-b-badge.lp-brk { background: rgba(239,68,68,.12); color: #ef4444; }
.lp-b-badge.lp-trn { background: rgba(217,119,6,.12); color: #d97706; }
.lp-b-badge.lp-grw { background: rgba(16,185,129,.12); color: #10b981; }
.lp-b-score { font-size: 18px; font-weight: 700; letter-spacing: -.03em; }
.lp-b-score.lp-brk { color: #ef4444; }
.lp-b-score.lp-trn { color: #d97706; }
.lp-b-score.lp-grw { color: #10b981; }
.lp-b-name { font-size: 11px; font-weight: 600; color: #0f172a; margin-bottom: 3px; }
.lp-b-bar { height: 2px; background: #e2e8f0; border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.lp-b-fill { height: 100%; border-radius: 2px; }
.lp-b-fill.lp-brk { background: #ef4444; }
.lp-b-fill.lp-trn { background: #d97706; }
.lp-b-fill.lp-grw { background: #10b981; }
.lp-b-platforms { font-size: 9px; color: #94a3b8; }

@media (max-width: 820px) {
  .lp-hero-grid { grid-template-columns: 1fr; gap: 40px; }
  .lp-browser { order: -1; }
}

/* STATS */
.lp-stats-band { background: #0f172a; padding-block: 40px; }
.lp-stats-inner {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  max-width: 1120px; margin: 0 auto;
  padding-left: max(24px, env(safe-area-inset-left, 0px));
  padding-right: max(24px, env(safe-area-inset-right, 0px));
}
.lp-stat { text-align: center; padding: 16px 8px; }
.lp-stat-num { font-family: var(--lp-serif, 'Playfair Display', Georgia, serif); font-size: 34px; font-weight: 700; color: #fff; letter-spacing: -.03em; line-height: 1; }
.lp-stat-label { font-size: 11px; color: rgba(255,255,255,.45); margin-top: 5px; text-transform: uppercase; letter-spacing: .06em; font-weight: 500; }
@media (max-width: 600px) { .lp-stats-inner { grid-template-columns: repeat(2, 1fr); } }

/* SHARED SECTION */
.lp-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #4f46e5; margin-bottom: 10px; }
.lp-sec-title { font-family: var(--lp-serif, 'Playfair Display', Georgia, serif); font-size: clamp(28px, 3.5vw, 40px); font-weight: 700; letter-spacing: -.025em; color: #0f172a; text-wrap: balance; margin: 0 0 12px; line-height: 1.15; }
.lp-sec-sub { font-size: 16px; color: #334155; max-width: 50ch; margin-bottom: 0; line-height: 1.65; }

/* HOW IT WORKS */
.lp-how { padding-block: 88px; }
.lp-how .lp-sec-sub { margin-bottom: 56px; }
.lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px 48px; }
.lp-step-num { font-family: var(--lp-serif, 'Playfair Display', Georgia, serif); font-size: 52px; font-weight: 700; color: #c7d2fe; letter-spacing: -.04em; line-height: 1; margin-bottom: 14px; }
.lp-step-icon { width: 46px; height: 46px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 11px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.lp-step-title { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 7px; }
.lp-step-desc { font-size: 14px; color: #334155; line-height: 1.65; }
@media (max-width: 680px) { .lp-steps { grid-template-columns: 1fr; } }

/* FEATURES */
.lp-features { padding-block: 88px; background: #fff; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
.lp-features .lp-sec-title { margin-bottom: 0; }
.lp-feat-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 1px; margin-top: 56px;
  background: #e2e8f0;
  border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;
  box-shadow: 0 4px 12px rgba(15,23,42,.08);
}
.lp-feat { background: #fff; padding: 32px; }
.lp-feat-icon { width: 46px; height: 46px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.lp-feat-title { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
.lp-feat-desc { font-size: 14px; color: #334155; line-height: 1.65; }
.lp-feat-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.lp-feat-tags span { font-size: 11px; font-weight: 500; color: #64748b; background: #f4f6fb; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 4px; }
@media (max-width: 680px) { .lp-feat-grid { grid-template-columns: 1fr; } }

/* PRICING */
.lp-pricing { padding-block: 88px; }
.lp-pricing .lp-sec-title { margin-bottom: 56px; }
.lp-plan-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: start; }
.lp-plan { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 24px; position: relative; box-shadow: 0 1px 3px rgba(15,23,42,.06); transition: transform .2s, box-shadow .2s; }
.lp-plan:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15,23,42,.08); }
.lp-plan-featured { border-color: #4f46e5; box-shadow: 0 0 0 1px #4f46e5, 0 4px 12px rgba(15,23,42,.08); }
.lp-plan-popular { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); font-size: 9.5px; font-weight: 700; letter-spacing: .07em; color: #fff; background: #4f46e5; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
.lp-plan-name { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 10px; }
.lp-plan-price { margin-bottom: 4px; }
.lp-plan-price strong { font-family: var(--lp-serif, 'Playfair Display', Georgia, serif); font-size: 34px; font-weight: 700; color: #0f172a; letter-spacing: -.03em; }
.lp-plan-price span { font-size: 12.5px; color: #64748b; }
.lp-plan-desc { font-size: 12.5px; color: #64748b; margin-bottom: 16px; line-height: 1.5; }
.lp-plan-hr { height: 1px; background: #e2e8f0; margin-block: 16px; }
.lp-plan-feats { list-style: none; display: flex; flex-direction: column; gap: 9px; padding: 0; margin: 0; }
.lp-plan-feats li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: #334155; line-height: 1.4; }
.lp-plan-feats li::before { content: "✓"; color: #10b981; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
.lp-plan-cta { margin-top: 22px; width: 100%; display: block; text-align: center; font-size: 13px; font-weight: 600; padding: 10px; border-radius: 8px; border: 1.5px solid #e2e8f0; color: #0f172a; cursor: pointer; transition: all .15s; background: none; }
.lp-plan-cta:hover { border-color: #4f46e5; color: #4f46e5; background: #eef2ff; }
.lp-plan-cta-feat { background: #4f46e5; border-color: #4f46e5; color: #fff !important; }
.lp-plan-cta-feat:hover { background: #3730a3 !important; border-color: #3730a3 !important; }
@media (max-width: 900px) { .lp-plan-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px) { .lp-plan-grid { grid-template-columns: 1fr; } }

/* CTA BAND */
.lp-cta-band { background: #0f172a; padding-block: 88px; text-align: center; position: relative; overflow: hidden; }
.lp-cta-band::before { content: ""; position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 700px; height: 400px; background: radial-gradient(ellipse, rgba(99,102,241,.22) 0%, transparent 68%); pointer-events: none; }
.lp-cta-label { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.35); margin-bottom: 16px; }
.lp-cta-h2 { font-family: var(--lp-serif, 'Playfair Display', Georgia, serif); font-size: clamp(28px, 4vw, 48px); font-weight: 700; color: #fff; letter-spacing: -.025em; line-height: 1.12; text-wrap: balance; margin-bottom: 14px; }
.lp-cta-muted { color: rgba(255,255,255,.55); }
.lp-cta-p { font-size: 16px; color: rgba(255,255,255,.5); max-width: 46ch; margin: 0 auto 36px; line-height: 1.6; }
.lp-cta-buttons { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.lp-btn-white { font-size: 15px; font-weight: 600; color: #4f46e5; background: #fff; border: none; padding: 13px 28px; border-radius: 10px; display: inline-flex; align-items: center; gap: 7px; transition: transform .15s, box-shadow .15s; }
.lp-btn-white:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,.25); }
.lp-btn-white-outline { font-size: 15px; font-weight: 500; color: rgba(255,255,255,.7); background: none; border: 1.5px solid rgba(255,255,255,.18); padding: 13px 28px; border-radius: 10px; transition: border-color .15s, color .15s, background .15s; }
.lp-btn-white-outline:hover { border-color: rgba(255,255,255,.45); color: #fff; background: rgba(255,255,255,.07); }
.lp-cta-note { font-size: 12px; color: rgba(255,255,255,.25); margin-top: 20px; }

/* FOOTER */
.lp-footer { background: #0f172a; border-top: 1px solid rgba(255,255,255,.05); padding-block: 32px; }
.lp-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.lp-footer-brand { display: flex; align-items: center; gap: 10px; }
.lp-footer-brand-name { font-size: 13px; font-weight: 700; color: rgba(255,255,255,.75); }
.lp-footer-brand-sub { font-size: 9.5px; color: rgba(255,255,255,.3); text-transform: uppercase; letter-spacing: .07em; margin-top: 2px; }
.lp-footer-links { display: flex; gap: 20px; flex-wrap: wrap; }
.lp-footer-links a { font-size: 12.5px; color: rgba(255,255,255,.35); transition: color .15s; }
.lp-footer-links a:hover { color: rgba(255,255,255,.75); }
.lp-footer-copy { font-size: 11.5px; color: rgba(255,255,255,.2); }
`;
