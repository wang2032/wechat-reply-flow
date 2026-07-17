export function getXmlTag(xml, tag) {
  const pattern = new RegExp(
    `<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>|<${tag}>(.*?)</${tag}>`,
    "s",
  );
  const match = xml.match(pattern);
  return match?.[1] ?? match?.[2] ?? "";
}

export function parseWechatMessage(xml) {
  return {
    toUserName: getXmlTag(xml, "ToUserName"),
    fromUserName: getXmlTag(xml, "FromUserName"),
    createTime: getXmlTag(xml, "CreateTime"),
    msgType: getXmlTag(xml, "MsgType"),
    content: getXmlTag(xml, "Content"),
    msgId: getXmlTag(xml, "MsgId"),
    event: getXmlTag(xml, "Event"),
    eventKey: getXmlTag(xml, "EventKey"),
  };
}

export function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildTextReply({ toUserName, fromUserName, content }) {
  const now = Math.floor(Date.now() / 1000);
  return [
    "<xml>",
    `<ToUserName><![CDATA[${toUserName}]]></ToUserName>`,
    `<FromUserName><![CDATA[${fromUserName}]]></FromUserName>`,
    `<CreateTime>${now}</CreateTime>`,
    "<MsgType><![CDATA[text]]></MsgType>",
    `<Content><![CDATA[${content}]]></Content>`,
    "</xml>",
  ].join("");
}

export function buildEmptyReply({ toUserName, fromUserName }) {
  return buildTextReply({
    toUserName,
    fromUserName,
    content: "ok",
  });
}
