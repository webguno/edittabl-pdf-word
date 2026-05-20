import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

const PUBLIC_KEY = 'project_public_c7d3b62aff3c63ef102b145c2f834209_QuAgd49a080a637304cc2295385181e8227c5'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ label: '', pct: 0 })
  const [errorMsg, setErrorMsg] = useState('')
  const [downloadBlob, setDownloadBlob] = useState(null)
  const [downloadName, setDownloadName] = useState('')
  const fileInputRef = useRef()

  useEffect(() => { setMounted(true) }, [])

  const ready = file && status !== 'converting'

  function handleFile(f) {
    setErrorMsg('')
    setDownloadBlob(null)
    setStatus('idle')
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF file.')
      return
    }
    if (f.size > 15 * 1024 * 1024) {
      setErrorMsg('File exceeds the 15 MB limit.')
      return
    }
    setFile(f)
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  async function convert() {
    if (!ready) return
    setStatus('converting')
    setErrorMsg('')
    setDownloadBlob(null)

    try {
      setProgress({ label: 'Preparing…', pct: 5 })

      const authRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: PUBLIC_KEY }),
      })
      const authData = await authRes.json()
      if (!authRes.ok) throw new Error(authData.error || 'Service error. Please try again.')

      const { token } = authData
      setProgress({ label: 'Starting…', pct: 15 })

      const startRes = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error || 'Service error. Please try again.')

      const { server, task } = startData
      setProgress({ label: 'Uploading…', pct: 35 })

      const formData = new FormData()
      formData.append('task', task)
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-ilove-token': token, 'x-ilove-server': server },
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed. Please try again.')

      const { server_filename } = uploadData
      setProgress({ label: 'Converting…', pct: 60 })

      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, server, task, server_filename, filename: file.name }),
      })
      const processData = await processRes.json()
      if (!processRes.ok) throw new Error(processData.error || 'Conversion failed. Please try again.')

      setProgress({ label: 'Almost done…', pct: 85 })

      const dlRes = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, server, task }),
      })
      if (!dlRes.ok) throw new Error('Could not retrieve file. Please try again.')

      const blob = await dlRes.blob()
      const baseName = file.name.replace(/\.pdf$/i, '')
      setDownloadBlob(blob)
      setDownloadName(baseName + '.docx')
      setProgress({ label: 'Done!', pct: 100 })
      setStatus('done')

    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong.')
      setStatus('error')
    }
  }

  function triggerDownload() {
    if (!downloadBlob) return
    const url = URL.createObjectURL(downloadBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName
    a.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    setFile(null)
    setDownloadBlob(null)
    setStatus('idle')
    setProgress({ label: '', pct: 0 })
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!mounted) return null

  return (
    <>
      <Head>
        <title>PDF to Word Converter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #F7F5F0; --surface: #FFFFFF; --surface2: #F0EDE6;
          --border: #E0DBD0; --border-strong: #C8C0B0;
          --text: #1A1814; --text-muted: #6B6456;
          --accent: #2D5016; --accent-light: #E8F0DC; --accent-mid: #4A7A28;
          --red: #C0392B; --red-light: #FDECEA;
          --mono: 'DM Mono', monospace; --sans: 'DM Sans', sans-serif;
          --radius: 10px; --radius-lg: 16px;
        }
        body { font-family: var(--sans); background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 48px 16px; }
        .container { width: 100%; max-width: 520px; }
        .header { margin-bottom: 36px; text-align: center; }
        h1 { font-size: 34px; font-weight: 600; letter-spacing: -.02em; line-height: 1.15; }
        h1 span { color: var(--text-muted); font-weight: 300; }
        .subtitle { margin-top: 8px; font-size: 15px; color: var(--text-muted); }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 28px; margin-bottom: 16px; }
        .drop-zone { border: 1.5px dashed var(--border-strong); border-radius: var(--radius); padding: 48px 24px; text-align: center; cursor: pointer; transition: background .15s, border-color .15s; background: var(--surface2); position: relative; }
        .drop-zone:hover, .drop-zone.over { background: var(--accent-light); border-color: var(--accent-mid); }
        .drop-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .drop-icon { font-size: 42px; margin-bottom: 12px; display: block; }
        .drop-title { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
        .drop-sub { font-size: 13px; color: var(--text-muted); }
        .file-info { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--accent-light); border: 1px solid #B8D496; border-radius: var(--radius); margin-top: 12px; }
        .file-name { font-size: 14px; font-weight: 500; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--mono); }
        .file-size { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .rm-btn { cursor: pointer; color: var(--text-muted); font-size: 18px; padding: 4px; border-radius: 6px; transition: color .15s; flex-shrink: 0; background: none; border: none; }
        .rm-btn:hover { color: var(--red); }
        .error-box { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: var(--red-light); border: 1px solid #EFBCB7; border-radius: var(--radius); margin-top: 12px; font-size: 13px; color: var(--red); line-height: 1.5; }
        .convert-btn { width: 100%; height: 52px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 16px; font-weight: 500; cursor: pointer; font-family: var(--sans); display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .15s; }
        .convert-btn:hover:not(:disabled) { background: #3D6B20; }
        .convert-btn:disabled { background: var(--border-strong); cursor: not-allowed; color: var(--text-muted); }
        .progress { margin-top: 16px; }
        .progress-top { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted); margin-bottom: 8px; font-family: var(--mono); }
        .progress-bg { height: 6px; background: var(--surface2); border-radius: 100px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--accent-mid); border-radius: 100px; transition: width .4s ease; }
        .result-card { background: var(--surface); border: 1px solid #B8D496; border-radius: var(--radius-lg); padding: 32px 28px; margin-bottom: 16px; text-align: center; }
        .result-icon { font-size: 44px; margin-bottom: 12px; }
        .result-title { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
        .result-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 24px; font-family: var(--mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dl-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: var(--accent); color: #fff; border-radius: var(--radius); font-size: 15px; font-weight: 500; cursor: pointer; border: none; font-family: var(--sans); transition: background .15s; margin-bottom: 14px; }
        .dl-btn:hover { background: #3D6B20; }
        .again-btn { display: block; margin: 0 auto; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; text-decoration: underline; font-family: var(--sans); }
        .again-btn:hover { color: var(--text); }
        .footer { text-align: center; font-size: 12px; color: var(--text-muted); margin-top: 4px; line-height: 1.7; }
      `}</style>

      <div className="container">
        <div className="header">
          <h1>PDF <span>to</span> Word</h1>
          <p className="subtitle">Upload a PDF and get an editable .docx file in seconds</p>
        </div>

        {/* Upload */}
        <div className="card">
          <div
            className={`drop-zone${dragOver ? ' over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }}
            />
            <span className="drop-icon">📄</span>
            <div className="drop-title">Drop your PDF here</div>
            <div className="drop-sub">or click to browse — max 15 MB</div>
          </div>

          {file && (
            <div className="file-info">
              <span style={{ fontSize: 22 }}>📋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatSize(file.size)}</div>
              </div>
              <button className="rm-btn" onClick={reset}>✕</button>
            </div>
          )}

          {errorMsg && (
            <div className="error-box">
              <span>⚠</span> {errorMsg}
            </div>
          )}
        </div>

        {/* Convert button */}
        {status !== 'done' && (
          <div className="card" style={{ padding: '20px 28px' }}>
            <button className="convert-btn" onClick={convert} disabled={!ready}>
              {status === 'converting' ? '⏳ Converting…' : '⚡ Convert to Word'}
            </button>

            {status === 'converting' && (
              <div className="progress">
                <div className="progress-top">
                  <span>{progress.label}</span>
                  <span>{progress.pct}%</span>
                </div>
                <div className="progress-bg">
                  <div className="progress-fill" style={{ width: progress.pct + '%' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {status === 'done' && (
          <div className="result-card">
            <div className="result-icon">✅</div>
            <div className="result-title">Your file is ready</div>
            <div className="result-sub">{downloadName}</div>
            <button className="dl-btn" onClick={triggerDownload}>⬇ Download .docx</button>
            <button className="again-btn" onClick={reset}>Convert another file</button>
          </div>
        )}

        <p className="footer">Files are processed securely and deleted after conversion.</p>
      </div>
    </>
  )
}
