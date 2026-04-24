-- =============================================================
--  Balaio Alamedas 2026 — PostgreSQL (Neon.tech) - Alex Passos
-- =============================================================

-- Participantes inscritos
CREATE TABLE IF NOT EXISTS participantes (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(100)  NOT NULL,
    bloco           VARCHAR(10)   NOT NULL,
    apartamento     VARCHAR(10)   NOT NULL,
    telefone        VARCHAR(20)   DEFAULT NULL,
    observacao      TEXT          DEFAULT NULL,
    status_pagamento VARCHAR(20)  DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
    created_at      TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE(bloco, apartamento)
);

-- Itens do balaio (lista de transparência)
CREATE TABLE IF NOT EXISTS itens_balaio (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(100)  NOT NULL,
    quantidade      INT           DEFAULT 1,
    preco_estimado  NUMERIC(10,2) NOT NULL,
    categoria       VARCHAR(50)   DEFAULT 'Geral',
    icone           VARCHAR(10)   DEFAULT '🎉'
);

-- Configurações gerais do sistema
CREATE TABLE IF NOT EXISTS configuracoes (
    chave   VARCHAR(50) PRIMARY KEY,
    valor   TEXT        NOT NULL
);

-- Autenticacao: senha configurada via variavel ADMIN_PASSWORD no Cloudflare Workers
-- Nao e necessaria tabela de senha no banco de dados.

-- ============================================================
--  Dados iniciais
-- ============================================================

INSERT INTO configuracoes (chave, valor) VALUES
    ('meta_balaio',   '2000.00'),
    ('valor_quota',   '50.00'),
    ('nome_evento',   'Balaio Junino 2026'),
    ('data_evento',   '27 de Junho de 2026'),
    ('local_evento',  'Área de Lazer – Bloco Central'),
    ('descricao',     'A maior festa junina do Alamedas! Uma noite de forró, comidas típicas e muita alegria entre vizinhos.')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO itens_balaio (nome, quantidade, preco_estimado, categoria, icone) VALUES
    ('Banda de Forró ao Vivo',      1,  600.00, 'Entretenimento', '🎸'),
    ('Fogos de Artifício',          1,  250.00, 'Entretenimento', '🎆'),
    ('Decoração Temática Completa', 1,  180.00, 'Decoração',      '🎪'),
    ('Bandeirolas e Varal',         3,   45.00, 'Decoração',      '🎏'),
    ('Canjica (leite, coco)',       1,  120.00, 'Comidas',        '🌽'),
    ('Pamonha e Curau',             1,   90.00, 'Comidas',        '🫙'),
    ('Amendoim Torrado',            5,   35.00, 'Comidas',        '🥜'),
    ('Pé-de-Moleque e Cocada',      1,   60.00, 'Comidas',        '🍬'),
    ('Refrigerantes e Sucos',       1,  200.00, 'Bebidas',        '🥤'),
    ('Quentão e Vinho Quente',      1,  150.00, 'Bebidas',        '🍷'),
    ('Copos, Pratos e Talheres',    1,   80.00, 'Utensílios',     '🍽️'),
    ('Descartáveis e Sacolas',      2,   40.00, 'Utensílios',     '🛍️'),
    ('Tendas e Mesas',              2,  150.00, 'Estrutura',      '⛺')
ON CONFLICT DO NOTHING;

-- ============================================================
--  Índices úteis
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_participantes_status ON participantes(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_participantes_bloco  ON participantes(bloco);

-- Adiciona a coluna de quantidade na tabela de participantes
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 1;

-- Remove a restrição de "um por apartamento" (já que uym único apartamento pode comprar mais de uma cota)
-- Se você tiver uma UNIQUE constraint em bloco/apartamento, rode:
ALTER TABLE participantes DROP CONSTRAINT IF EXISTS participantes_bloco_apartamento_key;
