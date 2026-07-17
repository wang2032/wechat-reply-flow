import { buildEmptyReply, buildTextReply, parseWechatMessage } from "../utils/xml.js";
import { handleIncomingMessage } from "../services/reply.service.js";
import { logError, logInfo, logWarn, truncate } from "../utils/logger.js";

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function textResponse(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  res.end(body);
}

function xmlResponse(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/xml; charset=utf-8",
  });
  res.end(body);
}

export function createWechatController({ path, verifySignature, userSyncService }) {
  return async function handleWechatRequest(req, res, url) {
    if (url.pathname !== path) {
      return false;
    }

    const signature = url.searchParams.get("signature") ?? "";
    const timestamp = url.searchParams.get("timestamp") ?? "";
    const nonce = url.searchParams.get("nonce") ?? "";
    const remoteAddress = req.socket?.remoteAddress ?? "unknown";
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    if (!verifySignature({ signature, timestamp, nonce })) {
      logWarn("wechat.callback.signature_invalid", {
        requestId,
        method: req.method,
        path,
        remoteAddress,
      });
      textResponse(res, 401, "invalid signature");
      return true;
    }

    if (req.method === "GET") {
      logInfo("wechat.callback.verify", {
        requestId,
        method: req.method,
        path,
        remoteAddress,
        result: "ok",
      });
      textResponse(res, 200, url.searchParams.get("echostr") ?? "");
      return true;
    }

    if (req.method !== "POST") {
      logWarn("wechat.callback.method_not_allowed", {
        requestId,
        method: req.method,
        path,
        remoteAddress,
      });
      textResponse(res, 405, "Method Not Allowed");
      return true;
    }

    try {
      const body = await readRequestBody(req);
      const incoming = parseWechatMessage(body);
      if (userSyncService) {
        await userSyncService.syncIncomingMessage(incoming, body);
      }
      const replyText = handleIncomingMessage(incoming);

      logInfo("wechat.callback.message_in", {
        requestId,
        method: req.method,
        path,
        remoteAddress,
        fromUserName: incoming.fromUserName || "unknown",
        toUserName: incoming.toUserName || "unknown",
        msgType: incoming.msgType || "unknown",
        event: incoming.event || "",
        eventKey: incoming.eventKey || "",
        content: truncate(incoming.content || "", 80),
      });

      if (!incoming.toUserName || !incoming.fromUserName) {
        logWarn("wechat.callback.message_malformed", {
          requestId,
          method: req.method,
          path,
          remoteAddress,
        });
        xmlResponse(
          res,
          200,
          buildTextReply({
            toUserName: "unknown",
            fromUserName: "unknown",
            content: "message parsed",
          }),
        );
        return true;
      }

      const reply =
        replyText === "ok"
          ? buildEmptyReply({
              toUserName: incoming.fromUserName,
              fromUserName: incoming.toUserName,
            })
          : buildTextReply({
              toUserName: incoming.fromUserName,
              fromUserName: incoming.toUserName,
              content: replyText,
            });

      logInfo("wechat.callback.message_out", {
        requestId,
        method: req.method,
        path,
        remoteAddress,
        replyType: replyText === "ok" ? "empty" : "text",
      });

      xmlResponse(res, 200, reply);
      return true;
    } catch (error) {
      logError("wechat.callback.error", {
        requestId,
        method: req.method,
        path,
        remoteAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      textResponse(res, 500, "internal server error");
      return true;
    }
  };
}
