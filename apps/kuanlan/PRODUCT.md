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
3. 领证照（领英灰蓝/浅灰/质感蓝棚底职业照）+ 证件照（白底/蓝底）。一寸/二寸/护照/美签是尺寸，不是单独 SKU
4. 资源落在 Cloudflare R2。公开 stills（orbit / 开拍样例 / 衣柜）在 `nebutra-assets`，经 `https://cdn.nebutra.com/kuanlan/…` 消费。Moment 写入 `nebutra-uploads`。`public/` 只做种子，不给浏览器当源。
   **只留下拍好的那张。** 用户上传的原图送去开拍之后即弃，不写入任何桶。Moment 由用户自己删除，删除同时清掉早期版本留下的原图。
5. 开拍：本应用后端封装 SKU 系统提示词，再打 `https://router.nebutra.com/v1` 的 `gpt-image-2`（New-API 中转 302.ai），最后由 sharp 裁到规格像素

Wardrobe 挂的是件 SKU（西装 / 针织 / 衬衫），只出衣服不出人像。件静物在烟底上一次拍成，不见衣架，不用 CV 抠边。开拍 SKU 可以引用一件衣服；领证照是其中一条已开放的开拍路径，不是衣柜的理由。不假装已经认识用户自己的衣柜。进入走 `auth.nebutra.com`，回来停在观澜；开拍和 Moments 挂在这笔会话上。

## SKU 控制面

操作员只改 `src/catalog/skus.ts` 的 `enabled`。

- `enabled: true` 出现在对应表面：件进 Wardrobe，开拍进 Create / `GET /api/skus`
- `enabled: false` 对用户不可见；compose 与 API 失败关闭
- 领证照是通用规格模型。同一个 SKU 带多个尺寸，尺寸不单列 SKU
- `look: "linkedin"` 是领英/职业领证照（灰蓝/浅灰/质感蓝棚底；西装 / 针织 / 衬衫可换）
- `look: "id-card"` 是证件照（白底/蓝底、正脸）

当前不开放：写真主题、旅游目的地、穿搭商品、商业套餐选品。

## SKU 模型

```text
件：id + kind: "garment" + origin + brand + title + line + door + slots
    + spec{ size, color, material, measures{衣长 裤长 胸围 袖长 肩宽 腰围 臀围} }
开拍：id + kind: "id-photo" + origin + brand + look + sizes[] + background + garmentId?
```

衣柜只列件。开拍规格可以引用一件衣服，也可以不引用。像素由毫米与 DPI 算出。开拍 brief 按 `look` 分叉；合成用 sharp 铺底 + cover。

平台自己上架的 SKU：`origin: "platform"`，`brand` 锁 `KUANLAN©️`，避免把别人的牌子挂到我们货架上。之后用户上传、VLM 识图解析的 SKU：`origin: "user"`，`brand` 不锁，成衣参数也可以由识图填。这条管道还没开，不要先做上传或识图。没有下装就不要填裤长。

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
