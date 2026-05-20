export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { token, server, task } = body || {}
  if (!token || !server || !task) return res.status(400).json({ error: 'Missing required fields' })

  try {
    const response = await fetch(`https://${server}/v1/download/${task}`, {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (!response.ok) return res.status(response.status).json({ error: 'Download failed' })

    const buffer = await response.arrayBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', 'attachment; filename="converted.docx"')
    res.send(Buffer.from(buffer))
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message })
  }
}
