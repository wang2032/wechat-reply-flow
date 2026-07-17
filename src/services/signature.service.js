import { createHash, timingSafeEqual } from "node:crypto";

function sha1(value) {
  return createHash("sha1").update(value).digest("hex");
}

export function createWechatSignatureVerifier(token) {
  return ({ signature, timestamp, nonce }) => {
    if (!signature || !timestamp || !nonce) return false;
    const digest = sha1([token, timestamp, nonce].sort().join(""));
    const left = Buffer.from(digest, "hex");
    const right = Buffer.from(signature, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
  };
}
