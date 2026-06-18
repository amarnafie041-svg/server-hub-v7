FROM node:20-slim
WORKDIR /app
COPY api-server/dist/index.mjs ./api-server/dist/index.mjs
COPY api-server/package.json ./api-server/
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "api-server/dist/index.mjs"]
