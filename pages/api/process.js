export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { token, server, task, server_filename, filename } = req.body || {}
  if (!token || !server || !task || !server_filename) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const r = await fetch(`https://${server}/v1/process`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        tool: 'pdfword',
        files: [{ server_filename, filename: filename || 'document.pdf' }],
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'Process failed' })
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
