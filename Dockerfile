# development environment
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# build environment
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

# production environment
FROM alpine:latest
RUN apk update && apk add --no-cache \
    build-base \
    pcre-dev \
    zlib-dev \
    openssl-dev \
    git \
    wget \
    apache2-utils
WORKDIR /usr/src
RUN wget http://nginx.org/download/nginx-1.25.3.tar.gz && \
    tar -zxvf nginx-1.25.3.tar.gz && \
    git clone https://github.com/atomx/nginx-http-auth-digest.git
WORKDIR /usr/src/nginx-1.25.3
RUN ./configure \
    --prefix=/etc/nginx \
    --sbin-path=/usr/sbin/nginx \
    --conf-path=/etc/nginx/nginx.conf \
    --error-log-path=/var/log/nginx/error.log \
    --http-log-path=/var/log/nginx/access.log \
    --with-http_ssl_module \
    --with-http_v2_module \
    --with-http_gzip_static_module \
    --add-module=/usr/src/nginx-http-auth-digest && \
    make && \
    make install
COPY --from=build /app/build /usr/share/nginx/html
COPY ./nginx/templates/default.conf.template /etc/nginx/conf.d/default.conf
COPY ./nginx/.htdigest /etc/nginx/.htdigest
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/osm.ir.rcos.nii.ac.jp.crt /etc/nginx/server.crt
COPY ./nginx/osm.ir.rcos.nii.ac.jp.key /etc/nginx/server.key
EXPOSE 3000
CMD ["/usr/sbin/nginx", "-g", "daemon off;"]