export default async function handler(req, res) {
  // Permite CORS do próprio site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { oab, uf } = req.query;

  if (!oab || !uf) {
    return res.status(400).json({ erro: 'Informe oab e uf' });
  }

  const ESCAVADOR_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMDNiNDgzNGVmOGRlMzQxYjFjYjk2MTNjZDUxZTY0ZTA1ZTUxZjVhNWM5YzY4YjMyZDNiZTBmMGM1YjY5NzU5ZTBlMTc3MmE5N2M2YzM1ZTciLCJpYXQiOjE3NzgxNjQ2MjMuNzY5NDIyLCJuYmYiOjE3NzgxNjQ2MjMuNzY5NDI0LCJleHAiOjE4MDk3NDUxOTkuNzY3NjY1LCJzdWIiOiIzNTU4NjMwIiwic2NvcGVzIjpbImFjZXNzYXJfYXBpX3BhZ2EiXX0.s5Gy_7HsV-YifVihZOjveEkG5uLR7zwniZH4-akrJYJ7ncRr7wW3Ac6jLrZBUBMCA1VnFCmabGMJOaUonqvHmFMoULeKO-DAz-bsfrmyw1E19nCvcNslGNEKMbzYza8XEYttiICTSpVO81xFueuMaJ2T63B2v2RCFp7D2C_svpL4To442TJI2V1wB93nXV2kKm5bck6uQESBzfcEYAyNg3mOcOGvvD7aEjRx5mMeDqfpRhhhx-zG553_wQqVEx5MEaNYt2QyM1lbn8gvIYo_FLsob_OemSKA5qjqkUy9g5rxBw97aivUAWX8vRHyROEZf5HiwPCgEQDqshzcC70ac1oY5edXBTskX4D1OHaFMHq5tFJjD9VvqJtYgLHV-tnuNUpzhCi-6UB_e232rmhqoxjICw1M0RmZPvK9SJBk6SeqBFZ7-wRbrmm0PV8JnHq1zLdoGdzcwXEy_62LWynhFeMFsXGMRSNAOi2pc3ljPCUmCqPiKU-45D3BmVp_4N-0IbpRKuDmCZ3MzfgZteTRNJNHKaeI3ft6OcKMiBXMmk5t5pk6clOVep4_PYGGXoZZ9iGFYKXfoNWmfFA0vplpL2KojRsMMWdbMvGIX1RScX3TGGAFWfbxySG6C1gLi4dViblxJq8nQ7QBLA2YEzvaig_kQoyYRcJP9X-rPH2kXmQ';

  try {
    // Busca processos pelo número OAB
    const resposta = await fetch(
      `https://api.escavador.com/api/v1/processos/numero-oab?numero=${oab}&uf=${uf}&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${ESCAVADOR_TOKEN}`,
          'Accept': 'application/json',
        }
      }
    );

    if (!resposta.ok) {
      const erro = await resposta.text();
      console.error('Escavador erro:', resposta.status, erro);
      return res.status(resposta.status).json({ erro: `Escavador retornou ${resposta.status}`, detalhe: erro });
    }

    const dados = await resposta.json();
    return res.status(200).json(dados);

  } catch (e) {
    console.error('Erro interno:', e);
    return res.status(500).json({ erro: e.message });
  }
}
