export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { token, server, task } = req.body || {}
  if (!token || !server || !task) return res.status(400).json({ error: 'Missing fields' })

  try {
    const r = await fetch(`https://${server}/v1/download/${task}`, {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (!r.ok) return res.status(r.status).json({ error: 'Download failed' })

    const buffer = await r.arrayBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', 'attachment; filename="converted.docx"')
    res.send(Buffer.from(buffer))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
