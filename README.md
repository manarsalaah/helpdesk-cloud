# HelpDesk Cloud

Plateforme web de gestion des incidents informatiques hébergée sur AWS (architecture 3-tiers).
Projet de semestre ING-4-CIM — Sabrine Trabelsi, Manar Salah, Cyrine Messaoud.

## Architecture

Architecture v3 en 4 couches sur 2 AZ (schéma source : [docs/architecture.drawio](docs/architecture.drawio)) :

Internet → **CloudFront + WAF** (en-tête secret) → **ALB public** → ASG **Frontend** Next.js (privé) → **ALB interne** → ASG **Backend** NestJS (privé) → **RDS PostgreSQL Multi-AZ** (sous-réseaux data, sans route sortante).
S3 privé SSE-KMS (Gateway Endpoint), 2 NAT Gateways (une par AZ), endpoints d'interface (ssm, secretsmanager, logs, monitoring…), CloudWatch, CloudFormation.

> Les justifications et l'estimation de coût de [docs/L2-architecture-cout.md](docs/L2-architecture-cout.md) décrivent l'architecture v1 (sans NAT, sans CloudFront, RDS single-AZ) : voir la section « Coût » ci-dessous pour la v3.

## Structure du dépôt

| Dossier | Contenu |
| --- | --- |
| `infra/` | 8 templates CloudFormation (voir « Ordre des piles ») |
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

Ordre des piles (chaque pile importe les exports des précédentes) :

| # | Pile | Fichier | Contenu |
| --- | --- | --- | --- |
| 1 | `helpdesk-network` | `network.yaml` | VPC, 10 sous-réseaux (public, frontend, LB interne, backend, data) sur 2 AZ, IGW, 2 NAT GW, tables `rt-private-a/b` + table data sans route, Gateway Endpoint S3 |
| 2 | `helpdesk-security` | `security.yaml` | SG-ALB-pub (prefix list CloudFront), SG-FE, SG-ALB-int, SG-BE, SG-RDS, SG-VPCE, secret de l'en-tête d'origine |
| 3 | `helpdesk-endpoints` | `endpoints.yaml` | 6 endpoints d'interface, ENI dans les sous-réseaux backend, Private DNS |
| 4 | `helpdesk-data` | `data.yaml` | RDS PostgreSQL Multi-AZ (mot de passe géré par Secrets Manager), bucket S3 privé SSE-KMS |
| 5 | `helpdesk-alb` | `alb.yaml` | ALB public (403 sans l'en-tête secret) + ALB interne, target groups |
| 6 | `helpdesk-compute` | `compute.yaml` | ASG frontend + ASG backend (min 2, max 3, IMDSv2, SSM, pas de SSH) |
| 7 | `helpdesk-edge` | `edge.yaml` | CloudFront, WAF global, WAF régional sur l'ALB public |
| 8 | `helpdesk-monitoring` | `monitoring.yaml` | Alarmes : cibles saines, CPU ASG, CPU et stockage RDS |

À la fin, le script affiche l'URL CloudFront. Attendre ~3-5 min (User Data + health checks). La page frontend affiche la réponse du backend via l'ALB interne, avec l'état de la connexion TCP vers RDS.

Variables optionnelles : `DB_MULTI_AZ=false`, `ASG_MIN=1 ASG_MAX=2` (mode dev économique), `ALB_CERT_ARN`, `INTERNAL_CERT_ARN`, `DB_ENGINE_VERSION` (détail en tête de `scripts/deploy.sh`).

### HTTPS entre les couches

Le schéma prévoit HTTPS 443 entre CloudFront → ALB public et frontend → ALB interne. Un listener HTTPS exige un certificat ACM, donc un nom de domaine que le Learner Lab ne fournit pas toujours. Sans certificat, ces deux liaisons passent en **HTTP 80 à l'intérieur d'AWS** (SG et en-tête secret inchangés) ; le trafic navigateur → CloudFront reste en HTTPS. Avec un certificat : `ALB_CERT_ARN=arn:... ./scripts/deploy.sh`. À signaler comme limite connue dans la présentation.

## Migration depuis l'ancienne version

Les piles v1 portent les mêmes noms que celles de la v3 et ne sont pas compatibles. Si l'ancienne infrastructure tourne encore : revenir sur `main` (ancien `scripts/destroy.sh`), la détruire, puis passer à la nouvelle branche. `deploy.sh` refuse de continuer si une ancienne pile `helpdesk-compute` est détectée.

## Détruire l'infrastructure (fin de CHAQUE séance)

```bash
./scripts/destroy.sh
```

Le script vide le bucket S3, supprime les 8 piles dans l'ordre inverse (compter 15-25 min : CloudFront et RDS Multi-AZ sont lents), puis vérifie qu'il ne reste ni instance, NAT GW, IP élastique, VPC, RDS, load balancer ni bucket (code de sortie 2 sinon).

## Coût (v3, indicatif us-east-1, à vérifier avec l'AWS Pricing Calculator)

| Poste | USD/heure |
| --- | --- |
| 4 × EC2 t3.micro (2 frontend + 2 backend) | 0,042 |
| 2 ALB | ≈ 0,06 |
| 2 NAT Gateways (hors trafic) | 0,090 |
| 6 endpoints d'interface × 2 AZ | 0,120 |
| RDS db.t3.micro Multi-AZ | 0,036 |
| 4 IPv4 publiques (2 NAT + 2 nœuds ALB public) | 0,020 |
| EBS + stockage RDS | ≈ 0,016 |
| 2 WAF (ACL + règles, au prorata) | ≈ 0,025 |
| **Total** | **≈ 0,41** |

Environ 4× la v1 (≈ 0,094 USD/h) : séance de 3 h ≈ 1,2 USD, une semaine oubliée ≈ 69 USD, soit plus que le crédit de 50 USD. NAT et endpoints d'interface (≈ 0,21 USD/h) en représentent plus de la moitié et sont imposés par le schéma ; `DB_MULTI_AZ=false` et `ASG_MIN=1` ne retirent que ≈ 0,06 USD/h. La destruction en fin de séance est donc encore plus critique qu'avant.

## Règles d'équipe

- Aucune ressource créée à la main dans la console : tout passe par `infra/`.
- Destruction en fin de séance, sans exception (une semaine d'oubli dépasse le crédit, voir « Coût »).
- Pas de secret dans Git.
