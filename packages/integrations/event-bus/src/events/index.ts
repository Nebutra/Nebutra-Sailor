// Event type constants
export const EventTypes = {
  // Content events
  CONTENT_CREATED: "content.created",
  CONTENT_UPDATED: "content.updated",
  CONTENT_DELETED: "content.deleted",
  CONTENT_PUBLISHED: "content.published",

  // User events
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_ACTION: "user.action",

  // AI events
  AI_JOB_REQUESTED: "ai.job.requested",
  AI_JOB_COMPLETED: "ai.job.completed",
  AI_JOB_FAILED: "ai.job.failed",

  // Recsys events
  RECSYS_MODEL_UPDATED: "recsys.model.updated",
  RECSYS_FEEDBACK: "recsys.feedback",

  // E-commerce events
  ORDER_CREATED: "order.created",
  ORDER_PAID: "order.paid",
  ORDER_SHIPPED: "order.shipped",
  ORDER_COMPLETED: "order.completed",
  ORDER_CANCELLED: "order.cancelled",
  INVENTORY_UPDATED: "inventory.updated",

  // Web3 events
  ONCHAIN_EVENT: "web3.onchain",
  TX_CONFIRMED: "web3.tx.confirmed",
  NFT_MINTED: "web3.nft.minted",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
