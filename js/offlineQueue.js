const CACHE_KEY = 'biblioteca-cache-fichas';
const QUEUE_KEY = 'biblioteca-offline-queue';

export function cacheFichas(fichas) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(fichas));
  } catch (e) {
    // armazenamento indisponível ou cheio — ignora silenciosamente
  }
}

export function getCachedFichas() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function setQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueDelete(fichaId) {
  const queue = getQueue();
  queue.push({ type: 'delete', fichaId, timestamp: Date.now() });
  setQueue(queue);
}

export function getQueueSize() {
  return getQueue().length;
}

export async function flushQueue(supabase) {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining = [];
  let synced = 0;

  for (const op of queue) {
    try {
      if (op.type === 'delete') {
        const { error } = await supabase.from('fichas').delete().eq('id', op.fichaId);
        if (error) throw error;
        synced++;
      }
    } catch (err) {
      remaining.push(op);
    }
  }

  setQueue(remaining);
  return { synced, remaining: remaining.length };
}
