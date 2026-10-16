# @nebutra/auth

## 4.0.0

### Patch Changes

- [#793](https://github.com/Nebutra/Nebutra-Sailor/pull/793) [`7684674`](https://github.com/Nebutra/Nebutra-Sailor/commit/7684674ba1e8431a3d75a4580a9aba197d503b1d) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - `createAuth({ provider: "better-auth" })` now resolves after the plugin probe, so `capabilities` reflects what mounted: switching the active organization through the gateway no longer answers 501.

- [`b6b494f`](https://github.com/Nebutra/Nebutra-Sailor/commit/b6b494f280a96982f96c8a1d4dce6b7405b154bf) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - A fresh scaffold can sell: the Better Auth session now carries the active organization and the member's role (`org:<role>`), so billing's role guards see them, and the default offer catalog adds Pro monthly and annual memberships beside the credit packs.

- Updated dependencies [[`8c77238`](https://github.com/Nebutra/Nebutra-Sailor/commit/8c772384caec2c5a7cb7f259d397dc73e2df57e3)]:
  - @nebutra/audit@5.0.0
  - @nebutra/email@5.0.0
  - @nebutra/logger@5.0.0
  - @nebutra/ui@5.0.0
  - @nebutra/i18n@5.0.0
  - @nebutra/feature-flags@0.1.8
  - @nebutra/db@0.1.7
  - @nebutra/repositories@0.0.8

## 3.0.1

### Patch Changes

- Updated dependencies []:
  - @nebutra/ui@4.0.1
  - @nebutra/audit@4.0.1
  - @nebutra/email@4.0.1
  - @nebutra/logger@4.0.1
  - @nebutra/feature-flags@0.1.7
  - @nebutra/db@0.1.6
  - @nebutra/repositories@0.0.7

## 3.0.0

### Patch Changes

- [#663](https://github.com/Nebutra/Nebutra-Sailor/pull/663) [`8d858d0`](https://github.com/Nebutra/Nebutra-Sailor/commit/8d858d02344d55fb78053f6e52a904d4b3c8f609) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - A relying party (a product app pointing `BETTER_AUTH_URL` at another host) resolves sessions at the auth center without `BETTER_AUTH_SECRET`. The secret is now checked only where a local Better Auth instance is built.

- Updated dependencies []:
  - @nebutra/audit@4.0.0
  - @nebutra/email@4.0.0
  - @nebutra/logger@4.0.0
  - @nebutra/ui@4.0.0
  - @nebutra/feature-flags@0.1.6
  - @nebutra/db@0.1.5
  - @nebutra/repositories@0.0.6

## 2.0.0

### Patch Changes

- Updated dependencies []:
  - @nebutra/audit@3.0.0
  - @nebutra/email@3.0.0
  - @nebutra/logger@3.0.0
  - @nebutra/ui@3.0.0
  - @nebutra/feature-flags@0.1.5
  - @nebutra/db@0.1.4
  - @nebutra/repositories@0.0.5

## 1.0.0

### Patch Changes

- Updated dependencies [[`0ea06f4`](https://github.com/Nebutra/Nebutra-Sailor/commit/0ea06f4b7ca492d20911a3d68a8c4da16c680dc0), [`a29746f`](https://github.com/Nebutra/Nebutra-Sailor/commit/a29746fdd9eabdfb9c1692a2dc43fc7d5810779c), [`025abf8`](https://github.com/Nebutra/Nebutra-Sailor/commit/025abf8b94aad96ffe56f50632a094782a30b968)]:
  - @nebutra/db@0.1.3
  - @nebutra/feature-flags@0.1.4
  - @nebutra/repositories@0.0.4
  - @nebutra/ui@2.0.0
  - @nebutra/email@2.0.0
  - @nebutra/audit@2.0.0
  - @nebutra/logger@2.0.0

## 0.1.3

### Patch Changes

- Updated dependencies []:
  - @nebutra/ui@0.2.2
  - @nebutra/audit@0.1.2
  - @nebutra/email@0.1.2
  - @nebutra/logger@0.1.2
  - @nebutra/db@0.1.2
  - @nebutra/feature-flags@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @nebutra/audit@0.1.1
  - @nebutra/email@0.1.1
  - @nebutra/logger@0.1.1
  - @nebutra/ui@0.2.1
  - @nebutra/feature-flags@0.1.2
  - @nebutra/db@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [[`da6bfea`](https://github.com/Nebutra/Nebutra-Sailor/commit/da6bfeaf6c323a9aecefdd65c481a9852aee25b9), [`092a1ce`](https://github.com/Nebutra/Nebutra-Sailor/commit/092a1ce810965e2d81767642e4bad05b80df81f4), [`34bd161`](https://github.com/Nebutra/Nebutra-Sailor/commit/34bd16140436c966896bf7a2276e8c20777c256f), [`d0b0e62`](https://github.com/Nebutra/Nebutra-Sailor/commit/d0b0e623a322e35f9ce2ae8d117e803b803b5e0b), [`4f5687f`](https://github.com/Nebutra/Nebutra-Sailor/commit/4f5687fd3fc55529486d6356e010bcaeffe131c8)]:
  - @nebutra/feature-flags@0.1.1
  - @nebutra/ui@0.2.0
