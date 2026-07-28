import type { AnyForgeToolDefinition } from "../types";
import { base64Tool } from "./base64";
import { caseConvertTool } from "./case-convert";
import { cnValidateTools } from "./cn-validate";
import { codecExtraTools } from "./codec-extra";
import { dataFormatTools } from "./data-formats";
import { devExtraTools } from "./dev-extra";
import { docxTextTools } from "./docx-text";
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
import { pptxTextTools } from "./pptx-text";
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
import { wave2DemandTools } from "./wave2-demand";
import { wave2bMatrixTools } from "./wave2b-matrix";
import { wave3StapleTools } from "./wave3-staples";
import { wave4LongtailTools } from "./wave4-longtail";
import { wave5SotaGapTools } from "./wave5-sota-gaps";
import { wordCountTool } from "./word-count";
import { xlsxTextTools } from "./xlsx-text";

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
  // demand-matrix W2 (generator / checker / optimizer / comparator)
  ...wave2DemandTools,
  // W2b matrix fill (json-diff, formatters, validators, reading-time, pdf-info…)
  ...wave2bMatrixTools,
  // W3 competitor staples (rot13, morse, multi-hash, beautifiers, life calcs…)
  ...wave3StapleTools,
  // W4 long-tail + EXIF
  ...wave4LongtailTools,
  // W5 SOTA matrix gaps
  ...wave5SotaGapTools,
  // Office-lite extractors (pure ZIP OOXML)
  ...docxTextTools,
  ...xlsxTextTools,
  ...pptxTextTools,
];

export {
  base64Tool,
  caseConvertTool,
  cnValidateTools,
  codecExtraTools,
  dataFormatTools,
  devExtraTools,
  docxTextTools,
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
  pptxTextTools,
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
  wave2bMatrixTools,
  wave2DemandTools,
  wave3StapleTools,
  wave4LongtailTools,
  wave5SotaGapTools,
  wordCountTool,
  xlsxTextTools,
};
