#!/usr/bin/env bash
# Destruction complete de l'infrastructure HelpDesk Cloud v3 (ordre inverse du deploiement).
# A lancer OBLIGATOIREMENT en fin de chaque seance (NAT GW, endpoints, RDS Multi-AZ et ALB sont factures a l'heure).
# Compter ~15-25 min : la suppression de la distribution CloudFront et du RDS Multi-AZ est lente.
set -uo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT_NAME:-helpdesk}"

# Ordre inverse des dependances (export/import entre piles) :
STACKS=(monitoring edge compute alb data endpoints security network)

aws sts get-caller-identity >/dev/null 2>&1 \
  || { echo "Identifiants AWS absents ou expires : les recharger (voir README)."; exit 1; }

# Un bucket S3 non vide bloque la suppression de la pile data : on le vide d'abord.
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${PROJECT}-attachments-${ACCOUNT_ID}-${REGION}"
if aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null 2>&1; then
  echo ">>> Vidage du bucket s3://${BUCKET}"
  aws s3 rm "s3://${BUCKET}" --recursive --region "$REGION" >/dev/null
fi

for name in "${STACKS[@]}"; do
  stack="${PROJECT}-${name}"
  if aws cloudformation describe-stacks --region "$REGION" --stack-name "$stack" >/dev/null 2>&1; then
    echo ">>> Suppression de ${stack}"
    aws cloudformation delete-stack --region "$REGION" --stack-name "$stack"
    aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$stack" \
      || { echo "ECHEC de suppression de ${stack} : voir la console CloudFormation (onglet Events)"; exit 1; }
  else
    echo "--- ${stack} : deja absente"
  fi
done

echo
echo "=== Verification : ressources facturables encore actives (Project=${PROJECT}) ==="
LEFT=0
check() { # check "<libelle>" <commande aws ... --output text>
  local label="$1"; shift
  local out; out="$("$@" 2>/dev/null || true)"
  if [ -n "$out" ] && [ "$out" != "None" ]; then echo "RESTE  ${label} : ${out}"; LEFT=1; else echo "ok     ${label}"; fi
}
check "instances EC2" aws ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Project,Values=${PROJECT}" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query "Reservations[].Instances[].InstanceId" --output text
check "NAT gateways" aws ec2 describe-nat-gateways --region "$REGION" \
  --filter "Name=tag:Project,Values=${PROJECT}" "Name=state,Values=pending,available" \
  --query "NatGateways[].NatGatewayId" --output text
check "adresses IP elastiques" aws ec2 describe-addresses --region "$REGION" \
  --filters "Name=tag:Project,Values=${PROJECT}" --query "Addresses[].AllocationId" --output text
check "VPC (et donc endpoints)" aws ec2 describe-vpcs --region "$REGION" \
  --filters "Name=tag:Project,Values=${PROJECT}" --query "Vpcs[].VpcId" --output text
check "instance RDS" aws rds describe-db-instances --region "$REGION" \
  --query "DBInstances[?DBInstanceIdentifier=='${PROJECT}-postgres'].DBInstanceIdentifier" --output text
check "load balancers" aws elbv2 describe-load-balancers --region "$REGION" \
  --query "LoadBalancers[?starts_with(LoadBalancerName, '${PROJECT}-')].LoadBalancerName" --output text
check "bucket S3" bash -c "aws s3api head-bucket --bucket '${BUCKET}' --region '${REGION}' >/dev/null 2>&1 && echo '${BUCKET}'"

echo
if [ "$LEFT" -eq 0 ]; then echo "=== Tout est detruit ==="; else echo "=== ATTENTION : des ressources restent, voir ci-dessus ==="; exit 2; fi
