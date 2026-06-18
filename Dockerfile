FROM node:20-slim

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy package files for dependency installation
COPY pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/db/
COPY packages/api-zod/package.json packages/api-zod/
COPY packages/api-client-react/package.json packages/api-client-react/
COPY api-server/package.json api-server/
COPY host-x/package.json host-x/

# Install dependencies
RUN pnpm install

# Copy source files
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY api-server/ ./api-server/
COPY host-x/ ./host-x/

# Build api-server (bundles all workspace packages)
RUN cd api-server && pnpm run build

# Build frontend
RUN cd host-x && pnpm run build

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production
ENV BASE_PATH=/

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/health').then(r=>r.json()).then(d=>process.exit(d.status==='ok'?0:1)).catch(()=>process.exit(1))"

CMD cd api-server && pnpm run start