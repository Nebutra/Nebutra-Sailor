-- CreateTable
CREATE TABLE "docs_feedback" (
    "id" TEXT NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "opinion" VARCHAR(10),
    "block_id" VARCHAR(191),
    "block_body" TEXT,
    "message" TEXT NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "github_url" TEXT,
    "sentiment_label" VARCHAR(20),
    "sentiment_score" DOUBLE PRECISION,
    "category" VARCHAR(40),
    "summary" TEXT,
    "triaged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "docs_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "docs_feedback_kind_created_at_idx" ON "docs_feedback"("kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "docs_feedback_url_idx" ON "docs_feedback"("url");

