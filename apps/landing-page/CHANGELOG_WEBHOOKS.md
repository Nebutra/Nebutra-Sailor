# Changelog Webhook Setup

This document explains how to configure the Sanity webhook that automatically notifies subscribers and external systems when a new release is published.

## Overview

The webhook handler at `/api/changelog/webhook` receives Sanity publish events for `changelogEntry` documents and distributes notifications across multiple channels:

- **Email**: Send to newsletter subscribers via Resend
- **Webhooks**: Fan-out to external systems via Svix
- **Slack**: Post release announcement to team channel
- **Next.js Cache**: Revalidate changelog pages for fresh content

Each channel is opt-in based on environment variables.

## Sanity Studio Configuration

### Step 1: Generate a Webhook Secret

Create a strong random secret (at least 32 characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Example output: a7f3c9e2b4d1f6a8e5c2b9d7f3a1e4c6b8d2f5a9e3c1b6d9f2a5e8c1b4d7f
```

Save this as `SANITY_WEBHOOK_SECRET` in your `.env.local` file.

### Step 2: Configure the Webhook in Sanity

1. Log in to your Sanity project dashboard
2. Navigate to **Settings** → **API** → **Webhooks**
3. Click **Create webhook**
4. Fill in the form:

   | Field | Value |
   |-------|-------|
   | **Name** | `Changelog Notifications` |
   | **URL** | `https://your-domain.com/api/changelog/webhook` |
   | **Trigger on** | `Create`, `Update` |
   | **Trigger for** | `changelogEntry` (document type) |
   | **Secret** | Paste the secret generated in Step 1 |
   | **HTTP method** | POST |

5. Click **Create**

The webhook will now send POST requests to your API whenever a `changelogEntry` is created or updated.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `SANITY_WEBHOOK_SECRET` | HMAC signature secret for webhook validation |

### Optional (Email)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from [Resend](https://resend.com) for email delivery |
| `RESEND_AUDIENCE_ID` | Audience ID in Resend (group of newsletter subscribers) |

To send release emails, both must be set. If either is missing, email notifications are skipped.

### Optional (Outbound Webhooks)

| Variable | Description |
|----------|-------------|
| `SVIX_API_KEY` | API key from [Svix](https://svix.com) for webhook routing |

If not set, external webhooks are not sent. Svix allows you to define multiple endpoints that will receive the `changelog.published` event.

### Optional (Slack)

| Variable | Description |
|----------|-------------|
| `SLACK_CHANGELOG_WEBHOOK_URL` | Incoming webhook URL from a Slack app |

To set up a Slack webhook:
1. Create or select a Slack app in your workspace
2. Enable **Incoming Webhooks** in the app settings
3. Create a new webhook pointing to your changelog channel
4. Copy the webhook URL to this env var

If not set, Slack notifications are skipped.

## Example `.env.local`

```env
# Sanity webhook validation
SANITY_WEBHOOK_SECRET=a7f3c9e2b4d1f6a8e5c2b9d7f3a1e4c6b8d2f5a9e3c1b6d9f2a5e8c1b4d7f

# Email notifications
RESEND_API_KEY=re_xyz123abc456
RESEND_AUDIENCE_ID=aud_7f8g9h0i1j2k3l

# Outbound webhooks
SVIX_API_KEY=svx_test_xyz123abc456

# Slack notifications
SLACK_CHANGELOG_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

## Webhook Payload

The handler expects a Sanity webhook payload with this shape:

```typescript
{
  _id: string;              // Document ID
  _type: "changelogEntry";  // Must be changelogEntry
  _rev: string;             // Document revision
  version: string;          // Release version (e.g., "1.2.0")
  title: string;            // Release title (e.g., "Dark mode support")
  publishedAt?: string;     // ISO timestamp
  type?: "feature" | "improvement" | "fix" | "breaking" | "security";
  summary?: string;         // Release summary/description
}
```

## Handler Logic

1. **Validate signature**: HMAC-SHA256 verification against `SANITY_WEBHOOK_SECRET`
2. **Filter document type**: Only `changelogEntry` documents are processed
3. **Build content**: Version, title, summary, and type are extracted
4. **Fan-out notifications** (all in parallel, best-effort):
   - Email via Resend (if `RESEND_API_KEY` is set)
   - Webhooks via Svix (if `SVIX_API_KEY` is set)
   - Slack (if `SLACK_CHANGELOG_WEBHOOK_URL` is set)
   - Revalidate Next.js ISR cache for `/changelog`
5. **Return success**: Response is sent immediately; notifications complete asynchronously

Invalid signatures return `401 Unauthorized`. Missing channels are silently skipped.

## Testing the Webhook

### Manual Test (cURL)

```bash
# Generate test payload
PAYLOAD='{"_id":"test","_type":"changelogEntry","_rev":"1","version":"1.0.0","title":"Test Release","summary":"Testing the webhook"}'

# Compute signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -mac HMAC -macopt key:$SANITY_WEBHOOK_SECRET | awk '{print $2}')

# Send request
curl -X POST http://localhost:3000/api/changelog/webhook \
  -H "sanity-webhook-signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

# Expected response
# {"ok":true,"version":"1.0.0","notificationChannels":["email","webhooks","slack"]}
```

### In Sanity Studio

1. Go to **Settings** → **API** → **Webhooks**
2. Find your webhook
3. Click the three-dot menu → **Test**
4. Select a `changelogEntry` document or trigger type
5. Click **Send test event**
6. Check the response and logs

## Troubleshooting

### Invalid signature error (401)

- Verify `SANITY_WEBHOOK_SECRET` matches the secret in Sanity dashboard
- Ensure the webhook URL uses HTTPS in production
- Check that the request body hasn't been modified in transit

### Notification channels not firing

- Check `.env.local` for the corresponding API key
- Verify API keys are valid and not expired
- Check server logs for error messages: `[changelog-webhook] [channel] failed: ...`
- Email and Slack notifications may take a few seconds; check after 1 minute

### Cache revalidation not working

- This feature only works in production Next.js deployments
- In development, ISR revalidation may be skipped
- Manually clear Next.js cache or redeploy if needed

## Security Considerations

- **Webhook secret**: Use a strong, randomly generated secret (32+ characters)
- **HTTPS only**: Always use HTTPS URLs in production
- **Signature validation**: Never skip the HMAC validation step
- **Rate limiting**: Consider adding rate limits if the webhook is public
- **API keys**: Rotate Resend, Svix, and Slack API keys regularly
- **Slack webhook URLs**: Don't commit webhook URLs to version control; use env vars only

## Related Files

- Handler: `/apps/landing-page/src/app/api/changelog/webhook/route.ts`
- Documentation: `/apps/landing-page/CHANGELOG_WEBHOOKS.md`
