import { type ConnectorRecord, type ConnectorSyncPort, KnowledgeBase } from "../src";

const connector: ConnectorSyncPort = {
  async sync(config: ConnectorRecord) {
    return [
      {
        id: `${config.id}:pricing`,
        path: "connectors/docs/pricing.md",
        content: "Alice said the starter plan should stay below twenty dollars.",
        metadata: { source_id: config.id },
      },
    ];
  },
};

const kb = await KnowledgeBase.open(".nebutra/examples/knowledge-base", {
  tenantId: "tenant_demo",
  connector,
});

try {
  await kb.addConnector({
    id: "docs",
    app: "docs",
    action: "list_documents",
    syncStrategy: { type: "on-demand" },
  });
  const synced = await kb.syncConnector("docs");
  process.stdout.write(`${JSON.stringify(synced, null, 2)}\n`);
} finally {
  await kb.close();
}
