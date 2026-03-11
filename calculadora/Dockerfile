FROM node:18-alpine
RUN apk add --no-cache libreoffice-writer font-noto
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/api/server.js"]
