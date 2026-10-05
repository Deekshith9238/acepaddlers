#!/bin/bash
# Runs on the web server through SSM (document ${name}-deploy): fetch settings,
# pull the image, start it beside the running one, switch once it is healthy.
# Caddy load-balances over both app ports and skips whichever is down, so the
# switch drops no requests.
set -euo pipefail
TAG="$1"
REPO="${repo}"
REGION="${region}"
D=/opt/acepaddlers
mkdir -p $D/caddy

# Settings: plain values from Parameter Store, secrets from Secrets Manager.
umask 077
aws ssm get-parameter --region $REGION --name "${env_param}" --query Parameter.Value --output text > $D/env.new
for k in ${secret_keys}; do
  printf '%s=%s\n' "$k" "$(aws secretsmanager get-secret-value --region $REGION --secret-id "${name}/$k" --query SecretString --output text)" >> $D/env.new
done
mv $D/env.new $D/env
umask 022

cat > $D/caddy/Caddyfile <<'CADDY'
(app) {
	reverse_proxy 127.0.0.1:8081 127.0.0.1:8082 {
		health_uri /api/healthz
		health_interval 3s
		lb_try_duration 30s
	}
}
${domain} {
	encode gzip
	import app
}
# Plain HTTP for the old load balancer only (security group), while DNS moves.
:8080 {
	import app
}
CADDY
if [ -z "$(docker ps -q -f name=^caddy$)" ]; then
  docker rm -f caddy 2>/dev/null || true
  docker run -d --name caddy --restart unless-stopped --network host \
    -v $D/caddy:/etc/caddy -v caddy_data:/data -v caddy_config:/config caddy:2
else
  docker exec caddy caddy reload --config /etc/caddy/Caddyfile
fi

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$${REPO%%/*}"
docker pull "$REPO:$TAG"

if [ -n "$(docker ps -q -f name=^app-8081$)" ]; then NEW=8082; OLD=8081; else NEW=8081; OLD=8082; fi
docker rm -f app-$NEW 2>/dev/null || true
docker run -d --name app-$NEW --restart unless-stopped --env-file $D/env -p 127.0.0.1:$NEW:8080 \
  --log-driver awslogs --log-opt awslogs-region=$REGION --log-opt awslogs-group="${log_group}" \
  --log-opt awslogs-stream="web-$(date +%Y%m%d-%H%M%S)-$NEW" "$REPO:$TAG"

# Migrations run at boot, so allow a few minutes.
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$NEW/api/healthz"; then
    docker rm -f app-$OLD 2>/dev/null || true
    docker image prune -f >/dev/null
    echo "deployed $TAG on port $NEW"
    exit 0
  fi
  sleep 5
done
echo "app-$NEW never became healthy; still serving from app-$OLD" >&2
docker logs --tail 50 app-$NEW >&2 || true
docker rm -f app-$NEW
exit 1
