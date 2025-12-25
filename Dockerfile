# Build
FROM node:20-alpine as build

WORKDIR /app
COPY . /app

RUN apk update --no-cache && \
    apk add --no-cache python3 py3-pip make g++ grep && \
    npm install -g node-gyp-build && \
    mkdir -p /app/.genaid/instructions && \
    echo "GenAID Docker build placeholder instructions" > /app/.genaid/instructions/genaid.instructions.md && \
    echo "Installing && Compiling" && \
    yarn install && \
    npm --prefix packages/core install --legacy-peer-deps --prefer-offline && \
    npm --prefix packages/cli install --legacy-peer-deps --prefer-offline && \
    npm --prefix packages/vscode install --legacy-peer-deps --prefer-offline && \
    npm --prefix packages/web install --legacy-peer-deps --prefer-offline && \
    yarn compile


# Prod
FROM node:20-alpine

WORKDIR /app

# Copy the necessary files from the build stage
COPY --from=build /app/packages/cli/built /app/packages/cli/built
COPY --from=build /app/packages/cli/genaid /app/packages/cli/genaid
COPY --from=build /app/packages/web/built /app/packages/web/built
COPY --from=build /app/packages/web/index.html /app/packages/web/index.html
COPY --from=build /app/packages/web/favicon.svg /app/packages/web/favicon.svg
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json

EXPOSE 8003

# Set environment variable to increase heap size and disable watching /proc
ENV NODE_OPTIONS="--max-old-space-size=3072"

CMD ["node", "/app/packages/cli/built/genaid.cjs", "serve", "--network"]
