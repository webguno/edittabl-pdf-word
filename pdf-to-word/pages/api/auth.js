export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { public_key } = req.body

  if (!public_key) return res.status(400).json({ error: 'Missing public_key' })

  try {
    const response = await fetch('https://api.ilovepdf.com/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Auth failed' })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message })
  }
}
