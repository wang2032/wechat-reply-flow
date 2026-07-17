# WeChat Reply Flow

一个最小可运行的微信公众号消息回调服务，支持：

- `GET` 服务器校验
- `POST` 文本消息自动回复
- 基于 `openid` 的轻量会话状态

## 目录结构

```text
src/
  config/
    env.js
  controllers/
    health.controller.js
    wechat.controller.js
  services/
    reply.service.js
    signature.service.js
  storage/
    session.store.js
  utils/
    xml.js
```

## 运行

```bash
cd wechat-reply-flow
WECHAT_TOKEN=your_token HOST=0.0.0.0 PORT=3000 npm start
```

也可以用 Bun：

```bash
WECHAT_TOKEN=your_token bun run start:bun
```

## 公众号后台配置

把服务器 URL 配成：

```text
https://wechat.10rig.com/wechat
```

参数 `Token` 要和环境变量 `WECHAT_TOKEN` 一致。

## Docker 部署

先复制环境文件：

```bash
cp .env.example .env
```

本地直跑：

```bash
docker compose up -d --build
```

生产部署，暴露端口给你自己的 Nginx：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

你需要把 `wechat.10rig.com` 解析到服务器公网 IP，然后让 Nginx 反代到 `127.0.0.1:38181`。

## 当前逻辑

- 用户发 `菜单`：返回可选操作
- 用户发 `1`：进入留名流程
- 用户发 `2`：进入提问流程
- 用户发普通文本：默认回显
- 关注事件：返回欢迎语

## 说明

当前版本是明文回调，不包含消息加解密。公众号后台如果开了安全模式，下一步要补 `msg_signature` 和 AES 处理。
