# L3 — Réseau et socle de calcul : script de démonstration live

## Ce qui est déployé (IaC uniquement, 8 piles CloudFormation)

Voir le tableau « Ordre des piles » du [README](../README.md) : réseau (VPC, 10 sous-réseaux, 2 NAT), sécurité (6 SG + secret d'origine), endpoints d'interface, données (RDS Multi-AZ + S3), ALB public/interne, ASG frontend/backend, CloudFront + WAF, alarmes CloudWatch.

## Avant la présentation (à faire AVANT la salle)

1. Recharger les identifiants AWS Academy, `aws sts get-caller-identity`.
2. Faire une répétition complète : `./scripts/deploy.sh` puis `./scripts/destroy.sh`.
3. Lancer `./scripts/deploy.sh` **30 minutes avant** de passer (CloudFront ≈ 10 min + RDS Multi-AZ ≈ 10-15 min + instances 3-5 min).

## Déroulé (≈ 5 min)

1. Montrer le dépôt : `infra/`, `scripts/`.
2. `./scripts/deploy.sh` (ou montrer le résultat si déjà lancé) — les 8 piles dans l'ordre.
3. Console : VPC, 10 sous-réseaux sur 2 AZ ; table publique (0.0.0.0/0 → IGW), `rt-private-a/b` (0.0.0.0/0 → NAT de la même AZ), table data (aucune route).
4. Groupes de sécurité en chaîne : ALB public ← prefix list CloudFront ; FE ← ALB public ; ALB interne ← FE ; BE ← ALB interne ; RDS ← BE.
5. Ouvrir l'URL CloudFront : la page affiche le frontend (ID, AZ) puis la réponse du backend via l'ALB interne et l'état de RDS. Appel direct de l'ALB public sans en-tête : 403.
6. Justifier l'accès sortant : une NAT GW par AZ (résilience), endpoint S3 de passerelle, endpoints d'interface pour SSM/Secrets Manager/CloudWatch.
7. `./scripts/destroy.sh` : montrer la destruction ordonnée et la vérification finale.

## Questions probables

- Pourquoi 2 NAT et autant d'endpoints ? → résilience par AZ et pas de dépendance Internet pour l'administration ; contrepartie : ≈ 0,21 USD/h, voir « Coût » du README.
- Pourquoi HTTP entre CloudFront et l'ALB ? → pas de domaine/certificat ACM dans le Learner Lab ; protégé par SG (prefix list) + en-tête secret.
- Pourquoi pas de SSH ? → accès admin via SSM (`LabInstanceProfile`), aucun port d'administration ouvert.
- Pourquoi CloudFormation ? → service natif AWS, aucun outil à installer, destruction propre pile par pile.
