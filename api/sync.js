export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { oab, uf } = req.query;
  if (!oab || !uf) return res.status(400).json({ erro: 'Informe oab e uf' });

  // DataJud CNJ — API pública gratuita, sem cadastro necessário
  // Chave pública oficial do CNJ
  const CNJ_KEY = 'ApiKey cDZHYzlZa0JadVREZDJCendFbXNBN3czYWRtand4MHRiMGxvQ2F0WGdWZF83bFZScm1VM1dhTk1oV0I4TmlVNQ==';

  // Tribunais para buscar — TJBA e TRF1 (principais para BA previdenciário)
  const tribunais = [
    { alias: 'api_publica_tjba', nome: 'TJBA' },
    { alias: 'api_publica_trf1', nome: 'TRF1' },
    { alias: 'api_publica_tst',  nome: 'TST'  },
  ];

  const processosTodos = [];

  for (const trib of tribunais) {
    try {
      const body = {
        query: {
          bool: {
            should: [
              { match: { 'dadosBasicos.polo.representante.numeroOAB': `${uf}${oab}` } },
              { match: { 'dadosBasicos.polo.representante.numeroOAB': oab } },
            ]
          }
        },
        size: 50,
        _source: [
          'numeroProcesso',
          'dadosBasicos.assunto',
          'dadosBasicos.orgaoJulgador.nomeOrgao',
          'dadosBasicos.classeProcessual',
          'movimentos'
        ]
      };

      const resp = await fetch(
        `https://api-publica.datajud.cnj.jus.br/${trib.alias}/_search`,
        {
          method: 'POST',
          headers: {
            'Authorization': CNJ_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        }
      );

      if (!resp.ok) continue;
      const dados = await resp.json();
      const hits = dados?.hits?.hits || [];

      hits.forEach(h => {
        const src = h._source || {};
        const movimentos = src.movimentos || [];
        const ultimoMov = movimentos[movimentos.length - 1];
        processosTodos.push({
          numero_cnj: src.numeroProcesso || h._id,
          tribunal: trib.nome + (src.dadosBasicos?.orgaoJulgador?.nomeOrgao ? ' — ' + src.dadosBasicos.orgaoJulgador.nomeOrgao : ''),
          tipo: src.dadosBasicos?.classeProcessual || 'Não informado',
          area: src.dadosBasicos?.assunto?.[0]?.descricao || 'Não informado',
          ultimo_movimento: ultimoMov?.nome || 'Sem movimentação',
        });
      });
    } catch (e) {
      console.error(`Erro no tribunal ${trib.nome}:`, e.message);
    }
  }

  return res.status(200).json({ items: processosTodos, total: processosTodos.length });
}
