import { inngest } from "./client";

/**
 * Auto-translate content when created or updated
 * Triggered by content.created or content.updated events
 */
export const autoTranslate = inngest.createFunction(
  {
    id: "auto-translate-content",
    name: "Auto Translate Content",
    retries: 3,
  },
  { event: "content/translate.requested" },
  async ({ event, step }) => {
    const { contentId, sourceLanguage, targetLanguages, tenantId } = event.data;

    // Step 1: Fetch content
    const content = await step.run("fetch-content", async () => {
      const response = await fetch(`${process.env.API_GATEWAY_URL}/content/${contentId}`, {
        headers: {
          "x-organization-id": tenantId,
        },
      });
      return response.json();
    });

    // Step 2: Translate to each target language
    const translations = await Promise.all(
      targetLanguages.map(async (targetLang: string) => {
        return step.run(`translate-to-${targetLang}`, async () => {
          const response = await fetch(`${process.env.API_GATEWAY_URL}/ai/translate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-organization-id": tenantId,
            },
            body: JSON.stringify({
              text: content.body,
              sourceLang: sourceLanguage,
              targetLang,
            }),
          });
          const data = await response.json();
          return { language: targetLang, text: data.text };
        });
      }),
    );

    // Step 3: Save translations
    await step.run("save-translations", async () => {
      await fetch(`${process.env.API_GATEWAY_URL}/content/${contentId}/translations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": tenantId,
        },
        body: JSON.stringify({ translations }),
      });
    });

    return { success: true, translatedTo: targetLanguages };
  },
);
