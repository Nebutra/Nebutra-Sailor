---
version: "vX.Y.Z"
date: "YYYY-MM-DD"
title: "Release Title (e.g., Feature Name or Theme)"
---

# Release vX.Y.Z

> **Release Date:** YYYY-MM-DD  
> **Type:** Major | Minor | Patch

## 📋 Overview

Brief summary of this release (1-2 sentences). What's the main theme or highlight?

---

## 🆕 New Features (Added)

### Feature Name
- Description of the feature
- User benefit / use case
- Related module/service: `apps/web`, `services/ai`, etc.

### Another Feature
- Description...

---

## 🔧 Improvements (Changed)

- **Performance:** Description of optimization
- **UX/UI:** Description of UI improvements
- **API:** Description of API enhancements
- **Infrastructure:** Description of infra changes

---

## 🐛 Bug Fixes (Fixed)

- Fixed issue where [description] (#issue-number if applicable)
- Resolved [problem description]

---

## ⚠️ Breaking Changes

> **Migration Required:** Yes / No

### Breaking Change 1
- **What changed:** Description
- **Why:** Reason for the change
- **Migration steps:**
  1. Step one
  2. Step two

---

## 📌 Upgrade Guide

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Steps
```bash
# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Run migrations (if applicable)
pnpm db:migrate

# Rebuild
pnpm build
```

### Configuration Changes
- New environment variable: `NEW_VAR_NAME` - Description

---

## 🔍 Technical Details

<details>
<summary>Detailed Changes by Module</summary>

### apps/web
- Change 1
- Change 2

### apps/api-gateway
- Change 1

### services/ai
- Change 1

### packages/db
- Schema changes

</details>

---

## 📊 Metrics & Impact

- **Performance:** X% improvement in [metric]
- **Bundle Size:** Reduced by X KB
- **API Response Time:** Improved by X ms

---

## 🙏 Contributors

Thanks to everyone who contributed to this release!

---

## 📚 Related Links

- [Full Changelog](../CHANGELOG.md)
- [Documentation](../../docs/)
- [Issue Tracker](https://github.com/your-org/nebutra-sailor/issues)
