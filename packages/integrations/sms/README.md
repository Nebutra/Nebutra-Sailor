# @nebutra/sms

> SMS verification service with Aliyun and Tencent Cloud provider support, including rate-limited code generation and verification.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/sms@workspace:*
```

## Usage

```typescript
import { initSmsVerification, sendVerificationCode, verifyCode } from "@nebutra/sms";
import { createAliyunProvider } from "@nebutra/sms/aliyun";

// Initialize with a provider and Redis
const provider = createAliyunProvider({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
  signName: "Nebutra",
  templateCode: "SMS_123456",
});

initSmsVerification({
  provider,
  redis: redisClient,
  config: { codeLength: 6, codeTtl: 300, cooldown: 60 },
});

// Send a verification code
await sendVerificationCode("+8613800138000");

// Verify the code
const result = await verifyCode("+8613800138000", "123456");
```

## API

| Export | Subpath | Description |
|--------|---------|-------------|
| `initSmsVerification(opts)` | `.` | Initialize SMS system with provider, Redis, and config |
| `sendVerificationCode(phone)` | `.` | Generate and send a verification code |
| `verifyCode(phone, code)` | `.` | Verify a submitted code |
| `createAliyunProvider(config)` | `./aliyun` | Create Aliyun SMS provider |
| `createTencentProvider(config)` | `./tencent` | Create Tencent Cloud SMS provider |

### Types

| Type | Description |
|------|-------------|
| `SmsProvider` | Provider interface for sending SMS |
| `SmsConfig` | Configuration (provider, codeLength, codeTtl, cooldown) |
| `AliyunSmsConfig` | Aliyun-specific config (accessKeyId, signName, templateCode) |
| `TencentSmsConfig` | Tencent-specific config |

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `codeLength` | `6` | Number of digits in verification code |
| `codeTtl` | `300` | Code expiry in seconds (5 minutes) |
| `cooldown` | `60` | Minimum seconds between sends to same number |

## Dependencies

- `@nebutra/cache` -- Redis client for code storage and rate limiting
- `@nebutra/logger` -- Structured logging
