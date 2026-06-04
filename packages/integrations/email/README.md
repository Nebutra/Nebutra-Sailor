# @nebutra/email

Multi-provider transactional email for Nebutra products.

The package auto-detects Resend, Nodemailer SMTP, or a console development
provider, then sends branded HTML templates through a single API.

## Installation

```bash
pnpm add @nebutra/email
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
| `EMAIL_PROVIDER` | Optional explicit provider: `resend`, `nodemailer`, or `console` |
| `RESEND_API_KEY` | Resend API key from https://resend.com/api-keys |
| `SMTP_HOST` | Enables Nodemailer SMTP provider when Resend is not configured |
| `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | SMTP provider settings |
| `EMAIL_FROM` | Verified sender address (default: `Nebutra <noreply@nebutra.com>`) |

## Providers

| Provider | Selection |
| --- | --- |
| `resend` | `EMAIL_PROVIDER=resend` or `RESEND_API_KEY` present |
| `nodemailer` | `EMAIL_PROVIDER=nodemailer` or `SMTP_HOST` present |
| `console` | Explicit `EMAIL_PROVIDER=console` or development/test fallback |

## License

MIT
