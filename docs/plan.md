# Plan de réalisation et état d'avancement

Référence : [cahier des charges](cahier-des-charges.md). Le produit est BARBERPRO, une plateforme pour salons de coiffure, et non une application de lavage automobile.

## Livré dans cette première étape

- Interface responsive Next.js/React/TypeScript, navigation, dashboard illustratif et aperçu de vitrine.
- La rubrique « Vitrine publique » de l’ERP ouvre le module connecté : profil, galerie de six photos, localisation GPS, catalogue, publication et demandes. Ce module nécessite Supabase configuré.
- Démonstration locale de création de demandes, changement de statut, ajout de prestations et de dépenses, et recherche dans les réservations.
- Données explicitement fictives, sauvegardées dans le navigateur et réinitialisables.
- Commandes de vérification TypeScript et build.

## Reste à réaliser avant toute exploitation

1. **Fondations** : API Go, PostgreSQL et migrations versionnées, authentification, création de tenant et d'établissement, sessions, permissions contrôlées par le serveur, journal d'audit, environnements séparés. Ajouter des tests négatifs d'isolation entre tenants avant de brancher des données réelles.
2. **Exploitation** : CRUD persistant des services, collaborateurs, clients et plannings ; horaires, pauses et absences ; machine à états des réservations et historique. La vérification de chevauchement doit être transactionnelle en base, y compris sous concurrence, avec tests automatisés.
3. **Gestion** : factures, paiements partiels et remboursements audités, sessions de caisse, dépenses validées, salaires et primes séparés, stock et rapports calculés côté API. Les rendez-vous ne sont pas des paiements.
4. **Public** : annuaire de salons publiés, pages publiques, gestion sécurisée des médias, recherche et réservation anonyme sécurisée avec limitation de débit, validation et vrai calcul de disponibilités.
5. **SaaS** : plans et quotas configurables, abonnements, essais et administration de plateforme ; préserver les données lors des downgrades.
6. **Stabilisation** : tests de permissions, de concurrence et de bout en bout ; contrôle d'accessibilité, supervision, sauvegardes et restauration testée, conformité et protection des données.

Aucune de ces fonctionnalités non livrées ne doit être considérée comme opérationnelle du seul fait qu'elle figure dans la navigation ou dans le cahier des charges. Les composants en mode démonstration seront à remplacer ou relier progressivement à l'API et à la base sécurisées.

## Première implémentation de la plateforme vitrine

Une plateforme publique est disponible dans le code et son module de gestion est intégré à la navigation de l’ERP : annuaire et pages publiques, authentification Supabase, création d'un salon, édition de son profil, gestion du catalogue et de la galerie, publication, demandes de réservation et suivi de statuts. La migration SQL et ses règles d'accès sont préparées mais n'ont pas été appliquées à une base au cours de cette session.

Ce module est intégré visuellement à l’ERP, mais ses données et son authentification sont **encore indépendantes de l’ERP de démonstration**. Il ne satisfait donc pas encore le besoin de visibilité automatique des salons déjà inscrits dans un véritable ERP. Il faut d'abord disposer des comptes, tenants et prestations persistants de celui-ci, puis partager leur source de vérité avec la vitrine. Voir les limites et précautions du README.

## Deuxième étape : opérations propriétaires connectées

Le mode connecté utilise désormais le même compte, salon, catalogue et réservations pour l’ERP et la vitrine. Il inclut des indicateurs opérationnels calculés en base, la liste des réservations, les changements de statut, un historique des changements à partir de la migration 003 et la création d’un rendez-vous futur au comptoir. Les clients sont déduits des 100 derniers rendez-vous et ne constituent pas encore un module CRM.

La migration 003 n’a pas été appliquée ou validée sur une base pendant cette session. Le planning est partagé et fixe, les tests RLS et de concurrence restent à réaliser. L’équipe, la caisse, les salaires, le stock et les rapports restent à implémenter avant toute mise en production.
