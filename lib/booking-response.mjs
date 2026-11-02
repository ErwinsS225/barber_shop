/**
 * A failed connection or server response cannot establish whether a booking
 * transaction committed. Only a UUID response proves success to this client.
 * @param {{data: unknown, error: unknown, status: number}} response
 * @returns {'confirmed' | 'rejected' | 'uncertain'}
 */
export function classifyBookingResponse({data, error, status}) {
  if (!error) return typeof data === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data) ? 'confirmed' : 'uncertain';
  return status >= 400 && status < 500 && status !== 408 && status !== 499 ? 'rejected' : 'uncertain';
}
