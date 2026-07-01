import { login, register, isLoggedIn } from './apiClient.js';
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

if (isLoggedIn()) {
  window.location.href = 'dashboard.html';
}

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');

function showError(msg) {
  successMsg.classList.add('hidden');
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function showSuccess(msg) {
  errorMsg.classList.add('hidden');
  successMsg.textContent = msg;
  successMsg.classList.remove('hidden');
}

function clearMessages() {
  errorMsg.classList.add('hidden');
  successMsg.classList.add('hidden');
}

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  clearMessages();
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  clearMessages();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('password').value;

  try {
    await login(email, password);
  } catch (err) {
    showError('E-mail ou senha incorretos. Tente novamente.');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
    return;
  }

  window.location.href = 'dashboard.html';
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();

  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;

  if (password.length < 6) {
    showError('A senha deve ter pelo menos 6 caracteres.');
    return;
  }
  if (password !== passwordConfirm) {
    showError('As senhas não coincidem.');
    return;
  }

  registerBtn.disabled = true;
  registerBtn.textContent = 'Criando conta...';

  try {
    await register(email, password);
  } catch (err) {
    showError(err.message || 'Não foi possível criar a conta.');
    registerBtn.disabled = false;
    registerBtn.textContent = 'Criar conta';
    return;
  }

  registerBtn.disabled = false;
  registerBtn.textContent = 'Criar conta';
  registerForm.reset();

  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  showSuccess('Conta criada com sucesso! Faça login para continuar.');
  document.getElementById('login-email').value = email;
  document.getElementById('password').focus();
});
