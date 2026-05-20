export const config = {
  api: { bodyParser: false },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers['x-ilove-token']
  const server = req.headers['x-ilove-server']

  if (!token || !server) {
    return res.status(400).json({ error: 'Missing token or server header' })
  }

  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)

    const response = await fetch(`https://${server}/v1/upload`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': req.headers['content-type'],
        'Content-Length': body.length,
      },
      body,
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Upload failed' })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message })
  }
}
