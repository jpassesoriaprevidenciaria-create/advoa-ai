const https = require('https');
const http = require('http');

const CNJ_KEY = 'ApiKey cDZHYzlZa0JadVREZDJCendFbXNBN3czYWRtand4MHRiMGxvQ2F0WGdWZF83bFZScm1VM1dhTk1oV0I4TmlVNQ==';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const oab  = url.searchParams.get('oab');
  const uf   = url.searchParams.get('uf');
  const nome = url.searchParams.get('nome'); // busca por nome do advogado

  // Health check
  if (!oab && !nome) {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({status:'ok', message:'Advoca.ai API funcionando!'}));
    return;
  }

  const tribunais = [
    {alias:'api_publica_tjba', nome:'TJBA'},
    {alias:'api_publica_trf1', nome:'TRF1'},
    {alias:'api_publica_trt5', nome:'TRT5'},
  ];

  const processosTodos = [];

  const buscas = tribunais.map(trib => new Promise(resolve => {

    // Monta query — tenta OAB e nome
    const should = [];
    if(oab && uf){
      should.push({match: {'dadosBasicos.polo.representante.numeroOAB': `${uf}${oab}`}});
      should.push({match: {'dadosBasicos.polo.representante.numeroOAB': oab}});
      should.push({match_phrase: {'dadosBasicos.polo.representante.nome': nome || ''}});
    }
    if(nome){
      should.push({match: {'dadosBasicos.polo.representante.nome': nome}});
      should.push({match: {'dadosBasicos.polo.advogado.nome': nome}});
    }

    const body = JSON.stringify({
      query: { bool: { should, minimum_should_match: 1 } },
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
            const num = src.numeroProcesso || h._id;
            if(num && !processosTodos.find(p => p.numero_cnj === num)){
              processosTodos.push({
                numero_cnj: num,
                tribunal: trib.nome + (src.dadosBasicos?.orgaoJulgador?.nomeOrgao ? ' — ' + src.dadosBasicos.orgaoJulgador.nomeOrgao : ''),
                tipo: src.dadosBasicos?.classeProcessual || 'Não informado',
                area: src.dadosBasicos?.assunto?.[0]?.descricao || 'Não informado',
                ultimo_movimento: ultimoMov?.nome || 'Sem movimentação',
              });
            }
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
