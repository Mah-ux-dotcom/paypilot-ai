# Security notes

PayPilot is a hackathon prototype and is not production-ready financial software.

## Current safeguards
- PayPal client credentials and OAuth access tokens are used only in server-side route handlers.
- The app is pinned to the PayPal Sandbox API endpoint; live PayPal API endpoints are rejected.
- Payment amounts, supported currencies, and request lengths are validated server-side.
- PayPal requests have network timeouts and responses are not cached.
- A short-lived, HTTP-only, signed order proof cookie is required before the capture route will capture an order.
- The AI may prepare a draft, but a person must approve it before an order is created.

## Important remaining gaps
- There is no user authentication, merchant tenancy, database, or durable order ledger.
- The signed cookie binds capture to an order created by this browser session, but it is not a substitute for authenticated merchant ownership or persistent order state.
- There is no verified PayPal webhook receiver. A browser redirect is not authoritative proof of settlement.
- Rate limiting, bot protection, abuse monitoring, and comprehensive automated tests are not yet implemented.
- Dashboard metrics and transaction rows are illustrative sample data, not live merchant data.

Do not use real customer information, production PayPal credentials, or live funds. Before any production use, implement authentication, per-merchant authorization, persistent order records, verified webhooks, rate limiting, monitoring, and a security review.
