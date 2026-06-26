# Biblioteca Pessoal — Fichas de Leitura (versão estática + Supabase)

Site 100% estático (HTML/CSS/JS puro, sem servidor próprio) para registrar fichas de leitura, hospedado no GitHub Pages. Os dados ficam no [Supabase](https://supabase.com) (Postgres + Auth + Storage).

## Como funciona

- **Hospedagem do site**: GitHub Pages (estático, gratuito)
- **Banco de dados**: tabela `fichas` no Postgres do Supabase, protegida por Row Level Security (cada usuário só vê suas próprias fichas)
- **Login**: você digita uma senha única; por trás, ela autentica uma conta fixa (`leitor@biblioteca.app`) via Supabase Auth — assim a senha nunca fica exposta no código, e a sessão é validada de verdade pelo servidor do Supabase
- **Capas dos livros**: enviadas para um bucket do Supabase Storage
- **PDF**: gerado inteiramente no navegador com [jsPDF](https://github.com/parallax/jsPDF), sem precisar de backend

## Projeto Supabase

- URL: `https://txmjtcnbmufnimjkqxcb.supabase.co`
- A chave pública (`anon key`) já está em `js/supabaseClient.js` — isso é esperado e seguro: ela só permite o que as políticas de RLS autorizam, nunca dados de outros usuários.

### Trocar a senha de acesso

A senha de login é a senha da conta `leitor@biblioteca.app` no Supabase Auth. Para trocar:

1. Acesse o [painel do Supabase](https://supabase.com/dashboard/project/txmjtcnbmufnimjkqxcb/auth/users)
2. Clique no usuário `leitor@biblioteca.app`
3. Use a opção de redefinir senha

## Rodar localmente

Qualquer servidor estático funciona, por exemplo:

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Depois abra `http://localhost:8080/index.html`.

## Publicar no GitHub Pages

1. Faça push deste repositório para o GitHub
2. Vá em **Settings → Pages**
3. Em "Source", selecione a branch `main` e a pasta `/ (root)`
4. Salve — o site fica disponível em `https://<seu-usuario>.github.io/<nome-do-repo>/`

## Estrutura

```
index.html          # tela de login
dashboard.html       # estante / lista de fichas
ficha-form.html      # criar/editar ficha
ficha-view.html      # ver ficha + exportar PDF
css/style.css        # tema visual de biblioteca
js/supabaseClient.js # configuração do Supabase
js/common.js         # utilitários compartilhados (auth guard, logout)
js/login.js          # lógica do login
js/dashboard.js      # lógica da estante
js/ficha-form.js     # lógica do formulário (com upload de capa)
js/ficha-view.js      # lógica da visualização + geração de PDF
```
