import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { ArrowRight, LayoutDashboard, ListOrdered, Briefcase, UserCheck, Eye, ShieldCheck, Target, CalendarDays, Activity, BellRing, CheckCircle2, Circle, FileText, Server, Gauge } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const SCREENS = [
  { key: "home", label: "Home Dashboard", icon: LayoutDashboard, points: ["Virtual account balance", "Available & used margin", "Daily P&L", "Portfolio performance", "Buy / Sell interface", "Open positions"] },
  { key: "watch", label: "Watchlist", icon: Eye, points: ["Nifty 50 & Bank Nifty", "Supported stocks", "Price movements", "Multiple market watchlists"] },
  { key: "orders", label: "Orders", icon: ListOrdered, points: ["Executed orders", "Open & pending orders", "Order status", "Trade history"] },
  { key: "portfolio", label: "Portfolio", icon: Briefcase, points: ["Holdings & positions", "Invested vs current value", "P&L", "Maximum drawdown"] },
  { key: "profile", label: "Profile & Evaluation", icon: UserCheck, points: ["Challenge progress", "Profit target", "Minimum trading days", "Trading accuracy"] },
];

const WATCH = [["NIFTY 50", "24,612.40", "+0.62%"], ["BANKNIFTY", "52,184.15", "+0.41%"], ["RELIANCE", "2,932.10", "+0.75%"], ["HDFCBANK", "1,671.30", "-0.38%"], ["TCS", "4,118.55", "+0.19%"], ["INFY", "1,842.00", "-0.22%"]];
const POSITIONS = [["RELIANCE", 24, "+₹612"], ["HDFCBANK", 40, "+₹402"], ["TCS", 12, "+₹227"]];
const ORDERS = [["BUY", "TCS", "Completed"], ["BUY", "HDFCBANK", "Completed"], ["SELL", "INFY", "Completed"]];
const BROKERS = [
  ["Zerodha", "India's largest discount broker with the Kite trading platform."],
  ["Angel One", "Full-service broker with SmartAPI and a mobile-first trading app."],
  ["Upstox", "Fast, low-cost trading with a modern web and mobile experience."],
  ["Dhan", "Trader-focused platform with advanced charts and options tools."],
];
const STEPS = ["Choose and purchase an IndiFunded challenge.", "Receive access to your virtual trading account.", "Trade using the applicable challenge rules.", "Complete the evaluation and pass the challenge.", "Complete verification and become eligible for the funded account setup, subject to applicable terms."];
const TRACKER = ["Challenge result", "KYC verification", "Document submission", "Platform selection", "Account setup", "Activation"];
const MANAGED = ["Account & challenge management", "Virtual account configuration", "Rules & evaluation tracking", "Pass / fail status", "KYC status", "Broker availability & setup", "Payout eligibility & requests", "Notifications, support & reports"];
const FAQS = [
  ["What is the IndiFunded Virtual Trading Platform?", "It's a simulated trading environment where you trade with virtual capital under clear challenge rules. Prices are live-like, but orders are simulated — no real money is at risk during the challenge."],
  ["How does the challenge work?", "Pick a plan, receive your virtual account, and trade within the profit target, maximum loss and trading-day rules for that plan. Pass the evaluation to move to verification."],
  ["What can I track in my dashboard?", "Balance, margin, daily P&L, open positions, orders, trade history, drawdown and your progress against every challenge rule."],
  ["What happens after I pass?", "You complete KYC, choose a supported broker platform and we set up your funded account, subject to applicable terms."],
  ["Is my evaluation calculated on my device?", "No. Trade validation, risk checks and pass/fail decisions run on our servers, so results are consistent and fair."],
];

function Spark({ up = true }) {
  const d = up ? "M0 40 L20 34 L40 37 L60 24 L80 28 L100 16 L120 20 L140 8 L160 12" : "M0 10 L20 16 L40 12 L60 26 L80 22 L100 34 L120 30 L140 40 L160 36";
  return <svg viewBox="0 0 160 48" className={`vt-spark ${up ? "" : "vt-spark-down"}`} preserveAspectRatio="none" aria-hidden="true"><path d={d} /></svg>;
}

function ScreenMock({ k }) {
  if (k === "watch") return <div className="vt-mock-list">{WATCH.map(([s, p, c]) => <div key={s}><span>{s}</span><span className="font-mono">{p}</span><span className={c.startsWith("-") ? "vt-down" : "vt-up"}>{c}</span></div>)}</div>;
  if (k === "orders") return <div className="vt-mock-list">{[...ORDERS, ["BUY", "RELIANCE", "Open"], ["SELL", "NIFTY 24600 CE", "Pending"]].map(([side, s, st], i) => <div key={i}><span className={side === "BUY" ? "vt-up" : "vt-down"}>{side}</span><span>{s}</span><span className="vt-muted">{st}</span></div>)}</div>;
  if (k === "portfolio") return <div><div className="vt-mock-kpis"><div><span>Invested</span><strong>₹2,16,350</strong></div><div><span>Current</span><strong>₹2,17,591</strong></div><div><span>P&L</span><strong className="vt-up">+₹1,241</strong></div><div><span>Max DD</span><strong>4.2%</strong></div></div><Spark /></div>;
  if (k === "profile") return <div className="vt-mock-progress">{[["Profit target", 62], ["Trading days", 70], ["Accuracy", 58], ["Drawdown used", 21]].map(([l, v]) => <div key={l}><div className="flex justify-between text-xs"><span>{l}</span><span className="font-mono">{v}%</span></div><div className="vt-bar"><i style={{ width: `${v}%` }} /></div></div>)}</div>;
  return <div><div className="vt-mock-kpis"><div><span>Balance</span><strong>₹10,42,680</strong></div><div><span>Available</span><strong>₹7,84,250</strong></div><div><span>Used</span><strong>₹2,16,350</strong></div><div><span>Day P&L</span><strong className="vt-up">+₹4,280</strong></div></div><Spark /><div className="flex gap-2 mt-3"><span className="vt-btn-buy">BUY</span><span className="vt-btn-sell">SELL</span></div></div>;
}

export default function VirtualTrading() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("home");
  const [plan, setPlan] = useState(null);
  useEffect(() => {
    api.get("/plans").then(r => setPlan(r.data.find(p => p.popular) || r.data[0] || null)).catch(() => {});
  }, []);
  const active = SCREENS.find(s => s.key === screen);
  const startHref = user ? "/challenges" : "/login?next=/challenges";

  return (
    <div className="vt-page">
      <section className="vt-hero container-xl">
        <div className="home-eyebrow justify-center">Virtual trading platform</div>
        <h1 className="font-display">Your trading journey<br /><span className="text-[var(--accent-2,var(--accent))]">starts here.</span></h1>
        <p>Explore the IndiFunded virtual trading platform, track your performance, master risk management, and work towards a funded trading account.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-7">
          <Link to={startHref} className="btn-amber rounded-full px-6 py-3 text-sm inline-flex items-center gap-2">Start Challenge <ArrowRight size={14} /></Link>
          <a href="#explore" className="btn-ghost rounded-full px-6 py-3 text-sm">Explore Platform</a>
        </div>
        <div className="vt-hero-stats"><div><strong className="font-display">5</strong><span>Core screens</span></div><div><strong className="font-display">100%</strong><span>Simulated orders</span></div><div><strong className="font-display">Rule</strong><span>Based evaluation</span></div></div>
      </section>

      <section id="explore" className="home-band"><div className="container-xl">
        <div className="home-section-heading"><div><div className="home-eyebrow">Product tour</div><h2 className="font-display">Explore the virtual trading platform</h2><p>Five focused screens built for disciplined trading.</p></div></div>
        <div className="vt-tour">
          <div className="vt-tour-tabs" role="tablist">{SCREENS.map(s => <button key={s.key} role="tab" aria-selected={screen === s.key} className={screen === s.key ? "is-active" : ""} onClick={() => setScreen(s.key)}><s.icon size={16} />{s.label}</button>)}</div>
          <div className="vt-tour-panel card-panel">
            <div className="vt-device"><div className="vt-device-bar"><span>{active.label}</span><span className="chip text-[10px]">Simulated data</span></div><ScreenMock k={screen} /></div>
            <ul className="vt-points">{active.points.map(p => <li key={p}><CheckCircle2 size={14} />{p}</li>)}</ul>
          </div>
        </div>
      </div></section>

      <section className="home-band"><div className="container-xl">
        <div className="home-section-heading"><div><div className="home-eyebrow">Virtual dashboard</div><h2 className="font-display">Your virtual account, at a glance</h2><p>Balance, margin, positions, orders and challenge rules in one place.</p></div></div>
        <div className="vt-dash">
          <div className="card-panel p-6 vt-dash-main"><div className="vt-muted text-xs">Virtual portfolio value</div><div className="font-display text-4xl mt-1">₹10,42,680</div><Spark /><div className="vt-mock-kpis mt-4"><div><span>Available margin</span><strong>₹7,84,250</strong></div><div><span>Used margin</span><strong>₹2,16,350</strong></div><div><span>Daily P&L</span><strong className="vt-up">+₹4,280</strong></div></div></div>
          <div className="card-panel p-6"><h3 className="font-display">Open positions</h3><div className="vt-mock-list mt-3">{POSITIONS.map(([s, q, p]) => <div key={s}><span>{s}</span><span className="vt-muted">{q} qty</span><span className="vt-up">{p}</span></div>)}</div></div>
          <div className="card-panel p-6"><h3 className="font-display">Recent orders</h3><div className="vt-mock-list mt-3">{ORDERS.map(([side, s, st], i) => <div key={i}><span className={side === "BUY" ? "vt-up" : "vt-down"}>{side}</span><span>{s}</span><span className="vt-muted">{st}</span></div>)}</div></div>
        </div>
      </div></section>

      <section className="home-band"><div className="container-xl">
        <div className="home-section-heading"><div><div className="home-eyebrow">Evaluation</div><h2 className="font-display">Trade with rules. Prove your skills.</h2><p>{plan ? `Rules shown are from the ${plan.name} plan.` : "Rules come from your selected plan."} Your personal progress appears in your dashboard once your challenge account is active.</p></div></div>
        <div className="vt-eval">
          {[[Target, "Profit target", plan ? `${plan.profit_target_points} pts` : "—"], [CalendarDays, "Trading days", plan ? `min ${plan.min_trading_days} days` : "—"], [CalendarDays, "Challenge window", plan ? `${plan.total_trading_days} days` : "—"], [Activity, "Accuracy", "Win rate"], [Gauge, "Maximum drawdown", plan ? `cap ${plan.max_loss_limit}%` : "cap 20%"]].map(([Icon, l, v]) => (
            <div key={l} className="card-panel p-5"><Icon size={18} className="text-[var(--accent)]" /><div className="vt-muted text-xs mt-3">{l}</div><div className="font-display text-xl mt-1">{v}</div></div>
          ))}
        </div>
        {!user && <p className="text-sm vt-muted mt-5"><Link to="/login?next=/app" className="text-[var(--accent)]">Sign in</Link> to see your own evaluation status.</p>}
      </div></section>

      <section className="home-band"><div className="container-xl">
        <div className="home-section-heading"><div><div className="home-eyebrow">How it works</div><h2 className="font-display">From challenge to funded account</h2></div></div>
        <ol className="vt-steps">{STEPS.map((s, i) => <li key={i} className="card-panel"><span className="font-display">{i + 1}</span><p>{s}</p></li>)}</ol>
      </div></section>

      <section className="home-band"><div className="container-xl">
        <div className="home-section-heading"><div><div className="home-eyebrow">After the challenge</div><h2 className="font-display">Choose your trading platform</h2><p>Challenge trading is simulated. Once you pass and complete verification, you pick the broker for your real funded account, subject to applicable terms.</p></div></div>
        <div className="vt-brokers">{BROKERS.map(([n, d]) => <article key={n} className="card-panel p-6"><div className="vt-broker-mark font-display">{n.split(" ").map(w => w[0]).join("")}</div><h3 className="font-display text-xl mt-4">{n}</h3><p className="text-sm vt-muted mt-2">{d}</p><div className="chip text-[10px] mt-4">Available after you pass</div></article>)}</div>
      </div></section>

      <section className="home-band"><div className="container-xl vt-two">
        <div>
          <div className="home-eyebrow">Risk management</div><h2 className="font-display vt-h2">Built-in risk monitoring</h2>
          <div className="vt-risk mt-6">
            {[[Gauge, plan ? `${plan.max_loss_limit}%` : "20%", "Maximum drawdown", "Overall loss cap measured against account size."], [ListOrdered, plan ? `${plan.trades_per_day} trades` : "3 trades", "Max trades per day", "Keeps trading disciplined and intentional."], [Target, plan ? `${plan.profit_target_points} pts` : "—", "Profit target tracking", "Progress toward the target, updated by our servers."], [BellRing, "Enabled", "Rule violation alerts", "Get notified when you approach or breach a rule."]].map(([Icon, v, t, d]) => (
              <div key={t} className="card-panel p-5"><div className="flex items-center gap-2"><Icon size={16} className="text-[var(--accent)]" /><strong className="font-display text-lg">{v}</strong></div><div className="text-sm mt-2">{t}</div><p className="text-xs vt-muted mt-1">{d}</p></div>
            ))}
          </div>
        </div>
        <div>
          <div className="home-eyebrow">Verification & activation</div><h2 className="font-display vt-h2">Account verification tracker</h2>
          <div className="card-panel p-6 mt-6">
            <ol className="vt-tracker">{TRACKER.map((t, i) => <li key={t}><Circle size={14} /><span>{i + 1}. {t}</span><em>pending</em></li>)}</ol>
            <div className="mt-5 pt-5 border-t border-[var(--border)]"><div className="text-sm font-medium flex items-center gap-2"><FileText size={14} /> Required documents</div><ul className="text-sm vt-muted mt-2 space-y-1"><li>PAN card</li><li>Aadhaar / address proof</li><li>Bank account details</li></ul><p className="text-xs vt-muted mt-3">Documents are requested only after you pass the challenge.</p></div>
          </div>
        </div>
      </div></section>

      <section className="home-band"><div className="container-xl">
        <div className="home-section-heading"><div><div className="home-eyebrow">Platform</div><h2 className="font-display">Everything managed in one place</h2><p>Evaluation calculations, trade validation, risk checks and pass/fail decisions run on our servers — never on the device alone.</p></div></div>
        <div className="vt-managed">{MANAGED.map(m => <div key={m} className="card-panel"><Server size={14} className="text-[var(--accent)]" />{m}</div>)}</div>
      </div></section>

      <section className="home-band"><div className="container-xl max-w-3xl">
        <div className="home-eyebrow">FAQs</div><h2 className="font-display vt-h2">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="mt-6">{FAQS.map(([q, a], i) => <AccordionItem key={i} value={`q${i}`}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent className="vt-muted">{a}</AccordionContent></AccordionItem>)}</Accordion>
        <div className="flex flex-wrap gap-3 mt-10"><Link to={startHref} className="btn-amber rounded-full px-6 py-3 text-sm inline-flex items-center gap-2">Start Challenge <ArrowRight size={14} /></Link><Link to="/rules" className="btn-ghost rounded-full px-6 py-3 text-sm inline-flex items-center gap-2"><ShieldCheck size={14} /> Read the rules</Link></div>
      </div></section>
    </div>
  );
}
