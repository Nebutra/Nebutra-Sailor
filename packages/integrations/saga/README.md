# @nebutra/saga

Status: **WIP**

> **Status: WIP** — Not yet integrated into any production app. Do not import until this notice is removed.

Saga pattern for distributed transactions.

## Installation

```bash
pnpm add @nebutra/saga
```

## Features

- **Orchestrator** — Central coordination of multi-step transactions
- **Compensation** — Automatic rollback on failures
- **Type-safe** — Fully typed step definitions
- **Audit** — Transaction logging and tracing

## Usage

### Define a Saga

```typescript
import { createSaga, SagaStep } from "@nebutra/saga";

const orderSaga = createSaga("order.create", [
  {
    name: "reserve_inventory",
    execute: async (ctx) => {
      const result = await inventoryService.reserve(ctx.items);
      return { reservationId: result.id };
    },
    compensate: async (ctx, result) => {
      await inventoryService.release(result.reservationId);
    },
  },
  {
    name: "charge_payment",
    execute: async (ctx) => {
      const charge = await paymentService.charge(ctx.amount);
      return { chargeId: charge.id };
    },
    compensate: async (ctx, result) => {
      await paymentService.refund(result.chargeId);
    },
  },
  {
    name: "create_order",
    execute: async (ctx, prev) => {
      return await orderService.create({
        ...ctx,
        reservationId: prev.reserve_inventory.reservationId,
        chargeId: prev.charge_payment.chargeId,
      });
    },
    compensate: async (ctx, result) => {
      await orderService.cancel(result.orderId);
    },
  },
]);
```

### Execute a Saga

```typescript
import { sagaOrchestrator } from "@nebutra/saga";

const result = await sagaOrchestrator.execute(orderSaga, {
  userId: "user_123",
  items: [{ productId: "prod_1", qty: 2 }],
  amount: 5999,
});

if (result.success) {
  console.log("Order created:", result.data);
} else {
  console.error("Saga failed:", result.error);
  // Compensation already executed
}
```

## Saga Lifecycle

```
Step 1 → Step 2 → Step 3 → Success
   ↓        ↓        ↓
   ←--------←--------← Compensate on failure
```

1. Execute steps in sequence
2. On failure, compensate completed steps in reverse order
3. Return final result or error

## Built-in Sagas

| Saga                   | Steps                              |
| ---------------------- | ---------------------------------- |
| `order.create`         | reserve → charge → create → notify |
| `subscription.upgrade` | validate → prorate → update → sync |
| `web3.mint`            | verify → mint → record             |

## Status Tracking

```typescript
const status = await sagaOrchestrator.getStatus(sagaId);
// { state: "completed", steps: [...], completedAt: ... }
```

## Related

- [Event Bus](../event-bus/)
- [E-commerce service](../../backends/python/ecommerce/)
