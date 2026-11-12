"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Bot, CheckCircle2, ChevronDown, CircleHelp, CreditCard, DollarSign, FileText, LayoutDashboard, Menu, Send, Settings, ShieldCheck, Sparkles, TrendingUp, Wallet, X } from "lucide-react";

type ChatMessage = { role: "assistant" | "user"; text: string };
type PaymentDraft = { amount: number; currency: string; description: string; customer?: string | null };

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export default function Home() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([{ role: "assistant", text: "Hey! I'm your PayPilot business operator. I can prepare payment requests, explain your cash flow, and help you spot what needs attention. What are we working on?" }]);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, draft]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const token = params.get("token");
    if (payment === "success" && token) {
      fetch("/api/paypal/capture-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: token }) })
        .then(r => r.json()).then(data => setNotice(data.status === "COMPLETED" ? `Payment ${data.id} captured successfully in PayPal Sandbox.` : data.error || "Payment returned from PayPal."))
        .catch(() => setNotice("We couldn't confirm the payment. Check your PayPal Sandbox account."));
      window.history.replaceState({}, "", "/");
    } else if (payment === "cancelled") {
      setNotice("Checkout was cancelled. No payment was captured.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  async function sendMessage(text = message) {
    if (!text.trim() || busy) return;
    setChat(prev => [...prev, { role: "user", text }]);
    setMessage("");
    setBusy(true);
    setDraft(null);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assistant unavailable.");
      setChat(prev => [...prev, { role: "assistant", text: data.reply }]);
      if (data.action === "create_payment") setDraft({ amount: data.amount, currency: data.currency || "USD", description: data.description, customer: data.customer });
    } catch (error) {
      setChat(prev => [...prev, { role: "assistant", text: error instanceof Error ? error.message : "Something went wrong." }]);
    } finally { setBusy(false); }
  }

  async function approvePayment() {
    if (!draft || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/paypal/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create PayPal order.");
      if (!data.approvalUrl) throw new Error("PayPal created the order but did not return an approval link.");
      window.location.href = data.approvalUrl;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Payment setup failed.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen lg:flex">
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 transition-transform lg:static lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-10 flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white"><Sparkles size={21}/></div><div><div className="text-lg font-bold tracking-tight">paypilot<span className="text-violet-600">.</span></div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">AI business operator</div></div></div><button className="lg:hidden" onClick={() => setMobileNav(false)}><X/></button></div>
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</div>
        <nav className="space-y-1 text-sm">
          <a className="flex items-center gap-3 rounded-xl bg-violet-50 px-3 py-3 font-semibold text-violet-700"><LayoutDashboard size={18}/> Overview</a>
          <a className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-500 hover:bg-slate-50"><Wallet size={18}/> Transactions</a>
          <a className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-500 hover:bg-slate-50"><FileText size={18}/> Invoices</a>
          <a className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-500 hover:bg-slate-50"><CreditCard size={18}/> Payment links</a>
        </nav>
        <div className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Intelligence</div>
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-800"><Bot size={17}/> PayPilot AI</div><p className="text-xs leading-5 text-slate-500">Your business operator is ready. Ask it to take care of the busywork.</p><button onClick={() => document.getElementById("assistant")?.scrollIntoView({ behavior: "smooth" })} className="mt-3 text-xs font-bold text-violet-700">Open assistant →</button></div>
        <div className="mt-auto space-y-2 pt-8 text-sm text-slate-500"><a className="flex items-center gap-3 rounded-xl px-3 py-2"><Settings size={17}/> Settings</a><a className="flex items-center gap-3 rounded-xl px-3 py-2"><CircleHelp size={17}/> Help center</a><div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">JD</div><div><div className="text-xs font-semibold text-slate-800">Jordan Davis</div><div className="text-[10px] text-slate-400">Demo workspace</div></div><ChevronDown size={15} className="ml-auto"/></div></div>
      </aside>
      {mobileNav && <button aria-label="Close menu" className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden" onClick={() => setMobileNav(false)}/>}
      <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        <header className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><button className="lg:hidden" onClick={() => setMobileNav(true)}><Menu/></button><div><div className="text-xs font-medium text-slate-400">{today}</div><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Good morning, Jordan <span>✦</span></h1><p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening with your business today.</p></div></div><div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Sandbox environment</div></header>
        {notice && <div className="mb-5 flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800"><span>{notice}</span><button onClick={() => setNotice("")}><X size={16}/></button></div>}
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Demo workspace: dashboard totals and recent transactions are illustrative sample data, not live PayPal account data.</div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Total revenue" value="$12,840.00" change="+12.8%" icon={<DollarSign size={18}/>} />
          <Stat title="Successful payments" value="184" change="+8.2%" icon={<CheckCircle2 size={18}/>} />
          <Stat title="Pending payments" value="$1,250.00" change="6 invoices" icon={<ArrowDownLeft size={18}/>} />
          <Stat title="Avg. transaction" value="$69.78" change="+4.3%" icon={<TrendingUp size={18}/>} />
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between"><div><h2 className="font-bold">Revenue overview</h2><p className="mt-1 text-xs text-slate-400">Your business performance at a glance</p></div><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Last 7 days <ChevronDown className="ml-2 inline" size={13}/></button></div>
            <div className="mt-7 flex items-end gap-3"><span className="text-3xl font-bold tracking-tight">$4,280.50</span><span className="mb-1 flex items-center text-xs font-semibold text-emerald-600"><ArrowUpRight size={14}/> 12.8%</span></div><p className="mt-1 text-xs text-slate-400">Compared to $3,792.20 last week</p>
            <div className="mt-7 flex h-40 items-end gap-2 sm:gap-4">{[42,65,48,78,58,88,70,95,63,82,72,100,76,91].map((h,i)=><div key={i} className="group flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-md bg-violet-100 transition-colors group-hover:bg-violet-500" style={{height:`${h}%`}}/><span className="text-[9px] text-slate-400">{["M","T","W","T","F","S","S","M","T","W","T","F","S","S"][i]}</span></div>)}</div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400"><span className="h-2 w-2 rounded-sm bg-violet-400"/> Revenue received <span className="ml-auto">Illustrative demo data</span></div>
          </div>
          <div id="assistant" className="flex min-h-[350px] flex-col rounded-2xl border border-violet-200 bg-white p-5 shadow-[0_8px_30px_rgba(99,91,255,.07)] sm:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"><Bot size={21}/></div><div><h2 className="font-bold">Ask PayPilot</h2><p className="text-[11px] text-emerald-600">● Ready to assist</p></div><span className="ml-auto rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">AI OPERATOR</span></div>
            <div className="flex-1 space-y-3 overflow-y-auto py-4" style={{maxHeight:260}}>{chat.map((item,i)=><div key={i} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-xs leading-5 ${item.role === "user" ? "rounded-br-sm bg-violet-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-700"}`}>{item.text}</div></div>)}{busy && <div className="text-xs text-slate-400">PayPilot is thinking…</div>}<div ref={bottomRef}/></div>
            {draft && <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50 p-3"><div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-violet-700">Payment approval required</div><div className="text-lg font-bold">{money(draft.amount)} {draft.currency}</div><div className="mt-1 text-xs text-slate-500">{draft.description}</div>{draft.customer && <div className="mt-1 text-xs text-slate-500">Customer: {draft.customer}</div>}<button disabled={busy} onClick={approvePayment} className="mt-3 w-full rounded-lg bg-violet-600 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">Approve & continue to PayPal</button></div>}
            <form onSubmit={e=>{e.preventDefault();sendMessage();}} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2"><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ask anything or create a payment…" className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" /><button disabled={busy || !message.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white disabled:opacity-40"><Send size={15}/></button></form>
            <div className="mt-3 flex flex-wrap gap-2">{["Request $250 from John","How can I improve cash flow?"].map(q=><button key={q} onClick={()=>sendMessage(q)} className="rounded-full border border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-500 hover:border-violet-300 hover:text-violet-700">{q}</button>)}</div>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Recent transactions</h2><p className="mt-1 text-xs text-slate-400">Illustrative sample transactions — not connected to a live account</p></div><button className="text-xs font-semibold text-violet-700">View all →</button></div><div className="space-y-4">{[{name:"Olivia Rhye",email:"Website redesign",amount:"+$1,200.00",date:"Today, 10:42 AM",initial:"OR"},{name:"Phoenix Baker",email:"Brand identity package",amount:"+$850.00",date:"Today, 9:18 AM",initial:"PB"},{name:"Lana Steiner",email:"Consulting session",amount:"+$320.00",date:"Yesterday, 4:36 PM",initial:"LS"}].map((t,i)=><div key={t.name} className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{t.initial}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{t.name}</div><div className="text-xs text-slate-400">{t.email}</div></div><div className="hidden text-right sm:block"><div className="text-[11px] text-slate-400">{t.date}</div><div className="mt-1 text-xs font-semibold text-emerald-600">{t.amount}</div></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Completed</span></div>)}</div></div>
        <footer className="mt-6 flex flex-col items-center justify-between gap-2 pb-4 text-[10px] text-slate-400 sm:flex-row"><span>© 2026 PayPilot. Built for the PayPal AI Hackathon.</span><span className="flex items-center gap-1"><ShieldCheck size={12}/> Payments are processed securely by PayPal Sandbox</span></footer>
      </section>
    </main>
  );
}

function Stat({title,value,change,icon}:{title:string;value:string;change:string;icon:React.ReactNode}) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{title}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">{icon}</span></div><div className="mt-4 text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-[11px] font-semibold text-emerald-600">{change}</div></div>;
}