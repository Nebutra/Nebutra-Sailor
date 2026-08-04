# Forge Tool UX Matrix — four dimensions, twelve patterns

**Date:** 2026-08-04  
**Status:** Active  
**Sibling:** [2026-08-04-forge-tool-ux-matrix-status.md](./2026-08-04-forge-tool-ux-matrix-status.md)

## 0. Freeze

Do not invent a unique UX per slug. Map tools to **twelve patterns** across **four dimensions**.

## 1. Dimensions

| Dim | Question |
|-----|----------|
| D1 美术物料 | What object holds the result? |
| D2 功能 UX | Finish fast and correctly? |
| D3 UIUX | Hierarchy / empty / busy / error clear? |
| D4 情绪价值 | Trust, respect, delivery pride? |

## 2. Twelve patterns

| ID | Name | Material |
|----|------|----------|
| P1 | Dual-pane live transform | None / light paper |
| P2 | Segmented code specimen | ID / barcode strip |
| P3 | Credential / payment card | Bank / JWT / secret |
| P4 | Configure → file paper | File paper |
| P5 | Drop-and-verdict / file pipe | File chip + report |
| P6 | Two-pane compare | Diff ribbon |
| P7 | Visual canvas | Swatch / canvas / QR |
| P8 | Network probe dial | Path / dial |
| P9 | Calculator / schedule | Table / timeline |
| P10 | Light validator badge | Badge + fields |
| P11 | Unit converter | Big number |
| P12 | Decision recommend | Recommendation card |

Specimens: `apps/forge/src/components/specimens/*`

## 3. Wave status

| Wave | Scope | Status |
|------|-------|--------|
| 1 | Specimens + id-card / jwt / Luhn | Shipped |
| 2 P4 | File paper generators | Shipped |
| 2 P2 | USCC · IBAN · VIN · ISBN · EAN | This change |
| 3 | File pipe + visual | Pending |
| 4 | P1 long-tail | Baseline started (TextTransform live-local) |

## 4. Gates G1–G10

Pattern · dual-surface · no hang · honesty · human conclusion · a11y · tokens · tests · review · no collateral

## 5. Tool map (abbrev)

- **P2:** id-card, USCC, phone-lookup, IBAN, Luhn, EAN/GTIN, ISBN, VIN  
- **P3:** JWT, password/secret, multi-hash  
- **P4:** robots, gitignore, editorconfig, dockerfile, readme, license  
- **P1:** text transforms, codecs, formatters  
- **P5–P12:** see earlier inventory (~187 tools)

## Changelog

| Date | Change |
|------|--------|
| 2026-08-04 | Matrix restored; Wave 2 P2 five-pack; P1 baseline |
