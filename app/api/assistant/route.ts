import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

    const key = process.env.OPENAI_API_KEY;
    if (key) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are PayPilot, an AI business operator. Help small businesses understand payments and cash flow. Return JSON with keys: reply (string), action (either create_payment or none), amount (number or null), currency (3-letter code), description (string), customer (string or null). Only choose create_payment when the user explicitly asks to create/request/charge a payment and an amount is clear. Never claim a payment has been created or paid. A human must approve every payment. If details are missing, ask for them in reply and use action none." },
            { role: "user", content: message }
          ]
        }),
        cache: "no-store"
      });
      if (!response.ok) throw new Error("The AI service is temporarily unavailable.");
      const data = await response.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      return NextResponse.json({
        reply: String(parsed.reply || "I can help with payments and business insights."),
        action: parsed.action === "create_payment" && Number(parsed.amount) > 0 ? "create_payment" : "none",
        amount: Number(parsed.amount) || null,
        currency: /^[A-Z]{3}$/.test(parsed.currency || "") ? parsed.currency : "USD",
        description: String(parsed.description || "Business payment"),
        customer: parsed.customer || null
      });
    }

    const match = message.match(/(?:\$|usd\s*)?([0-9]+(?:\.[0-9]{1,2})?)/i);
    const wantsPayment = /create|request|send|charge|invoice/i.test(message);
    if (wantsPayment && match) {
      const amount = Number(match[1]);
      return NextResponse.json({
        reply: `I understood a payment request for $${amount.toFixed(2)}. Review the details below and approve it to continue to PayPal Sandbox.`,
        action: "create_payment", amount, currency: "USD",
        description: message.slice(0, 100), customer: null
      });
    }
    return NextResponse.json({
      reply: "I'm ready to help run your business. Try asking me to create a payment request, or connect your OpenAI API key to enable richer natural-language business analysis.",
      action: "none"
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Assistant request failed." }, { status: 500 });
  }
}