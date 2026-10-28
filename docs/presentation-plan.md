# Plan de présentation (15 min, tous les membres)

Répartition proposée (à échanger librement) :

| Min | Contenu | Qui |
| --- | --- | --- |
| 0–1 | Introduction de l'équipe et du sujet | Sabrine |
| 1–5 | **L1** : problème, acteurs, fonctionnalités MVP, composants, dépôt Git | Sabrine |
| 5–10 | **L2** : schéma, justification des services selon les 5 axes, estimation de coût (≈ 0,094 USD/h, ≈ 16 USD/semaine oubliée) | Manar |
| 10–14 | **L3** : démonstration live (voir `L3-demo.md`) et script de destruction | Cyrine |
| 14–15 | Conclusion et suite (L4 : ALB + Auto Scaling) | Cyrine |

Rappels du prof :
- Rien de construit à la main dans la console.
- Détruire toutes les ressources à la fin de la séance.

Messages à faire passer :
1. Projet d'infrastructure : l'application est la charge de travail.
2. Tout est reproductible : `deploy.sh` / `destroy.sh`.
3. Choix assumés : pas de NAT (coût), RDS single-AZ (budget), SG en cascade ALB → EC2 → RDS.
