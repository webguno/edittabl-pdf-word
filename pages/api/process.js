export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { token, server, task, server_filename, filename } = body || {}
  if (!token || !server || !task || !server_filename) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const response = await fetch(`https://${server}/v1/process`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        tool: 'pdfword',
        files: [{ server_filename, filename: filename || 'document.pdf' }],
      }),
    })
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.message || 'Processing failed' })
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message })
  }
}
