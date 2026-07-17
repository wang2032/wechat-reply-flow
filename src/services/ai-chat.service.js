import { logWarn } from "../utils/logger.js";

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, "");
}

function toChatMessage(row) {
  const content =
    row.content ??
    row.event_name ??
    row.event_key ??
    "";

  if (!content) return null;

  return {
    role: row.direction === "out" ? "assistant" : "user",
    content,
  };
}

export function createAiChatService({
  apiKey,
  baseUrl = "https://api.openai.com/v1",
  model = "gpt-4o-mini",
  temperature = 0.7,
  systemPrompt = "你是一个中文微信公众号智能客服，回答要自然、简洁、准确。",
  userStore,
}) {
  async function replyToUser({ openid, userMessage }) {
    if (!apiKey) {
      return "AI 功能未配置，请先设置 AI_API_KEY。";
    }

    const recent = await userStore.getRecentConversation(openid, 12);
    const messages = [
      { role: "system", content: systemPrompt },
      ...recent.map(toChatMessage).filter(Boolean),
      { role: "user", content: userMessage },
    ];

    const response = await fetch(
      `${normalizeBaseUrl(baseUrl)}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      logWarn("wechat.ai.request_failed", {
        openid,
        status: response.status,
        detail,
      });
      throw new Error(`AI 请求失败 (${response.status})`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error("AI 返回内容为空");
    }
    return reply;
  }

  return {
    replyToUser,
    isConfigured: () => Boolean(apiKey),
  };
}
