# PayPilot

**Your AI-powered business operator.** PayPilot combines natural-language AI with PayPal checkout so small businesses can prepare and collect payments through a human-approved workflow.

## What it does

- Chat with an AI business operator.
- Turn a natural-language instruction such as "Request $250 from John for website design" into a structured payment draft.
- Review the amount and description, then explicitly approve.
- Create a PayPal Checkout order using the PayPal Orders v2 API.
- Redirect to PayPal Sandbox for payer approval and capture the order after the customer returns.
- Keep PayPal credentials server-side; the browser never receives the client secret.

The dashboard currently includes clearly illustrative sample analytics and transactions. Live payment creation and capture use PayPal Sandbox when credentials are configured.

## Stack

- Next.js 14, React 18, TypeScript, Tailwind CSS
- PayPal REST API (OAuth 2.0, Orders v2)
- OpenAI Chat Completions API (optional, for richer intent extraction)

## Run locally

1. Install Node.js 20 or later.
2. Clone this repository and install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

4. Create a **Sandbox** REST app in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox) and add its client ID and secret to `.env.local`.

5. Optional: add an OpenAI API key. Without it, PayPilot uses a small deterministic fallback parser so the demo can still be explored.

6. Start the app:

   ```bash
   npm run dev
   ```

7. Open http://localhost:3000.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PAYPAL_CLIENT_ID` | For live sandbox checkout | PayPal Sandbox REST app client ID |
| `PAYPAL_CLIENT_SECRET` | For live sandbox checkout | PayPal Sandbox REST app secret; server-side only |
| `PAYPAL_BASE_URL` | No | Defaults to `https://api-m.sandbox.paypal.com` |
| `OPENAI_API_KEY` | No | Enables richer natural-language interpretation |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL for PayPal return/cancel URLs |

## Demo flow

1. In the assistant, enter: `Request $25 from a customer for a design consultation`.
2. Review the generated payment draft.
3. Select **Approve & continue to PayPal**.
4. Complete the payment using a PayPal Sandbox personal test account.
5. PayPilot captures the approved order when PayPal redirects back.

Do not use real payment credentials or real customer data in the hackathon demo.

## Safety and limitations

- The AI only proposes a payment draft; it cannot approve or capture a payment on its own.
- The owner must click the approval button before PayPilot creates a PayPal order.
- PayPal client secrets and OAuth tokens are handled only in server routes.
- This is a hackathon proof of concept, not production financial software.
- Analytics and recent transactions are sample UI data, not a connected merchant ledger yet.

## AI tools

OpenAI is used for structured intent extraction from natural-language requests. The assistant returns a constrained JSON object; the server validates the proposed action and amount before displaying an approval card. If no AI key is configured, a deterministic fallback supports the core demo flow.

## License

MIT. See [LICENSE](./LICENSE).
