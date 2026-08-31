# KUANLAN 观澜 — product contract

**品牌：** 观澜 / KUANLAN
**Slogan：** 观你所见，澜起于心。
**品类：** AI Personal Presence Platform
**Origin：** `kuanlan.nebutra.com`
**阶段：** MVP / 产品页 + 第一条可开关 SKU

## 一句话

KUANLAN 围绕「我如何出现、如何被看见」工作。它不是变美工具，也不是 AI 生成站。

情绪底色是 Discovery 与 Presence，不是 Transformation。

## 当前交付

1. 产品首页（品牌认知 + 开拍入口）
2. Create（今天想怎么拍？）
3. 通用领证照 SKU（规格目录 + 上传本人照片 + 开拍 + 下载）
4. 资源落在 Cloudflare R2（公开 stills 在 `nebutra-assets`，Moment 在 `nebutra-uploads`）
5. 开拍消费走 image2（`gpt-image-2`），再由本应用裁到规格像素

Wardrobe / Moments / Me 先占位，不假装已经认识用户。

## SKU 控制面

操作员只改 `src/catalog/skus.ts` 的 `enabled`。

- `enabled: true` 出现在 Create / 领证照页 / `GET /api/skus`
- `enabled: false` 对用户不可见；compose 与 API 失败关闭
- 领证照是通用规格模型，不是写死的单一尺寸

当前不开放：写真主题、旅游目的地、穿搭商品、商业套餐选品。

## 领证照模型

```text
id + kind: "id-photo" + enabled
+ title + widthMm + heightMm + dpi + background + headRatio
```

像素由毫米与 DPI 算出。合成用 sharp 铺底 + cover，不走远程生图。

## 用户语言

| 不使用 | 使用 |
| --- | --- |
| 生成 | 拍 / 开拍 |
| 图片 / Generation | Moment / 照片 |
| Prompt | 想法 |
| 再生成 | 再拍一会儿 |
| 历史记录 | Moments |

不要：提升颜值、高价值展示面、包装自己、吸引异性、秒杀朋友圈。

## 导航

Home · Create · Wardrobe · Moments · Me

## 判断标准

新能力必须让观澜更理解用户，或让「我想怎样出现」更好说，或留下真正值得留的 Moment。三条都否，不进核心。
