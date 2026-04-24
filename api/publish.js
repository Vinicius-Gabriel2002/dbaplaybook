export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, content } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token GitHub não configurado no servidor.' });
  }

  const url = `https://api.github.com/repos/Vinicius-Gabriel2002/dbaplaybook/contents/content.js`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  const getRes = await fetch(url, { headers });
  if (!getRes.ok) {
    return res.status(502).json({ error: `Erro ao conectar no GitHub (${getRes.status}).` });
  }
  const { sha } = await getRes.json();

  const encoded = Buffer.from(content, 'utf-8').toString('base64');
  const putRes  = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: 'chore: atualizar conteúdo via DBA Playbook editor',
      content: encoded,
      sha
    })
  });

  if (!putRes.ok) {
    return res.status(502).json({ error: `Erro ao publicar no GitHub (${putRes.status}).` });
  }

  res.status(200).json({ ok: true });
}
