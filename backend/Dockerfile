FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads/screenshots uploads/avatars uploads/documents uploads/evidence

EXPOSE 5000

CMD ["sh", "-c", "node migrations/run.js && node src/server.js"]
