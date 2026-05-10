import { inngest } from "./client";

/**
 * Sync inventory from Shopify
 * Runs every 15 minutes
 */
export const inventorySync = inngest.createFunction(
  {
    id: "shopify-inventory-sync",
    name: "Sync Shopify Inventory",
    retries: 3,
  },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async ({ step }) => {
    // Step 1: Get tenants with Shopify integration
    const tenants = await step.run("get-shopify-tenants", async () => {
      const response = await fetch(`${process.env.API_GATEWAY_URL}/integrations/shopify/tenants`);
      return response.json();
    });

    const results = [];

    for (const tenant of tenants) {
      // Step 2: Fetch products from Shopify
      const products = await step.run(`fetch-shopify-products-${tenant.id}`, async () => {
        const response = await fetch(`${process.env.ECOMMERCE_SERVICE_URL}/shopify/products`, {
          headers: {
            "x-organization-id": tenant.id,
            "x-shopify-token": tenant.shopifyToken,
          },
        });
        return response.json();
      });

      // Step 3: Sync to local database
      const syncResult = await step.run(`sync-products-${tenant.id}`, async () => {
        const response = await fetch(`${process.env.ECOMMERCE_SERVICE_URL}/products/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": tenant.id,
          },
          body: JSON.stringify({ products }),
        });
        return response.json();
      });

      results.push({
        tenantId: tenant.id,
        synced: syncResult.synced,
        errors: syncResult.errors,
      });
    }

    return { tenants: results.length, results };
  },
);

/**
 * Process order events from Shopify webhook
 */
export const processShopifyOrder = inngest.createFunction(
  {
    id: "process-shopify-order",
    name: "Process Shopify Order",
    retries: 3,
  },
  { event: "shopify/order.created" },
  async ({ event, step }) => {
    const { order, tenantId } = event.data;

    // Step 1: Create order in our system
    const createdOrder = await step.run("create-order", async () => {
      const response = await fetch(`${process.env.ECOMMERCE_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": tenantId,
        },
        body: JSON.stringify({
          externalId: order.id,
          source: "shopify",
          items: order.line_items,
          total: order.total_price,
          customer: order.customer,
        }),
      });
      return response.json();
    });

    // Step 2: Update inventory
    await step.run("update-inventory", async () => {
      for (const item of order.line_items) {
        await fetch(`${process.env.ECOMMERCE_SERVICE_URL}/products/${item.product_id}/inventory`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": tenantId,
          },
          body: JSON.stringify({
            adjustment: -item.quantity,
            reason: `Order ${order.id}`,
          }),
        });
      }
    });

    // Step 3: Send confirmation email
    await step.run("send-confirmation", async () => {
      await fetch(`${process.env.API_GATEWAY_URL}/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": tenantId,
        },
        body: JSON.stringify({
          template: "order-confirmation",
          to: order.customer.email,
          data: { order: createdOrder },
        }),
      });
    });

    return { orderId: createdOrder.id, success: true };
  },
);
