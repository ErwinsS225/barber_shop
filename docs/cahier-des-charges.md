# BARBERPRO — Cahier des charges fonctionnel et technique

**Version :** 1.0 — **Date :** 2 novembre 2026

**Produit :** plateforme SaaS multi-salons de coiffure masculine / barber shops

**Marché de lancement envisagé :** Côte d’Ivoire, avec extension possible à d’autres pays.

---

## 1. Vision du produit

BARBERPRO est une plateforme SaaS qui permet à chaque barber shop de piloter son activité depuis un espace privé, tout en disposant d’une page publique professionnelle sur laquelle les clients peuvent découvrir le salon, parcourir ses photos, consulter ses prestations et demander un rendez-vous.

Le produit comporte deux expériences complémentaires :

1. **Espace de gestion privé** : réservé au propriétaire et aux collaborateurs autorisés. Il couvre le planning, les réservations, les clients, le catalogue de prestations, l’équipe salariée, la caisse, les dépenses, les stocks, les rapports et la page publique du salon.
2. **Vitrine publique / annuaire** : accessible sans compte client. Elle présente les salons inscrits et publiés, permet de rechercher un établissement, de consulter sa galerie et ses tarifs, puis de soumettre une réservation.

BARBERPRO est multi-tenant dès sa conception : les données d’un salon ne doivent jamais être visibles ou modifiables par un autre salon. Une même entreprise pourra ultérieurement gérer plusieurs établissements sous un même compte propriétaire.

## 2. Objectifs métier

- Digitaliser les opérations quotidiennes d’un barber shop.
- Augmenter les réservations grâce à une vitrine publique consultable sur ordinateur et mobile.
- Réduire les oublis, doubles réservations et conflits de planning.
- Centraliser les recettes, les paiements, les dépenses et les clôtures de caisse.
- Suivre les salariés, leurs présences, leurs prestations et leurs primes variables éventuelles.
- Mesurer la performance du salon, des prestations et de l’équipe.
- Donner à chaque établissement une présence numérique soignée sans devoir créer son propre site.
- Fournir à l’éditeur SaaS des outils d’administration, d’abonnement et de supervision.

## 3. Périmètre fonctionnel

### 3.1 Modules de l’espace privé

| Module | Fonctions attendues |
|---|---|
| Dashboard | Indicateurs du jour, évolution du chiffre d’affaires, rendez-vous à venir, activité de l’équipe, dernières transactions, alertes. |
| Planning | Vues jour/semaine, filtres par barbier, horaires de travail, pauses, congés, indisponibilités et blocage de créneaux. |
| Réservations | Création au comptoir ou depuis la vitrine, confirmation, report, annulation, arrivée, prestation en cours, clôture et absence. |
| Clients | Fiche client, téléphone, email facultatif, historique, préférences, notes non sensibles et fréquence de visite. |
| Prestations | Catégories, nom, description, prix en FCFA, durée, temps tampon, visibilité publique et activation/désactivation. |
| Équipe | Fiches des salariés, fonctions, statut, horaires, affectation aux prestations, congés et suivi de performance. |
| Caisse & paiements | Encaissements, paiements partiels, moyens de paiement, remboursements tracés, ouverture/clôture de caisse et historique. |
| Dépenses | Catégories, montant, date, justificatif facultatif, auteur et validation selon le rôle. |
| Salaires & primes | Suivi des salaires fixes, avances et primes variables. Les primes/commissions sont séparées du salaire fixe et configurables par l’employeur. |
| Produits & stock | Produits de revente et consommables, entrées/sorties, seuils d’alerte, ajustements et inventaires. |
| Rapports | Caisse, revenus, dépenses, résultat opérationnel, prestations, clients, performance des salariés, stock et primes. |
| Vitrine publique | Profil public, URL, description, coordonnées publiées, horaires, catalogue visible, galerie, politique de réservation et statut de publication. |
| Paramètres | Informations de l’entreprise, établissements, rôles, permissions, préférences de réservation, moyens de paiement et abonnement. |

### 3.2 Annuaire public et page vitrine des salons

L’annuaire BARBERPRO est un site public responsive. Seuls les salons actifs, autorisés et dont la vitrine est publiée apparaissent dans les résultats.

**Page d’accueil / annuaire :**
- Présentation de BARBERPRO et moteur de recherche.
- Recherche par nom du salon, ville/quartier et prestation.
- Filtres : ville, type de service, gamme de prix, disponibilité et options configurées.
- Cartes des salons avec image de couverture, nom, localisation, note si un système d’avis vérifiés est activé, prestations phares et prix de départ.
- Tri par pertinence, proximité lorsque la localisation est autorisée, popularité ou disponibilité.
- Pagination ou chargement progressif.

**Page détaillée d’un salon :**
- URL publique stable, par exemple `/salons/gentlemans-house`.
- Nom, logo, photo de couverture, description, adresse/quartier, téléphone public si autorisé, horaires et liens sociaux.
- Galerie d’images : intérieur, postes de coupe, réalisations et prestations. L’administrateur du salon peut ajouter, réordonner, légender, masquer ou supprimer les images.
- Catalogue des prestations avec descriptions, durées et tarifs.
- Présentation des barbiers si le salon choisit de les rendre publics.
- Bouton de réservation principal et informations de contact.
- Avis clients uniquement dans une phase dédiée, avec modération et mécanisme empêchant les faux avis.

**Gestion des médias :**
- Téléversement depuis téléphone ou ordinateur.
- Formats acceptés : JPEG, PNG et WebP ; taille maximale configurable ; compression et génération de miniatures.
- Contrôle du type réel de fichier, nom de fichier non exécutable, protection contre les téléversements abusifs.
- Galerie triable par glisser-déposer ; image de couverture sélectionnable.
- Consentement et droits à l’image à la charge du salon ; mécanisme de signalement/modération côté plateforme.

### 3.3 Parcours de réservation client

1. Le visiteur ouvre l’annuaire ou un lien direct du salon.
2. Il choisit une prestation et, facultativement, un barbier.
3. Le système affiche uniquement les créneaux compatibles avec la durée du service, les horaires, les pauses, les congés et les réservations existantes.
4. Le visiteur choisit une date et une heure.
5. Il renseigne son nom et un numéro de téléphone ; l’email reste facultatif sauf choix du salon.
6. Il accepte la politique de réservation et transmet sa demande.
7. Le système crée une réservation avec un numéro de référence et un statut initial déterminé par la configuration du salon : `pending` (validation manuelle) ou `confirmed` (confirmation automatique).
8. Le client voit un écran de confirmation. Le salon retrouve la demande dans son espace privé.
9. Le salon peut confirmer, refuser, proposer un autre créneau, reprogrammer ou annuler. Les changements sont historisés.

**Règles anti-conflit :** le serveur est la source de vérité des disponibilités. Le contrôle final du créneau se fait dans une transaction de base de données. Deux requêtes concurrentes ne peuvent pas confirmer le même créneau pour un même barbier. Les créneaux temporaires de sélection, s’ils sont introduits, expirent automatiquement.

**Statuts de réservation recommandés :** `pending`, `confirmed`, `checked_in`, `in_progress`, `completed`, `cancelled`, `rejected`, `no_show`. Les transitions autorisées sont validées côté serveur et auditées.

**Réservations sans rendez-vous :** un collaborateur peut créer une réservation immédiate ou une visite spontanée depuis le comptoir, sans passer par le site public.

### 3.4 Gestion des salariés

Le modèle retenu est celui de barbiers **employés salariés**. Le salaire fixe est géré séparément des primes de performance. Si le propriétaire souhaite motiver l’équipe, il peut activer une prime ou commission variable par prestation, objectif ou période. Cette prime ne doit pas être présentée comme le salaire principal ni calculée sans règle explicitement configurée.

Données utiles : identité, téléphone professionnel, date d’embauche, rôle, statut actif/inactif, horaires, prestations maîtrisées, congés, rémunération fixe et règle de prime facultative. L’accès aux données salariales est limité au propriétaire et aux rôles financiers autorisés.

### 3.5 Caisse et gestion financière

- Modes de paiement configurables : espèces, Wave, Orange Money, MTN MoMo, Moov Money, carte, virement et autre.
- Paiement total ou partiel ; plusieurs moyens de paiement pour une même facture si activé.
- Chaque encaissement est associé à une facture/prestation et à un utilisateur.
- Une réservation seule n’est pas considérée comme un revenu encaissé.
- Les annulations, remises et remboursements doivent laisser une trace et nécessiter les permissions adaptées.
- Ouverture et clôture de caisse par session ; rapprochement entre montant théorique et comptage réel.
- Dépenses classées : fournitures, loyer, eau/électricité, entretien, transport, salaires, primes, marketing et autres catégories personnalisables.
- Rapports distinguant chiffre d’affaires réalisé, encaissements, dépenses et résultat opérationnel. Ne pas confondre trésorerie et bénéfice comptable.

### 3.6 Abonnements SaaS et administration de la plateforme

Le moteur de plans doit être configurable depuis le back-office. Les plans, prix, quotas, fonctionnalités, périodes d’essai et règles de dépassement ne sont pas figés dans le code.

- Inscription d’un propriétaire et création du tenant.
- Essai gratuit configurable.
- Choix ou changement de plan avec historique.
- Statuts : essai, actif, paiement en attente, suspendu, résilié ou expiré.
- En cas de dépassement ou de downgrade, conserver les données ; bloquer uniquement les nouvelles actions dépassant les limites prévues, sans supprimer l’historique.
- Administration plateforme : salons, utilisateurs, abonnements, paiements SaaS, signalements, activation/désactivation et journal d’audit.

## 4. Profils, rôles et permissions

| Rôle | Accès principal |
|---|---|
| Super-administrateur BARBERPRO | Gestion globale de la plateforme, tenants, plans, abonnements, support et audits. |
| Propriétaire du salon | Accès complet au tenant, données financières, équipe, vitrine, abonnements et paramètres. |
| Gérant | Opérations du salon, planning, équipe et rapports autorisés ; accès financier configurable. |
| Réceptionniste / caissier | Clients, réservations, planning, encaissements et tickets selon permissions. |
| Barbier salarié | Son planning, ses rendez-vous, statut des prestations et historique professionnel limité. Pas d’accès global aux salaires, aux dépenses ni aux autres données confidentielles. |
| Visiteur public | Consultation des salons publiés et création d’une demande de réservation. |

Toutes les vérifications de permissions doivent être effectuées côté API, pas uniquement en masquant les boutons dans l’interface.

## 5. Conception détaillée du Dashboard

### 5.1 Objectif de l’écran

En moins de dix secondes, le propriétaire ou le gérant doit pouvoir comprendre : combien le salon a encaissé, combien de clients sont attendus, l’état du planning, l’activité des barbiers et les actions qui demandent une attention.

### 5.2 Structure de page

**A. Barre latérale gauche**
- Logo BARBERPRO et nom du produit.
- Sélecteur d’établissement si le tenant possède plusieurs salons.
- Navigation : Vue d’ensemble, Planning, Réservations, Clients, Prestations, Équipe, Caisse & finances, Produits & stock, Vitrine publique, Rapports et Paramètres.
- En bas : établissement actif, profil utilisateur et déconnexion.
- Sur mobile : navigation compacte ou menu latéral repliable.

**B. Barre supérieure**
- Fil d’Ariane et titre de page.
- Période sélectionnée et raccourci de filtre.
- Centre de notifications.
- Bouton primaire « Nouvelle réservation ».
- Raccourci « Voir la vitrine ».

**C. En-tête du contenu**
- Salutation contextualisée et date locale du salon.
- Titre « Vue d’ensemble ».
- Sous-titre court : activité et priorités du jour.
- Filtres : Aujourd’hui, 7 jours, 30 jours, période personnalisée.

**D. Cartes KPI**
1. **Chiffre d’affaires encaissé** : somme des paiements validés dans la période, hors réservations non payées ; comparaison avec la période précédente.
2. **Réservations** : nombre total avec ventilation par statut (à confirmer, confirmées, terminées, annulées).
3. **Clients reçus** : clients ayant une prestation effectivement commencée ou terminée selon la règle choisie.
4. **Dépenses** : dépenses validées sur la période ; afficher le résultat opérationnel estimé lorsque les données sont disponibles.

Chaque carte indique sa période, son unité et la règle de calcul dans une aide contextuelle. Les montants sont affichés en FCFA pour le tenant ivoirien, avec devise paramétrable ultérieurement.

**E. Zone analytique principale**
- Graphique d’évolution des encaissements par jour/semaine/mois.
- Courbe ou barre secondaire facultative pour les dépenses.
- Légende explicite ; données filtrées selon la période et l’établissement.
- Un clic sur un point ouvre le détail de la journée.

**F. Colonne opérationnelle**
- « Prochains rendez-vous » : heure, client, service, barbier et statut ; accès à la fiche.
- « Activité de l’équipe » : prestations réalisées, taux d’occupation estimé et charge par barbier.
- Alertes : réservation en attente, stock sous le seuil, caisse non clôturée, abonnement à renouveler, vitrine incomplète.

**G. Tableau des dernières transactions**
- Client, prestation, collaborateur, moyen de paiement, date/heure, montant, statut.
- Accès au détail de la facture et à la fiche client.
- Export selon permissions.

### 5.3 Principes d’interface

- Style premium, épuré, professionnel : fond ivoire/gris très clair, sidebar charbon, accents champagne/doré utilisés avec retenue.
- Typographie lisible ; grands chiffres pour les indicateurs ; textes secondaires discrets mais contrastés.
- Cartes avec bordures fines, rayons cohérents et ombres légères.
- Mise en page responsive : 4 KPI sur grand écran, 2 sur tablette, 1 ou 2 sur téléphone ; graphiques adaptés ; tables transformées en listes/cartes sur petit écran.
- États obligatoires : chargement, vide, erreur, absence de permission et données indisponibles.
- Les données du dashboard sont calculées par l’API ; le frontend ne doit pas inventer ou recalculer des agrégats financiers sensibles.

### 5.4 Sources de données du Dashboard

| Indicateur | Source logique | Règle essentielle |
|---|---|---|
| CA encaissé | Paiements validés | Somme des paiements affectés aux factures sur la période. |
| Dépenses | Dépenses validées | Ne pas inclure les brouillons ou opérations rejetées. |
| Clients reçus | Rendez-vous / prestations | Compter les visites effectuées, pas les demandes en attente. |
| Rendez-vous | Réservations | Ventiler les statuts et éviter de compter deux fois une reprogrammation. |
| Occupation barbier | Disponibilités + réservations | Calculer sur les plages de travail réelles, pauses exclues. |
| Primes | Règles de primes + prestations éligibles | Afficher distinctement du salaire fixe et des paiements clients. |

## 6. Modèle de données indicatif

Les entités principales :

- `tenants` : entreprise propriétaire des données.
- `locations` : établissements physiques associés au tenant.
- `users`, `roles`, `permissions`, `user_location_memberships`.
- `subscriptions`, `plans`, `plan_features`, `subscription_events`, `saas_payments`.
- `salon_profiles`, `public_pages`, `media_assets`, `gallery_items`.
- `services`, `service_categories`, `barber_services`.
- `employees`, `employee_schedules`, `employee_time_off`, `bonus_rules`.
- `clients`, `bookings`, `booking_events`, `availability_blocks`.
- `invoices`, `invoice_lines`, `payments`, `refunds`, `cash_sessions`.
- `expenses`, `expense_categories`, `salary_records`, `bonus_records`.
- `products`, `stock_movements`, `stock_counts`.
- `audit_logs`, `notifications`.

Chaque table métier appartenant à un salon ou établissement porte un identifiant de tenant et, lorsque nécessaire, un identifiant d’établissement. Les clés étrangères et les requêtes doivent empêcher toute relation inter-tenant. Des contraintes et tests automatisés doivent vérifier cette isolation.

## 7. Architecture technique recommandée

- **Frontend :** Next.js App Router, React, TypeScript, Tailwind CSS et composants accessibles.
- **Backend :** API REST en Go, organisée par domaines métier, validation serveur et middleware d’authentification/autorisation.
- **Base de données :** PostgreSQL ; accès Go via `pgx` et requêtes générées/organisées avec `sqlc`.
- **Médias :** stockage objet compatible S3 en production ; stockage local pour le développement. Les images sont servies via des URLs dédiées et des miniatures.
- **Authentification :** sessions sécurisées ou jetons courts avec renouvellement sécurisé ; vérification stricte du tenant et du rôle sur chaque requête.
- **Application :** responsive et installable en PWA. L’architecture peut prévoir une file locale pour certaines actions non critiques, mais le contrôle des créneaux et l’encaissement doivent être validés côté serveur.
- **Déploiement :** environnements séparés développement, test et production ; migrations versionnées ; sauvegardes PostgreSQL ; journalisation et monitoring.

Organisation indicative du dépôt :

```text
barberpro/
  apps/
    web/                 # Next.js : back-office + site public
  services/
    api/                 # API Go
  db/
    migrations/          # migrations PostgreSQL
    queries/             # requêtes sqlc
  docs/
    architecture.md
    api-contracts.md
    acceptance-tests.md
```

## 8. Exigences non fonctionnelles et sécurité

- Isolation multi-tenant stricte, testée automatiquement.
- Contrôle d’accès par rôle côté serveur.
- Mots de passe hachés avec un algorithme robuste ; cookies sécurisés ; protections CSRF/XSS/SQL injection ; limitation de débit des formulaires publics.
- Validation stricte des entrées, des montants, des dates, des téléphones et des médias.
- Journal d’audit pour opérations sensibles : modification de prix, remboursement, suppression logique, accès aux données financières et changements de permissions.
- Suppression logique lorsque la conservation d’historique est nécessaire ; politique de rétention documentée.
- Sauvegardes et procédure de restauration testée.
- Données personnelles minimisées : ne collecter que ce qui sert à la réservation et à la relation client ; définir une durée de conservation et une politique de confidentialité.
- Accessibilité : contrastes, navigation clavier, libellés de champs, retours d’erreur explicites.
- Performance : pagination, index adaptés, images responsives et chargement différé des galeries.

## 9. Exigences de qualité et critères d’acceptation

### A. Multi-tenant
- Un utilisateur du salon A ne peut lire, modifier, supprimer ou exporter aucune donnée du salon B, même en modifiant un identifiant dans l’URL ou le corps de la requête.
- Les tâches d’arrière-plan et exports respectent également le tenant.

### B. Vitrine
- Un salon non publié n’apparaît pas dans l’annuaire.
- Le propriétaire peut modifier le nom, la description, les horaires, les coordonnées publiques, les tarifs et la galerie.
- Une photo ajoutée peut être définie comme couverture, réordonnée, masquée ou supprimée.
- La vitrine est utilisable sur mobile et dispose d’une URL partageable.

### C. Réservation
- Un visiteur peut choisir un service, une date, un créneau et communiquer son nom et son téléphone.
- Le système refuse un créneau hors horaires, pendant une pause ou déjà occupé.
- Deux demandes simultanées ne peuvent pas être confirmées sur le même créneau/barbier.
- Le salon voit la nouvelle demande et peut confirmer, refuser ou reprogrammer ; chaque changement est historisé.
- Une réservation publique ne crée pas automatiquement un encaissement.

### D. Caisse
- Une prestation terminée peut être facturée et payée en espèces ou mobile money.
- Un paiement partiel conserve le solde dû.
- Un remboursement est tracé et ne supprime pas le paiement original.
- Les totaux du dashboard correspondent aux paiements validés et aux dépenses validées.

### E. Salariés
- Les barbiers ont un planning et des permissions limitées.
- Le salaire fixe est séparé des primes variables.
- Un collaborateur ne peut consulter les données salariales des autres sans permission explicite.

### F. Interface
- Chaque action visible a un comportement réel : validation, navigation, enregistrement, erreur ou état désactivé clairement expliqué.
- Aucun bouton décoratif ne doit donner l’impression d’effectuer une opération alors qu’il ne fait rien.
- Les formulaires empêchent les doubles soumissions et affichent des messages de succès/erreur exploitables.

## 10. Découpage de réalisation recommandé

**Phase 1 — Fondations SaaS** : authentification, tenant, établissement, rôles, onboarding, configuration de base et structure PostgreSQL.

**Phase 2 — Exploitation du salon** : catalogue, salariés, horaires, clients, planning, réservations au comptoir et prestations réalisées.

**Phase 3 — Caisse et gestion** : factures, paiements, dépenses, clôture, salaires, primes et rapports initiaux.

**Phase 4 — Site public** : annuaire, profil salon, galerie, catalogue public, moteur de recherche et réservation en ligne.

**Phase 5 — Administration SaaS** : plans configurables, essais, paiements d’abonnement, limitations fonctionnelles et back-office plateforme.

**Phase 6 — Stabilisation** : tests multi-tenant, sécurité, tests de concurrence des créneaux, sauvegardes, performance, accessibilité et déploiement.

## 11. Décisions à conserver comme règles de produit

- Le produit est SaaS multi-tenant dès la première migration de base de données.
- Les clients peuvent réserver sans créer de compte dans la première version ; le téléphone est obligatoire pour le suivi.
- Le salon choisit la confirmation manuelle ou automatique des demandes.
- Les barbiers sont des salariés ; les primes variables sont facultatives et séparées du salaire fixe.
- La vitrine publique et le back-office partagent le même catalogue de prestations, mais le salon décide ce qui est visible publiquement.
- Les disponibilités et conflits de réservation sont contrôlés par le backend.
- Les données de démonstration d’un prototype ne constituent pas des données réelles ni une connexion backend.

---

## 12. Prototype initial

Le fichier `barberpro_prototype.html` illustre :
- le Dashboard avec indicateurs, graphique, rendez-vous, activité de l’équipe et transactions ;
- la navigation entre les principaux modules ;
- l’annuaire public des salons ;
- une page détaillée de salon avec galerie et tarifs ;
- un parcours de demande de réservation en trois étapes ;
- l’enregistrement local des demandes dans le navigateur pour la démonstration.

Ce prototype est une maquette frontend autonome. Il ne contient pas encore de serveur, de vraie base de données, de compte utilisateur, de paiement ni de confirmation SMS/WhatsApp. Ces éléments seront intégrés dans les phases de réalisation ci-dessus.
