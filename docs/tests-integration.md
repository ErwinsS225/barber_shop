# Vérifications à exécuter sur un projet Supabase de test

Ces scénarios ne sont **pas encore exécutés** dans cette session. Appliquer les migrations 001, 002 et 003 dans un projet isolé, configurer Auth et créer deux comptes distincts A et B avec leurs salons. Utiliser uniquement des données fictives.

1. Créer un service et publier le salon A depuis l'ERP. Vérifier que `/decouvrir` et `/salons/<slug>` affichent les informations, photos et prix enregistrés, puis que le retrait de publication les masque.
2. Envoyer une demande publique. Vérifier qu'elle apparaît en attente dans l'ERP du salon A, jamais chez B, puis confirmer et terminer ; vérifier l'historique et le dashboard. Une réservation ne doit créer aucun paiement ou revenu.
3. Créer au comptoir un rendez-vous futur dans l'ERP A, y compris lorsque sa vitrine est en brouillon. Vérifier que le créneau est occupé dans l'ERP et, si publié, sur le site public.
4. Lancer deux requêtes concurrentes sur des créneaux qui se chevauchent pour le même salon : une seule doit réussir. Vérifier également les durées différentes et les créneaux adjacents.
5. Tester sans session et avec B la lecture, l'écriture et les fonctions RPC sur les réservations et événements de A. Aucun accès privé ne doit réussir. Tester également les transitions non autorisées et les requêtes forgées.
6. Ajouter six photos, puis tenter deux ajouts concurrents : jamais plus de six métadonnées ne doivent être enregistrées. Contrôler les fichiers orphelins après erreur. Les URL de stockage restent publiques même pour des images masquées.
7. Vérifier les limites de dates, dimanche, 9h–19h, positions GPS valides et invalides, téléphone, absence de service et suppression de données fictives.
8. Avant ouverture réelle : limiter les abus, tester la restauration des sauvegardes, l'accessibilité, les politiques de confidentialité et de rétention, et mettre en place supervision et alertes.
