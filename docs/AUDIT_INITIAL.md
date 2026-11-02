# BARBERPRO — audit initial (phase 0)

> **Instantané de phase 0 :** les constats ci-dessous décrivent l'état lors de l'audit initial. Pour les migrations et vérifications intervenues ensuite, voir [le rapport de phase 1](PHASE_1_STABILISATION.md).

**Date :** 2 novembre 2026<br>
**Périmètre :** dépôt `ErwinsS225/barber_shop`, branche `arena/e75f3ed8-lavautomain2`, commit initial observé `8c6d4b9` (merge de la PR #1).<br>
**Statut : partiellement validé.** Audit statique du code et des migrations, tests et build locaux exécutés. Aucune fonctionnalité métier modifiée et aucune migration appliquée. Les comportements connectés, la RLS, la concurrence et les parcours utilisateurs n'ont pas été validés sur une base ou par tests navigateur.

## 1. Méthode et limites

- `git status --short` initial : propre. `git branch --show-current` : `arena/e75f3ed8-lavautomain2`. `git log -5` ne montre que `8c6d4b9` : le clone est superficiel (`git rev-parse --is-shallow-repository` = `true`). L'historique antérieur complet et une éventuelle exposition historique de secrets n'ont donc pas pu être vérifiés.
- Toutes les sources suivies du dépôt ont été inventoriées, y compris routes, composants, CSS, migrations, dépendances, tests et documentation. Recherche des gestionnaires JSX (`onClick`, `onSubmit`, `onChange`, `onBlur`), liens et appels Supabase ; les interactions sont regroupées par action ci-dessous. Un contrôle statique ne prouve pas leur fonctionnement en conditions réelles.
- Variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` absentes de l'environnement local. Aucun fichier `.env` réel présent dans le dépôt. `/` fonctionne donc en **démo locale**, pas en mode connecté.
- Aucun navigateur automatisé, accès applicatif connecté, projet de test identifié, `psql`, Docker ou CLI Supabase n'était disponible pour exécuter les scénarios d'intégration. Les requêtes HTTP locales ne testent ni l'hydratation, ni les clics, ni la RLS. Les CSS responsive sont présents ; leur rendu mobile, clavier et lecteur d'écran n'a pas été vérifié visuellement.
- Le connecteur Supabase activé expose un projet nommé **`barbershopmain`** (référence observée `kiopqvbyamyobwlxdplk`). L'association de ce projet au déploiement de ce dépôt n'est **pas confirmée** ; il ne doit pas être présumé de test ou de production. Seules des métadonnées ont été lues, sans consulter de données métier ni modifier la configuration. `auth`, `db`, `rest` et `storage` sont signalés sains ; l'historique des migrations, les Edge Functions, les tables du schéma `public`, les fonctions `public.bp_*` et le bucket `barberpro-gallery` retournent des listes vides. L'absence d'historique ne prouve pas à elle seule qu'aucun SQL n'a jamais été exécuté ; ici les objets métier recherchés sont eux aussi absents. D'autres schémas, données, comptes, politiques et configurations Auth/Storage n'ont pas été audités exhaustivement.
- Statuts de l'inventaire : **D** = comportement de démonstration local seulement ; **I** = implémenté dans le code, non vérifié de bout en bout ; **P** = partiel ou trompeur ; **N** = absent / sans action ; **B** = intentionnellement bloqué. Aucun statut I ne signifie « validé en production ».

## 2. Architecture réelle

| Couche | État et fichiers |
|---|---|
| Application | Next.js App Router 16.4.3, React / React DOM 19.3.1, TypeScript 5.9.3 (versions résolues par `npm ci`), `@supabase/supabase-js` 2.118.0, `lucide-react` 0.468.0 ; `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`. TypeScript `strict` activé. |
| Entrée | `app/page.tsx` choisit `ConnectedERP` si les deux variables Supabase sont présentes, sinon `DemoERP` ; ce choix vérifie la présence des variables, pas la connexion ni la santé de la base. Il faut éviter qu'une configuration manquante fasse passer un environnement réel inaperçu en démo. |
| Manager connecté | `app/components/ConnectedERP.tsx` : salon propriétaire, tableau de bord, réservations, prestations, clients déduits et composant vitrine. `VitrineManager.tsx` : Auth, création salon, profil, services, médias et statuts. Beaucoup de logique réseau, formulaires, état et interface dans ces composants ; requêtes Supabase directement depuis le navigateur. |
| Démo | `app/components/DemoERP.tsx` : données préremplies, KPI et transactions fictifs ; réservations, prestations et dépenses via `localStorage` (`barberpro-demo-v1`). Aucun lien avec les données Supabase. La rubrique vitrine affiche néanmoins le composant connecté, qui demande une configuration. |
| Public | `/decouvrir` (`app/decouvrir/page.tsx`), `/salons/[slug]` et `/espace-vitrine`. Client React, chargement Supabase après montage ; `app/layout.tsx` fournit des métadonnées génériques. Aucun rendu SEO spécifique par salon, aucune PWA ou génération de miniatures repérée. |
| Données | `lib/supabase.ts` crée un client singleton non typé avec les clés publiques, types métier manuels et aide Google Maps ; `lib/booking-domain.mjs` duplique les transitions côté UI. Pas de couche `services`/`repositories`, API métier Go, Prisma ni validation partagée. |
| Design / exploitation | `app/globals.css`, `app/site.css`, image `public/salon.jpg`, Google Fonts distantes. `next.config.ts` autorise `*.e2b.app` en développement. Aucun workflow `.github`, configuration Supabase CLI ou pipeline CI/CD suivi. |

## 3. Inventaire fonctionnel

| Domaine | Situation observée | Statut / limites |
|---|---|---|
| Authentification / salon | `VitrineManager` appelle `signUp`, `signInWithPassword`, `signOut`, crée `bp_salons` pour `auth.uid()` | **I/P**. Confirmation email selon configuration externe ; pas de parcours mot de passe oublié, invitations, MFA imposé, récupération ou désactivation vérifiés. Les appels Auth ne sont pas testés. |
| Tableau de bord connecté | `ConnectedERP` → RPC `bp_owner_dashboard` | **I/P**. Compte RDV du jour hors annulés/refusés, demandes en attente, RDV terminés du jour et services actifs. Pas de CA, périodes, graphiques financiers ou équipe ; « encaissements indisponibles » affiché honnêtement. |
| Réservations connectées | `bp_bookings`, `bp_available_slots`, `bp_owner_available_slots`, `bp_request_booking`, `bp_create_counter_booking`, `bp_change_booking_status`, `bp_booking_events` | **I/P**. Création future public / comptoir, statuts et historique prévus ; pas de report, édition, arrivée, en cours, calendrier personnel, marche immédiate ou notifications. Fenêtre fixe lun.–sam. 9h–19h, Abidjan, pas 30 min, 90 jours, une ressource par salon. Historique uniquement après migration 003. |
| Clients | `ConnectedERP` regroupe par téléphone les 100 réservations chargées | **P**. Aucun `clients`/CRUD, aucune fiche, recherche client dédiée ou normalisation ; les noms et numéros peuvent différer. Le regroupement porte sur les 100 dates `starts_at` décroissantes, pas l'historique complet. |
| Prestations | `VitrineManager` et `bp_services` | **I/P**. Création, édition, activation/désactivation ; même champ `active` pilote réservation et visibilité publique, pas de catégorie, suppression/archivage dédié ni association aux employés. `bp_bookings.service_name` et `price` figent les valeurs à la création. |
| Vitrine / galerie | `VitrineManager`, `bp_salons`, `bp_gallery`, Storage | **I/P**. Profil, publication, GPS, jusqu'à six métadonnées, ajout/suppression, visibilité, légendes et ordre ; pas d'horaires modifiables, logo distinct, vignette/compression serveur, politique de réservation ou contrôle des droits à l'image. URL des objets publiques même masqués. |
| Découverte | `app/decouvrir/page.tsx` | **I/P**. Recherche en mémoire sur nom, ville, adresse et chargement des 100 salons publiés les plus récents ; sans pagination, recherche globale, service, prix, proximité ou disponibilité. Résultats au-delà de 100 absents ; pas de filtre fiable par prestation. |
| Fiche publique / réservation | `app/salons/[slug]/page.tsx` | **I/P**. Présente galerie/services et lien Google Maps ; formulaire avec consentement et référence de demande ; pas de notification ni de paiement. Page non publiée/non trouvée affiche un message côté client mais la route répond HTTP 200 dans le test local, à revoir pour SEO/404. |
| Planning, salariés, caisse, dépenses, salaires, primes, stock, rapports, abonnements, rôles, administration SaaS | Aucun modèle ni module métier connecté correspondant ; équipe / caisse / rapports visuellement « bientôt » | **N/B**. Les écrans démo ne sont pas des fonctions connectées. Aucun chiffre d'affaires, bénéfice ou encaissement ne peut être certifié. |
| Démo réservations, prestations et dépenses | `DemoERP`, `localStorage` | **D/P**. Écriture locale prévue, sans transaction ni synchronisation ; réservations empêchent uniquement doublon même barbier/date/heure, pas les chevauchements de durée. Les données de démonstration ne doivent pas devenir données réelles par accident. |

## 4. Inventaire des interactions

L'inventaire couvre les éléments interactifs repérés dans les cinq composants/pages, regroupés lorsque plusieurs boutons ont la même action. Les formulaires cités comprennent leurs champs, les validations HTML et leurs sélecteurs. Les états sont déduits du code ; ni succès backend, ni persistance, ni responsive n'ont été vérifiés par clic connecté.

### 4.1 Mode démonstration — `app/components/DemoERP.tsx`

| Élément / action attendue | État | Diagnostic / correction à étudier |
|---|---|---|
| Menu mobile ouvrir, fermer et fond de fermeture ; navigation des 11 sections | D | Met à jour l'état React ; certaines sections affichent un état indisponible plutôt qu'un module. Tester clavier/mobile. |
| Clo​​che d'alertes, fermeture par navigation vers réservations | D/P | Affiche le nombre fictif en attente ; pas de système de notifications, fermeture hors clic / Échap non démontrée. |
| Liens annuaire, espace professionnel et « Voir le site public » | I/P | Navigation vers routes existantes ; sans configuration elles affichent un état non connecté. |
| « Réinitialiser » et confirmation native | D | Réinitialise l'état démo dans le navigateur ; ne concerne pas les données Supabase. |
| Sélecteurs établissement et profil / icône de déconnexion dans la sidebar, localisation et chevrons en haut | N | Présentés comme éléments visuels (`div`/`span`/icônes), sans sélection ni déconnexion réelle. Rendre clairement non interactifs ou implémenter. |
| « Nouvelle réservation », fermer/annuler, champs client/téléphone/service/barbier/date/heure et soumission | D/P | Crée uniquement une réservation locale ; vérifie le doublon exact, pas les intervalles ni les horaires. Aucun double-submit ou succès d'écriture `localStorage` garanti : la notification apparaît avant la persistance de l'effet React. |
| « Aujourd'hui / 7 jours / 30 jours » | P | Change la sélection visuelle ; aucun filtrage, indication explicite pour 7/30 jours. Implémenter un vrai filtre ou désactiver. |
| Sélecteur graphique « Cette semaine » | N | `span` avec apparence de select ; aucune action. Graphique et total statiques. |
| « Voir tout / planning complet », « Voir tout » transactions, « Voir équipe » / « Voir toute l'équipe » | D/P | Naviguent vers sections démo ; transactions, équipe et performance sont fictives. Aucune fiche ou transaction réelle. |
| Recherche planning/réservations ; sélection de statut | D/P | Filtrage local et changement de statut arbitraire ; aucun cycle métier serveur, permissions ou audit. |
| « Ajouter une prestation », nom/durée/prix, enregistrer/annuler | D | Ajout local ; pas de modification, archivage ni publication. |
| « Ajouter une dépense », libellé/catégorie/montant, enregistrer/annuler | D | Ajout local fictif ; pas de validation financière ni écriture de caisse. |
| Clients, prestations, équipe, caisse, vitrine, produits/stock, rapports, paramètres dans le menu | D/P/B | Clients déduits des réservations ; équipe fictive ; caisse limitée aux dépenses locales ; vitrine demande Supabase ; stock/rapports/paramètres annoncent l'indisponibilité. Pas d'actions CRUD manquantes dissimulées à considérer comme livrées. |

### 4.2 Manager connecté — `ConnectedERP.tsx`

| Élément / action attendue | État | Diagnostic / correction à étudier |
|---|---|---|
| Ouvrir/fermer menu mobile, navigation Vue d'ensemble / Réservations / Prestations / Clients / Vitrine | I | État React ; la navigation recharge les données sauf vitrine. Tester focus, restauration et responsive. Équipe, caisse et rapports sont des éléments « bientôt », non des boutons opérationnels. |
| Déconnexion | I/P | Appelle `auth.signOut()` sans attendre ni traiter son erreur ; à vérifier session expirée/erreur réseau. |
| Lien « Site public » et « Voir le site » | I/P | `/decouvrir` ou page du salon si publié ; le brouillon renvoie à l'annuaire, pas à une prévisualisation privée. |
| « Nouvelle réservation » | I/B | Ouvre le formulaire comptoir ; désactivé sans salon ni prestation active. Ne permet pas une visite immédiate hors planning. |
| Tableau de bord « Tout voir », « Gérer ma vitrine » | I | Changent de section. La liste « dernières » est limitée à cinq éléments parmi les 100 dates décroissantes, pas nécessairement les prochains rendez-vous. |
| Recherche client/téléphone/prestation | P | Filtre en mémoire uniquement les 100 réservations chargées ; sans pagination, tri ni recherche serveur. |
| Sélection de transition ; bouton Historique / fermer | I/P | RPC de statut et lecture de `bp_booking_events` prévus. Lors d'une erreur d'historique, le message général est derrière la modale et l'état vide peut être trompeur. Pas de détail client ni report. |
| « Gérer le catalogue » | I/P | Navigue vers la vitrine, où l'édition est prévue ; aucun CRUD direct dans la liste du manager. |
| Vue Clients | P | Tableau dérivé des 100 rendez-vous ; aucun bouton pour créer, modifier, supprimer, filtrer ou accéder à une fiche. |
| Formulaire comptoir : prestation, date, choix de créneau, nom/téléphone, confirmer, annuler/fermer | I/P | Appelle `bp_owner_available_slots` puis `bp_create_counter_booking`, désactive l'envoi sans créneau/en cours. Créneau futur et planning unique ; soumission réelle / concurrence non testées. |
| Fermeture d'une notification | I | Supprime l'état React, sans impact métier. |

### 4.3 Gestion de vitrine et authentification — `VitrineManager.tsx`

| Élément / action attendue | État | Diagnostic / correction à étudier |
|---|---|---|
| Liens logo, annuaire, retour ERP et déconnexion | I/P | Routes existantes ; libellé « ERP de démonstration » peut être faux si configuré. Déconnexion attend l'appel mais ne présente pas son erreur. |
| Basculer connexion / inscription ; email, mot de passe, soumettre | I/P | `signInWithPassword` / `signUp`, `busy`, retour générique. Confirmation dépend de Supabase ; mot de passe oublié et contrôles renforcés absents. Pas de tests d'authentification. |
| Créer le salon : nom, ville, slug et soumission | I/P | `bp_salons.insert`, propriété `auth.uid`, `unique(owner_id)` ; un salon maximum par propriétaire. Pas de sélecteur multi-établissements. |
| Voir ma page, publier / retirer publication | I/P | Update de `published`, lien affiché si publié. Aucune prévisualisation privée et aucun statut d'abonnement/modération ; l'utilisateur peut lui-même modifier `active` par l'API sous les politiques actuelles. |
| Modifier nom, ville, adresse, téléphone, accroche, description, latitude/longitude et enregistrer | I/P | Update direct ; paire GPS validée client et SQL. Pas de champs horaires ni d'identité visuelle complète ; gestion d'erreur générique. |
| « Utiliser ma position » | I/P | Géolocalisation du navigateur avec permission, puis saisie dans le formulaire ; nécessite enregistrement et confirmation que la position est bien celle du salon. |
| Ajouter photo, fichier JPEG/PNG/WebP ≤ 5 Mo ; légende au blur | I/P | Upload Storage puis insertion de métadonnées. Limite de six métadonnées ; type MIME déclaré et taille seulement, pas d'inspection réelle de contenu. Si l'insertion échoue, la suppression compensatoire de l'objet n'est pas contrôlée ; fichiers orphelins possibles. |
| Déplacer avant/après | I/P | Mises à jour successives non transactionnelles des positions ; erreur partielle possible. Pas de glisser-déposer ; contrôle des résultats concurrents absent. |
| Masquer / afficher et supprimer photo | I/P | Update métadonnée ou suppression après `confirm()` natif. URL du bucket public accessible si connue même masquée ; suppression des métadonnées puis du fichier non atomique, erreur signalée si fichier non supprimé. |
| Ajouter une prestation : nom, description, prix, durée | I/P | `bp_services.insert`, validation HTML et contraintes SQL ; aucune catégorie ni association à un salarié. |
| Modifier / enregistrer / annuler prestation ; masquer / activer | I/P | `update` et champ `active` ; pas de suppression logique indépendante ni distinction visibilité / réservable. Les mises à jour utilisent `.eq(id)` sans `select()`/nombre de lignes ; un résultat sans erreur ne prouve pas à lui seul qu'une ligne a changé. |
| Sélecteur d'action sur une réservation | I/P | Appelle la même RPC de statut que l'ERP ; pas de report ou gestion d'un collaborateur ; l'état après échec doit être testé. |
| Formulaires, boutons de soumission et chargement | P | Certains utilisent `busy`, d'autres non (`toggleService`, légende, visibilité) ; promesses réseau rejetées sans `try/finally` dans plusieurs chemins. Tester doubles clics et erreurs. |

### 4.4 Annuaire et fiche publique

| Élément / action attendue | État | Diagnostic / correction à étudier |
|---|---|---|
| Logo, « Les salons », « Explorer », liens professionnels et retour ERP (`/decouvrir`) | I/P | Navigation / ancre ; « Explorer » ne soumet pas une recherche serveur. Libellé retour « démo » erroné en mode connecté. |
| Recherche nom/ville/quartier | P | Filtre local sur 100 établissements au maximum ; pas de recherche de services, pagination ou filtrage serveur. |
| Carte salon → `/salons/[slug]` | I | Lien vers salon publié / actif ; validité, SEO et restrictions doivent être testées avec Supabase. |
| Lien Google Maps | I/P | Construit avec coordonnées numériques vérifiées ; absent si coordonnées non renseignées. Aucune carte embarquée ou validation géographique indépendante. |
| Boutons « Prendre rendez-vous », service → réserver, « Réserver ma prestation » | I/B | Ouvrent le formulaire ou le désactivent s'il n'y a pas de service actif ; pas de choix de coiffeur. |
| Formulaire public : service/date/créneau, nom/téléphone, consentement, envoyer | I/P | Disponibilités RPC puis insertion RPC ; désactivation pendant envoi. Consentement seulement case UI, pas d'enregistrement de version de politique ; rate limit/CAPTCHA absents ; absence de notification client. Aucune preuve d'exécution réelle. |
| Fermer modale / cliquer le fond / terminer après confirmation | I/P | Contrôle l'état local ; pas de démonstration de focus trap, touche Échap ou retour de focus. |
| Réinitialisation mot de passe, tri, pagination, filtres services/prix/disponibilité, avis, notifications | N | Aucune interaction correspondante ; à concevoir sans boutons décoratifs. |

## 5. Base de données prévue par les migrations du dépôt

**Important :** description du SQL versionné, pas du schéma réel du projet non confirmé. Trois fichiers (`001`, `002`, `003`) ; aucun fichier de migration ne doit être réécrit s'il a déjà été appliqué ailleurs.

### 5.1 Tables, relations et contraintes

```text
auth.users 1 ── 0..1 bp_salons (owner_id UNIQUE)
                      ├── N bp_services
                      ├── N bp_gallery ── path Storage
                      ├── N bp_bookings ── (service_id, salon_id) → bp_services
                      │       └── N bp_booking_events
                      └── N bp_booking_events
```

| Table | Clés / règles / suppressions / index |
|---|---|
| `bp_salons` | UUID PK, `owner_id` FK `auth.users` + unique, `slug` unique et format, nom/adresse/description bornés, `published`, `active`, GPS nullable par paire et borné (002). FK owner sans cascade explicite. `unique(owner_id)` interdit plusieurs établissements pour un propriétaire ; aucun membre ou rôle. |
| `bp_services` | UUID PK, FK salon `ON DELETE CASCADE`, unique `(id,salon_id)` pour la FK composite, prix entier ≥ 0, durée 15–240, `active`, index salon. Pas de catégorie, délai tampon ou affectation. Une réservation existante peut empêcher la suppression du service via FK. |
| `bp_gallery` | UUID PK, FK salon `ON DELETE CASCADE`, path unique, légende bornée, position et visibilité, index `(salon_id,position)`. Trigger 002 vise six éléments, y compris masqués ; besoin de tests concurrence et migration des données préexistantes. Les suppressions de lignes en cascade ne suppriment pas automatiquement les objets Storage. |
| `bp_bookings` | UUID PK ; FK salon ; FK composite `(service_id,salon_id)` ; nom/téléphone contrôlés ; début/fin, instantané nom/prix, statuts contrôlés, index `(salon_id,starts_at)`. Exclusion GiST sur intervalles `[)` pour un salon lorsque statut `pending` ou `confirmed`, pas par coiffeur. Suppressions non cascadées pour historique. |
| `bp_booking_events` | Identité PK ; FKs réservation/salon/acteur ; statut précédent/nouveau et date, index `(booking_id,created_at)`. Pas de FK composite imposant que le salon de l'événement corresponde à celui de la réservation ; trigger seul alimente normalement les lignes. Aucun événement rétroactif 003. |

### 5.2 RLS et privilèges prévus

| Objet | Politiques / permissions prévues | Risques et limites |
|---|---|---|
| `bp_salons` | RLS activée ; SELECT salon publié/actif ou propriétaire, insert/update/delete propriétaire `auth.uid()`, droits `anon`/`authenticated` révoqués puis réattribués. | SELECT de table et `select('*')` exposent toutes les colonnes des salons publics, notamment `owner_id` ; réduire la surface aux champs nécessaires après analyse de compatibilité. Le propriétaire peut modifier `active` directement, incompatible avec une future suspension imposée par la plateforme. Tests RLS et privilèges réels absents. |
| `bp_services` | SELECT propriétaire ou service actif d'un salon publié/actif ; ALL authentifié si propriétaire. | Pas de rôles gérant/caissier/barbier. `active` mélange disponibilité et visibilité ; tester directement avec anon et deux propriétaires. |
| `bp_gallery` | SELECT propriétaire ou visible d'un salon publié/actif ; ALL propriétaire, `WITH CHECK` sur préfixe `auth.uid()/salon_id/`. | Les métadonnées masquées ne rendent pas le fichier privé. Vérifier les droits réels et les accès indirects. |
| `bp_bookings` | SELECT authentifié propriétaire seulement ; pas d'insert/update direct accordé aux rôles applicatifs ; mutations par RPC `SECURITY DEFINER`. | Vérifier droits effectifs, fonctions accessibles et fuite inter-salons ; aucune RLS/test exécuté sur un projet initialisé. |
| `bp_booking_events` | SELECT propriétaire, écriture via trigger privilégié. | Absence de politiques d'administration/rôles et de tests de relation multi-salon ; conservation et accès à encadrer. |
| `storage.objects` / bucket `barberpro-gallery` | Bucket public, limite annoncée 5 Mo, MIME déclarés ; politiques insert/delete authentifié avec préfixe owner/salon. | Uploads directs possibles indépendamment du nombre de lignes `bp_gallery` : six métadonnées ne limitent pas nécessairement le nombre d'objets ou le coût Storage. Contrôle du contenu réel, quotas, fichiers orphelins et accès par URL à tester. `ON CONFLICT DO NOTHING` ne corrige pas une configuration antérieure du bucket. |

RLS est activée dans les fichiers, mais une analyse statique ne démontre pas une isolation effective : tester les droits hérités, la configuration des schémas et chaque rôle dans une base de test.

### 5.3 Fonctions / triggers privilégiés

| Fonction / trigger | Rôle et contrôle prévu | Limites |
|---|---|---|
| `bp_available_slots` | `SECURITY DEFINER`, publique, services actifs et salons publiés ; calcul des créneaux Abidjan | Horaires figés, pas d'employé/congé, fonction publique à protéger contre l'abus. |
| `bp_request_booking` | `SECURITY DEFINER`, anon/authenticated, validation nom/téléphone, service public et disponibilité ; exclusion en base | Aucune limitation de fréquence ou CAPTCHA ; réservation anonyme sans vérification du numéro ; message d'erreur générique ; tests atomiques/concurrence manquants. |
| `bp_change_booking_status` | `SECURITY DEFINER`, authenticated ; contrôle propriétaire, verrouillage de ligne et transitions | Pas de `in_progress`, reprogrammation ni autorisation par rôle ; pas de tests d'accès. |
| `bp_limit_gallery_to_six` / trigger | `SECURITY DEFINER`, verrou consultatif puis décompte | Tester réellement concurrence, isolation transactionnelle et données déjà au-delà de six. Ne limite pas les objets Storage non référencés. |
| `bp_record_booking_event` / trigger | `SECURITY DEFINER`, insertion d'événement à la création / changement de statut | Pas d'historique avant activation, ni journal général des prix/permissions/publications ou financières. |
| `bp_owner_available_slots` / `bp_create_counter_booking` | `SECURITY DEFINER`, authenticated, contrôle propriétaire ; créneaux non dépendants de publication | Un seul planning et uniquement créneaux futurs ; logique des disponibilités dupliquée avec RPC publique. Tester la cohérence et la concurrence. |
| `bp_owner_dashboard` | `SECURITY DEFINER`, authenticated, contrôle propriétaire ; compte des rendez-vous et services | Pas de recette. Fuseau figé ; pas de tests de précision / performance. |

Les fonctions déclarent un `search_path` (`public,extensions` ou `public,pg_temp`) et des révocations/grants ; vérifier néanmoins en base les privilèges réels, la possibilité de création dans les schémas et tous les chemins d'exécution. Le statut `completed` sort de la contrainte d'exclusion : si un rendez-vous futur est marqué terminé trop tôt, son créneau peut redevenir réservable ; reproduire et clarifier la règle métier. Un salon inactif peut être remis actif par son propriétaire avec les droits actuels ; aucune suspension SaaS robuste.

## 6. Sécurité, confidentialité et exploitation

### P0 — avant tout usage réel

1. **Base et autorisations non prouvées** : les migrations ne sont pas appliquées dans le projet homonyme observé et aucune RLS, aucun RPC, aucune isolation A/B ou course n'a été exécuté. Préparer un projet de test explicitement identifié et exclusivement fictif. Ne pas supposer que `barbershopmain` est un environnement de test.
2. **Abus réservation / Storage** : appels publics sans rate limiting applicatif, CAPTCHA, quota ou protection SMS/email ; objets publics uploadables hors quota de six métadonnées. Prévoir limitations serveur vérifiables, observabilité, coût, contrôles de type réel et nettoyage des objets orphelins.
3. **Vie privée** : téléphone/nom collectés, case de consentement non historisée, aucune politique/version, durée de conservation, export/suppression ou procédure de réponse identifiée. Le bucket public expose les fichiers par URL, même en brouillon/masqués ; ne pas y placer de données confidentielles.
4. **Architecture multi-tenant insuffisante** : salon propriétaire unique, absence de memberships/permissions, contrôle `owner_id` uniquement, impossibilité de prouver l'isolation de futurs modules financiers. Concevoir une transition additive avec migration des données et double compatibilité après état des lieux de l'environnement réel.
5. **Validation métier insuffisante** : planning figé à une seule ressource, exclusions et changements de statut à éprouver, aucun test de concurrence effectif. Ne pas communiquer de disponibilité professionnelle comme garantie tant que non validée.

### P1 — fiabilité / sécurité complémentaire

- Auth : aucune vérification effective de l'URL de redirection, inscription ouverte/fermée, SMTP, MFA, politique de mot de passe, expiration ou configuration d'un environnement identifié dans cette phase. Les formulaires ne proposent pas de récupération de mot de passe.
- `lib/supabase.ts` ne contient que les variables publiques ; aucune clé `service_role` repérée dans les fichiers suivis de la révision inspectée. `.gitignore` exclut `.env*` sauf exemple. Ceci n'établit pas l'absence de secrets dans l'historique complet, les environnements ou GitHub.
- Mutations de galerie non atomiques ; sorties asynchrones sans traitement global des exceptions, `getSession`/`signOut` sans erreur explicite, stockage local sans traitement quota, états obsolètes / courses de requêtes possibles. Reproduire avant correction.
- `bp_salons`/`bp_services` accordent DELETE aux propriétaires, alors que les dépendances et objets Storage peuvent bloquer ou laisser des éléments ; définir archivage et règles de rétention.
- Pas de protections métier financières, sauvegardes, restauration testée, monitoring, audit global ou CI identifiés. Ne pas ajouter de finance sans écritures atomiques et tests.
- Pas de pagination réelle et requêtes `select('*')`, chargement côté client, images brutes, absence de données structurées / métadonnées par salon : risque de performance, coût et référencement. Tester avant optimisation.
- CSS responsive présente ; pas d'audit WCAG, navigation clavier, focus trap/retour focus, messages d'erreur accessibles, taille tactile ou mode réduit. Certaines icônes/contrôles visuellement trompeurs en démo. Pas de test d'écran rétréci.

## 7. Tests et état du build initial

| Commande / vérification | Résultat réel |
|---|---|
| `npm ci --no-audit --no-fund` | Réussi ; 47 packages ajoutés (dépendances locales ignorées par Git). |
| `npm run test` | Réussi : 4 tests Node unitaires `tests/booking-domain.test.mjs` portant uniquement sur les transitions / étiquettes UI. Aucun test SQL, paiement, disponibilité, RLS, composant, API ou E2E. |
| `npm run lint` | Réussi ; ce script est en réalité `tsc --noEmit`, **pas ESLint**. Pas de script `typecheck` séparé. |
| `npm run build` | Réussi avec Next 16.4.3 ; `/`, `/_not-found`, `/decouvrir`, `/espace-vitrine` générés ; `/salons/[slug]` dynamique. Cela ne valide pas les RPC ni une base. |
| `npm audit --omit=dev --audit-level=high` puis `npm audit --json` | Aucun avis signalé par le registre lors de l'exécution ; résultat ponctuel, pas un audit de sécurité global. |
| `npm run dev` + `curl` | `/`, `/decouvrir`, `/espace-vitrine`, `/salons/salon-inexistant` : HTTP 200, sans variables Supabase. La dernière route n'a pas été validée comme 404 serveur. Pas de test navigateur ni connecté. Serveur arrêté ensuite. |
| `git status` après vérifications | `next-env.d.ts` a été modifié automatiquement par Next dev, puis ramené à sa version initiale propre ; aucune modification métier. `node_modules` et `.next` sont ignorés. |

Aucun script de test d'intégration ou E2E, ESLint, CI ou `typecheck` dédié n'a été trouvé. `docs/tests-integration.md` est une **liste de scénarios à exécuter**, pas une preuve de leur réussite.

## 8. Risques de régression et dépendances

- La sélection du mode dépend des variables publiques au build ; tester à la fois démo et connecté avant modification de l'entrée ou de l'authentification. Préserver la clé `localStorage` et ne pas migrer les données fictives implicitement.
- `ConnectedERP` et `VitrineManager` partagent directement les mêmes tables et se rafraîchissent via l'événement navigateur `barberpro-salon-changed` ; une extraction de services ou un changement de session doit préserver cet échange et les états après erreur.
- L'interface et PostgreSQL maintiennent séparément les transitions ; toute extension doit aligner `booking-domain.mjs`, les options des deux écrans, les RPC, l'audit et les tests.
- `bp_available_slots` et `bp_owner_available_slots` dupliquent horaires et règles. Changer l'un sans l'autre peut créer des écarts entre public et comptoir.
- Des prix et noms de prestations sont copiés dans les réservations : préserver ces instantanés lors des futures migrations / éditions ; ne pas assimiler une réservation à un paiement.
- `bp_salons.owner_id`, sa contrainte unique, les sélections `maybeSingle()`, les fonctions et toutes les politiques dépendent du propriétaire unique. Ajouter organisations/memberships exige un plan de migration, contrôle de données existantes et adaptation des appels, pas une suppression brutale.
- Galeries, buckets publics et ordre non transactionnel : tenir compte des objets déjà partagés et des données potentiellement masquées avant changement de stockage ou suppression.
- Les migrations peuvent avoir été appliquées à un autre projet que `barbershopmain` ; vérifier l'environnement réel et l'historique effectif avant tout fichier additionnel, sans modifier rétroactivement les migrations déjà utilisées.
- La CSS globale et les composants client sont volumineux et couplés ; toute extraction doit tester les routes, les deux modes et les tailles d'écran. Le fichier de cahier des charges comporte une recommandation Go obsolète par rapport à la décision actuelle Supabase ; ne pas introduire Go sans demande.

## 9. Plan d'évolution priorisé et critères de passage

**Préalable P0 (dépendance à réaliser dans la phase 1, avant ouverture réelle) :** confirmer quel projet Supabase est associé, identifier explicitement un environnement de test isolé et fictif, documenter les sauvegardes et établir des comptes A/B. N'appliquer aucune migration sur un projet non identifié. Une base de test et des tests d'isolation précèdent tout travail sur des données réelles ou la finance ; cette préparation de sécurité est une dépendance technique, pas un report de l'audit final de phase 10.

1. **Phase 1 — stabilisation** : après validation de cet audit, isoler progressivement les appels Supabase / validations et les états, sans changer les contrats ; traiter erreurs, races, déconnexion et faux contrôles. Tests des deux modes, composants essentiels et base de test ; `npm run test`, `npm run lint`, `npm run build` à chaque lot.
2. **Phase 2 — design system / accessibilité** : composants partagés incrémentaux, clavier, focus/modales, messages, mobile/tablette/desktop ; préserver vues et actions. Tests interactions et responsive documentés.
3. **Phase 3 — activité salon** : modèle additif des clients / employés et permissions, services, planning par coiffeur, réservations et passages ; définir d'abord organisation/memberships et compatibilité de `owner_id` comme prérequis, sans anticiper le moteur d'abonnements. Tester RLS, fuseaux, pauses et conflits simultanés.
4. **Phase 4 — caisse / finance** : définir règles comptables, devise, écritures immuables, droits, idempotence, transactions et corrections ; ensuite factures, paiements partiels, dépenses et commissions ; tests de montant et concurrence sur base isolée.
5. **Phase 5 — stock** : modèle de mouvements et inventaires audités, droits et seuils ; tests concurrence et cohérence des quantités.
6. **Phase 6 — rapports** : formules versionnées et sources partagées avec écritures, filtre période, exports autorisés ; tests de rapprochement et pas de chiffres fictifs connectés.
7. **Phase 7 — public** : pagination et recherche serveur, métadonnées/SEO, profils et médias réellement publics/privés selon contrat, visibilité séparée des services, gestion du cycle des fichiers ; tests de publication et parcours.
8. **Phase 8 — réservation avancée** : règles partagées public/comptoir, coiffeurs, disponibilités et historique, anti-abus, transitions et report ; tests simultanés réels et isolation avant commercialisation.
9. **Phase 9 — SaaS** : généraliser l'organisation et memberships préparés en phase 3, plusieurs salons, plans configurables/quotas, downgrade sans perte, administration et facturation uniquement avec intégration réelle ; tests de droits et limites.
10. **Phase 10 — sécurité** : revue complète Auth/RLS/Storage/RPC, tests effectifs inter-salons et régression, secrets, conservation, sauvegarde/restauration, supervision ; ne pas considérer cette revue tardive comme une dispense des contrôles continus.
11. **Phase 11 — E2E** : scénarios inscription, salon, client, réservation, paiement déclaré, isolation et commissions sur environnement isolé, mobile et desktop.
12. **Phase 12 — audit final des interactions** : reprendre chaque ligne de l'inventaire, prouver clic, validation, persistance, erreurs, droits et accessibilité ; laisser explicitement indisponible ce qui n'est pas livré.

**Critères à chaque phase :** modifications compatibles et justifiées, migrations additives documentées avec retour arrière lorsque possible, tests unitaires et d'intégration adaptés au risque, build et TypeScript réussis, audit des actions modifiées, état de validation clair. Si des tests essentiels nécessitent l'environnement isolé non disponible, marquer **bloqué / partiellement validé** et ne pas affirmer la mise en production prête.

## 10. Décision attendue

Valider ce diagnostic et choisir/confirmer un **projet Supabase de test isolé** avant les migrations et tests connectés. Ensuite seulement démarrer la phase 1, par petits lots, en restant sur la branche de session existante ; le nom de branche est imposé par l'environnement. Aucune autre phase n'a été commencée.
