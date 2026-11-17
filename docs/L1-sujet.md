# L1 — Sujet, application, composants

## Sujet

**HelpDesk Cloud** — plateforme web de gestion des incidents informatiques hébergée sur AWS.

**Problème résolu** : dans beaucoup d'organisations, les incidents sont signalés par e-mail, téléphone ou messagerie, ce qui provoque des demandes oubliées, des délais longs et un manque de visibilité. HelpDesk Cloud centralise les demandes et suit chaque incident de sa création à sa résolution.

Exemples : impossible de se connecter, ordinateur qui ne démarre plus, Wi-Fi en panne, application indisponible, demande d'installation de logiciel.

## Acteurs

| Acteur | Actions principales |
| --- | --- |
| Utilisateur | Déclarer un incident (titre, description, catégorie), joindre un fichier (capture d'écran), consulter ses tickets, suivre l'avancement d'un ticket |
| Technicien IT | Consulter les tickets à traiter, consulter le détail d'un ticket et ses pièces jointes, prendre en charge un ticket, mettre à jour l'état d'un ticket, consulter l'historique |
| Administrateur | Gérer les comptes, gérer les droits d'accès, superviser l'activité, surveiller l'état du service |

Tous les acteurs doivent s'authentifier avant d'effectuer une action.

## Cas d'utilisation

Le système comporte 15 cas d'utilisation (voir le diagramme de cas d'utilisation).

| Acteur | Cas d'utilisation | Description |
| --- | --- | --- |
| Utilisateur | Déclarer un incident | Saisie du titre, de la description et de la catégorie ; le ticket est créé avec le statut « nouveau » |
| Utilisateur | Joindre un fichier | Ajout facultatif d'une capture d'écran à l'incident déclaré, stockée dans S3 (bucket privé) |
| Utilisateur | Consulter ses tickets | Liste des tickets déclarés par l'utilisateur |
| Utilisateur | Suivre l'avancement d'un ticket | Consultation du statut d'un de ses tickets (nouveau / en cours / en attente / résolu / fermé) |
| Technicien IT | Consulter les tickets à traiter | Liste des tickets à traiter (nouveaux tickets et tickets qu'il a pris en charge) |
| Technicien IT | Consulter le détail d'un ticket | Affichage des informations complètes d'un ticket |
| Technicien IT | Consulter les pièces jointes | Accès aux fichiers joints à un ticket |
| Technicien IT | Prendre en charge un ticket | Le technicien s'attribue un ticket, qui passe à « en cours » |
| Technicien IT | Mettre à jour l'état d'un ticket | Changement du statut du ticket (en cours, en attente, résolu, fermé) |
| Technicien IT | Consulter l'historique | Liste des changements d'état d'un ticket |
| Administrateur | Gérer les comptes | Création, modification et désactivation des comptes utilisateurs |
| Administrateur | Gérer les droits d'accès | Attribution à chaque compte de son rôle (utilisateur, technicien, administrateur) |
| Administrateur | Superviser l'activité | Suivi de l'activité de la plateforme : tickets par statut, tickets en retard |
| Administrateur | Surveiller l'état du service | Vérification de la disponibilité de la plateforme (health checks, alarmes CloudWatch) |
| Tous | S'authentifier | Connexion par identifiant et mot de passe ; rôle reconnu à la connexion |

**Relations entre cas d'utilisation**

- `«include»` **S'authentifier** : inclus dans tous les cas d'utilisation sauf « Joindre un fichier » et « S'authentifier » lui-même (13 cas).
- `«extend»` **Joindre un fichier** étend **Déclarer un incident** : la pièce jointe est facultative.

## Fonctionnalités

**MVP** : authentification par rôle, déclaration d'incident, pièces jointes dans S3 privé, consultation et suivi des tickets, prise en charge, mise à jour de l'état (nouveau / en cours / en attente / résolu / fermé), historique des changements d'état, gestion des comptes et des droits d'accès, supervision de l'activité et de l'état du service.

**Évolutions possibles (hors périmètre du diagramme de cas d'utilisation actuel)** : commentaires sur les tickets, confirmation de la résolution par l'utilisateur, notes techniques et enregistrement de la solution, affectation des tickets par l'administrateur, gestion des catégories, tableau de bord et statistiques, recherche et filtres, SLA et alertes de retard, suivi des incidents critiques.

## Composants de l'application

Le projet est avant tout un projet d'infrastructure : l'application est la charge de travail qui démontre que l'infrastructure fonctionne.

| Composant | Technologie | Rôle |
| --- | --- | --- |
| Frontend | Next.js (React) | Interface utilisateur |
| Backend | NestJS (API REST, Node.js) | Logique métier, authentification, tickets |
| Base de données | PostgreSQL (Amazon RDS) | Persistance relationnelle |
| Stockage objet | Amazon S3 (bucket privé) | Pièces jointes |

> Sur chaque EC2, Nginx reçoit le trafic de l'ALB sur le port 80 : il envoie `/` vers Next.js (frontend) et `/api` vers NestJS (API), qui communique avec PostgreSQL (RDS). Trois composants distincts qui communiquent : frontend, API, base de données.

## Objectifs non fonctionnels

Haute disponibilité (2 AZ, Auto Scaling, health checks), sécurité (segmentation réseau, RDS privé, S3 privé), reproductibilité (IaC), supervision (CloudWatch), maîtrise du coût (crédit de 50 USD).

## Dépôt Git

`helpdesk-cloud` — URL : https://github.com/manarsalaah/helpdesk-cloud.git
