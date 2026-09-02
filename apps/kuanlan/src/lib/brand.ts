import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";

export const BRAND = {
  name: "KUANLAN",
  nameCn: "观澜",
  slogan: "观你所见，澜起于心。",
  support: "穿你喜欢的衣服，去你想去的地方，留下属于你的每一个 Moment。",
  origin: getBrandOrigin("kuanlan"),
  skuMark: "KUANLAN©️",
} as const;
