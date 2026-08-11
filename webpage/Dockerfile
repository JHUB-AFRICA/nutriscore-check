FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/index.html /usr/share/nginx/html/
COPY --from=build /app/health.html /usr/share/nginx/html/
COPY --from=build /app/site.css /usr/share/nginx/html/
COPY --from=build /app/assets /usr/share/nginx/html/assets
COPY --from=build /app/dist /usr/share/nginx/html/dist

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
