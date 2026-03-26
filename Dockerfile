FROM node:20

WORKDIR /frontend

COPY frontend/ .

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
