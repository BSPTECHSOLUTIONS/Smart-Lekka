#!/bin/sh
set -e

nginx

node /app/artifacts/api-server/dist/index.mjs
