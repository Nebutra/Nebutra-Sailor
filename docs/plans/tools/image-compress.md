# Tool brief: image-compress

## 1. User need

压缩截图/照片体积再上传；保留可接受画质。

## 2. Competitors

TinyWow / iLoveIMG — 拖拽、质量滑杆、格式选择、批量。

## 3–5. Engine

| Choice | Why |
|--------|-----|
| **sharp (libvips)** | Node 图片处理事实 SOTA：快、内存可控、格式全 |
| Rejected | 纯 browser canvas 处理大图（内存与格式弱） |

**sota_status:** `lab`（引擎 production 级，人用上传 UX 需齐）  
