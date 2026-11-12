import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== "string") return NextResponse.json({ error: "Missing PayPal order ID." }, { status: 400 });
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    if (!id || !secret) throw new Error("PayPal sandbox credentials are not configured.");
    const base = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
    const auth = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
      cache: "no-store"
    });
    if (!auth.ok) throw new Error("PayPal authentication failed.");
    const { access_token } = await auth.json();
    const response = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.message || "Payment capture failed." }, { status: response.status });
    return NextResponse.json({ id: data.id, status: data.status, payer: data.payer?.name?.given_name || "Customer" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to capture payment." }, { status: 500 });
  }
}