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
import { w3BusinessDayShiftTools } from "./w3-business-day-shift";
import { w3CsvColumnsTools } from "./w3-csv-columns";
import { w3CsvDiffTools } from "./w3-csv-diff";
import { w3DockerfileStarterTools } from "./w3-dockerfile-starter";
import { w3EanUpcGtinTools } from "./w3-ean-upc-gtin";
import { editorconfigGeneratorTools } from "./w3-editorconfig-generator";
import { w3EncodingDetectTools } from "./w3-encoding-detect";
import { w3EnvDiffTools } from "./w3-env-diff";
import { w3ExifStripTools } from "./w3-exif-strip";
import { w3FileTypeDetectTools } from "./w3-file-type-detect";
import { w3GitignoreGeneratorTools } from "./w3-gitignore-generator";
import { w3IbanTools } from "./w3-iban";
import { w3ImageRotateFlipTools } from "./w3-image-rotate-flip";
import { w3IsbnTools } from "./w3-isbn";
import { w3LanguageDetectTools } from "./w3-language-detect";
import { w3LicenseChooserTools } from "./w3-license-chooser";
import { w3LineEndingDetectTools } from "./w3-line-ending-detect";
import { w3ListSetCompareTools } from "./w3-list-set-compare";
import { w3LoanAmortizationTools } from "./w3-loan-amortization";
import { w3ReadmeSkeletonGeneratorTools } from "./w3-readme-skeleton-generator";
import { w3RetryBackoffScheduleTools } from "./w3-retry-backoff-schedule";
import { w3RobotsTxtGeneratorTools } from "./w3-robots-txt-generator";
import { w3SecretScanTools } from "./w3-secret-scan";
import { w3UnifiedSocialCreditCodeTools } from "./w3-unified-social-credit-code";
import { w3VinTools } from "./w3-vin";
import { w3YamlDiffTools } from "./w3-yaml-diff";
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
  // W3 — opened Template + Detector roots, deepened Verifier + Comparator (docs §6.7.2a)
  // W3b — completed the Editor and Simulator roots (docs §6.7.9)
  ...w3BusinessDayShiftTools,
  ...w3CsvColumnsTools,
  ...w3ExifStripTools,
  ...w3ImageRotateFlipTools,
  ...w3LoanAmortizationTools,
  ...w3RetryBackoffScheduleTools,
  ...w3CsvDiffTools,
  ...w3DockerfileStarterTools,
  ...w3EanUpcGtinTools,
  ...editorconfigGeneratorTools,
  ...w3EncodingDetectTools,
  ...w3EnvDiffTools,
  ...w3FileTypeDetectTools,
  ...w3GitignoreGeneratorTools,
  ...w3IbanTools,
  ...w3IsbnTools,
  ...w3LanguageDetectTools,
  ...w3LicenseChooserTools,
  ...w3LineEndingDetectTools,
  ...w3ListSetCompareTools,
  ...w3ReadmeSkeletonGeneratorTools,
  ...w3RobotsTxtGeneratorTools,
  ...w3SecretScanTools,
  ...w3UnifiedSocialCreditCodeTools,
  ...w3VinTools,
  ...w3YamlDiffTools,
];

export {
  base64Tool,
  caseConvertTool,
  cnValidateTools,
  codecExtraTools,
  dataFormatTools,
  devExtraTools,
  docxTextTools,
  editorconfigGeneratorTools,
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
  w3BusinessDayShiftTools,
  w3CsvColumnsTools,
  w3CsvDiffTools,
  w3DockerfileStarterTools,
  w3EanUpcGtinTools,
  w3EncodingDetectTools,
  w3EnvDiffTools,
  w3ExifStripTools,
  w3FileTypeDetectTools,
  w3GitignoreGeneratorTools,
  w3IbanTools,
  w3ImageRotateFlipTools,
  w3IsbnTools,
  w3LanguageDetectTools,
  w3LicenseChooserTools,
  w3LineEndingDetectTools,
  w3ListSetCompareTools,
  w3LoanAmortizationTools,
  w3ReadmeSkeletonGeneratorTools,
  w3RetryBackoffScheduleTools,
  w3RobotsTxtGeneratorTools,
  w3SecretScanTools,
  w3UnifiedSocialCreditCodeTools,
  w3VinTools,
  w3YamlDiffTools,
  wave2bMatrixTools,
  wave2DemandTools,
  wave3StapleTools,
  wave4LongtailTools,
  wave5SotaGapTools,
  wordCountTool,
  xlsxTextTools,
};
