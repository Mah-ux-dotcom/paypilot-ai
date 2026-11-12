import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 1200;
const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const message = body && typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Keep messages under ${MAX_MESSAGE_LENGTH} characters.` }, { status: 413 });
    }

    const key = process.env.OPENAI_API_KEY;
    if (key) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 350,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are PayPilot, an AI business operator. You do not have access to merchant accounts, transactions, balances, or customer records. Never invent financial figures or claim to have analyzed live business data. Return JSON with keys: reply (string), action (create_payment or none), amount (number or null), currency (3-letter code), description (string), customer (string or null). Only choose create_payment when the user explicitly asks to create/request/charge a payment and an amount is clear. Never claim a payment has been created or paid. A human must approve every payment. If details are missing, ask for them and use action none." },
            { role: "user", content: message }
          ]
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(18000)
      });
      if (!response.ok) {
        return NextResponse.json({ error: "The AI service is temporarily unavailable. Please try again." }, { status: 502 });
      }
      const data = await response.json();
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      } catch {
        return NextResponse.json({ error: "The AI returned an unreadable response. Please try again." }, { status: 502 });
      }

      const amount = typeof parsed.amount === "number" ? parsed.amount : Number(parsed.amount);
      const action = parsed.action === "create_payment" &&
        Number.isFinite(amount) && amount > 0 && amount <= 1000000 &&
        Number.isInteger(Math.round(amount * 100))
          ? "create_payment" : "none";
      const currency = typeof parsed.currency === "string" && ALLOWED_CURRENCIES.has(parsed.currency.toUpperCase())
        ? parsed.currency.toUpperCase() : "USD";

      return NextResponse.json({
        reply: typeof parsed.reply === "string" ? parsed.reply.slice(0, 1000) : "I can help prepare a payment request.",
        action,
        amount: action === "create_payment" ? Math.round(amount * 100) / 100 : null,
        currency,
        description: typeof parsed.description === "string" ? parsed.description.slice(0, 127) : "Business payment",
        customer: typeof parsed.customer === "string" ? parsed.customer.slice(0, 100) : null
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const match = message.match(/(?:\$|usd\s*)?([0-9]+(?:\.[0-9]{1,2})?)/i);
    const wantsPayment = /\b(create|request|send|charge|invoice)\b/i.test(message);
    if (wantsPayment && match) {
      const amount = Number(match[1]);
      if (amount > 0 && amount <= 1000000) {
        return NextResponse.json({
          reply: `I understood a payment request for $${amount.toFixed(2)}. Review the details below and approve it to continue to PayPal Sandbox.`,
          action: "create_payment", amount, currency: "USD",
          description: message.slice(0, 100), customer: null
        });
      }
    }
    return NextResponse.json({
      reply: "I'm ready to help prepare payment requests. I don't yet have access to your live transaction ledger, so I can't report real revenue or cash-flow figures. Connect your OpenAI key for richer request interpretation.",
      action: "none"
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The assistant request timed out. Please try again."
      : "The assistant could not process that request.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
