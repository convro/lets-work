FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    sqlite-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo_sqlite zip

RUN mkdir -p /var/www/data /var/www/public/uploads \
    && chown -R www-data:www-data /var/www/data /var/www/public/uploads

WORKDIR /var/www

COPY config/ /var/www/config/
COPY src/ /var/www/src/
COPY public/ /var/www/public/

RUN chown -R www-data:www-data /var/www

EXPOSE 9000
CMD ["php-fpm"]
