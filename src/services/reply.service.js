import { escapeXml } from "../utils/xml.js";
import { getSession, updateSession } from "../storage/session.store.js";

export function handleTextMessage(openid, text) {
  const session = getSession(openid);
  const value = text.trim();

  if (session.step === "await_name") {
    updateSession(openid, { step: "idle", name: value });
    return `收到，你的名字是：${escapeXml(value)}。回复“菜单”继续。`;
  }

  if (session.step === "await_issue") {
    updateSession(openid, { step: "idle", issue: value });
    return `已记录你的问题：${escapeXml(value)}。我会继续按这个问题回复。`;
  }

  if (value === "菜单" || value.toLowerCase() === "menu") {
    updateSession(openid, { step: "idle" });
    return [
      "请选择一个动作：",
      "1. 留下姓名",
      "2. 描述问题",
      "3. 查看默认回复",
      "回复对应数字即可。",
    ].join("\n");
  }

  if (value === "1") {
    updateSession(openid, { step: "await_name" });
    return "请直接回复你的名字。";
  }

  if (value === "2") {
    updateSession(openid, { step: "await_issue" });
    return "请回复你的问题描述。";
  }

  if (value === "3") {
    return "这是默认自动回复。你可以先回复“菜单”查看可用选项。";
  }

  return `收到：${escapeXml(value)}。回复“菜单”开始交互。`;
}

export function handleIncomingMessage(message) {
  const openid = message.fromUserName || "anonymous";

  if (message.msgType === "event") {
    if (message.event === "subscribe") {
      updateSession(openid, { step: "idle" });
      return "欢迎关注。回复“菜单”查看自动回复示例。";
    }

    if (message.event === "CLICK" || message.event === "click") {
      if (message.eventKey === "MENU_START") {
        updateSession(openid, { step: "idle" });
        return "已进入菜单。回复 1 留名，回复 2 提问。";
      }
    }

    return "ok";
  }

  if (message.msgType === "text") {
    return handleTextMessage(openid, message.content ?? "");
  }

  return "目前只处理文本和关注事件。";
}
