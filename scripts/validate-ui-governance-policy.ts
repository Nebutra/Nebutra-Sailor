#!/usr/bin/env tsx

import { loadUiGovernancePolicy } from "./lib/ui-governance-policy";

const _policy = loadUiGovernancePolicy();

console.log("UI governance policy schema validation passed ✓");
