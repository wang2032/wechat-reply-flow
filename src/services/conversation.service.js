import { updateSession } from "../storage/session.store.js";

const MAIN_MENU_TEXT = [
  "这里分享 AI 工具、自部署项目、开发效率与实用教程。",
  "",
  "请选择你感兴趣的内容，直接回复数字即可：",
  "",
  "1｜使用小工具（chatgpt、vpn）",
  "2｜获取免费 token 福利",
  "3｜项目部署教程",
  "4｜工具投稿 / 推广合作",
  "5｜AI 定制开发 / 私有部署",
  "",
  "联系咨询技术交流加入QQ群（947986727）。",
  "",
  "另外可以直接发送 /start 开启 AI 智能自动对话，发送 /stop 结束。",
].join("\n");

function getMainMenuText() {
  return MAIN_MENU_TEXT;
}

const BUSINESS_ROUTES = {
  "1": {
    title: "使用小工具（chatgpt、vpn）",
    response: [
      "使用小工具：",
      "你可以直接描述你要找的工具类型、使用场景和设备平台，我会优先给你现成方案。",
      "",
      "如果想切到 AI 智能自动对话，直接发送 /start。",
    ].join("\n"),
  },
  "2": {
    title: "获取免费 token 福利",
    response: [
      "免费 token 福利：",
      "请直接说明你想领取哪类福利，我会按当前可用活动或说明给你回复。",
      "",
      "如果只是想先浏览其他内容，继续回复数字即可。",
    ].join("\n"),
  },
  "3": {
    title: "项目部署教程",
    response: [
      "项目部署教程：",
      "请直接发项目名 + 环境 + 卡住步骤，我会按 Docker / Nginx / 数据库 / 域名这些方向拆解。",
    ].join("\n"),
  },
  "4": {
    title: "工具投稿 / 推广合作",
    response: [
      "工具投稿 / 推广合作：",
      "请直接留下工具名、链接、目标用户、合作方式和联系方式，我会继续和你对接。",
    ].join("\n"),
  },
  "5": {
    title: "AI 定制开发 / 私有部署",
    response: [
      "AI 定制开发 / 私有部署：",
      "请直接描述你的场景、数据来源、期望效果和部署环境，我会给你更具体的方案。",
    ].join("\n"),
  },
};

function handleManualTextMessage(openid, text) {
  const value = text.trim();

  if (value === "菜单" || value.toLowerCase() === "menu") {
    updateSession(openid, { step: "idle" });
    return getMainMenuText();
  }

  const route = BUSINESS_ROUTES[value];
  if (route) {
    updateSession(openid, { step: "idle", lastMenuSelection: value });
    return route.response;
  }

  return getMainMenuText();
}

export function createConversationService({ userStore, aiChatService }) {
  return {
    async handleIncomingMessage(message) {
      const openid = message.fromUserName || "anonymous";

      if (message.msgType === "event") {
        if (message.event === "subscribe") {
          updateSession(openid, { step: "idle" });
          return [
            "关注成功，下面是当前可用入口：",
            "",
            getMainMenuText(),
          ].join("\n");
        }

        if (message.event === "CLICK" || message.event === "click") {
          if (message.eventKey === "MENU_START") {
            updateSession(openid, { step: "idle" });
            return getMainMenuText();
          }
        }

        return "ok";
      }

      if (message.msgType !== "text") {
        return "目前只处理文本和关注事件。";
      }

      const text = (message.content ?? "").trim();
      if (text === "/start") {
        await userStore.setAiMode(openid, true, message.toUserName);
        return "AI 智能对话已开启，直接发送内容即可。发送 /stop 结束。";
      }

      if (text === "/stop") {
        await userStore.setAiMode(openid, false, message.toUserName);
        return "AI 智能对话已结束，已切回普通回复模式。";
      }

      const user = await userStore.getUser(openid);
      if (user?.ai_mode_enabled) {
        return aiChatService.replyToUser({
          openid,
          userMessage: text,
        });
      }

      return handleManualTextMessage(openid, text);
    },
  };
}
