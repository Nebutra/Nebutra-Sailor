import type { AnyForgeToolDefinition } from "../types";
import { base64Tool } from "./base64";
import { caseConvertTool } from "./case-convert";
import { cnValidateTools } from "./cn-validate";
import { codecExtraTools } from "./codec-extra";
import { dataFormatTools } from "./data-formats";
import { devExtraTools } from "./dev-extra";
import { htmlEntitiesTool } from "./html-entities";
import { imageTools } from "./image-ops";
import { jsonFormatTool } from "./json-format";
import { jwtDecodeTool } from "./jwt-decode";
import { lifeExtraTools } from "./life-extra";
import { llmExtraTools } from "./llm-extra";
import { md5Tool } from "./md5";
import { numberBaseTool } from "./number-base";
import { passwordGenerateTool } from "./password-generate";
import { pdfOpsTools } from "./pdf-ops";
import { pureBatchTools } from "./pure-batch";
import { qrTools } from "./qr";
import { removeBlankLinesTool } from "./remove-blank-lines";
import { securityExtraTools } from "./security-extra";
import { sha256Tool } from "./sha256";
import { textCnTools } from "./text-cn";
import { textDiffTool } from "./text-diff";
import { timeExtraTools } from "./time-extra";
import { tokenCountTool } from "./token-count";
import { unitConvertTools } from "./unit-convert";
import { unixTimestampTool } from "./unix-timestamp";
import { urlCodecTool } from "./url-codec";
import { uuidTool } from "./uuid";
import { wordCountTool } from "./word-count";

/**
 * Full Forge registry — core batch + pure catalog + OSS expansions.
 * Playwright md→pdf is NOT registered here (optional peer); use
 * `@nebutra/forge-runtime/pdf` and register mdToPdfTool in hosts that need it.
 */
export const F0_BATCH1_TOOLS: readonly AnyForgeToolDefinition[] = [
  // text core
  wordCountTool,
  caseConvertTool,
  removeBlankLinesTool,
  textDiffTool,
  ...textCnTools,
  // codec
  base64Tool,
  urlCodecTool,
  htmlEntitiesTool,
  jwtDecodeTool,
  ...codecExtraTools,
  // data
  jsonFormatTool,
  ...dataFormatTools,
  // hash / security
  md5Tool,
  sha256Tool,
  passwordGenerateTool,
  ...securityExtraTools,
  // dev / time / llm
  uuidTool,
  numberBaseTool,
  unixTimestampTool,
  tokenCountTool,
  ...devExtraTools,
  ...timeExtraTools,
  ...llmExtraTools,
  // density batch (sort/unique/hex/life/unit partial…)
  ...pureBatchTools,
  // units / life / cn / qr / pdf-lib / image
  ...unitConvertTools,
  ...lifeExtraTools,
  ...cnValidateTools,
  ...qrTools,
  ...pdfOpsTools,
  ...imageTools,
];

export {
  base64Tool,
  caseConvertTool,
  cnValidateTools,
  codecExtraTools,
  dataFormatTools,
  devExtraTools,
  htmlEntitiesTool,
  imageTools,
  jsonFormatTool,
  jwtDecodeTool,
  lifeExtraTools,
  llmExtraTools,
  md5Tool,
  numberBaseTool,
  passwordGenerateTool,
  pdfOpsTools,
  pureBatchTools,
  qrTools,
  removeBlankLinesTool,
  securityExtraTools,
  sha256Tool,
  textCnTools,
  textDiffTool,
  timeExtraTools,
  tokenCountTool,
  unitConvertTools,
  unixTimestampTool,
  urlCodecTool,
  uuidTool,
  wordCountTool,
};
