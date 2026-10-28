# L3 — Réseau et socle de calcul : script de démonstration live

## Ce qui est déployé (IaC uniquement, piles CloudFormation)

| Pile | Fichier | Ressources |
| --- | --- | --- |
| helpdesk-network | `infra/network.yaml` | VPC, IGW, 2 sous-réseaux publics + 2 privés (2 AZ), tables de routage, endpoint S3 |
| helpdesk-security | `infra/security.yaml` | SG ALB, SG app, SG RDS |
| helpdesk-compute | `infra/compute.yaml` | 1 instance EC2 t3.micro (Flask minimal via User Data) |

## Avant la présentation (à faire AVANT la salle)

1. Recharger les identifiants AWS Academy, `aws sts get-caller-identity`.
2. Faire une répétition complète : `./scripts/deploy.sh` puis `./scripts/destroy.sh`.
3. Tout relancer **10 minutes avant** de passer, pour que l'instance soit prête (2 min de User Data).

## Déroulé (≈ 5 min)

1. Montrer le dépôt : `infra/`, `scripts/`.
2. `./scripts/deploy.sh` (ou montrer le résultat si déjà lancé) — les 3 piles dans l'ordre.
3. Console : VPC, 4 sous-réseaux sur 2 AZ, table publique (route 0.0.0.0/0 → IGW) vs table privée (aucune route Internet).
4. Groupes de sécurité : EC2 n'accepte que l'ALB (+ l'IP de l'équipe pour la démo), RDS que le SG des EC2.
5. Ouvrir l'URL de la pile `compute` : la page affiche l'ID d'instance et l'AZ ; `/health` répond `ok`.
6. Justifier l'accès sortant (voir L2) : IGW + IP publique, pas de NAT Gateway, endpoint S3.
7. `./scripts/destroy.sh` : montrer la destruction ordonnée et la vérification finale.

## Questions probables

- Pourquoi pas de NAT ? → coût (+48 % horaire), voir L2.
- Pourquoi pas de SSH ? → accès admin via SSM (`LabInstanceProfile`), aucun port d'administration ouvert.
- Pourquoi CloudFormation ? → service natif AWS, aucun outil à installer, destruction propre pile par pile.
