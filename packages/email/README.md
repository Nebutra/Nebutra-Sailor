# @nebutra/email

> Transactional email service powered by Resend with branded HTML templates.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/email@workspace:*
```

## Usage

```typescript
import { sendWelcomeEmail, sendApiKeyCreatedEmail } from "@nebutra/email";

await sendWelcomeEmail({
  to: "user@example.com",
  firstName: "Jane",
  orgName: "Acme Corp",
});

await sendApiKeyCreatedEmail({
  to: "user@example.com",
  firstName: "Jane",
  keyPrefix: "sk_live_abc",
  keyName: "Production Key",
  plaintextKey: "sk_live_abc123...",
});
```

## API

| Function | Description |
|----------|-------------|
| `sendWelcomeEmail` | Welcome email for new organization provisioning |
| `sendOrderConfirmationEmail` | Order confirmation with line items |
| `sendApiKeyCreatedEmail` | API key creation notice (shows key once) |
| `sendQuotaWarningEmail` | Quota usage warning (80%/100% threshold) |
| `sendInviteEmail` | Team member invitation |
| `sendMagicLinkEmail` | Passwordless sign-in link |
| `sendContactFormReceivedEmail` | Contact form acknowledgment |
| `sendCheckoutCompletedEmail` | Subscription checkout confirmation |
| `sendTrialEndingEmail` | Trial expiry warning (3 days before) |
| `sendInvoicePaidEmail` | Payment receipt |
| `sendPaymentFailedEmail` | Payment failure retry notification |
| `sendSubscriptionCanceledEmail` | Cancellation confirmation |
| `sendUpcomingInvoiceEmail` | Upcoming charge notification |
| `sendPlanChangedEmail` | Plan upgrade/downgrade notice |
| `sendLicenseCreatedEmail` | License key delivery email |

## Configuration

| Environment Variable | Description |
|---------------------|-------------|
| `RESEND_API_KEY` | Resend API key from https://resend.com/api-keys |
| `EMAIL_FROM` | Verified sender address (default: `Nebutra <noreply@nebutra.ai>`) |
