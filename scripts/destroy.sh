#!/usr/bin/env bash
# Destruction complete de l'infrastructure HelpDesk Cloud (ordre inverse du deploiement).
# A lancer OBLIGATOIREMENT en fin de chaque seance.
set -uo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT_NAME:-helpdesk}"

# Ordre inverse des dependances. Ajouter ici les futures piles (monitoring, rds, alb...) AVANT 'compute'.
STACKS=(compute security network)

for name in "${STACKS[@]}"; do
  stack="${PROJECT}-${name}"
  if aws cloudformation describe-stacks --region "$REGION" --stack-name "$stack" >/dev/null 2>&1; then
    echo ">>> Suppression de ${stack}"
    aws cloudformation delete-stack --region "$REGION" --stack-name "$stack"
    aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$stack" \
      || { echo "ECHEC de suppression de ${stack} : voir la console CloudFormation (events)"; exit 1; }
  else
    echo "--- ${stack} : deja absente"
  fi
done

echo
echo "=== Verification : instances encore actives avec le tag Project=${PROJECT} ==="
aws ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Project,Values=${PROJECT}" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query "Reservations[].Instances[].InstanceId" --output text
echo "(liste vide = tout est detruit)"
