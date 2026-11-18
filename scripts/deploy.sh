#!/usr/bin/env bash
# Deploiement de l'infrastructure HelpDesk Cloud v3 (8 piles CloudFormation, dans l'ordre des dependances).
# Prerequis : identifiants AWS Academy temporaires charges (voir README), aws cli v2 installe.
#
# Variables optionnelles (toutes avec une valeur par defaut conforme au schema) :
#   AWS_REGION=us-east-1        PROJECT_NAME=helpdesk
#   ALB_CERT_ARN=               certificat ACM de l'ALB public   (vide = HTTP CloudFront -> ALB)
#   INTERNAL_CERT_ARN=          certificat ACM de l'ALB interne  (vide = HTTP frontend -> ALB interne)
#   DB_MULTI_AZ=true            false = RDS single-AZ (dev, cout RDS divise par 2)
#   ASG_MIN=2 ASG_MAX=3         taille des Auto Scaling Groups (ex. ASG_MIN=1 ASG_MAX=2 en dev)
#   DB_ENGINE_VERSION=          vide = version par defaut de RDS
#   FRONTEND_PORT=3000 BACKEND_PORT=3001
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT_NAME:-helpdesk}"
ALB_CERT_ARN="${ALB_CERT_ARN:-}"
INTERNAL_CERT_ARN="${INTERNAL_CERT_ARN:-}"
DB_MULTI_AZ="${DB_MULTI_AZ:-true}"
ASG_MIN="${ASG_MIN:-2}"
ASG_MAX="${ASG_MAX:-3}"
DB_ENGINE_VERSION="${DB_ENGINE_VERSION:-}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
INFRA_DIR="$(cd "$(dirname "$0")/../infra" && pwd)"

aws sts get-caller-identity >/dev/null 2>&1 \
  || { echo "Identifiants AWS absents ou expires : les recharger (voir README)."; exit 1; }

# Garde-fou : les piles de l'ancienne architecture (v1/v2) portent les memes noms et ne sont pas
# compatibles. Il faut les detruire AVEC L'ANCIEN destroy.sh avant le premier deploiement v3.
if aws cloudformation describe-stack-resource --region "$REGION" --stack-name "${PROJECT}-compute" \
     --logical-resource-id FirstInstance >/dev/null 2>&1; then
  echo "Une ancienne pile ${PROJECT}-compute (architecture v1) existe encore."
  echo "La detruire d'abord avec l'ancien scripts/destroy.sh (voir README, section Migration)."
  exit 1
fi

# Prefix list geree par AWS : les IP d'origine de CloudFront (SG-ALB-pub n'accepte que celle-ci)
CF_PREFIX_LIST="$(aws ec2 describe-managed-prefix-lists --region "$REGION" \
  --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
  --query 'PrefixLists[0].PrefixListId' --output text)"
if [ -z "$CF_PREFIX_LIST" ] || [ "$CF_PREFIX_LIST" = "None" ]; then
  echo "Prefix list CloudFront introuvable dans ${REGION}."; exit 1
fi

deploy() {
  local name="$1" template="$2"; shift 2
  echo
  echo ">>> Pile ${PROJECT}-${name}"
  aws cloudformation deploy \
    --region "$REGION" \
    --stack-name "${PROJECT}-${name}" \
    --template-file "${INFRA_DIR}/${template}" \
    --no-fail-on-empty-changeset \
    --tags Project="$PROJECT" \
    --parameter-overrides ProjectName="$PROJECT" "$@"
}

deploy network    network.yaml
deploy security   security.yaml   CloudFrontPrefixListId="$CF_PREFIX_LIST" \
                                  FrontendPort="$FRONTEND_PORT" BackendPort="$BACKEND_PORT" \
                                  AlbCertificateArn="$ALB_CERT_ARN" InternalCertificateArn="$INTERNAL_CERT_ARN"
deploy endpoints  endpoints.yaml
deploy data       data.yaml       DbMultiAz="$DB_MULTI_AZ" DbEngineVersion="$DB_ENGINE_VERSION"
deploy alb        alb.yaml        FrontendPort="$FRONTEND_PORT" BackendPort="$BACKEND_PORT" \
                                  AlbCertificateArn="$ALB_CERT_ARN" InternalCertificateArn="$INTERNAL_CERT_ARN"
deploy compute    compute.yaml    AsgMinSize="$ASG_MIN" AsgMaxSize="$ASG_MAX" \
                                  FrontendPort="$FRONTEND_PORT" BackendPort="$BACKEND_PORT" \
                                  InternalCertificateArn="$INTERNAL_CERT_ARN"
deploy edge       edge.yaml       AlbCertificateArn="$ALB_CERT_ARN"
deploy monitoring monitoring.yaml

echo
echo "=== Deploiement termine ==="
aws cloudformation describe-stacks --region "$REGION" --stack-name "${PROJECT}-edge" \
  --query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" --output text
echo "(attendre ~3-5 min que les instances installent Node.js et passent 'healthy' dans les target groups)"
echo "(rappel : ./scripts/destroy.sh en fin de seance)"
