import { supabase, FIXED_EMAIL } from './supabaseClient.js';
import { registerServiceWorker } from './pwa.js';

registerServiceWorker();

const SPINE_COLORS = ['#5a2a27', '#6b3a23', '#4a3624', '#3f4a3a', '#2d3b4a', '#5c3a4a', '#6b5a2e', '#3a2c20'];

function renderShelf(elId, count, offset, heightBase, heightStep, heightMod) {
  const el = document.getElementById(elId);
  let html = '';
  for (let i = 0; i < count; i++) {
    const height = heightBase + (i % heightMod) * heightStep;
    const color = SPINE_COLORS[(i + offset) % SPINE_COLORS.length];
    html += `<div class="book-spine" style="height:${height}px; background:${color};"></div>`;
  }
  el.innerHTML = html;
}

renderShelf('shelf-top', 28, 0, 40, 8, 5);
renderShelf('shelf-bottom', 28, 3, 40, 7, 6);

(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.href = 'dashboard.html';
  }
})();

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');
const loginBtn = document.getElementById('login-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';

  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({
    email: FIXED_EMAIL,
    password,
  });

  if (error) {
    errorMsg.textContent = 'Senha incorreta. Tente novamente.';
    errorMsg.classList.remove('hidden');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
    return;
  }

  window.location.href = 'dashboard.html';
});
