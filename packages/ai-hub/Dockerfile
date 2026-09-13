# Built from the monorepo root (see cloudbuild.yaml: `docker build -f
# packages/ai-hub/Dockerfile .`) so npm workspace hoisting resolves the
# same way it does locally.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
COPY packages/ai-hub/package.json packages/ai-hub/package.json
RUN npm install --workspace=ai-hub
COPY . .
RUN npm run build --workspace=ai-hub

FROM nginx:1.27-alpine
COPY --from=build /app/packages/ai-hub/dist/ /usr/share/nginx/html/ai/
COPY packages/ai-hub/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
