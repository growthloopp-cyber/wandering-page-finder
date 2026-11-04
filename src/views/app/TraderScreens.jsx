import { useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { formatINR } from "../../lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import {
  INSTRUMENTS, TIMEFRAMES, makeCandles, ACCOUNT, ACCOUNTS, evaluation, TRADES, POSITIONS, ORDERS, monthDays, NOTIFICATIONS,
} from "../../lib/demo-trading";
import {
  FlaskConical, ChevronLeft, ChevronRight, Upload, CheckCircle2, Clock, XCircle, Bell, ShieldAlert, TrendingUp, Target,
  CalendarDays, LifeBuoy, Send, Wallet, BadgeCheck, AlertTriangle, Activity,
} from "lucide-react";

/* ---------- shared bits ---------- */
export function SampleBadge() {
  return <span className="sample-badge"><FlaskConical size={12} /> Sample data</span>;
}
function PageHead({ title, sub, children }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 flex-wrap"><h1 className="font-display text-3xl md:text-4xl">{title}</h1><SampleBadge /></div>
        {sub && <p className="text-sm text-[var(--muted)] mt-2 max-w-xl">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
const inr = (n) => formatINR(Math.round(Number(n) || 0));
const signed = (n) => `${n >= 0 ? "+" : "−"}${inr(Math.abs(n))}`;
const pnlCls = (n) => (n >= 0 ? "text-[var(--emerald)]" : "text-[var(--rose)]");

export function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const tone = ["active", "executed", "paid", "funded", "approved", "open", "verified", "resolved"].includes(s) ? "ok"
    : ["pending", "processing", "submitted", "in review", "under review"].includes(s) ? "wait"
    : ["failed", "rejected", "cancelled", "breached"].includes(s) ? "bad" : "neutral";
  return <span className={`status-pill is-${tone}`}>{status}</span>;
}

function Table({ cols, rows, empty = "Nothing here yet." }) {
  return (
    <div className="card-panel overflow-x-auto">
      <table className="w-full text-sm min-w-[640px] dash-table">
        <thead><tr>{cols.map((c) => <th key={c.k} className={c.right ? "text-right" : "text-left"}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((r, i) => (
            <tr key={r.id || i}>{cols.map((c) => <td key={c.k} className={c.right ? "text-right" : ""}>{c.render ? c.render(r) : r[c.k]}</td>)}</tr>
          )) : <tr><td colSpan={cols.length} className="text-center text-[var(--muted)] py-10">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Meter({ label, value, max, money = true, warnAt = 0.7, sub }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const tone = pct >= 90 ? "bad" : pct >= warnAt * 100 ? "wait" : "ok";
  return (
    <div className="card-panel p-5">
      <div className="flex justify-between text-xs text-[var(--muted-2)] uppercase tracking-wider font-mono"><span>{label}</span><span>{Math.round(pct)}%</span></div>
      <div className="font-display text-2xl mt-2">{money ? inr(value) : value} <span className="text-sm text-[var(--muted)]">/ {money ? inr(max) : max}</span></div>
      <div className={`meter is-${tone}`}><i style={{ width: `${pct}%` }} /></div>
      {sub && <div className="text-xs text-[var(--muted)] mt-2">{sub}</div>}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }) {
  return (
    <div className="card-panel p-5">
      <div className="flex justify-between items-start"><div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">{label}</div>{Icon && <Icon size={16} className="text-[var(--accent)]" />}</div>
      <div className={`font-display text-2xl md:text-3xl mt-3 ${tone || ""}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--muted-2)] mt-1">{sub}</div>}
    </div>
  );
}

/* ---------- SVG candlestick chart ---------- */
export function CandleChart({ candles, height = 320 }) {
  const W = 900, H = height, pad = 8;
  const hi = Math.max(...candles.map((c) => c.high)), lo = Math.min(...candles.map((c) => c.low));
  const y = (v) => pad + ((hi - v) / (hi - lo || 1)) * (H - pad * 2);
  const step = W / candles.length, bw = Math.max(2, step * 0.6);
  const last = candles[candles.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto candle-svg" role="img" aria-label="Candlestick chart (sample data)">
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="grid-line" />)}
      {candles.map((c, i) => {
        const up = c.close >= c.open, x = i * step + step / 2;
        return (
          <g key={i} className={up ? "up" : "down"}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} />
            <rect x={x - bw / 2} width={bw} y={y(Math.max(c.open, c.close))} height={Math.max(1.5, Math.abs(y(c.open) - y(c.close)))} rx="1" />
          </g>
        );
      })}
      <line x1="0" x2={W} y1={y(last.close)} y2={y(last.close)} className="last-line" />
    </svg>
  );
}

/* ---------- Trading terminal ---------- */
export function TradingTerminal() {
  const [sym, setSym] = useState("NIFTY");
  const [tf, setTf] = useState("5m");
  const [side, setSide] = useState("BUY");
  const [lots, setLots] = useState(1);
  const [type, setType] = useState("MARKET");
  const [limit, setLimit] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [orders, setOrders] = useState(ORDERS);
  const [positions, setPositions] = useState(POSITIONS);
  const inst = INSTRUMENTS.find((i) => i.symbol === sym);
  const candles = useMemo(() => makeCandles(sym, tf, 70), [sym, tf]);
  const ltp = candles[candles.length - 1].close;
  const chg = ((ltp - candles[0].open) / candles[0].open) * 100;
  const qty = Math.max(1, lots) * inst.lot;
  const price = type === "MARKET" ? ltp : Number(limit) || ltp;

  const place = () => {
    const id = `O-${56000 + orders.length}`;
    const status = type === "MARKET" ? "Executed" : "Pending";
    setOrders([{ id, symbol: sym, qty, type, side, price: +price.toFixed(2), date: "Just now", status }, ...orders]);
    if (status === "Executed") {
      const signedQty = side === "BUY" ? qty : -qty;
      setPositions([{ symbol: sym, qty: signedQty, avg: +price.toFixed(2), ltp: +ltp.toFixed(2), status: "Open", pnl: 0 }, ...positions]);
    }
    setConfirm(false);
    toast.success(`${side} ${qty} ${sym} — ${status.toLowerCase()} (sample)`);
  };

  return (
    <div>
      <PageHead title="Trading terminal" sub="Practice layout of the IndiFunded terminal. Orders here are sample only and don't reach any account." />
      <div className="terminal-grid">
        <div className="card-panel p-4 md:p-5 min-w-0">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="seg" role="tablist" aria-label="Instrument">
              {INSTRUMENTS.map((i) => <button key={i.symbol} role="tab" aria-selected={sym === i.symbol} className={sym === i.symbol ? "is-on" : ""} onClick={() => setSym(i.symbol)}>{i.name}</button>)}
            </div>
            <div className="seg" role="tablist" aria-label="Timeframe">
              {TIMEFRAMES.map((t) => <button key={t} role="tab" aria-selected={tf === t} className={tf === t ? "is-on" : ""} onClick={() => setTf(t)}>{t}</button>)}
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-4">
            <div className="font-display text-3xl">{ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
            <div className={`text-sm ${pnlCls(chg)}`}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</div>
          </div>
          <div className="mt-3"><CandleChart candles={candles} /></div>
        </div>

        <div className="card-panel p-5 order-panel">
          <div className="seg w-full" role="tablist" aria-label="Side">
            {["BUY", "SELL"].map((s) => <button key={s} className={`flex-1 ${side === s ? (s === "BUY" ? "is-buy" : "is-sell") : ""}`} onClick={() => setSide(s)}>{s}</button>)}
          </div>
          <label className="dash-label">Order type</label>
          <div className="seg w-full">{["MARKET", "LIMIT", "SL"].map((t) => <button key={t} className={`flex-1 ${type === t ? "is-on" : ""}`} onClick={() => setType(t)}>{t}</button>)}</div>
          <label className="dash-label" htmlFor="lots">Lots <span className="text-[var(--muted-2)]">(1 lot = {inst.lot})</span></label>
          <div className="qty">
            <button type="button" onClick={() => setLots(Math.max(1, lots - 1))} aria-label="Fewer lots">−</button>
            <input id="lots" type="number" min="1" max="50" value={lots} onChange={(e) => setLots(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} />
            <button type="button" onClick={() => setLots(Math.min(50, lots + 1))} aria-label="More lots">+</button>
          </div>
          {type !== "MARKET" && <>
            <label className="dash-label" htmlFor="px">{type === "SL" ? "Trigger price" : "Limit price"}</label>
            <input id="px" className="input-dark" inputMode="decimal" placeholder={ltp.toFixed(2)} value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9.]/g, ""))} />
          </>}
          <div className="order-summary">
            <div><span>Quantity</span><strong>{qty}</strong></div>
            <div><span>Price</span><strong>{price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong></div>
            <div><span>Trades left today</span><strong>{evaluation().trades_left}</strong></div>
          </div>
          <button className={`w-full rounded-full py-3 font-semibold mt-2 ${side === "BUY" ? "btn-buy" : "btn-sell"}`} onClick={() => setConfirm(true)}>{side} {sym}</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div><h2 className="font-display text-xl mb-3">Open positions</h2><PositionsTable rows={positions} /></div>
        <div><h2 className="font-display text-xl mb-3">Pending orders</h2><OrdersTable rows={orders.filter((o) => o.status === "Pending")} /></div>
      </div>
      <h2 className="font-display text-xl mt-8 mb-3">Recent trades</h2>
      <TradesTable rows={TRADES.slice(0, 4)} />

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Confirm {side.toLowerCase()} order</DialogTitle>
          <DialogDescription>Sample order — nothing is sent to a real or evaluation account.</DialogDescription>
          <div className="order-summary">
            <div><span>Instrument</span><strong>{inst.name}</strong></div>
            <div><span>Type</span><strong>{type}</strong></div>
            <div><span>Quantity</span><strong>{qty}</strong></div>
            <div><span>Price</span><strong>{price.toFixed(2)}</strong></div>
          </div>
          <div className="flex gap-2 mt-2">
            <button className="flex-1 rounded-full py-2.5 border border-[var(--border-hi)]" onClick={() => setConfirm(false)}>Cancel</button>
            <button className={`flex-1 rounded-full py-2.5 font-semibold ${side === "BUY" ? "btn-buy" : "btn-sell"}`} onClick={place}>Place order</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- tables ---------- */
function TradesTable({ rows }) {
  return <Table rows={rows} cols={[
    { k: "id", label: "Trade ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { k: "symbol", label: "Instrument" },
    { k: "side", label: "Side", render: (r) => <span className={r.side === "BUY" ? "text-[var(--emerald)]" : "text-[var(--rose)]"}>{r.side}</span> },
    { k: "entry", label: "Entry", right: true }, { k: "exit", label: "Exit", right: true }, { k: "qty", label: "Qty", right: true },
    { k: "in", label: "Entry time" }, { k: "out", label: "Exit time" },
    { k: "pnl", label: "P&L", right: true, render: (r) => <span className={pnlCls(r.pnl)}>{signed(r.pnl)}</span> },
  ]} />;
}
function PositionsTable({ rows }) {
  return <Table rows={rows} empty="No open positions." cols={[
    { k: "symbol", label: "Instrument" },
    { k: "qty", label: "Qty", right: true, render: (r) => <span className={r.qty >= 0 ? "text-[var(--emerald)]" : "text-[var(--rose)]"}>{r.qty}</span> },
    { k: "avg", label: "Avg entry", right: true }, { k: "ltp", label: "Current", right: true },
    { k: "pnl", label: "P&L", right: true, render: (r) => <span className={pnlCls(r.pnl)}>{signed(r.pnl)}</span> },
    { k: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
  ]} />;
}
function OrdersTable({ rows }) {
  return <Table rows={rows} empty="No orders." cols={[
    { k: "id", label: "Order ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { k: "symbol", label: "Instrument" },
    { k: "side", label: "Side", render: (r) => <span className={r.side === "BUY" ? "text-[var(--emerald)]" : "text-[var(--rose)]"}>{r.side}</span> },
    { k: "qty", label: "Qty", right: true }, { k: "type", label: "Type" }, { k: "price", label: "Price", right: true },
    { k: "date", label: "Date" }, { k: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
  ]} />;
}

export function TradeBook() {
  const [q, setQ] = useState("");
  const rows = TRADES.filter((t) => !q || t.symbol.includes(q));
  const total = rows.reduce((s, t) => s + t.pnl, 0);
  return (
    <div>
      <PageHead title="Trade book" sub="Every closed trade with entry, exit and P&L.">
        <div className="seg">{["", "NIFTY", "BANKNIFTY", "SENSEX"].map((s) => <button key={s || "all"} className={q === s ? "is-on" : ""} onClick={() => setQ(s)}>{s || "All"}</button>)}</div>
      </PageHead>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Kpi label="Trades" value={rows.length} icon={Activity} />
        <Kpi label="Winning trades" value={rows.filter((t) => t.pnl > 0).length} icon={TrendingUp} />
        <Kpi label="Net P&L" value={signed(total)} tone={pnlCls(total)} icon={Wallet} />
      </div>
      <TradesTable rows={rows} />
    </div>
  );
}

export function Positions() {
  const total = POSITIONS.reduce((s, p) => s + p.pnl, 0);
  return (
    <div>
      <PageHead title="Positions" sub="Open positions with live P&L." />
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Kpi label="Open positions" value={POSITIONS.length} icon={Activity} />
        <Kpi label="Unrealised P&L" value={signed(total)} tone={pnlCls(total)} icon={TrendingUp} />
      </div>
      <PositionsTable rows={POSITIONS} />
    </div>
  );
}

export function Orders() {
  const [f, setF] = useState("All");
  const rows = ORDERS.filter((o) => f === "All" || o.status === f);
  return (
    <div>
      <PageHead title="Orders" sub="All orders placed on this account.">
        <div className="seg">{["All", "Executed", "Pending", "Cancelled"].map((s) => <button key={s} className={f === s ? "is-on" : ""} onClick={() => setF(s)}>{s}</button>)}</div>
      </PageHead>
      <OrdersTable rows={rows} />
    </div>
  );
}

/* ---------- Evaluation ---------- */
export function EvaluationProgress() {
  const a = ACCOUNT, e = evaluation(a);
  return (
    <div>
      <PageHead title="Evaluation progress" sub={`${a.product} · ${a.account_id}`}><StatusPill status={a.status} /></PageHead>
      <div className="card-panel p-6 md:p-8 eval-hero">
        <div className="ring" style={{ "--p": e.progress }}><span className="font-display">{e.progress}%</span><small>of target</small></div>
        <div className="grid sm:grid-cols-3 gap-4 flex-1">
          <Kpi label="Profit target" value={inr(a.profit_target)} icon={Target} />
          <Kpi label="Current profit" value={signed(e.pnl)} tone={pnlCls(e.pnl)} icon={TrendingUp} />
          <Kpi label="Remaining target" value={inr(e.remaining_target)} icon={Target} />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Meter label="Trading days" value={a.trading_days_done} max={a.min_trading_days} money={false} warnAt={2} sub={`${e.remaining_days} more days needed`} />
        <Meter label="Days elapsed" value={a.days_elapsed} max={a.total_days} money={false} sub={`${a.total_days - a.days_elapsed} days remaining`} />
        <Kpi label="Accuracy" value={`${a.accuracy}%`} sub="Winning trades / total trades" icon={BadgeCheck} />
      </div>
    </div>
  );
}

/* ---------- Risk ---------- */
export function RiskManagement() {
  const a = ACCOUNT, e = evaluation(a);
  const rules = [
    { t: "Daily loss within limit", ok: a.daily_loss_used < a.daily_loss_limit },
    { t: "Overall loss within limit", ok: a.max_drawdown_used < a.overall_loss_limit },
    { t: "Trades per day within limit", ok: a.trades_today <= a.max_trades_per_day },
    { t: "No overnight positions", ok: true },
  ];
  return (
    <div>
      <PageHead title="Risk management" sub="Your loss limits and rule compliance, updated as you trade." />
      <div className="grid md:grid-cols-2 gap-4">
        <Meter label="Daily loss used" value={a.daily_loss_used} max={a.daily_loss_limit} sub={`${inr(e.daily_loss_left)} left today`} />
        <Meter label="Overall loss / drawdown" value={a.max_drawdown_used} max={a.overall_loss_limit} sub={`${inr(e.overall_loss_left)} remaining allowance · ${e.drawdown_pct}% drawdown`} />
        <Meter label="Trades today" value={a.trades_today} max={a.max_trades_per_day} money={false} sub={`${e.trades_left} trades left`} />
        <div className="card-panel p-5">
          <div className="text-xs text-[var(--muted-2)] uppercase tracking-wider font-mono mb-3">Rule compliance</div>
          <ul className="space-y-2 text-sm">{rules.map((r) => <li key={r.t} className="flex items-center gap-2">{r.ok ? <CheckCircle2 size={16} className="text-[var(--emerald)]" /> : <AlertTriangle size={16} className="text-[var(--rose)]" />}{r.t}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- Calendar ---------- */
export function TradingCalendar() {
  const [m, setM] = useState(10); // November 2026 (0-based month)
  const year = 2026;
  const days = monthDays(year, m);
  const lead = new Date(year, m, 1).getDay();
  const traded = days.filter((d) => d.pnl !== null && d.pnl !== 0);
  const total = traded.reduce((s, d) => s + d.pnl, 0);
  return (
    <div>
      <PageHead title="Trading calendar" sub="Daily P&L at a glance.">
        <div className="flex items-center gap-2">
          <button className="btn-ghost rounded-full p-2" onClick={() => setM((v) => Math.max(0, v - 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <div className="font-display text-lg w-40 text-center">{new Date(year, m, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}</div>
          <button className="btn-ghost rounded-full p-2" onClick={() => setM((v) => Math.min(11, v + 1))} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </PageHead>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Profitable days" value={traded.filter((d) => d.pnl > 0).length} tone="text-[var(--emerald)]" />
        <Kpi label="Losing days" value={traded.filter((d) => d.pnl < 0).length} tone="text-[var(--rose)]" />
        <Kpi label="No-trade days" value={days.filter((d) => d.pnl === 0).length} />
        <Kpi label="Month P&L" value={signed(total)} tone={pnlCls(total)} />
      </div>
      <div className="cal-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="cal-head">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {days.map((d) => (
          <div key={d.day} className={`cal-day ${d.pnl === null ? "is-off" : d.pnl > 0 ? "is-up" : d.pnl < 0 ? "is-down" : "is-flat"}`}>
            <span>{d.day}</span>
            {d.pnl !== null && <strong>{d.pnl === 0 ? "—" : `${d.pnl > 0 ? "+" : "−"}${Math.abs(d.pnl).toLocaleString("en-IN")}`}</strong>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Funded account ---------- */
export function FundedAccount() {
  const f = ACCOUNTS.find((a) => a.status === "Funded");
  const share = Math.max(0, f.pnl) * (ACCOUNT.profit_split / 100);
  return (
    <div>
      <PageHead title="Funded account" sub={`${f.id} · started ${f.start}`}><StatusPill status="Funded" /></PageHead>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi label="Account size" value={inr(f.size)} icon={Wallet} />
        <Kpi label="Balance" value={inr(f.balance)} icon={Wallet} />
        <Kpi label="P&L" value={signed(f.pnl)} tone={pnlCls(f.pnl)} icon={TrendingUp} />
        <Kpi label="Profit split" value={`${ACCOUNT.profit_split}%`} icon={BadgeCheck} />
        <Kpi label="Overall loss limit" value={inr(ACCOUNT.overall_loss_limit)} icon={ShieldAlert} />
        <Kpi label="Your share (if paid now)" value={inr(share)} tone="text-[var(--emerald)]" icon={Wallet} />
      </div>
      <div className="card-panel p-6 mt-6 flex flex-wrap items-center justify-between gap-4">
        <div><div className="font-display text-xl">Ready to withdraw?</div><p className="text-sm text-[var(--muted)] mt-1">Payouts are processed after KYC verification.</p></div>
        <Link to="/app/payouts" className="btn-amber rounded-full px-5 py-2.5 text-sm">Request payout</Link>
      </div>
    </div>
  );
}

/* ---------- KYC ---------- */
export function Kyc() {
  const [form, setForm] = useState({ aadhaar: "", pan: "", bank: "", ifsc: "", holder: "" });
  const [files, setFiles] = useState({});
  const [status, setStatus] = useState("Not submitted");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const docs = [["aadhaar_doc", "Aadhaar (front & back)"], ["pan_doc", "PAN card"], ["bank_doc", "Cancelled cheque / bank statement"]];
  const valid = /^\d{12}$/.test(form.aadhaar.replace(/\s/g, "")) && /^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan.toUpperCase()) && form.bank.length >= 6 && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase()) && form.holder.trim();
  const submit = (e) => {
    e.preventDefault();
    if (!valid) return toast.error("Please check the Aadhaar (12 digits), PAN (ABCDE1234F), account number and IFSC.");
    if (docs.some(([k]) => !files[k])) return toast.error("Please attach all three documents.");
    setStatus("Under review");
    toast.success("KYC submitted (sample) — nothing was uploaded.");
  };
  const steps = [["Submitted", status !== "Not submitted"], ["Under review", status === "Under review" || status === "Verified"], ["Verified", status === "Verified"]];
  return (
    <div>
      <PageHead title="KYC verification" sub="Needed before your first payout. This screen is a preview — documents are not uploaded."><StatusPill status={status} /></PageHead>
      <div className="kyc-steps mb-6">{steps.map(([t, on], i) => <div key={t} className={on ? "is-on" : ""}><span>{on ? <CheckCircle2 size={16} /> : i + 1}</span>{t}</div>)}</div>
      <form onSubmit={submit} className="grid lg:grid-cols-2 gap-6">
        <div className="card-panel p-6 space-y-4">
          <div className="font-display text-lg">Identity & bank details</div>
          {[["aadhaar", "Aadhaar number", "1234 5678 9012"], ["pan", "PAN", "ABCDE1234F"], ["holder", "Account holder name", "As per bank"], ["bank", "Bank account number", ""], ["ifsc", "IFSC", "SBIN0001234"]].map(([k, l, ph]) => (
            <div key={k}><label className="dash-label" htmlFor={`kyc-${k}`}>{l}</label><input id={`kyc-${k}`} className="input-dark" placeholder={ph} value={form[k]} onChange={set(k)} maxLength={k === "aadhaar" ? 14 : 34} autoComplete="off" /></div>
          ))}
        </div>
        <div className="card-panel p-6 space-y-4">
          <div className="font-display text-lg">Documents</div>
          {docs.map(([k, l]) => (
            <label key={k} className={`upload-box ${files[k] ? "has-file" : ""}`}>
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFiles({ ...files, [k]: e.target.files?.[0]?.name })} />
              {files[k] ? <CheckCircle2 size={18} /> : <Upload size={18} />}
              <div><strong>{l}</strong><small>{files[k] || "JPG, PNG or PDF"}</small></div>
            </label>
          ))}
          <button type="submit" className="btn-amber rounded-full w-full py-3 text-sm" disabled={status === "Under review"}>{status === "Under review" ? "Submitted" : "Submit for verification"}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Notifications ---------- */
export function Notifications() {
  const [read, setRead] = useState([]);
  const icon = { risk: ShieldAlert, trade: Activity, progress: Target, kyc: BadgeCheck };
  return (
    <div>
      <PageHead title="Notifications" sub="Risk alerts, order updates and account news.">
        <button className="btn-ghost rounded-full px-4 py-2 text-xs" onClick={() => setRead(NOTIFICATIONS.map((n) => n.id))}>Mark all read</button>
      </PageHead>
      <ul className="space-y-3">
        {NOTIFICATIONS.map((n) => { const Icon = icon[n.kind] || Bell; const unread = !read.includes(n.id); return (
          <li key={n.id} className={`card-panel p-4 flex gap-4 items-start notif ${unread ? "is-unread" : ""}`} onClick={() => setRead([...read, n.id])}>
            <span className="notif-icon"><Icon size={17} /></span>
            <div className="flex-1"><div className="flex justify-between gap-3"><strong className="text-sm">{n.t}</strong><small className="text-[var(--muted-2)]">{n.time}</small></div><p className="text-sm text-[var(--muted)] mt-1">{n.d}</p></div>
          </li>
        ); })}
      </ul>
    </div>
  );
}

/* ---------- Support ---------- */
export function Support() {
  const [tickets, setTickets] = useState([
    { id: "TK-SAMPLE-301", subject: "Trading day not counted", status: "Resolved", date: "2026-10-28" },
    { id: "TK-SAMPLE-318", subject: "Payout timeline question", status: "Pending", date: "2026-11-02" },
  ]);
  const [form, setForm] = useState({ subject: "", category: "Account", message: "" });
  const submit = (e) => {
    e.preventDefault();
    if (form.subject.trim().length < 4 || form.message.trim().length < 10) return toast.error("Please add a subject and a short description.");
    setTickets([{ id: `TK-SAMPLE-${330 + tickets.length}`, subject: form.subject.trim().slice(0, 120), status: "Pending", date: "Today" }, ...tickets]);
    setForm({ subject: "", category: "Account", message: "" });
    toast.success("Ticket created (sample). For urgent help use WhatsApp or email.");
  };
  return (
    <div>
      <PageHead title="Support" sub="Raise a ticket or reach the team directly." />
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <form onSubmit={submit} className="card-panel p-6 space-y-4">
          <div className="font-display text-lg flex items-center gap-2"><LifeBuoy size={18} /> New ticket</div>
          <div><label className="dash-label" htmlFor="tk-cat">Category</label>
            <select id="tk-cat" className="input-dark" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Account", "Trading", "Payouts", "KYC", "Other"].map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="dash-label" htmlFor="tk-sub">Subject</label><input id="tk-sub" className="input-dark" maxLength={120} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><label className="dash-label" htmlFor="tk-msg">Message</label><textarea id="tk-msg" rows={5} className="input-dark" maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <button className="btn-amber rounded-full w-full py-3 text-sm inline-flex items-center justify-center gap-2"><Send size={15} /> Submit ticket</button>
        </form>
        <div>
          <h2 className="font-display text-xl mb-3">Your tickets</h2>
          <Table rows={tickets} cols={[
            { k: "id", label: "Ticket", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
            { k: "subject", label: "Subject" }, { k: "date", label: "Date" },
            { k: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
          ]} />
        </div>
      </div>
    </div>
  );
}

/* ---------- My accounts (sample cards with filters) ---------- */
export function SampleAccounts() {
  const [f, setF] = useState("All");
  const list = ACCOUNTS.filter((a) => f === "All" || a.status === f);
  return (
    <section className="mt-12">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3"><h2 className="font-display text-2xl">Account overview</h2><SampleBadge /></div>
        <div className="seg">{["All", "Active", "Completed", "Failed", "Funded"].map((s) => <button key={s} className={f === s ? "is-on" : ""} onClick={() => setF(s)}>{s}</button>)}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {list.map((a) => (
          <div key={a.id} className="card-panel p-5 acct-card">
            <div className="flex justify-between items-start"><div><div className="font-mono text-xs text-[var(--muted-2)]">{a.id}</div><div className="font-display text-xl mt-1">{a.product}</div></div><StatusPill status={a.status} /></div>
            <dl className="acct-meta">
              <div><dt>Size</dt><dd>{inr(a.size)}</dd></div><div><dt>Balance</dt><dd>{inr(a.balance)}</dd></div>
              <div><dt>Equity</dt><dd>{inr(a.equity)}</dd></div><div><dt>P&L</dt><dd className={pnlCls(a.pnl)}>{signed(a.pnl)}</dd></div>
              <div><dt>Start</dt><dd>{a.start}</dd></div><div><dt>Expiry</dt><dd>{a.expiry}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Overview extras ---------- */
export function OverviewSample() {
  const a = ACCOUNT, e = evaluation(a);
  const curve = useMemo(() => { let v = a.starting_capital; return makeCandles("NIFTY", "1D", 30).map((c, i) => (v += (c.close - c.open) * 4 + i * 30)); }, []);
  const lo = Math.min(...curve), hi = Math.max(...curve);
  const pts = curve.map((v, i) => `${(i / (curve.length - 1)) * 600},${150 - ((v - lo) / (hi - lo || 1)) * 140}`).join(" ");
  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-4"><h2 className="font-display text-2xl">Trading overview</h2><SampleBadge /><span className="text-xs text-[var(--muted-2)] font-mono">Trader ID {a.trader_id}</span></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Starting capital" value={inr(a.starting_capital)} />
        <Kpi label="Balance" value={inr(a.balance)} />
        <Kpi label="Current equity" value={inr(a.equity)} />
        <Kpi label="Total P&L" value={signed(e.pnl)} tone={pnlCls(e.pnl)} />
        <Kpi label="Daily P&L" value={signed(a.daily_pnl)} tone={pnlCls(a.daily_pnl)} />
        <Kpi label="Drawdown" value={`${e.drawdown_pct}%`} />
        <Kpi label="Trading days" value={`${a.trading_days_done} / ${a.min_trading_days}`} icon={CalendarDays} />
        <Kpi label="Target progress" value={`${e.progress}%`} icon={Target} />
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-6">
        <div className="card-panel p-5">
          <div className="text-xs text-[var(--muted-2)] uppercase tracking-wider font-mono mb-3">Equity curve · 30 days</div>
          <svg viewBox="0 0 600 160" className="w-full h-auto equity-svg" role="img" aria-label="Equity curve (sample)"><polyline points={pts} /><polygon points={`0,160 ${pts} 600,160`} /></svg>
        </div>
        <div className="card-panel p-5">
          <div className="text-xs text-[var(--muted-2)] uppercase tracking-wider font-mono mb-3">Recent trades</div>
          <ul className="space-y-2 text-sm">{TRADES.slice(0, 5).map((t) => <li key={t.id} className="flex justify-between gap-3"><span>{t.side === "BUY" ? "▲" : "▼"} {t.symbol} <small className="text-[var(--muted-2)]">{t.in.slice(5)}</small></span><span className={pnlCls(t.pnl)}>{signed(t.pnl)}</span></li>)}</ul>
          <Link to="/app/tradebook" className="text-xs text-[var(--accent)] mt-4 inline-block hover:underline">Open trade book →</Link>
        </div>
      </div>
    </section>
  );
}
