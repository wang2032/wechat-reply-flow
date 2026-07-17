export function loadEnvConfig() {
  const token = process.env.WECHAT_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;
  if (!token) {
    throw new Error("Missing env WECHAT_TOKEN");
  }
  if (!databaseUrl) {
    throw new Error("Missing env DATABASE_URL");
  }

  return {
    token,
    databaseUrl,
    aiApiKey: process.env.AI_API_KEY ?? "",
    aiBaseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
    aiModel: process.env.AI_MODEL ?? "gpt-4o-mini",
    aiTemperature: Number.parseFloat(process.env.AI_TEMPERATURE ?? "0.7"),
    aiSystemPrompt:
      process.env.AI_SYSTEM_PROMPT ??
      "你是一个中文微信公众号智能客服，回答要自然、简洁、准确。",
    host: process.env.HOST ?? "0.0.0.0",
    port: Number.parseInt(process.env.PORT ?? "3000", 10),
    path: process.env.WECHAT_PATH ?? "/wechat",
  };
}
