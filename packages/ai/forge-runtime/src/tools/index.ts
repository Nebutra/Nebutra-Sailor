import type { AnyForgeToolDefinition } from "../types";
import { base64Tool } from "./base64";
import { caseConvertTool } from "./case-convert";
import { htmlEntitiesTool } from "./html-entities";
import { imageTools } from "./image-ops";
import { jsonFormatTool } from "./json-format";
import { jwtDecodeTool } from "./jwt-decode";
import { md5Tool } from "./md5";
import { numberBaseTool } from "./number-base";
import { passwordGenerateTool } from "./password-generate";
import { pureBatchTools } from "./pure-batch";
import { removeBlankLinesTool } from "./remove-blank-lines";
import { sha256Tool } from "./sha256";
import { textDiffTool } from "./text-diff";
import { tokenCountTool } from "./token-count";
import { unixTimestampTool } from "./unix-timestamp";
import { urlCodecTool } from "./url-codec";
import { uuidTool } from "./uuid";
import { wordCountTool } from "./word-count";

/**
 * Default registry tools without optional-peer surfaces (playwright PDF is
 * registered separately via `@nebutra/forge-runtime/pdf` consumers).
 */
export const F0_BATCH1_TOOLS: readonly AnyForgeToolDefinition[] = [
  wordCountTool,
  caseConvertTool,
  removeBlankLinesTool,
  textDiffTool,
  base64Tool,
  urlCodecTool,
  htmlEntitiesTool,
  jwtDecodeTool,
  jsonFormatTool,
  md5Tool,
  sha256Tool,
  passwordGenerateTool,
  uuidTool,
  numberBaseTool,
  unixTimestampTool,
  tokenCountTool,
  ...pureBatchTools,
  ...imageTools,
];

export {
  base64Tool,
  caseConvertTool,
  htmlEntitiesTool,
  imageTools,
  jsonFormatTool,
  jwtDecodeTool,
  md5Tool,
  numberBaseTool,
  passwordGenerateTool,
  removeBlankLinesTool,
  sha256Tool,
  textDiffTool,
  tokenCountTool,
  unixTimestampTool,
  urlCodecTool,
  uuidTool,
  wordCountTool,
};
