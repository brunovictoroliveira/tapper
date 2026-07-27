FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

USER root

RUN npm install --global @openai/codex@latest \
    && npm cache clean --force

USER node
