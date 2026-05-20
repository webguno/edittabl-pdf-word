export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { token } = req.body

  if (!token) return res.status(400).json({ error: 'Missing token' })

  try {
    const response = await fetch('https://api.ilovepdf.com/v1/start/pdfword', {
      headers: { Authorization: 'Bearer ' + token },
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Start task failed' })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message })
  }
}
