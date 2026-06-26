import { supabase } from './supabaseClient.js';

export async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return null;
  }
  return data.session;
}

export function bindLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });
}

export function starsDisplay(rating) {
  const r = Math.max(0, Math.min(5, rating || 0));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

export function initOfflineBanner(onReconnect) {
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.className = 'offline-banner hidden';
  document.body.prepend(banner);

  function render() {
    if (!navigator.onLine) {
      banner.textContent = '📡 Você está offline — exibindo dados salvos. Alterações serão sincronizadas quando a conexão voltar.';
      banner.classList.remove('hidden', 'offline-banner-success');
      banner.classList.add('offline-banner-warning');
    } else {
      banner.classList.add('hidden');
    }
  }

  window.addEventListener('offline', render);
  window.addEventListener('online', async () => {
    render();
    if (onReconnect) {
      const result = await onReconnect();
      if (result && result.synced > 0) {
        banner.textContent = `✅ Conexão restabelecida — ${result.synced} alteração(ões) sincronizada(s).`;
        banner.classList.remove('hidden', 'offline-banner-warning');
        banner.classList.add('offline-banner-success');
        setTimeout(() => banner.classList.add('hidden'), 4000);
      }
    }
  });

  render();
}
