# docker buildx build --push --platform linux/amd64,linux/arm64 -t docker.homejota.net/geoos/zrepo2:latest -t docker.homejota.net/geoos/zrepo2:0.11 .
# 
FROM node:16-alpine
EXPOSE 8096
WORKDIR /usr/src/app
COPY package*.json ./
COPY zrepo.hjson /home/config/
RUN npm install --production

COPY . .
CMD ["node", "index"]