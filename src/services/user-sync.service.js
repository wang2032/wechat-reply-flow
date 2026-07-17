export function createWechatUserSyncService(store) {
  return {
    async syncIncomingMessage(message, rawXml) {
      return store.recordIncomingMessage({
        openid: message.fromUserName || "anonymous",
        toUserName: message.toUserName || "unknown",
        msgType: message.msgType || null,
        event: message.event || null,
        eventKey: message.eventKey || null,
        content: message.content || null,
        rawXml,
      });
    },
  };
}
