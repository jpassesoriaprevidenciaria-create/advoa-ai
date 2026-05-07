const https = require('https');
const http = require('http');

const CNJ_KEY = 'ApiKey cDZHYzlZa0JadVREZDJCendFbXNBN3czYWRtand4MHRiMGxvQ2F0WGdWZF83bFZScm1VM1dhTk1oV0I4TmlVNQ==';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const oab = url.searchParams.get('oab');
  const uf  = url.searchParams.get('uf');

  // Health check
  if (!oab || !uf) {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({status:'ok', message:'Advoca.ai API funcionando! Use ?oab=NUMERO&uf=UF'}));
    return;
  }

  const tribunais = [
    {alias:'api_publica_tjba', nome:'TJBA'},
    {alias:'api_publica_trf1', nome:'TRF1'},
    {alias:'api_publica_tst',  nome:'TST'},
  ];

  const processosTodos = [];

  const buscas = tribunais.map(trib => new Promise(resolve => {
    const body = JSON.stringify({
      query: {
        bool: {
          should: [
            {match: {'dadosBasicos.polo.representante.numeroOAB': `${uf}${oab}`}},
            {match: {'dadosBasicos.polo.representante.numeroOAB': oab}},
          ]
        }
      },
      size: 50,
      _source: ['numeroProcesso','dadosBasicos','movimentos']
    });

    const options = {
      hostname: 'api-publica.datajud.cnj.jus.br',
      path: `/${trib.alias}/_search`,
      method: 'POST',
      headers: {
        'Authorization': CNJ_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const reqCNJ = https.request(options, resCNJ => {
      let data = '';
      resCNJ.on('data', chunk => data += chunk);
      resCNJ.on('end', () => {
        try {
          const json = JSON.parse(data);
          const hits = json?.hits?.hits || [];
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
        } catch(e) { console.error('Parse erro:', e.message); }
        resolve();
      });
    });

    reqCNJ.on('error', (e) => { console.error(`Erro ${trib.nome}:`, e.message); resolve(); });
    reqCNJ.write(body);
    reqCNJ.end();
  }));

  await Promise.all(buscas);

  res.writeHead(200, {'Content-Type':'application/json'});
  res.end(JSON.stringify({items: processosTodos, total: processosTodos.length}));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
