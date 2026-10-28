# L1 — Sujet, application, composants

## Sujet

**HelpDesk Cloud** — plateforme web de gestion des incidents informatiques hébergée sur AWS.

**Problème résolu** : dans beaucoup d'organisations, les incidents sont signalés par e-mail, téléphone ou messagerie, ce qui provoque des demandes oubliées, des délais longs et un manque de visibilité. HelpDesk Cloud centralise les demandes et suit chaque incident de sa création à sa résolution.

Exemples : impossible de se connecter, ordinateur qui ne démarre plus, Wi-Fi en panne, application indisponible, demande d'installation de logiciel.

## Acteurs

| Acteur | Actions principales |
| --- | --- |
| Utilisateur | Créer un ticket (titre, description, catégorie), joindre une capture d'écran, suivre le statut, commenter, confirmer la résolution |
| Technicien IT | Consulter ses tickets, modifier priorité et statut, ajouter des notes techniques, enregistrer la solution |
| Administrateur | Gérer utilisateurs et catégories, affecter les tickets, surveiller les délais, consulter les statistiques |

## Fonctionnalités

**MVP** : authentification par rôle, création de tickets, suivi (nouveau / en cours / en attente / résolu / fermé), affectation, historique (commentaires et changements de statut), tableau de bord, recherche et filtres.

**Avancées (si le temps le permet)** : SLA et alertes de retard, statistiques de performance, pièces jointes dans S3 privé, suivi des incidents critiques.

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
