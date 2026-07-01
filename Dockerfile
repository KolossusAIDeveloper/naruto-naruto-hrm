# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 2: Final image
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    libpq-dev \
    gcc \
    && apt-get clean

# Copy and install Python deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend
COPY backend/ /app/backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Copy nginx and supervisor configs
COPY nginx.conf /etc/nginx/sites-available/hrm
RUN rm -f /etc/nginx/sites-enabled/default && \
    ln -s /etc/nginx/sites-available/hrm /etc/nginx/sites-enabled/hrm
COPY supervisord.conf /etc/supervisor/conf.d/hrm.conf

# Create media and static dirs
RUN mkdir -p /app/backend/media /app/backend/staticfiles

# Make entrypoint executable
RUN chmod +x /app/backend/entrypoint.sh

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/hrm.conf"]
