/** Statuts affichés côté interface ; la base valide indépendamment les transitions. */
/** @type {Readonly<Record<string, string>>} */
export const statusLabels = Object.freeze({
  pending: 'À confirmer', confirmed: 'Confirmée', completed: 'Terminée',
  cancelled: 'Annulée', rejected: 'Refusée', no_show: 'Absent',
});
const transitions = Object.freeze({
  pending: Object.freeze(['confirmed', 'rejected', 'cancelled']),
  confirmed: Object.freeze(['completed', 'cancelled', 'no_show']),
});
/** @param {string} status @returns {readonly string[]} */
export function allowedTransitions(status) { return transitions[status] || []; }
