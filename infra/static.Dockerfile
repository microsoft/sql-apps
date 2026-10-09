# check=skip=InvalidDefaultArgInFrom
# Require the deployed runtime; never default to another image.
ARG RUNTIME_IMAGE
FROM ${RUNTIME_IMAGE}
COPY --chown=node:node public/ /app/public/
