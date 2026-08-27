/**
 * @nebutra/china-compliance
 *
 * Single entry-point re-exporting the focused submodules.
 */

export { formatICPNumber, PROVINCE_CODES, validateICPNumber } from "./icp";
export {
  type CDNHints,
  type ChinaRegion,
  detectChinaRegion,
  getCDNHints,
  isChinaRegion,
} from "./region";
export {
  type BuildWeChatAuthUrlOptions,
  buildWeChatAuthUrl,
  type WeChatScope,
} from "./wechat";
