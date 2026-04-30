#!/usr/bin/env bash
# 在服务器上：与 package.json 同目录，chmod +x deploy.sh
# 环境变量（可选）：
#   DEPLOY_BRANCH=main
#   PM2_APP_NAME=rag-search-api
# 若用单独 Deploy Key 拉私库，取消下面 GIT_SSH_COMMAND 的注释并改路径
# export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes'

set -euo pipefail

cd "$(dirname "$0")"

# GitHub Actions / 非交互 SSH 不会读登录 shell 的 .bashrc，常导致「pnpm: command not found」
# 与「你手动 ssh 上去明明有 pnpm」不矛盾：交互会话加载了 nvm/corepack 等。
if [ -f /etc/profile ]; then
  # shellcheck source=/dev/null
  . /etc/profile
fi
if [ -f "${HOME}/.bash_profile" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.bash_profile"
elif [ -f "${HOME}/.bashrc" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.bashrc"
fi
if [ -f "${HOME}/.profile" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.profile"
fi
export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${NVM_DIR}/nvm.sh"
fi
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi
export PATH="${HOME}/.local/share/pnpm:/usr/local/bin:${PATH}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm 不在 PATH 中。请在服务器以部署用户执行: which pnpm"
  echo "并把该目录加入本脚本 PATH，或改用全路径调用 pnpm。"
  exit 127
fi

BRANCH="${DEPLOY_BRANCH:-main}"
APP_NAME="${PM2_APP_NAME:-rag-search-api}"

echo "==> deploy: $(pwd) branch=${BRANCH}"

git fetch origin
git reset --hard "origin/${BRANCH}"

# 有 lock 文件时尽量可复现；没有则回退为普通 install
if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi

pnpm run prisma:generate

# OceanBase 等环境若 migrate deploy 报错，可临时改为: pnpm run prisma:push
# 或先设: export PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1
pnpm run prisma:deploy

pnpm run build

export NODE_ENV=production

if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start dist/main.js --name "$APP_NAME" --update-env
fi

pm2 save

echo "==> deploy done: ${APP_NAME}"
