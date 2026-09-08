# Jobs — Lovart

**Indicator** (O): no global jobs list. Job state is shown in three places at once: the canvas placeholder (`c-task` with 生成中 pill or the prompt text), the chat step card (model badge + 生成中 + shimmer) and a status row above the composer ("使用 GPT Image 2 生成图片… 00:31 / 2分钟"). Send turns into a stop button while running.

**Lifecycle** (O): submitted → running (placeholder + card) → completed (swap in place, credits settle). Failed / cancelled states not observed (U). Generator jobs: credits deducted at submit; agent jobs: at completion (O, single sample each).

**Timing** (O): GPT Image 2 Low 1K via agent ≈45 s including planning; via generator node ≈25 s. Model list shows a static ETA badge per model (10 s–600 s).

**Queues** (O, paywall copy): 无限低速生成 slow queue for Basic+ with tier-specific priority; fast mode consumes credits.

**Concurrency limits** (O, paywall copy): 1 / 2 / 4 / 8 / 10 by tier.
