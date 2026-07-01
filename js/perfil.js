import { fetchMe } from './apiClient.js';
import { requireSession, bindLogout } from './common.js?v=2';
import { renderSidebar } from './appShell.js';

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `Conta criada em ${d.toLocaleDateString('pt-BR')}`;
}

(async () => {
  const session = await requireSession();
  if (!session) return;

  renderSidebar('');
  bindLogout();

  try {
    const me = await fetchMe();
    document.getElementById('perfil-email').textContent = me.email;
    document.getElementById('perfil-criado').textContent = formatDateTime(me.criado_em);
  } catch (e) {
    document.getElementById('perfil-email').textContent = session.email || '';
  }
})();
