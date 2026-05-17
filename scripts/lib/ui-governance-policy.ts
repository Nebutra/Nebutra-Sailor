import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

export const POLICY_POINTER_PATH = "tests/architecture/governance/ui-governance.current.json";
export const POLICY_SCHEMA_PATH = "tests/architecture/governance/schemas/ui-governance.schema.json";

export interface FileSurface {
  root: string;
  extensions: string[];
  excludeContains?: string[];
}

export interface RawTailwindBudget extends FileSurface {
  surface: string;
  max: number;
}

export interface TierPolicy {
  name: string;
  requiredCoverage: number;
  components: string[];
}

export interface AggregateBudgetEntry {
  description: string;
  max: number;
  paths: string[];
  exclude?: string[];
}

export interface AggregateBudgets {
  rawTailwindColors: AggregateBudgetEntry;
  rawTailwindBorderRadius: AggregateBudgetEntry;
}

export interface ContentRule {
  name: string;
  description: string;
  file: string;
  requiredContains: string[];
  forbiddenContains: string[];
}

export interface GovernancePolicy {
  policyVersion: string;
  rawTailwindColorBudgets: RawTailwindBudget[];
  budgets?: AggregateBudgets;
  tokenFormatBudget: {
    tokenSurfaces: FileSurface[];
    maxHexLiterals: number;
    maxHslLiterals: number;
    minOklchLiterals: number;
    allowedHexFiles: string[];
    allowedHslFiles: string[];
  };
  motionBoundary: {
    appSurfaces: string[];
    allowedFramerMotionImports: string[];
  };
  componentTierCoverage: {
    primitivesRoot: string;
    tiers: TierPolicy[];
  };
  dependencyBoundaries: {
    appSurfaces: string[];
    forbiddenImportRegexes: string[];
    customUiAllowedExports: string[];
  };
  dashboardExperience: {
    rules: ContentRule[];
  };
}

function readFromRepo(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function formatAjvErrors(errors: Ajv.ErrorObject[] | null | undefined) {
  if (!errors || errors.length === 0) return "Unknown schema validation error.";
  return errors
    .map((error) => {
      const pointer = error.instancePath || "/";
      return `${pointer} ${error.message || "is invalid"}`.trim();
    })
    .join("; ");
}

function resolvePolicyPathFromPointer() {
  const pointer = JSON.parse(readFromRepo(POLICY_POINTER_PATH)) as {
    policyFile?: string;
  };

  if (!pointer.policyFile || typeof pointer.policyFile !== "string") {
    throw new Error(`Invalid policy pointer: missing "policyFile" in ${POLICY_POINTER_PATH}.`);
  }

  if (pointer.policyFile.includes("..") || path.isAbsolute(pointer.policyFile)) {
    throw new Error(`Invalid policy pointer target: ${pointer.policyFile}`);
  }

  return path.posix.join("tests/architecture/governance", pointer.policyFile);
}

export function loadUiGovernancePolicy(): GovernancePolicy {
  const policyPath = resolvePolicyPathFromPointer();
  const schema = JSON.parse(readFromRepo(POLICY_SCHEMA_PATH)) as Record<string, unknown>;
  const policyData = JSON.parse(readFromRepo(policyPath)) as Record<string, unknown>;

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(policyData);
  if (!valid) {
    throw new Error(
      `UI governance policy schema validation failed (${policyPath}): ${formatAjvErrors(validate.errors)}`,
    );
  }

  return policyData as GovernancePolicy;
}
