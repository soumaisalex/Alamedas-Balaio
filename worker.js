/**
 * Balaio Alamedas 2026 - Cloudflare Worker
 *
 * Variaveis de ambiente (Workers > Settings > Variables):
 *   ADMIN_PASSWORD  [Secret] - Senha admin em texto plano (NUNCA exposta ao frontend)
 *   DATABASE_URL    [Secret] - Connection string do Neon
 *   PIX_KEY         [Secret] - Chave PIX (CPF, CNPJ, email ou telefone)
 *   PIX_NOME        [Var]    - Nome do recebedor no QR Code (max 25 chars)
 *   PIX_CIDADE      [Var]    - Cidade do recebedor (max 15 chars)
 *
 * Seguranca da senha:
 *   1. Admin envia a senha no login
 *   2. Worker compara com env.ADMIN_PASSWORD (fica APENAS no servidor Cloudflare)
 *   3. Se correta, devolve token = sha256(senha)
 *   4. Frontend guarda o token e o envia como Bearer em cada request
 *   5. Worker valida: sha256(ADMIN_PASSWORD) === token
 *   => A senha real NUNCA sai do Worker
 *
 * Para configurar:
 *   wrangler secret put ADMIN_PASSWORD
 *   wrangler secret put DATABASE_URL
 *   wrangler secret put PIX_KEY
 */
import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function fail(msg, status = 400) { return respond({ error: msg }, status); }

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const token = (request.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
  if (!token || token.length !== 64) return false;
  return token === await sha256hex(env.ADMIN_PASSWORD);
}

// PIX EMV Logic
function tlv(id, val) { return `${id}${String(val.length).padStart(2, '0')}${val}`; }
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function norm(str, max) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().trim().substring(0, max);
}
function gerarPix({ chave, nome, cidade, valor, txid }) {
  const tx = txid.replace(/[^A-Za-z0-9]/g, '').substring(0, 25) || 'BALAIO';
  let p = tlv('00', '01')
    + tlv('26', tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave))
    + tlv('52', '0000') + tlv('53', '986')
    + tlv('54', parseFloat(valor).toFixed(2))
    + tlv('58', 'BR') + tlv('59', norm(nome, 25)) + tlv('60', norm(cidade, 15))
    + tlv('62', tlv('05', tx)) + '6304';
  return p + crc16(p);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const { pathname } = new URL(request.url);
    const sql = neon(env.DATABASE_URL);

    try {
      // GET /api/dados - Público
      if (pathname === '/api/dados' && request.method === 'GET') {
        const [cfgRows, itens, statsQuery] = await Promise.all([
          sql`SELECT chave, valor FROM configuracoes`,
          sql`SELECT * FROM itens_balaio ORDER BY categoria, nome`,
          sql`SELECT 
                SUM(quantidade) as total_cotas,
                SUM(CASE WHEN status_pagamento = 'pago' THEN quantidade ELSE 0 END) as cotas_pagas
              FROM participantes`
        ]);

        const config = Object.fromEntries(cfgRows.map(r => [r.chave, r.valor]));
        const quotaBase = parseFloat(config.valor_quota || 10);
        const cotasPagas = parseInt(statsQuery[0].cotas_pagas || 0);

        return respond({
          config, itens,
          stats: {
            total_inscritos: parseInt(statsQuery[0].total_cotas || 0),
            total_pagos: cotasPagas,
            total_arrecadado: (quotaBase * cotasPagas).toFixed(2),
          },
        });
      }

      // POST /api/inscricao - Público
      if (pathname === '/api/inscricao' && request.method === 'POST') {
        const { nome, bloco, apartamento, telefone, observacao, quantidade } = await request.json().catch(() => ({}));
        
        if (!nome?.trim() || !bloco?.trim() || !apartamento?.trim())
          return fail('Preencha nome, bloco e apartamento.');

        const qtd = Math.max(1, parseInt(quantidade) || 1);
        const cfgR = await sql`SELECT valor FROM configuracoes WHERE chave = 'valor_quota'`;
        const valorCota = parseFloat(cfgR[0]?.valor || 10);
        const valorTotal = (valorCota * qtd).toFixed(2);

        const [ins] = await sql`
          INSERT INTO participantes (nome, bloco, apartamento, telefone, observacao, quantidade)
          VALUES (${nome.trim()}, ${bloco.trim().toUpperCase()}, 
                  ${apartamento.trim().toUpperCase()}, 
                  ${telefone?.trim() || null}, ${observacao?.trim() || null}, ${qtd})
          RETURNING id`;

        const txid = `BAL${String(ins.id).padStart(8, '0')}`;

        if (!env.PIX_KEY) return respond({ sucesso: true, id: ins.id, pix: null, aviso: 'PIX_KEY ausente' });

        const pixPayload = gerarPix({
          chave: env.PIX_KEY, 
          nome: env.PIX_NOME || 'BALAIO ALAMEDAS',
          cidade: env.PIX_CIDADE || 'ARACAJU', 
          valor: valorTotal, 
          txid
        });

        return respond({ sucesso: true, pix: { payload: pixPayload, valor: valorTotal, txid } });
      }

      // Rotas Administrativas
      if (pathname === '/api/admin/login' && request.method === 'POST') {
        const { senha } = await request.json().catch(() => ({}));
        if (senha === env.ADMIN_PASSWORD) return respond({ token: await sha256hex(senha) });
        return fail('Senha incorreta', 401);
      }

      // Bloqueio de segurança para rotas restritas
      if (pathname.startsWith('/api/admin') && !(await isAdmin(request, env))) {
        return fail('Não autorizado', 401);
      }

      // GET /api/admin/participantes
      if (pathname === '/api/admin/participantes' && request.method === 'GET') {
        const participantes = await sql`
          SELECT id, nome, bloco, apartamento, telefone, observacao, status_pagamento, quantidade,
          to_char(created_at AT TIME ZONE 'America/Bahia', 'DD/MM/YYYY HH24:MI') AS data_inscricao
          FROM participantes ORDER BY created_at DESC`;
        return respond({ participantes });
      }

      // DELETE /api/admin/participante/:id
      if (pathname.startsWith('/api/admin/participante/') && request.method === 'DELETE') {
        const id = pathname.split('/').pop();
        await sql`DELETE FROM participantes WHERE id = ${id}`;
        return respond({ sucesso: true });
      }

      // POST /api/admin/confirmar
      if (pathname === '/api/admin/confirmar' && request.method === 'POST') {
        const { id, status } = await request.json().catch(() => ({}));
        await sql`UPDATE participantes SET status_pagamento = ${status} WHERE id = ${id}`;
        return respond({ sucesso: true });
      }

      // POST /api/admin/config
      if (pathname === '/api/admin/config' && request.method === 'POST') {
        const { updates } = await request.json().catch(() => ({}));
        for (const { chave, valor } of updates) {
          await sql`INSERT INTO configuracoes (chave, valor) VALUES (${chave}, ${String(valor)})
                    ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`;
        }
        return respond({ sucesso: true });
      }

      return fail('Rota não encontrada', 404);
    } catch (err) {
      return fail(err.message, 500);
    }
  }
};
