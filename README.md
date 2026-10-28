# HelpDesk Cloud

Plateforme web de gestion des incidents informatiques hébergée sur AWS (architecture 3-tiers).
Projet de semestre ING-4-CIM — Sabrine Trabelsi, Manar Salah, Cyrine Messaoud.

## Architecture

Internet → Internet Gateway → ALB (sous-réseaux publics) → EC2 (Next.js + NestJS) en Auto Scaling sur 2 AZ → RDS PostgreSQL (sous-réseaux privés).
S3 privé pour les pièces jointes, CloudWatch pour la supervision, CloudFormation pour l'IaC.
Détails et justifications : [docs/L2-architecture-cout.md](docs/L2-architecture-cout.md).

## Structure du dépôt

| Dossier | Contenu |
| --- | --- |
| `infra/` | Templates CloudFormation (`network.yaml`, `security.yaml`, `compute.yaml`, ...) |
| `app/` | Code de l'application (frontend / backend) |
| `scripts/` | `deploy.sh`, `destroy.sh` |
| `docs/` | Livrables L1, L2, L3, plan de présentation |

## Prérequis

- AWS CLI v2
- Une session AWS Academy active (région `us-east-1`)

## Charger les identifiants AWS Academy

1. AWS Academy → Learner Lab → *Start Lab* → *AWS Details* → *Show* (AWS CLI).
2. Copier le bloc dans `~/.aws/credentials` (il contient `aws_access_key_id`, `aws_secret_access_key`, `aws_session_token`).
3. Vérifier : `aws sts get-caller-identity`

Les identifiants expirent à chaque fin de session : les recharger à chaque séance. Ne jamais les committer.

## Reconstruire l'infrastructure

```bash
./scripts/deploy.sh
```

Ordre des piles : `helpdesk-network` → `helpdesk-security` → `helpdesk-compute`.
Le script affiche l'URL de l'application à la fin (attendre ~2 min le User Data).

## Détruire l'infrastructure (fin de CHAQUE séance)

```bash
./scripts/destroy.sh
```

Le script supprime les piles dans l'ordre inverse et vérifie qu'aucune instance ne reste active.

## Règles d'équipe

- Aucune ressource créée à la main dans la console : tout passe par `infra/`.
- Destruction en fin de séance, sans exception (une semaine d'oubli ≈ 35 % du crédit).
- Pas de secret dans Git.
