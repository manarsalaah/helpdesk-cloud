#!/usr/bin/env bash
# Deploiement de l'infrastructure HelpDesk Cloud (piles CloudFormation, dans l'ordre).
# Prerequis : identifiants AWS Academy temporaires charges (voir README), aws cli installe.
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT_NAME:-helpdesk}"
INFRA_DIR="$(cd "$(dirname "$0")/../infra" && pwd)"

# IP publique de l'equipe pour l'acces direct de la demo L3 (retiree des qu'un ALB existe).
if [ -z "${DEMO_CIDR+x}" ]; then
  MY_IP="$(curl -s https://checkip.amazonaws.com || true)"
  DEMO_CIDR="${MY_IP:+$MY_IP/32}"
fi

deploy() {
  local name="$1" template="$2"; shift 2
  echo ">>> Pile ${PROJECT}-${name}"
  aws cloudformation deploy \
    --region "$REGION" \
    --stack-name "${PROJECT}-${name}" \
    --template-file "${INFRA_DIR}/${template}" \
    --no-fail-on-empty-changeset \
    --tags Project="$PROJECT" \
    --parameter-overrides ProjectName="$PROJECT" "$@"
}

deploy network  network.yaml
deploy security security.yaml DemoCidr="${DEMO_CIDR:-}"
deploy compute  compute.yaml

echo
echo "=== Deploiement termine ==="
aws cloudformation describe-stacks --region "$REGION" --stack-name "${PROJECT}-compute" \
  --query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" --output text
echo "(attendre ~2 min que le User Data installe Node.js)"
