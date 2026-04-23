# 🎪 Balaio Alamedas 2026

Sistema de gestão e transparência para o Balaio Junino do Condomínio Alamedas Jardins

---

## 📁 Estrutura de Arquivos

```
balaio-alamedas/
│
├── frontend/
│   └── index.html          ← Site público (Cloudflare Pages)
│
├── worker/
│   ├── worker.js           ← API backend (Cloudflare Workers)
│   ├── wrangler.toml       ← Configuração do Worker
│   └── package.json        ← Dependências (neon serverless)
│
└── database/
    └── schema.sql          ← Tabelas e dados iniciais (Neon)
```

---

## 🚀 Deploy: Passo a Passo

### 1. Banco de Dados (Neon.tech)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta gratuita
2. Crie um novo **Project** (ex: `balaio-alamedas`)
3. Na aba **SQL Editor**, cole e execute o conteúdo de `schema.sql`
4. Copie a **Connection String** (formato `postgresql://user:pass@host/db?sslmode=require`)

---

### 2. Backend (Cloudflare Workers)

**Pré-requisitos:** Node.js 18+ instalado

```bash
# Entre na pasta do worker
cd worker/

# Instale as dependencias
npm install

# Faca login na Cloudflare
npx wrangler login

# Configure os secrets (digitados de forma segura, nunca ficam no codigo):
npx wrangler secret put ADMIN_PASSWORD   # senha do painel admin
npx wrangler secret put DATABASE_URL     # connection string do Neon
npx wrangler secret put PIX_KEY          # sua chave PIX

# Deploy do worker
npm run deploy
```

> **Seguranca da senha**: a `ADMIN_PASSWORD` fica apenas no servidor Cloudflare.
> O frontend jamais ve a senha — recebe apenas um token `sha256(senha)` apos o login.
> Para trocar a senha, basta rodar `wrangler secret put ADMIN_PASSWORD` novamente.

Após o deploy, você verá a URL do Worker, algo como:
```
https://balaio-alamedas-worker.SEU_USUARIO.workers.dev
```

**Edite variáveis públicas** em `wrangler.toml` se necessário:
```toml
[vars]
PIX_NOME   = "CONDOMINIO ALAMEDAS"   # Nome no QR Code PIX (máx 25 chars)
PIX_CIDADE = "SALVADOR"              # Cidade no PIX (máx 15 chars)
```

---

### 3. Configurar Senha do Admin

Com o Worker online, faça a configuração inicial da senha **uma única vez** através do painel (botão ⚙️ no canto inferior direito do site) > "Primeira configuração".

Ou via cURL:
```bash
curl -X POST https://SEU_WORKER.workers.dev/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"senha": "suaSenhaSegura123"}'
```

---

### 4. Frontend (Cloudflare Pages)

1. **Edite `index.html`** — atualize a constante `API_BASE`:
   ```javascript
   const API_BASE = 'https://balaio-alamedas-worker.SEU_USUARIO.workers.dev';
   ```

2. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages** → **Create a project**

3. Escolha **"Upload assets"** (deploy direto, sem Git) e faça upload do `index.html`

4. Ou conecte ao GitHub para CI/CD automático

---

## 🔐 Segurança

| Item | Como funciona |
|------|--------------|
| Senha admin | SHA-256 hash armazenado no banco — nunca texto puro |
| Token de sessão | O próprio hash funciona como bearer token |
| CORS | Configurado para aceitar qualquer origem — restrinja em produção |
| Variáveis sensíveis | `DATABASE_URL` e `PIX_KEY` como Secrets do Cloudflare, nunca no código |

Para restringir CORS apenas ao seu domínio, edite `worker.js`:
```javascript
const CORS = {
  'Access-Control-Allow-Origin': 'https://balaio.seudominio.com',
  ...
};
```

---

## 🛠️ Rotas da API

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `GET`  | `/api/dados` | Público | Dashboard: config, itens, stats |
| `POST` | `/api/inscricao` | Público | Inscrever participante + gerar PIX |
| `POST` | `/api/admin/setup` | Público (1x) | Configurar senha inicial |
| `POST` | `/api/admin/login` | Público | Login → retorna token |
| `GET`  | `/api/admin/participantes` | 🔒 Admin | Listar todos os inscritos |
| `POST` | `/api/admin/confirmar` | 🔒 Admin | Alterar status de pagamento |
| `POST` | `/api/admin/item` | 🔒 Admin | Adicionar item ao balaio |

---

## 💡 Personalizações comuns

### Alterar meta e valor da cota
Execute no SQL Editor do Neon:
```sql
UPDATE configuracoes SET valor = '2500.00' WHERE chave = 'meta_balaio';
UPDATE configuracoes SET valor = '60.00'   WHERE chave = 'valor_quota';
UPDATE configuracoes SET valor = '04 de Julho de 2026' WHERE chave = 'data_evento';
```

### Adicionar item à lista
```sql
INSERT INTO itens_balaio (nome, quantidade, preco_estimado, categoria, icone)
VALUES ('Cachorro-quente', 100, 150.00, 'Comidas', '🌭');
```

### Trocar senha do admin
```bash
wrangler secret put ADMIN_PASSWORD
# Digite a nova senha quando solicitado, pressione Enter
```

---

## 📦 Tecnologias

| Camada | Tecnologia | Custo |
|--------|-----------|-------|
| Frontend | HTML5 + Tailwind CSS | Grátis |
| Hospedagem Frontend | Cloudflare Pages | Grátis |
| Backend | Cloudflare Workers | Grátis (100k req/dia) |
| Banco de Dados | Neon PostgreSQL | Grátis (0.5 GB) |
| PIX | EMV QR Code padrão Banco Central | Grátis |

**Custo total: R$ 0,00** 🎉

---

Desenvolvido por **Alex Passos** · 2026
