# BARBERPRO

Plateforme de démonstration et première implémentation de vitrine pour salons de coiffure. Référence : [cahier des charges](docs/cahier-des-charges.md).

## Démarrer

Prérequis : Node.js 20.9 ou supérieur et npm.

```bash
npm ci
npm run dev
```

- `/` : ERP connecté quand Supabase est configuré ; sinon, ERP de démonstration avec données fictives et `localStorage`.
- `/decouvrir` : annuaire public des salons publiés.
- `/salons/<slug>` : vitrine, galerie, prestations et demande de rendez-vous.
- `/espace-vitrine` : connexion, création du salon et administration de la vitrine.

L'annuaire et l'espace professionnel ont besoin de Supabase. Sans configuration, ils affichent un message explicite ; l'ERP démo reste utilisable.

## Configuration de l'espace vitrine

1. Utiliser un **projet Supabase de test séparé**. Les migrations 001–005 ont déjà été appliquées au projet de test confirmé dans cette session ; vérifier l'historique de chaque projet avant toute application.
2. Sur un projet de test isolé, examiner puis appliquer dans l'ordre `db/migrations/001_public_vitrine.sql`, `002_gallery_location.sql`, `003_erp_operations.sql`, `004_restrict_function_execution.sql` et `005_fix_gallery_storage_policies.sql` avec un processus de migration versionné. Ces migrations supposent Supabase Auth, Storage et les rôles `anon`/`authenticated` ; elles créent les tables `bp_*`, leurs politiques RLS et le bucket **public** `barberpro-gallery`. Les cinq ont été appliquées et partiellement testées sur le projet isolé confirmé ; voir `docs/PHASE_1_STABILISATION.md`. Ne pas en déduire une validation de production.
3. Copier `.env.example` en `.env.local` et renseigner l'URL du projet ainsi que sa **clé publique** (publishable ou anon), jamais une clé `service_role` ou secrète.
4. Dans Supabase Auth, configurer l'URL du site et autoriser l'URL de retour `/espace-vitrine` de votre environnement de test. Si la confirmation d'email est activée, le propriétaire doit confirmer son adresse avant de se connecter. Configurer la délivrabilité des emails avant lancement.
5. Redémarrer le serveur. Dans `/`, créer un compte et un salon, puis ajouter des prestations, jusqu’à six photos et éventuellement les coordonnées GPS. Après publication, les visiteurs pourront demander un créneau. Le propriétaire retrouve les demandes dans son ERP et peut aussi créer des rendez-vous au comptoir.

## Périmètre et limites importantes

- Dans le mode connecté, l’ERP propriétaire, son module « Vitrine publique » et le site public utilisent le même compte et les mêmes tables `bp_salons`, `bp_services` et `bp_bookings`. Le dashboard utilise une fonction SQL ; les rendez-vous ne sont jamais comptés comme encaissements. L’historique des statuts commence à l’installation de la migration 003.
- Sans variables d’environnement, `/` affiche encore la maquette locale. Elle n’est pas synchronisée et ne doit pas être utilisée pour des données réelles. Ce nouveau mode connecté ne migre pas les données locales de démonstration.
- L’application utilise Supabase directement avec la clé publique et RLS, **pas l’API Go prévue**. Cette base est une première implémentation propriétaire uniquement, pas encore l’ERP complet ni la gestion des collaborateurs, rôles et permissions du cahier des charges.
- Cette première version gère un salon par compte propriétaire et un planning partagé : lundi à samedi, 9h–19h en heure d'Abidjan, par pas de 30 minutes. Pas de sélection de barbier, d'horaires personnalisables, pauses, congés, buffer ou reprogrammation. Le comptoir permet de réserver un créneau futur, pas encore une visite immédiate hors planning. Les disponibilités sont recalculées par PostgreSQL et une contrainte d'exclusion empêche les chevauchements concurrents au niveau du salon. Les demandes commencent en attente ; aucun paiement ni notification n'est envoyé.
- Les fichiers du bucket sont publics par leur URL, même si une photo est masquée ou un salon en brouillon. N'y téléversez aucune image confidentielle. Le propriétaire est responsable des droits à l'image. Contrôles de contenu réel et modération restent à implémenter.
- **Ne pas ouvrir au public en production en l'état.** Il manque notamment limitation de débit et anti-abus des réservations, notifications, tests complémentaires d'isolation et de concurrence avec sessions réelles, audit des permissions, politique de confidentialité/rétention et suppression des données, sauvegardes/restauration testées, supervision et validation d'intégration avec le vrai ERP. Les réservations collectent nom et téléphone : utiliser uniquement des données fictives jusqu'à ces validations.
- Les autres modules de l’ERP (notamment équipe, caisse et rapports) ne sont pas encore disponibles en mode connecté. Les coordonnées renseignées ouvrent Google Maps via un lien ; aucune clé Google Maps n’est requise.

Vérifications locales : `npm run test`, `npm run lint` et `npm run build`. Les tests unitaires ne remplacent pas les tests d’intégration SQL et d’isolation multi-tenant. Les tests navigateur facultatifs et leurs prérequis sont décrits dans [les vérifications d'intégration](docs/tests-integration.md). Voir aussi [l'état d'avancement](docs/plan.md).
