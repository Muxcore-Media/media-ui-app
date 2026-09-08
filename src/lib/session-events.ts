/** Subscribe to household session SSE (operator GET /events/streams via the BFF). */
export function watchSessionEvents(onEvent: () => void): () => void {
  if (typeof EventSource === 'undefined') return () => undefined;
  const source = new EventSource('/api/sessions/events');
  const notify = () => onEvent();
  source.addEventListener('session', notify);
  source.addEventListener('connected', notify);
  source.onmessage = notify;
  return () => source.close();
}
