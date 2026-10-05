# DEV-ONLY static preview. NOT the production image.
# Builds the SPA and serves it from a standalone nginx that proxies /api to request-media.
# The product image is _mvp/dockerfiles/media-ui.Dockerfile (with the BFF);
# see umbrella docs/architecture/SDD.md §5.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist-app /usr/share/nginx/html
EXPOSE 80
