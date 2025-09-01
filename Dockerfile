# Stage 1
FROM alpine:latest AS build

# Install dependencies
RUN apk add --update --no-cache npm hugo

RUN hugo version

WORKDIR /opt/app

COPY . .

# install node dependencies
RUN npm ci --no-audit --no-fund --omit=dev

# Run Hugo in the Workdir to generate HTML.
RUN npm run build:prod

# Stage 2
FROM nginx:alpine

# Set workdir to the NGINX default dir.
WORKDIR /usr/share/nginx/html

# Copy HTML from previous build into the Workdir.
COPY --from=build /opt/app/public .


EXPOSE 80/tcp