#!/bin/sh

# Create SSL directory
mkdir -p /etc/nginx/ssl

# Generate self-signed certificate if not exists
if [ ! -f /etc/nginx/ssl/cert.pem ]; then
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Substitute environment variables in nginx config
envsubst '${BACKEND_URL} ${FRONTEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start nginx
exec "$@"
