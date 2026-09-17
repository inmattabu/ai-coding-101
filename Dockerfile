FROM node:22-alpine

WORKDIR /app
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node html ./html
COPY --chown=node:node css ./css
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node data ./data

ENV NODE_ENV=production
ENV PORT=9009
EXPOSE 80
USER node
CMD ["node", "server.js"]
