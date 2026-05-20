import { useState, useRef } from 'react'
import Head from 'next/head'

export default function Home() {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState('idle') // idle | converting | done | error
  const [progress, setProgress] = useState({ label: '', pct: 0 })
  const [errorMsg, setErrorMsg] = useState('')
  const [downloadBlob, setDownloadBlob] = useState(null)
  const [downloadName, setDownloadName] = useState('')
  const fileInputRef = useRef()

  const ready = file && apiKey.trim().length > 10 && status !== 'converting'

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
      setProgress({ label: 'Authenticating…', pct: 5 })

      const authRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: apiKey.trim() }),
      })
      const authData = await authRes.json()
      if (!authRes.ok) throw new Error(authData.error || 'Authentication failed. Check your API key.')

      const { token } = authData
      setProgress({ label: 'Starting task…', pct: 15 })

      const startRes = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error || 'Failed to start task.')

      const { server, task } = startData
      setProgress({ label: 'Uploading PDF…', pct: 35 })

      const formData = new FormData()
      formData.append('task', task)
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-ilove-token': token,
          'x-ilove-server': server,
        },
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'File upload failed.')

      const { server_filename } = uploadData
      setProgress({ label: 'Converting to Word…', pct: 60 })

      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, server, task, server_filename, filename: file.name }),
      })
      const processData = await processRes.json()
      if (!processRes.ok) throw new Error(processData.error || 'Conversion failed.')

      setProgress({ label: 'Downloading result…', pct: 85 })

      const dlRes = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, server, task }),
      })
      if (!dlRes.ok) throw new Error('Failed to download converted file.')

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

  const stepActive = (n) => {
    if (n === 1) return true
    if (n === 2) return !!file
    if (n === 3) return status === 'converting' || status === 'done'
    if (n === 4) return status === 'done'
    return false
  }

  return (
    <>
      <Head>
        <title>PDF → Word Converter</title>
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
        body { font-family: var(--sans); background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px; }
        .container { width: 100%; max-width: 560px; }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: var(--accent-light); color: var(--accent); font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; padding: 4px 10px; border-radius: 100px; margin-bottom: 14px; font-family: var(--mono); }
        .badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-mid); }
        h1 { font-size: 32px; font-weight: 600; letter-spacing: -.02em; line-height: 1.15; }
        h1 span { color: var(--text-muted); font-weight: 300; }
        .subtitle { margin-top: 8px; font-size: 15px; color: var(--text-muted); }
        .header { margin-bottom: 40px; }
        .steps { display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 28px; }
        .step { flex: 1; padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 500; font-family: var(--mono); color: var(--text-muted); border-right: 1px solid var(--border); }
        .step:last-child { border-right: none; }
        .step.active { background: var(--accent-light); color: var(--accent); }
        .step-num { display: block; font-size: 16px; font-weight: 600; margin-bottom: 2px; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 28px; margin-bottom: 16px; }
        .section-label { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .1em; color: var(--text-muted); font-family: var(--mono); margin-bottom: 10px; }
        .api-row { display: flex; gap: 8px; }
        .api-input { flex: 1; height: 40px; padding: 0 12px; font-size: 14px; font-family: var(--mono); color: var(--text); background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); outline: none; transition: border-color .15s; }
        .api-input:focus { border-color: var(--border-strong); background: var(--surface); }
        .api-input::placeholder { color: var(--text-muted); opacity: .6; }
        .icon-btn { height: 40px; width: 40px; display: flex; align-items: center; justify-content: center; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; font-size: 18px; transition: background .15s; flex-shrink: 0; }
        .icon-btn:hover { background: var(--border); }
        .api-help { margin-top: 8px; font-size: 12px; color: var(--text-muted); }
        .api-help a { color: var(--accent-mid); text-decoration: none; }
        .api-help a:hover { text-decoration: underline; }
        .drop-zone { border: 1.5px dashed var(--border-strong); border-radius: var(--radius); padding: 36px 24px; text-align: center; cursor: pointer; transition: background .15s, border-color .15s; background: var(--surface2); position: relative; }
        .drop-zone:hover, .drop-zone.over { background: var(--accent-light); border-color: var(--accent-mid); }
        .drop-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .drop-icon { font-size: 36px; margin-bottom: 10px; display: block; }
        .drop-title { font-size: 15px; font-weight: 500; margin-bottom: 4px; }
        .drop-sub { font-size: 13px; color: var(--text-muted); }
        .file-info { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--accent-light); border: 1px solid #B8D496; border-radius: var(--radius); margin-top: 12px; }
        .file-name { font-size: 14px; font-weight: 500; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--mono); }
        .file-size { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .rm-btn { cursor: pointer; color: var(--text-muted); font-size: 18px; padding: 4px; border-radius: 6px; transition: color .15s; flex-shrink: 0; background: none; border: none; }
        .rm-btn:hover { color: var(--red); }
        .error-box { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: var(--red-light); border: 1px solid #EFBCB7; border-radius: var(--radius); margin-top: 12px; font-size: 13px; color: var(--red); line-height: 1.5; }
        .convert-btn { width: 100%; height: 48px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 15px; font-weight: 500; cursor: pointer; font-family: var(--sans); display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .15s; }
        .convert-btn:hover:not(:disabled) { background: #3D6B20; }
        .convert-btn:disabled { background: var(--border-strong); cursor: not-allowed; color: var(--text-muted); }
        .progress { margin-top: 16px; }
        .progress-top { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted); margin-bottom: 8px; font-family: var(--mono); }
        .progress-bg { height: 6px; background: var(--surface2); border-radius: 100px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--accent-mid); border-radius: 100px; transition: width .3s ease; }
        .result-card { background: var(--surface); border: 1px solid #B8D496; border-radius: var(--radius-lg); padding: 28px; margin-bottom: 16px; text-align: center; }
        .result-icon { font-size: 40px; margin-bottom: 12px; }
        .result-title { font-size: 17px; font-weight: 600; margin-bottom: 6px; }
        .result-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; font-family: var(--mono); }
        .dl-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: var(--accent); color: #fff; border-radius: var(--radius); font-size: 15px; font-weight: 500; cursor: pointer; border: none; font-family: var(--sans); transition: background .15s; margin-bottom: 12px; }
        .dl-btn:hover { background: #3D6B20; }
        .again-btn { display: block; margin: 0 auto; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; text-decoration: underline; font-family: var(--sans); }
        .again-btn:hover { color: var(--text); }
        .footer { text-align: center; font-size: 12px; color: var(--text-muted); margin-top: 8px; line-height: 1.6; }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="badge">iLovePDF API</div>
          <h1>PDF <span>→</span> Word</h1>
          <p className="subtitle">Convert any PDF to an editable .docx file instantly</p>
        </div>

        <div className="steps">
          {['API Key', 'Upload', 'Convert', 'Download'].map((label, i) => (
            <div key={i} className={`step${stepActive(i + 1) ? ' active' : ''}`}>
              <span className="step-num">{i + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {/* API Key */}
        <div className="card">
          <div className="section-label">iLovePDF Public Key</div>
          <div className="api-row">
            <input
              className="api-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="project_public_xxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
            <button className="icon-btn" onClick={() => setShowKey(v => !v)} title="Toggle visibility">
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
          <p className="api-help">
            Get your free key at{' '}
            <a href="https://developer.ilovepdf.com/" target="_blank" rel="noreferrer">
              developer.ilovepdf.com
            </a>{' '}
            → Projects → Public Key
          </p>
        </div>

        {/* Upload */}
        <div className="card">
          <div className="section-label">PDF File</div>
          <div
            className={`drop-zone${dragOver ? ' over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
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

        {/* Convert */}
        {status !== 'done' && (
          <div className="card" style={{ padding: '20px 28px' }}>
            <button className="convert-btn" onClick={convert} disabled={!ready}>
              {status === 'converting' ? '⏳' : '⚡'}
              {status === 'converting' ? 'Converting…' : 'Convert to Word'}
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
            <div className="result-title">Conversion complete!</div>
            <div className="result-sub">{downloadName}</div>
            <button className="dl-btn" onClick={triggerDownload}>⬇ Download .docx</button>
            <button className="again-btn" onClick={reset}>Convert another file</button>
          </div>
        )}

        <p className="footer">
          Files are processed via iLovePDF's secure servers.<br />
          Your API key is never stored — only used for this session.
        </p>
      </div>
    </>
  )
}
