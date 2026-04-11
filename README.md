# mock-crow

A reusable escrow payment scaffold built with TypeScript, Express, and SQLite. Designed for developers who want to simulate a secure payment flow in their projects — particularly useful for school projects, hackathons, or any prototype where implementing a real payment provider is overkill, but the escrow logic itself needs to be realistic and trustworthy.

Instead of skipping the payment layer entirely or hardcoding a fake transaction, mock-crow gives you a working escrow system with real state management, pluggable adapters, and an optional demo UI — so you can focus on your actual project while having a credible payment backbone.

---

## What is Escrow?

Funds are locked when a buyer places an order. The seller ships the product. The buyer confirms delivery — only then are funds released to the seller. If something goes wrong, the buyer can request a refund before the seller ships.

```
Buy → [Held] → Seller Ships → [Shipped] → Buyer Confirms → [Released]
                                        ↘ Buyer Refunds  → [Refunded]
```

---

## Getting Started

### 1. Install

```bash
npm install github:berhanerdogan/test-crow
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

`.env.example` contains:

```
SERVE_DEMO=true
```

Set `SERVE_DEMO=true` to serve the demo UI and mock auth. Set to `false` or omit when integrating into your own project.

### 3. Run

```bash
npm run dev
```

Server starts at `http://localhost:3000`

---

## Project Structure

```
src/
  adapters/
    IDatabaseAdapter.ts      # Database interface — implement this to swap DB
    SQLiteAdapter.ts         # Default SQLite implementation
  services/
    EscrowService.ts         # Core escrow logic
    payment/
      IPaymentGateway.ts     # Payment interface — implement this to use real payments
      MockPaymentGateway.ts  # Always returns true
  middleware/
    demoAuthMiddleware.ts    # Demo only — not loaded when SERVE_DEMO=false
  interfaces/
    Escrow.ts
    Transaction.ts
    User.ts
  enums/
    EscrowStatus.ts
    TransactionType.ts
  index.ts
public/                      # Demo frontend (only served when SERVE_DEMO=true)
```

---

## Integrating Into Your Project

### Auth

mock-crow reads the current user from `req.user`. As long as your existing auth middleware sets `req.user` with the following shape, no changes are needed:

```typescript
req.user = {
  userID: string
  userName: string
  balance: number
  lockedBalance: number
}
```

Set `SERVE_DEMO=false` in your `.env`. The demo auth middleware will not be loaded and mock-crow will use the `req.user` set by your own middleware automatically.

### Disabling the Demo UI

Set `SERVE_DEMO=false` in your `.env`. This disables both the demo frontend and the mock auth middleware. mock-crow will only expose the API endpoints, leaving the UI and auth entirely up to your project.

### Swapping the Database Adapter

Implement `IDatabaseAdapter` for your database of choice:

```typescript
import { IDatabaseAdapter } from "./adapters/IDatabaseAdapter"

export class PostgresAdapter implements IDatabaseAdapter {
  // implement all methods
}
```

Pass it to `EscrowService` and your routes:

```typescript
const db = new PostgresAdapter()
const escrowService = new EscrowService(db, paymentGateway)
```

### Swapping the Payment Gateway

Implement `IPaymentGateway` to connect a real payment provider:

```typescript
import { IPaymentGateway } from "./services/payment/IPaymentGateway"

export class StripeGateway implements IPaymentGateway {
  async charge(userID: string, amount: number): Promise<boolean> {
    // your Stripe logic here
    return true
  }
}
```

Pass it to `EscrowService`:

```typescript
const escrowService = new EscrowService(db, new StripeGateway())
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/escrow/create` | Create a new escrow |
| POST | `/escrow/ship` | Seller marks order as shipped |
| POST | `/escrow/release` | Buyer confirms delivery, funds released to seller |
| POST | `/escrow/refund` | Refund funds to buyer |
| GET | `/escrow/seller` | Get all escrows for the current seller |
| GET | `/escrow/buyer` | Get all escrows for the current buyer |
| GET | `/products` | List all products |
| GET | `/ledger` | Get all balances and transactions |
| POST | `/ledger/topup` | Add funds to a user (demo only) |

---

## Demo UI

When `SERVE_DEMO=true`, a terminal-style demo interface is served at `http://localhost:3000`.

- Switch between **Buyer** and **Seller** views using the toggle in the header
- Buyer can browse products, purchase, confirm delivery or request a refund
- Seller can view incoming orders and mark them as shipped

---

## License

MIT