# Phase 1 — stabilisation : lots réalisés, validation partielle

## Périmètre réalisé

- Extraction des lectures de l'espace propriétaire dans `lib/services/owner-workspace.mjs` : salon filtré par `owner_id`, prestations et réservations filtrées par `salon_id`, maximum de 100 réservations, RPC de tableau de bord inchangée. La couche accepte un client injectable pour les tests.
- Distinction entre absence de salon et échec de lecture ; les échecs de chargement de l'ERP connecté disposent d'un message et d'un bouton Réessayer. Les réponses de chargement obsolètes sont ignorées ; les données affichées sont effacées lors d'un changement de compte. L'historique utilise un contrôle distinct des réponses obsolètes.
- Ajout de messages d'erreur pour la vérification de session, la déconnexion, le changement de statut et la lecture de l'historique dans l'ERP. Le résultat d'un changement de statut doit être vérifié si la réponse est incertaine.
- Pour les réservations publiques et au comptoir : traitement des réponses incertaines (notamment erreur réseau de statut 0, timeout, erreur serveur ou réponse sans UUID valide), sans afficher de faux succès. La soumission est bloquée dans le formulaire courant et un message demande de vérifier avant de réessayer. Les échecs de chargement de créneaux sont également signalés.
- Le mode démo et les migrations 001–003 n'ont pas été modifiés. Après accord explicite, les migrations 001–003 ont été appliquées au projet de test isolé, puis une migration additive 004 a été créée et appliquée après découverte d'un écart de permissions ; la migration additive 005 a ensuite été autorisée et appliquée pour corriger les politiques Storage (voir ci-dessous).

## Lot complémentaire — vitrine et chargements publics

- Extraction des lectures du gestionnaire de vitrine et des pages publiques vers des services injectables. Les erreurs de lecture sont distinctes des listes vides et des salons absents ; des boutons Réessayer sont proposés. Une erreur de créneaux ne s'affiche plus comme « aucun créneau ».
- Dans le gestionnaire : invalidation des anciennes réponses au changement de compte, effacement des données affichées, gestion des erreurs de session/déconnexion, limitation des mutations simultanées et absence de message de succès si aucune ligne n'est confirmée. Les erreurs réseau ou les réponses ambiguës demandent une vérification avant nouvelle tentative. Les opérations de réordonnancement restent non atomiques et peuvent être partielles.
- La galerie ne supprime plus automatiquement l'objet Storage si l'insertion de ses métadonnées a un résultat incertain : une ligne peut déjà y faire référence. En cas de rejet de base identifié, elle tente un nettoyage et signale son échec ; un résultat incertain ou un changement de session peut encore laisser un objet orphelin. Aucun téléversement Storage réel n'a été exécuté dans ce lot.
- Les formulaires de réservation évitent une double soumission simultanée dans la même interface ; la garantie serveur d'idempotence et la persistance après rechargement restent à réaliser. Le mode démo n'a pas été modifié ; aucune migration ni configuration Supabase supplémentaire n'avait été appliquée lors de ce lot précédent.
- Ajout de tests de composants React avec clients simulés pour les erreurs/réessais, changements de compte, résultats tardifs ou incertains et double soumission. `react-test-renderer` émet un avertissement de dépréciation ; des tests navigateur séparés sont désormais disponibles.

## Vérifications locales

- `npm ci --no-audit --no-fund` : installation reproductible réussie à partir du lockfile.
- `npm run test` : **34 tests réussis**, dont les quatre tests de transitions préexistants. Les autres couvrent les services avec clients simulés, les filtres et limites, les erreurs et réponses obsolètes, le traitement de l'upload, les réponses de réservation et quelques parcours de composants React simulés.
- `npm run lint` (`tsc --noEmit`) : réussi.
- `npm run build` : réussi.
- `git diff --check` : réussi pour les fichiers suivis modifiés.
- Serveur de production local sans variables Supabase : HTTP 200 sur `/`, `/decouvrir`, `/espace-vitrine` et `/salons/salon-inexistant` ; ce dernier reste une réponse HTTP 200, pas une vraie 404.
- Chromium réel exécuté après compilation temporaire des bibliothèques manquantes : `npm run test:browser` réussi sur les parcours de démonstration, `localStorage`, navigation mobile et états publics non configurés ; `npm run test:browser:mock` réussi sur des connexions A/B, une publication, une fiche publique, une réservation et des erreurs de créneaux, avec **toutes les requêtes Supabase simulées en mémoire**. Instructions et limites dans `tests-integration.md`. Aucun test navigateur avec Supabase réel n'a été réalisé.
- Ces essais navigateur ont révélé un attribut HTML `pattern` invalide en mode Unicode `v` pour les téléphones ; il a été corrigé pour les formulaires public et comptoir et vérifié avec des numéros valides et invalides. La section et le filtre de recherche de l'ERP sont remis à zéro lors d'un changement de compte. Les liens vers `/` n'affirment plus qu'il s'agit systématiquement de la démo.

## Essais sur Supabase isolé — 2 novembre 2026

L'utilisateur a confirmé `barbershopmain` (`kiopqvbyamyobwlxdplk`) comme projet isolé et autorisé les migrations 001–003, puis séparément les migrations 004 et 005. Avant application, aucune table publique métier ni migration enregistrée n'était présente. Les migrations sont enregistrées sous les versions Supabase `20261102051048` (001), `20261102051100` (002), `20261102051120` (003), `20261102051724` (004) et `20261102064811` (005). Le bucket `barberpro-gallery` a été créé **public** par 001 ; aucune image n'a été téléversée.

### Écart découvert et correction

Les rôles `anon` et `authenticated` disposaient par défaut de droits `EXECUTE` explicites sur toutes les fonctions `bp_*` malgré les révocations de `PUBLIC` dans 001–003. Par exemple, un appel anonyme à `bp_owner_dashboard` atteignait la fonction avant d'être refusé par son contrôle interne. Cela ne démontre pas une lecture non autorisée des données ; les privilèges étaient néanmoins plus larges que prévu. La migration additive `db/migrations/004_restrict_function_execution.sql`, autorisée et appliquée, retire explicitement ces droits et ne réaccorde aux rôles concernés que les fonctions attendues. Après application, vérification des privilèges : seules les deux RPC publiques sont exécutables par `anon` ; les RPC propriétaires sont exécutables par `authenticated` ; les deux fonctions de trigger ne sont exécutables directement par aucun des deux rôles. La migration ne modifie pas 001–003. Un éventuel retour arrière nécessiterait une revue explicite des privilèges à restaurer ; réaccorder globalement les droits anonymes serait risqué.

### Correction des politiques Storage (migration 005)

Un test de métadonnées Storage avec rôles et claims fictifs a révélé que l'expression de 001 `storage.foldername(name)` dans la sous-requête sur `bp_salons s` se résolvait en `storage.foldername(s.name)` et non au chemin de l'objet. L'insertion d'un objet dans le bon dossier propriétaire était refusée ; un nom de salon façonné comme un chemin pouvait aussi rendre la condition sur le deuxième dossier incorrecte. Les politiques d'origine ne prévoyaient pas de SELECT des métadonnées pour le propriétaire.

Après accord explicite, `db/migrations/005_fix_gallery_storage_policies.sql` a remplacé les deux politiques nommées et ajouté une politique de lecture de métadonnées limitée au propriétaire et à son salon, en qualifiant `storage.objects.name`. `tests/supabase-storage-policy.sql` a réussi sur le projet isolé dans une transaction annulée : insertion dans le bon dossier pour A et B, refus de chemins forgés ou du dossier d'un autre propriétaire, isolation de la lecture de métadonnées et absence de listing anonyme. Vérification après rollback : aucun compte ou salon fictif de cet essai ne reste. Ce test SQL ne téléverse ni ne supprime de fichier et ne démontre pas le fonctionnement effectif de l'API Storage. Le bucket demeure **public par URL**, y compris pour une image masquée.

Dans Chromium, les opérations de galerie, le nettoyage après rejet certain et la conservation de l'objet après réponse incertaine ont été testés avec un stockage et une base **simulés en mémoire**. Aucun upload ou suppression Storage réel n'a été exécuté. Un retour arrière de la migration 005 nécessiterait une revue explicite des politiques ; restaurer les règles ambiguës réintroduirait l'anomalie.

### Résultats observés

- `tests/supabase-phase1.sql` exécuté sur la base réelle après 004 : deux utilisateurs fictifs créés **dans une transaction**, rôle SQL et claim utilisateur simulés, puis rollback. Vérifications réussies : visibilité public/brouillon, refus anonyme du dashboard et des réservations privées, tentative de modification et accès inter-salons refusés, création publique, disponibilité sans chevauchement et contiguë, rendez-vous comptoir en brouillon, transitions et historique, dashboard, contraintes GPS et maximum séquentiel de six photos. Un jeu précédent a également vérifié la libération d'un créneau après annulation. Ce n'est pas un test d'authentification réelle.
- `tests/supabase-isolation-negative.sql` exécuté après 005 avec rôles/claims simulés et rollback : refus de modifier ou créer une prestation d'un autre salon, d'accéder à ses réservations/événements ou RPC propriétaire, et de transférer le propriétaire ; données masquées non listées publiquement et requête de réservation associant salon et service différents refusée. Vérification après rollback : aucun utilisateur ou salon fictif de cet essai ne reste. Ces vérifications restent ciblées et ne remplacent pas des sessions Auth réelles.
- Deux transactions réellement parallèles ont essayé de réserver des créneaux se chevauchant pour un service d'une heure : une réussite, un rejet « Ce créneau vient d’être réservé », une réservation active en base. Une transaction gardait le verrou trois secondes. Ce résultat couvre ce scénario précis, pas toutes les combinaisons possibles.
- Deux transactions parallèles ont essayé d'ajouter une photo à une galerie déjà dotée de cinq métadonnées : une réussite, un rejet « La galerie est limitée à six photos », six métadonnées au total. Ce test n'incluait aucun objet Storage.
- Les jeux temporaires des essais parallèles ont été supprimés par identifiants précis ; vérification finale : zéro utilisateur, salon ou métadonnée de test restante pour ces jeux. Les tests transactionnels ont été annulés ; les séquences PostgreSQL peuvent néanmoins avancer.

## Limites et points encore ouverts

- Les tests Node sont simulés. Les scénarios SQL sur base réelle exercent certaines politiques et transitions avec des identités simulées, et deux cas précis de concurrence ; ils ne prouvent pas l'ensemble de l'isolation ni le fonctionnement des sessions réelles. Des changements d'interface, l'authentification et la déconnexion ont été exercés dans Chromium avec un service simulé ; ils n'ont pas encore été testés de bout en bout avec des sessions réelles.
- Le blocage après réponse incertaine ne survit pas à un rechargement de page ; il ne constitue pas une garantie d'idempotence côté serveur. La vérification auprès du salon ou dans les réservations reste nécessaire avant toute nouvelle tentative.
- Les parcours vitrine et chargements publics ont été durcis, mais toutes les interactions ne sont pas couvertes. Les mutations de galerie restent multi-étapes, non atomiques, et les essais Storage, réseau et navigateur réels restent nécessaires ; des fichiers orphelins restent possibles.
- Les contrôles en base décrits ci-dessus restent partiels : pas de session Supabase Auth réelle, de parcours PostgREST/navigateur, d'upload Storage ou de tests exhaustifs des politiques et des permutations de concurrence. L'environnement d'exécution ne dispose pas d'un accès direct aux hôtes Supabase pour ces parcours ; le connecteur a permis les contrôles SQL uniquement. Le projet de test confirmé ne doit pas être assimilé à une autorisation de déployer en production.
- Le contrôle par `owner_id` côté client n'est pas une preuve de sécurité serveur. Les réserves P0 de l'audit ne sont que partiellement levées. Les agrégats financiers restent hors périmètre de ce lot.

## Suite avant validation complète de la phase 1

1. Exécuter avec des sessions Supabase Auth réelles les scénarios connectés multi-comptes, RLS, auth/déconnexion, erreurs réseau et transitions ; compléter les tests de concurrence, Storage et les parcours navigateur et démo.
2. Vérifier les droits et le comportement PostgREST/Storage, y compris les images orphelines et la publication/dépublication.
3. Vérifier les autres interactions et couvrir les mutations et races résiduelles, sans modifier silencieusement les contrats ; remplacer à terme le moteur de tests React déprécié.
4. Refaire tests et build après chaque lot, puis documenter les résultats et les éventuels blocages.

**Statut : phase 1 partiellement réalisée et partiellement vérifiée ; non validée pour la production. Phase 2 non commencée.**
