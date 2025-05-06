FROM node:20

WORKDIR /app

COPY . .
RUN npm install
RUN npx prisma generate


EXPOSE 5000

CMD ["npm", "run", "start:prod"]
