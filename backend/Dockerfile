FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads/screenshots uploads/avatars uploads/documents uploads/evidence

EXPOSE 5000

CMD ["node", "src/server.js"]
