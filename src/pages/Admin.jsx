import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, LogOut, ClipboardList, UserRound, Check, X, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Header from '../components/Header.jsx'

export default function Admin() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <>
      <Header right={
        session ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link to="/" className="brand-nav" style={{ textDecoration: 'none' }}><ShieldCheck size={16} />回到申請頁</Link>
            <button className="brand-nav" onClick={() => supabase.auth.signOut()}><LogOut size={16} />登出</button>
          </div>
        ) : (
          <Link to="/" className="brand-nav" style={{ textDecoration: 'none' }}><ShieldCheck size={16} />回到申請頁</Link>
        )
      } />
      <div className="shell">
        {!session ? <Login /> : <AdminHome />}
      </div>
    </>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  async function login(e) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setErr('登入失敗，請確認帳號密碼')
  }

  return (
    <div className="login-wrap">
      <form className="card" onSubmit={login}>
        <h2>管理者登入</h2>
        <p className="sub">僅限管理者使用</p>
        <div className="field">
          <label>Email</label>
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>密碼</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {err && <div className="msg msg-err">{err}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '登入中...' : '登入'}
        </button>
      </form>
    </div>
  )
}

function AdminHome() {
  const [tab, setTab] = useState('review')
  return (
    <>
      <div className="tabs-row">
        <button className={`tab-btn ${tab === 'review' ? 'active' : ''}`} onClick={() => setTab('review')}>
          <ClipboardList size={17} /> 審核申請
        </button>
        <button className={`tab-btn ${tab === 'roster' ? 'active' : ''}`} onClick={() => setTab('roster')}>
          <UserRound size={17} /> 名單管理
        </button>
      </div>
      {tab === 'review' ? <ReviewApplications /> : <RosterManager />}
    </>
  )
}

function ReviewApplications() {
  const [apps, setApps] = useState([])
  const [filter, setFilter] = useState('待審')
  const [notes, setNotes] = useState({})

  async function load() {
    let q = supabase.from('applications').select('*').order('submitted_at', { ascending: false })
    if (filter !== '全部') q = q.eq('status', filter)
    const { data } = await q
    setApps(data || [])
  }

  useEffect(() => { load() }, [filter])

  async function review(id, status) {
    await supabase.from('applications').update({
      status,
      review_note: notes[id] || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    load()
  }

  return (
    <div className="card">
      <h2>審核申請</h2>
      <p className="sub">核准或退回經銷商核心送出的公關品申請</p>

      <div className="field" style={{ maxWidth: 220 }}>
        <label>篩選狀態</label>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="待審">待審</option>
          <option value="核准">已核准</option>
          <option value="退回">已退回</option>
          <option value="全部">全部</option>
        </select>
      </div>

      {apps.length === 0 && <div className="empty">目前沒有符合條件的申請</div>}

      {apps.map(a => (
        <div className="app-row" key={a.id}>
          <div className="app-row-head">
            <span className="app-row-title">{a.applicant_name} · {a.event_theme}</span>
            <span className={`status-badge status-${a.status}`}>{a.status}</span>
          </div>
          <div className="app-row-meta">{a.project} · {a.rank} · 補助金 NT$ {Number(a.subsidy_amount).toLocaleString()}</div>
          <div className="app-row-meta">活動期間：{a.event_period}</div>
          <div className="app-row-content">{a.event_content}</div>
          {a.items && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>公關品統整</div>
              {a.items.map((i, idx) => (
                <div key={idx} style={{ marginBottom: 8, paddingLeft: 4 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>
                    {idx + 1}. {i.product}（{i.spec}）x{i.qty}　NT$ {((Number(i.qty) || 0) * (Number(i.amount) || 0)).toLocaleString()}
                  </div>
                  {i.recipientName && (
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', paddingLeft: 14 }}>
                      收件：{i.recipientName} · {i.recipientPhone} · {i.recipientAddress}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>
                總計：NT$ {a.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.amount) || 0), 0).toLocaleString()}
              </div>
            </div>
          )}

          {a.status === '待審' && (
            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="備註（退回時建議填寫原因）"
                value={notes[a.id] || ''}
                onChange={e => setNotes({ ...notes, [a.id]: e.target.value })}
                style={{ marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-approve btn-sm" onClick={() => review(a.id, '核准')}><Check size={13} />核准</button>
                <button className="btn btn-danger btn-sm" onClick={() => review(a.id, '退回')}><X size={13} />退回</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RosterManager() {
  const [roster, setRoster] = useState([])
  const [form, setForm] = useState({ project: '', rank: '', applicant_name: '', subsidy_amount: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function load() {
    const { data } = await supabase.from('roster').select('*').order('created_at', { ascending: false })
    setRoster(data || [])
  }
  useEffect(() => { load() }, [])

  async function addRow(e) {
    e.preventDefault()
    if (!form.project || !form.rank || !form.applicant_name || !form.subsidy_amount) {
      setErr('請完整填寫所有欄位')
      return
    }
    setErr(null)
    setSaving(true)
    await supabase.from('roster').insert({
      ...form,
      subsidy_amount: Number(form.subsidy_amount),
    })
    setSaving(false)
    setForm({ ...form, applicant_name: '', subsidy_amount: '' })
    load()
  }

  async function removeRow(id) {
    const person = roster.find(r => r.id === id)
    const ok = window.confirm(
      person
        ? `刪除「${person.applicant_name}（${person.project}）」後，這個人在此項目底下送出的申請紀錄也會一併刪除，確定要刪除嗎？`
        : '確定要刪除嗎？'
    )
    if (!ok) return
    if (person) {
      const { error: e1 } = await supabase.from('applications').delete().eq('project', person.project).eq('applicant_name', person.applicant_name)
      if (e1) { alert('刪除申請紀錄時發生錯誤：' + e1.message); return }
    }
    const { error: e2 } = await supabase.from('roster').delete().eq('id', id)
    if (e2) { alert('刪除名單時發生錯誤：' + e2.message); return }
    load()
  }

  async function clearAll() {
    const ok = window.confirm('確定要刪除「所有」名單與申請紀錄嗎？這個動作無法復原，通常只在測試完、要正式上線前清空測試資料時使用。')
    if (!ok) return
    const ok2 = window.confirm('再次確認：這會把目前系統裡所有名單與所有申請紀錄「全部」刪除，確定嗎？')
    if (!ok2) return
    const { error: e1 } = await supabase.from('applications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (e1) { alert('清空申請紀錄時發生錯誤：' + e1.message); return }
    const { error: e2 } = await supabase.from('roster').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (e2) { alert('清空名單時發生錯誤：' + e2.message); return }
    alert('已清空所有名單與申請紀錄')
    load()
  }

  return (
    <>
      <div className="card">
        <h2>新增名單</h2>
        <p className="sub">每季更新項目、位階、申請人與補助金額</p>
        <form onSubmit={addRow}>
          <div className="grid-2">
            <div className="field">
              <label>項目</label>
              <input type="text" placeholder="例如：26Q3 團隊長公關品贊助" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required />
            </div>
            <div className="field">
              <label>位階</label>
              <input type="text" placeholder="例如：團隊長" value={form.rank} onChange={e => setForm({ ...form, rank: e.target.value })} required />
            </div>
          </div>
          <div className="field">
            <label>申請人</label>
            <input type="text" value={form.applicant_name} onChange={e => setForm({ ...form, applicant_name: e.target.value })} required />
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>商品補助金</label>
            <input type="number" value={form.subsidy_amount} onChange={e => setForm({ ...form, subsidy_amount: e.target.value })} required />
          </div>
          {err && <div className="msg msg-err">{err}</div>}
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? '新增中...' : '新增這筆'}</button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2>目前名單</h2>
          {roster.length > 0 && (
            <button className="link-muted" onClick={clearAll} style={{ color: 'var(--reject-btn)' }}>
              <Trash2 size={13} />清空全部名單與申請紀錄
            </button>
          )}
        </div>
        {roster.length === 0 ? <div className="empty">尚未新增任何名單</div> : (
          <table className="roster-table">
            <thead>
              <tr><th>項目</th><th>位階</th><th>申請人</th><th>補助金</th><th></th></tr>
            </thead>
            <tbody>
              {roster.map(r => (
                <tr key={r.id}>
                  <td>{r.project}</td>
                  <td>{r.rank}</td>
                  <td>{r.applicant_name}</td>
                  <td>NT$ {Number(r.subsidy_amount).toLocaleString()}</td>
                  <td><button className="link-muted" onClick={() => removeRow(r.id)}><Trash2 size={14} />刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
