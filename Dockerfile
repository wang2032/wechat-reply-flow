FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV WECHAT_PATH=/wechat

COPY package.json ./package.json
COPY server.js ./server.js
COPY src ./src
COPY README.md ./README.md

EXPOSE 3000

CMD ["node", "server.js"]
