# 🧺 Balaio Alamedas 2026
Sistema de gestão de rifas e arrecadação para eventos comunitários, focado em facilidade de uso para o morador e controle total para o administrador. Desenvolvido para o condomínio Alamedas, com integração de pagamentos via PIX e painel administrativo dinâmico.

## 🚀 Funcionalidades
### Para o Morador
**Inscrição Simplificada:** Seleção de bloco (1 a 26) e apartamento via menus suspensos para evitar erros.  
**Múltiplas Cotas:** Opção de comprar até 10 cotas de uma vez, aumentando as chances no sorteio.  
**Cálculo em Tempo Real:** Visualização do valor total antes de finalizar a inscrição.  
**Pagamento via PIX:** Geração automática de QR Code e código "Copia e Cola" (Padrão EMV).  
**Termômetro de Arrecadação:** Acompanhamento visual do progresso para o próximo balaio.  

### Para o Administrador
**Painel Administrativo Protegido:** Acesso restrito via senha configurada no servidor.  
**Gestão de Participantes:** Lista completa com busca, filtragem por status e exclusão com modal de confirmação.  
**Confirmação de Pagamento:** Atualização manual de status (Pendente para Pago).  
**Configurações Dinâmicas:** Ajuste de valor da cota, meta do balaio e data do evento sem mexer no código.  
**Impressão de Sorteio Econômica:** Geração de cupons automáticos formatados (4 por linha) com IDs únicos para auditoria.  

## 📦 Tecnologias
| Camada | Tecnologia | Custo |
|--------|-----------|-------|
| Frontend | HTML5 + Tailwind CSS (Mobile First) + JavaScript Vanilla | Grátis |
| Hospedagem Frontend | Cloudflare Pages | Grátis |
| Backend | Cloudflare Workers | Grátis (100k req/dia) |
| Banco de Dados | Neon PostgreSQL (Serverless Postgres) | Grátis (0.5 GB) |
| PIX | Payloads EMV QR Code padrão Banco Central | Grátis |

**Custo total: R$ 0,00** 🎉

## 🔐 Segurança
| Item | Como funciona |
|------|---------------|
| Senha admin | SHA-256 hash armazenado no banco — nunca texto puro |
| Token de sessão | O próprio hash funciona como bearer token |
| CORS | Configurado para aceitar qualquer origem |
| Variáveis sensíveis | `DATABASE_URL` e `PIX_KEY` como Secrets do Cloudflare, nunca no código |

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

## ⚙️ Configuração e Instalação
### 1. Requisitos
Conta na [Cloudflare](https://dash.cloudflare.com/sign-up) (para o Worker).
Banco de Dados PostgreSQL ([neon.tech](https://neon.tech) sugerido).
> Na aba **SQL Editor**, cole e execute o conteúdo de `schema.sql`
Chave PIX configurada (preferencialmente aleatória).

### 2. Deploy

- Acesse o [cloudflare](https://dash.cloudflare.com) → **Pages** → **Create a project**
- Escolha **"Github"** (para CI/CD automático) 
```
# Comando da build:
npm install

# Comando de implantação:
npx wrangler deploy

# Comando da versão:
npx wrangler versions upload

# Diretório raiz:/
```
Após o deploy, você verá a URL do Worker (que deverá adicionar ao index.html na constante `API_BASE`), algo como:
```
https://SEUPROJETO.SEU_USUARIO.workers.dev
```
Com o Worker online, faça a configuração inicial da senha **uma única vez** através do painel (botão ⚙️ no canto inferior direito do site) > "Primeira configuração" > "Variáveis e Segredos".

### 3. Variáveis de Ambiente (Secrets)
No painel da Cloudflare ou via Wrangler, configure as seguintes variáveis:

`DATABASE_URL`: String de conexão do PostgreSQL (formato `postgresql://user:pass@host/db?sslmode=require`).  
`PIX_KEY`: Sua chave PIX (CPF, E-mail ou Telefone).  
`PIX_NOME`: Nome do recebedor (ex: Condomínio Alamedas).  
`PIX_CIDADE`: Cidade do recebedor.  
`ADMIN_PASSWORD`: Senha de acesso ao painel administrativo.  
> **Segurança da senha**: a `ADMIN_PASSWORD` fica apenas no servidor Cloudflare. O frontend **jamais** vê a senha, recebe apenas um token `sha256(senha)` após o login.

## 🛠️ Rotas da API
| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `GET`  | `/api/dados` | Público | Dashboard: config, itens, stats |
| `POST` | `/api/inscricao` | Público | Inscrever participante + gerar PIX |
| `POST` | `/api/admin/login` | Público | Login → retorna token |
| `GET`  | `/api/admin/participantes` | 🔒 Admin | Listar todos os inscritos |
| `POST` | `/api/admin/confirmar` | 🔒 Admin | Alterar status de pagamento |
| `POST` | `/api/admin/item` | 🔒 Admin | Adicionar item ao balaio |

## 📜 Licença
Este projeto foi desenvolvido por **[Alex Passos](https://www.instagram.com/soumaisalex)** para uso comunitário. Sinta-se livre para adaptar e utilizar em seu condomínio ou evento.

```
"Que o São João do Alamedas seja repleto de alegria e balaios cheios, sempre!" 🌽🔥
```
