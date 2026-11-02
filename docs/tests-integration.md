# Vérifications à exécuter sur un projet Supabase de test

État au 2 novembre 2026 : les migrations 001 à 005 sont appliquées sur le projet isolé confirmé `barbershopmain` (`kiopqvbyamyobwlxdplk`). Certains contrôles SQL et deux essais de concurrence ont été exécutés avec des données fictives ; voir `PHASE_1_STABILISATION.md`. Des parcours navigateur en démo et avec services simulés ont aussi réussi ; les parcours Auth/PostgREST/Storage réels listés ci-dessous restent à exécuter. Ne pas utiliser de données réelles.

Le script `tests/supabase-phase1.sql` couvre une partie des scénarios directement en base, avec deux identités fictives et des rôles/claims simulés. Il termine par un rollback ; le lancer uniquement sur un projet de test isolé avec les migrations 001 à 004. Il ne remplace pas les tests de sessions réelles. `tests/supabase-storage-policy.sql`, à exécuter après la migration 005, vérifie en transaction les politiques des métadonnées Storage avec des utilisateurs fictifs et un rollback ; il ne téléverse aucun objet et ne teste pas l’API Storage. `tests/supabase-isolation-negative.sql`, à exécuter sur un projet isolé après 005, couvre en plus les tentatives inter-comptes sur prestations, réservations et historique, les données masquées et les requêtes forgées ; il termine aussi par un rollback. Les essais de concurrence et de Storage nécessitent des sessions distinctes.

## Tests navigateur locaux automatisés

Ces deux tests exigent Node, `npm ci` et un binaire Chromium/Chrome fonctionnel avec ses bibliothèques système. Ils créent un contexte navigateur isolé ; les jeux de données et identités sont fictifs. Indiquer si nécessaire le chemin du navigateur par `CHROMIUM_EXECUTABLE_PATH`. `BASE_URL` accepte seulement `localhost` ou `127.0.0.1` (port 3000 par défaut). Les requêtes hors serveur local sont bloquées, sauf l'origine fictive interceptée dans le second test. Ne jamais utiliser une clé ou un compte réel.

**Démo / absence de configuration.** Dans un premier terminal, reconstruire et démarrer avec les variables publiques vides (même si un `.env.local` existe) :

```bash
NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run build
NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run start
```

Dans un second terminal : `CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium npm run test:browser`. Le test vérifie création et persistance locale d'une prestation, d'une réservation et d'une dépense fictives, filtre, changement de statut, navigation mobile et états publics non configurés. Il n'effectue aucun appel métier réel.

**Parcours connecté simulé.** Arrêter le premier serveur, puis reconstruire et démarrer avec l'origine **fictive** réservée au test :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bp-test.invalid NEXT_PUBLIC_SUPABASE_ANON_KEY=demo-anon-key npm run build
NEXT_PUBLIC_SUPABASE_URL=https://bp-test.invalid NEXT_PUBLIC_SUPABASE_ANON_KEY=demo-anon-key npm run start
```

Dans un second terminal : `CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium npm run test:browser:mock`. Les appels à cette origine sont interceptés et simulés en mémoire : connexion/déconnexion A et B, publication, ajout/suppression de photo simulés, erreurs et nettoyage simulés, fiche publique, disponibilité en erreur puis réessai, validation de téléphone et réservation. Le jeu simulé filtre lui-même les données : ce test vérifie l'interface, **pas la RLS, l'Auth réelle, PostgREST ou Storage**. Ne pas déployer le build avec cette configuration fictive. Après ces essais, reconstruire avec la configuration de l'environnement souhaité.

## Scénarios réels encore à effectuer

1. Créer un service et publier le salon A depuis l'ERP. Vérifier que `/decouvrir` et `/salons/<slug>` affichent les informations, photos et prix enregistrés, puis que le retrait de publication les masque.
2. Envoyer une demande publique. Vérifier qu'elle apparaît en attente dans l'ERP du salon A, jamais chez B, puis confirmer et terminer ; vérifier l'historique et le dashboard. Une réservation ne doit créer aucun paiement ou revenu.
3. Créer au comptoir un rendez-vous futur dans l'ERP A, y compris lorsque sa vitrine est en brouillon. Vérifier que le créneau est occupé dans l'ERP et, si publié, sur le site public.
4. Lancer deux requêtes concurrentes sur des créneaux qui se chevauchent pour le même salon : une seule doit réussir. Vérifier également les durées différentes et les créneaux adjacents.
5. Tester sans session et avec B la lecture, l'écriture et les fonctions RPC sur les réservations et événements de A. Aucun accès privé ne doit réussir. Tester également les transitions non autorisées et les requêtes forgées.
6. Ajouter six photos, puis tenter deux ajouts concurrents : jamais plus de six métadonnées ne doivent être enregistrées. Contrôler les fichiers orphelins après erreur. Les URL de stockage restent publiques même pour des images masquées.
7. Vérifier les limites de dates, dimanche, 9h–19h, positions GPS valides et invalides, téléphone, absence de service et suppression de données fictives.
8. Avant ouverture réelle : limiter les abus, tester la restauration des sauvegardes, l'accessibilité, les politiques de confidentialité et de rétention, et mettre en place supervision et alertes.
