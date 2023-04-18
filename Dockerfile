FROM node:18

ENV NODE_ENV=production

WORKDIR /Secrets

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

EXPOSE 3000

CMD [ "node", "app.js" ]