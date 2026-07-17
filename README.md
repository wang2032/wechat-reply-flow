# WeChat Reply Flow

一个最小可运行的微信公众号消息回调服务，支持：

- `GET` 服务器校验
- `POST` 文本消息自动回复
- 基于 `openid` 的轻量会话状态
- 收到消息自动同步到 PostgreSQL
- `/start` 开启 AI 智能对话，`/stop` 结束

## 目录结构

```text
src/
  config/
    env.js
  controllers/
    health.controller.js
    wechat.controller.js
  services/
    ai-chat.service.js
    conversation.service.js
    reply.service.js
    signature.service.js
    user-sync.service.js
  storage/
    postgres.js
    session.store.js
  utils/
    xml.js
    logger.js
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

服务还需要 `DATABASE_URL`，用于把收到的消息同步到 PostgreSQL。

如果走 Docker，`docker compose` 会同时启动 Postgres；如果直接 `npm start`，要先保证 `DATABASE_URL` 指向可用的 PostgreSQL。

AI 对话是可选的，配置这些变量后才会启用：

- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`
- `AI_TEMPERATURE`
- `AI_SYSTEM_PROMPT`

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

数据库里会保存：
- 每条原始消息
- 每个 `openid` 的最新状态
- 消息次数和最后一次消息内容

查询最近用户：

```bash
curl http://127.0.0.1:38181/api/users
curl http://127.0.0.1:38181/api/users/o1Qug2BMeaZ6jJDbhCCczgwzlrxE
```

## 当前逻辑

- 用户关注：主动发送主菜单
- 用户发 `菜单`：返回主菜单
- 用户发 `1`：进入小工具业务
- 用户发 `2`：进入免费 token 福利业务
- 用户发 `3`：进入项目部署教程业务
- 用户发 `4`：进入工具投稿 / 推广合作业务
- 用户发 `5`：进入 AI 定制开发 / 私有部署业务
- 发 `/start`：切到 AI 对话模式
- 发 `/stop`：退出 AI 对话模式

## 说明

当前版本是明文回调，不包含消息加解密。公众号后台如果开了安全模式，下一步要补 `msg_signature` 和 AES 处理。
