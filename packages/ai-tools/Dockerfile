# ai-tools' vite base is './' (relative) specifically so one build can be
# served from multiple paths — see vite.config.js's comment. The load
# balancer forwards the full incoming path unchanged (no rewrite; see
# bradjobe-dev-infra/lb.tf's priority=20 route_rule), so this image
# physically serves the same build from five directories, mirroring the
# five `alias` blocks the current nginx config uses.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
COPY packages/ai-tools/package.json packages/ai-tools/package.json
RUN npm install --workspace=ai-tools
COPY . .
RUN npm run build --workspace=ai-tools

FROM nginx:1.27-alpine
RUN for path in agent-demo genre-classifier image-classifier llm-testing status; do \
      mkdir -p /usr/share/nginx/html/$path; \
    done
COPY --from=build /app/packages/ai-tools/dist/ /usr/share/nginx/html/agent-demo/
RUN cp -r /usr/share/nginx/html/agent-demo/. /usr/share/nginx/html/genre-classifier/ && \
    cp -r /usr/share/nginx/html/agent-demo/. /usr/share/nginx/html/image-classifier/ && \
    cp -r /usr/share/nginx/html/agent-demo/. /usr/share/nginx/html/llm-testing/ && \
    cp -r /usr/share/nginx/html/agent-demo/. /usr/share/nginx/html/status/
COPY packages/ai-tools/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
