import { useEffect, useMemo, useState } from 'react'
import { UserRound, ClipboardList, Package, Truck, CalendarDays, ClipboardEdit, Search, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Apply() {
  const [tab, setTab] = useState('apply')
  return (
    <>
      <div className="tabs-row">
        <button className={`tab-btn ${tab === 'apply' ? 'active' : ''}`} onClick={() => setTab('apply')}>
          <ClipboardEdit size={17} /> 填寫申請
        </button>
        <button className={`tab-btn ${tab === 'status' ? 'active' : ''}`} onClick={() => setTab('status')}>
          <Search size={17} /> 查詢申請狀態
        </button>
      </div>
      {tab === 'apply' ? <ApplyForm /> : <StatusLookup />}
    </>
  )
}

function SectionCard({ icon, iconBg, title, subtitle, children }) {
  return (
    <div className="card">
      <div className="section-card-head">
        <div className="section-icon" style={{ background: iconBg }}>{icon}</div>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function emptyItem() { return { id: 'i' + Math.random().toString(36).slice(2), product: '', spec: '', qty: '', amount: '' } }
function lineTotal(i) { return (Number(i.qty) || 0) * (Number(i.amount) || 0) }

function ApplyForm() {
  const [roster, setRoster] = useState([])
  const [project, setProject] = useState('')
  const [name, setName] = useState('')
  const [eventTheme, setEventTheme] = useState('')
  const [eventStart, setEventStart] = useState('')
  const [eventEnd, setEventEnd] = useState('')
  const [eventContent, setEventContent] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('roster').select('*').then(({ data }) => setRoster(data || []))
  }, [])

  const projects = useMemo(() => [...new Set(roster.map(r => r.project))], [roster])
  const namesForProject = useMemo(() => roster.filter(r => r.project === project), [roster, project])
  const selected = useMemo(() => namesForProject.find(r => r.applicant_name === name), [namesForProject, name])
  const itemsTotal = items.reduce((sum, i) => sum + lineTotal(i), 0)

  function updateItem(id, key, value) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: value } : i))
  }
  function addItem() { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(id) { setItems(prev => prev.length === 1 ? prev : prev.filter(i => i.id !== id)) }

  function formatDate(d) {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return `${y}/${m}/${day}`
  }

  async function submit(e) {
    e.preventDefault()
    if (!selected) { setMsg({ type: 'err', text: '請先選擇項目與申請人' }); return }
    if (!eventTheme || !eventStart || !eventEnd || !eventContent) { setMsg({ type: 'err', text: '請完整填寫企劃書內容' }); return }
    if (eventEnd < eventStart) { setMsg({ type: 'err', text: '結束日期不能早於開始日期' }); return }
    const validItems = items.filter(i => i.product && i.spec && i.qty && i.amount)
    if (validItems.length === 0) { setMsg({ type: 'err', text: '請至少填寫一項公關品品項' }); return }
    if (!recipientName || !recipientPhone || !recipientAddress) { setMsg({ type: 'err', text: '請完整填寫收件資訊' }); return }

    setLoading(true)
    setMsg(null)
    const { error } = await supabase.from('applications').insert({
      roster_id: selected.id,
      project: selected.project,
      rank: selected.rank,
      applicant_name: selected.applicant_name,
      subsidy_amount: selected.subsidy_amount,
      event_theme: eventTheme,
      event_period: `${formatDate(eventStart)} - ${formatDate(eventEnd)}`,
      event_content: eventContent,
      items: validItems,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress,
    })
    setLoading(false)
    if (error) {
      setMsg({ type: 'err', text: '送出失敗，請稍後再試 (' + error.message + ')' })
    } else {
      setMsg({ type: 'ok', text: '申請已送出！可以到「查詢申請狀態」查看審核進度。' })
      setEventTheme(''); setEventStart(''); setEventEnd(''); setEventContent('')
      setItems([emptyItem()])
      setRecipientName(''); setRecipientPhone(''); setRecipientAddress('')
    }
  }

  return (
    <form onSubmit={submit}>
      <SectionCard icon={<UserRound size={20} color="#3A5872" />} iconBg="var(--blue-bg)" title="選擇你的申請資格" subtitle="項目與補助金額由公司統一設定">
        <div className="field">
          <label>項目</label>
          <select value={project} onChange={e => { setProject(e.target.value); setName('') }} required>
            <option value="">請選擇項目</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label>申請人</label>
          <select value={name} onChange={e => setName(e.target.value)} required disabled={!project}>
            <option value="">請選擇姓名</option>
            {namesForProject.map(r => <option key={r.id} value={r.applicant_name}>{r.applicant_name}</option>)}
          </select>
        </div>
        {selected && (
          <div className="grid-2">
            <div className="field">
              <label>位階</label>
              <span className="readonly-chip chip-blue">{selected.rank}</span>
            </div>
            <div className="field">
              <label>商品補助金</label>
              <span className="readonly-chip chip-sage">NT$ {Number(selected.subsidy_amount).toLocaleString()}</span>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard icon={<ClipboardList size={20} color="#8A6A3A" />} iconBg="var(--tan-bg)" title="企劃書內容" subtitle="請填寫本次公關品活動的企劃內容">
        <div className="field">
          <label>活動主題</label>
          <input type="text" value={eventTheme} onChange={e => setEventTheme(e.target.value)} required placeholder="例如：夏日新品體驗會" />
        </div>
        <div className="field">
          <label>活動期間</label>
          <div className="grid-date-2">
            <div className="date-field">
              <CalendarDays size={16} />
              <input type="date" value={eventStart} onChange={e => setEventStart(e.target.value)} required />
            </div>
            <div className="date-field">
              <CalendarDays size={16} />
              <input type="date" value={eventEnd} onChange={e => setEventEnd(e.target.value)} required />
            </div>
          </div>
          <div className="date-hint">左邊選開始日期、右邊選結束日期</div>
        </div>
        <div className="field">
          <label>活動內容</label>
          <textarea value={eventContent} onChange={e => setEventContent(e.target.value)} required placeholder="請說明活動執行方式、預計參與對象、公關品運用方式等" />
        </div>
      </SectionCard>

      <SectionCard icon={<Package size={20} color="#8A6A3A" />} iconBg="var(--tan-bg)" title="公關品統整" subtitle="列出本次申請的公關品品項">
        {items.map(item => (
          <div className="item-card" key={item.id}>
            <div className="field">
              <label>商品</label>
              <input type="text" value={item.product} onChange={e => updateItem(item.id, 'product', e.target.value)} placeholder="商品名稱" />
            </div>
            <div className="field">
              <label>規格</label>
              <input type="text" value={item.spec} onChange={e => updateItem(item.id, 'spec', e.target.value)} placeholder="例如：粉色 / M號" />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>數量</label>
                <input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} placeholder="0" />
              </div>
              <div className="field">
                <label>金額</label>
                <input type="number" value={item.amount} onChange={e => updateItem(item.id, 'amount', e.target.value)} placeholder="單價" />
              </div>
            </div>
            <div className="item-card-row">
              <span className="item-subtotal">小計：NT$ {lineTotal(item).toLocaleString()}</span>
              <button type="button" className="item-remove-btn" onClick={() => removeItem(item.id)}><Trash2 size={13} />刪除</button>
            </div>
          </div>
        ))}
        <button type="button" className="add-item-btn" onClick={addItem}><Plus size={15} />新增品項</button>
        <div className="items-total-row">
          <span>總計</span>
          <span className="amount">NT$ {itemsTotal.toLocaleString()}</span>
        </div>
      </SectionCard>

      <SectionCard icon={<Truck size={20} color="#3A5872" />} iconBg="var(--blue-bg)" title="收件資訊" subtitle="公關品寄送資訊">
        <div className="field">
          <label>收件人姓名</label>
          <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} required placeholder="請填寫收件人姓名" />
        </div>
        <div className="field">
          <label>聯絡電話</label>
          <input type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} required placeholder="請填寫聯絡電話" />
        </div>
        <div className="field">
          <label>收件地址</label>
          <input type="text" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} required placeholder="請填寫完整收件地址" />
        </div>
      </SectionCard>

      {msg && <div className={`msg ${msg.type === 'ok' ? 'msg-ok' : 'msg-err'}`}>{msg.text}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? '送出中...' : '送出申請'}
      </button>
    </form>
  )
}

function StatusLookup() {
  const [roster, setRoster] = useState([])
  const [project, setProject] = useState('')
  const [name, setName] = useState('')
  const [apps, setApps] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('roster').select('*').then(({ data }) => setRoster(data || []))
  }, [])

  const projects = [...new Set(roster.map(r => r.project))]
  const namesForProject = roster.filter(r => r.project === project)

  async function lookup(e) {
    e.preventDefault()
    setLoading(true)
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('applicant_name', name)
      .eq('project', project)
      .order('submitted_at', { ascending: false })
    setApps(data || [])
    setLoading(false)
  }

  return (
    <>
      <form onSubmit={lookup}>
        <SectionCard icon={<Search size={20} color="#3A5872" />} iconBg="var(--blue-bg)" title="查詢我的申請" subtitle="選擇項目與姓名，查看該項目下的申請狀態">
          <div className="field">
            <label>項目</label>
            <select value={project} onChange={e => { setProject(e.target.value); setName('') }} required>
              <option value="">請選擇項目</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>申請人姓名</label>
            <select value={name} onChange={e => setName(e.target.value)} required disabled={!project}>
              <option value="">請選擇姓名</option>
              {namesForProject.map(r => <option key={r.id} value={r.applicant_name}>{r.applicant_name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '查詢中...' : '查詢'}
          </button>
        </SectionCard>
      </form>

      {apps && (
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>申請紀錄</h2>
          {apps.length === 0 && <div className="empty">目前沒有申請紀錄</div>}
          {apps.map(a => (
            <div className="app-row" key={a.id}>
              <div className="app-row-head">
                <span className="app-row-title">{a.event_theme}</span>
                <span className={`status-badge status-${a.status}`}>{a.status}</span>
              </div>
              <div className="app-row-meta" style={{ marginBottom: 10 }}>{a.project} · {a.event_period}</div>

              {a.items && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>公關品統整</div>
                  <ol style={{ fontSize: 12.5, color: 'var(--ink-soft)', paddingLeft: 18, margin: 0 }}>
                    {a.items.map((i, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{i.product}（{i.spec}）x{i.qty}　NT$ {((Number(i.qty) || 0) * (Number(i.amount) || 0)).toLocaleString()}</li>
                    ))}
                  </ol>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>
                    總計：NT$ {a.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.amount) || 0), 0).toLocaleString()}
                  </div>
                </div>
              )}

              {a.recipient_name && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>收件資訊</div>
                  <div className="app-row-meta">收件人姓名：{a.recipient_name}</div>
                  <div className="app-row-meta">聯絡電話：{a.recipient_phone}</div>
                  <div className="app-row-meta">收件地址：{a.recipient_address}</div>
                </div>
              )}

              {a.status === '退回' && a.review_note && <div className="app-row-meta" style={{ marginTop: 8 }}>退回原因：{a.review_note}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
