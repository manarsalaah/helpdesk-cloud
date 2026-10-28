# L2 — Architecture, justification des services, coût

## Schéma d'architecture


Flux :
1. Les utilisateurs accèdent à l'application via Internet et l'Internet Gateway.
2. L'ALB (sous-réseaux publics) répartit le trafic entre les deux instances EC2.
3. Les instances lisent et écrivent les tickets dans RDS PostgreSQL (sous-réseaux privés).
4. Les instances stockent les pièces jointes dans S3 (bucket privé).
Supervision CloudWatch et déploiement par piles CloudFormation.

## Plan réseau (région us-east-1, 2 AZ)

| Sous-réseau | CIDR | AZ | Contenu |
| --- | --- | --- | --- |
| Public A | 10.0.1.0/24 | 1ʳᵉ AZ | ALB, EC2 |
| Public B | 10.0.2.0/24 | 2ᵉ AZ | ALB, EC2 |
| Privé A | 10.0.11.0/24 | 1ʳᵉ AZ | RDS |
| Privé B | 10.0.12.0/24 | 2ᵉ AZ | RDS (groupe de sous-réseaux) |

VPC : 10.0.0.0/16.

## Groupes de sécurité

| SG | Entrée autorisée |
| --- | --- |
| ALB | HTTP 80 depuis 0.0.0.0/0 |
| EC2 (app) | Port applicatif depuis le SG de l'ALB uniquement (pas de SSH, accès admin via SSM) |
| RDS | 5432 depuis le SG des EC2 uniquement |

## Accès sortant (solution justifiée)

Les instances EC2 sont dans les **sous-réseaux publics** avec une IP publique et sortent via l'Internet Gateway (installation de paquets, mises à jour). Elles ne sont pas joignables directement : leur SG n'accepte que le trafic de l'ALB.
Les sous-réseaux privés (RDS) n'ont **aucune route vers Internet** : RDS n'en a pas besoin. Le trafic S3 passe par un **endpoint de passerelle S3** (gratuit).

**Pourquoi pas de NAT Gateway ?** Environ 0,045 USD/h par NAT (≈ 33 USD/mois) plus le trafic traité, soit près de +48 % sur le coût horaire de l'architecture, pour un bénéfice faible : la sécurité repose déjà sur les SG et sur l'absence d'accès entrant direct. Compromis assumé : les EC2 ont une IP publique (facturée à l'heure, comptée dans l'estimation).

## Justification des services (cinq axes)

| Service | Disponibilité | Performance | Sécurité | Scalabilité | Coût |
| --- | --- | --- | --- | --- | --- |
| VPC multi-AZ | Résiste à la perte d'une AZ | Réseau AWS à faible latence | Isolation, public/privé | CIDR /16 large | Gratuit |
| ALB | Health checks, retire les cibles défaillantes | Répartition de charge L7 | SG dédié, point d'entrée unique | Monte en charge automatiquement | ≈ 0,0225 USD/h + LCU |
| EC2 + Auto Scaling (min 2, max 2-3) | Remplacement automatique d'une instance | t3.micro suffisant pour le MVP | SG restrictif, IMDSv2, pas de SSH | Ajout d'instances (max 3) | t3.micro ≈ 0,0104 USD/h pièce |
| RDS PostgreSQL | Sauvegardes automatisées, restauration | Moteur managé | Sous-réseaux privés, SG limité | Évolution de classe | db.t3.micro ≈ 0,018 USD/h, single-AZ |
| S3 | Durabilité élevée | Accès objet direct | Bucket privé, accès public bloqué | Illimitée | Quasi nul pour ce volume |
| CloudWatch | Alarmes (HealthyHostCount, CPU) | Métriques et logs centralisés | Traçabilité | Natif | Niveau gratuit + quelques alarmes |
| CloudFormation | Reconstruction reproductible | — | Pas de dérive manuelle | Modèles réutilisables | Gratuit |

Choix de coût : RDS en single-AZ (budget Academy), compromis connu côté disponibilité de la base ; le Multi-AZ RDS est une évolution possible en production.

## Estimation de coût (prix indicatifs us-east-1, à vérifier avec l'AWS Pricing Calculator)

| Poste | USD/heure |
| --- | --- |
| 2 × EC2 t3.micro | 0,0208 |
| ALB (1 LCU) | ≈ 0,0305 |
| RDS db.t3.micro PostgreSQL | 0,018 |
| 4 IPv4 publiques (2 EC2 + 2 nœuds ALB) | 0,020 |
| EBS 2 × 8 Go + stockage RDS 20 Go | ≈ 0,005 |
| **Total** | **≈ 0,094** |

- Séance de 3 h : ≈ 0,28 USD.
- Une semaine oubliée (168 h) : ≈ 15,8 USD, soit environ 32 % du crédit de 50 USD (cohérent avec l'ordre de grandeur de 35 % annoncé).
- Un mois non arrêté (730 h) : ≈ 69 USD, au-dessus du crédit → la destruction en fin de séance est obligatoire.
- Un crédit de 50 USD représente ≈ 530 h de fonctionnement complet.

**Alarme de budget** : à configurer si AWS Academy l'autorise (AWS Budgets à 50 % et 80 % du crédit) ; sinon suivi manuel de la consommation en fin de séance, consigné dans `docs/`.
