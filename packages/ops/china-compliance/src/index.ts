/**
 * @nebutra/china-compliance
 *
 * Single entry-point re-exporting the focused submodules.
 */

export { formatICPNumber, PROVINCE_CODES, validateICPNumber } from "./icp.js";
export {
  type CDNHints,
  type ChinaRegion,
  detectChinaRegion,
  getCDNHints,
  isChinaRegion,
} from "./region.js";
export {
  type BuildWeChatAuthUrlOptions,
  buildWeChatAuthUrl,
  type WeChatScope,
} from "./wechat.js";
