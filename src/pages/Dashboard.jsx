import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#0F0F13', surface: '#16161C', card: '#1C1C24', border: '#2A2A36',
  accent: '#7C5CFC', accentSoft: '#7C5CFC22', accentHover: '#9B7FFF',
  teal: '#00D4AA', tealSoft: '#00D4AA18',
  coral: '#FF6B6B', coralSoft: '#FF6B6B18',
  amber: '#FFB84D', amberSoft: '#FFB84D18',
  green: '#4DFFB4', greenSoft: '#4DFFB418',
  text: '#F0EEF8', muted: '#A0A0B8', dim: '#6A6A80',
}

const STATUS_CFG = {
  Pending:   { color: C.amber,  bg: C.amberSoft,  icon: '⏳' },
  Working:   { color: C.teal,   bg: C.tealSoft,   icon: '⚡' },
  Review:    { color: C.coral,  bg: C.coralSoft,  icon: '👁' },
  Completed: { color: C.green,  bg: C.greenSoft,  icon: '✓' },
}
const STATUSES = ['Pending', 'Working', 'Review', 'Completed']
const PRIORITY_CFG = {
  High:   { color: C.coral },
  Medium: { color: C.amber },
  Low:    { color: C.teal },
}

const Avatar = ({ profile, size = 36 }) => {
  const col = profile?.avatar_color || C.accent
  const init = profile?.avatar_initials || profile?.name?.slice(0,2).toUpperCase() || '??'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: col + '33', border: `2px solid ${col}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33, fontWeight: 700, color: col, flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>{init}</div>
  )
}
const Tag = ({ label }) => (
  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: C.accentSoft, color: '#B09FFF', fontFamily: "'DM Mono',monospace", border: `1px solid ${C.accent}44` }}>{label}</span>
)
const Badge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Pending
  return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 600, border: `1px solid ${cfg.color}55`, display:'inline-flex', alignItems:'center', gap:4 }}>{cfg.icon} {status}</span>
}

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [tasks, setTasks] = useState([])
  const [messages, setMessages] = useState([])
  const [view, setView] = useState('board')
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [filterMember, setFilterMember] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    const taskSub = supabase.channel('tasks-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasks())
      .subscribe()
    const msgSub = supabase.channel('messages-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => { taskSub.unsubscribe(); msgSub.unsubscribe() }
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, view])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadProfile(), loadProfiles(), loadTasks(), loadMessages()])
    setLoading(false)
  }

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data)
  }
  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setProfiles(data || [])
  }
  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data || [])
  }
  const loadMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at').limit(100)
    setMessages(data || [])
  }
  const loadComments = async (taskId) => {
    const { data } = await supabase.from('comments').select('*').eq('task_id', taskId).order('created_at')
    setSelectedTask(prev => prev ? { ...prev, comments: data || [] } : null)
  }

  const getProfile = (id) => profiles.find(p => p.id === id)

  const updateTaskStatus = async (taskId, newStatus) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    if (selectedTask?.id === taskId) setSelectedTask(prev => ({ ...prev, status: newStatus }))
  }

  const sendMessage = async () => {
    if (!chatInput.trim()) return
    await supabase.from('messages').insert({ user_id: session.user.id, content: chatInput.trim() })
    setChatInput('')
  }

  const signOut = () => supabase.auth.signOut()

  const navigate = (v) => { setView(v); setSidebarOpen(false) }

  if (loading) return (
    <div style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ fontSize: 36 }}>⚡</div>
      <div style={{ color: C.muted, fontSize: 14 }}>Loading TeamFlow…</div>
    </div>
  )

  const filtered = filterMember ? tasks.filter(t => t.assigned_to === filterMember) : tasks
  const stats = { total: tasks.length, pending: tasks.filter(t=>t.status==='Pending').length, working: tasks.filter(t=>t.status==='Working').length, done: tasks.filter(t=>t.status==='Completed').length }

  const navItems = [
    {id:'board',icon:'▦',label:'Task Board'},
    {id:'list', icon:'≡',label:'List View'},
    {id:'chat', icon:'✉',label:'Team Chat'},
    {id:'team', icon:'◎',label:'My Team'},
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        body{background:${C.bg};color:${C.text}}

        .nav-btn{background:none;border:none;cursor:pointer;width:100%;text-align:left;padding:11px 20px;border-radius:10px;display:flex;align-items:center;gap:10px;font-size:14px;font-family:'Outfit',sans-serif;color:${C.muted};transition:all 0.18s;margin-bottom:2px}
        .nav-btn:hover{background:${C.card};color:${C.text}}
        .nav-btn.active{background:${C.accentSoft};color:#B09FFF}

        .btn-primary{background:${C.accent};color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-family:'Outfit',sans-serif;font-weight:600;cursor:pointer;transition:all 0.18s;white-space:nowrap}
        .btn-primary:hover{background:${C.accentHover}}
        .btn-ghost{background:none;border:1px solid ${C.border};color:${C.muted};border-radius:10px;padding:9px 16px;font-size:13px;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.18s}
        .btn-ghost:hover{border-color:${C.accent};color:#B09FFF}

        .card{background:${C.card};border:1px solid ${C.border};border-radius:14px}
        .inp{background:${C.surface};border:1px solid ${C.border};color:${C.text};border-radius:10px;padding:10px 14px;font-size:14px;font-family:'Outfit',sans-serif;outline:none;transition:border-color 0.18s;width:100%}
        .inp:focus{border-color:${C.accent}}
        .inp::placeholder{color:${C.dim}}
        select.inp option{background:${C.surface};color:${C.text}}

        .task-card{background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:14px;cursor:pointer;transition:all 0.18s;margin-bottom:10px}
        .task-card:hover{border-color:${C.accent}55;transform:translateY(-1px);box-shadow:0 4px 20px #0008}

        .overlay{position:fixed;inset:0;background:#000b;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal{background:${C.surface};border:1px solid ${C.border};border-radius:20px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;padding:24px}

        .chip{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:30px;cursor:pointer;transition:all 0.18s;border:1px solid transparent;font-size:13px;color:${C.muted};white-space:nowrap}
        .chip:hover,.chip.active{border-color:${C.accent}55;background:${C.accentSoft};color:#B09FFF}

        .pbar{height:4px;border-radius:2px;background:${C.border};overflow:hidden;margin-top:8px}
        .pfill{height:100%;border-radius:2px;transition:width 0.6s ease}

        .col-hdr{padding:11px 14px;border-radius:10px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between}

        /* Mobile sidebar overlay */
        .sidebar-overlay{display:none;position:fixed;inset:0;background:#0009;z-index:150}
        
        /* Layout */
        .app-layout{display:flex;height:100vh;background:${C.bg};color:${C.text};font-family:'Outfit',sans-serif;overflow:hidden}
        
        .sidebar{width:220px;background:${C.surface};border-right:1px solid ${C.border};display:flex;flex-direction:column;flex-shrink:0;transition:transform 0.25s;z-index:160}
        
        .topbar{height:58px;background:${C.surface};border-bottom:1px solid ${C.border};display:flex;align-items:center;padding:0 16px;gap:10px;flex-shrink:0}
        
        .content{flex:1;overflow:auto;padding:20px}

        /* Kanban grid */
        .kanban-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;min-width:0}
        
        /* Stats grid */
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}

        /* Table */
        .table-wrap{overflow-x:auto}
        table{width:100%;border-collapse:collapse;font-size:13px;min-width:600px}
        th{padding:12px 14px;text-align:left;font-size:11px;color:${C.muted};font-family:'DM Mono',monospace;letter-spacing:0.06em;font-weight:500;border-bottom:1px solid ${C.border}}
        td{padding:11px 14px;border-bottom:1px solid ${C.border}18;color:${C.text}}
        tr:hover td{background:${C.surface}}

        label{font-size:11px;color:${C.muted};font-family:'DM Mono',monospace;letter-spacing:0.06em;display:block;margin-bottom:6px}
        textarea.inp{resize:vertical;min-height:70px}

        /* Hamburger button */
        .hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:${C.text};font-size:20px}

        /* MOBILE */
        @media (max-width: 768px) {
          .hamburger{display:flex;align-items:center;justify-content:center}
          
          .sidebar{position:fixed;left:0;top:0;bottom:0;transform:translateX(-100%)}
          .sidebar.open{transform:translateX(0)}
          .sidebar-overlay{display:block}
          
          .kanban-grid{grid-template-columns:1fr;gap:16px}
          .stats-grid{grid-template-columns:repeat(2,1fr)}
          .content{padding:14px}
          
          .modal{padding:18px;max-height:95vh}
          .overlay{padding:10px;align-items:flex-end}
          .modal{border-radius:20px 20px 0 0;max-height:92vh}
          
          .hide-mobile{display:none}
          .topbar{padding:0 12px}
        }

        @media (max-width: 400px) {
          .stats-grid{grid-template-columns:repeat(2,1fr)}
        }
      `}</style>

      <div className="app-layout">
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div style={{ padding: '18px 16px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⚡</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', color: C.text }}>TeamFlow</div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono',monospace" }}>VISUAL STUDIO</div>
              </div>
            </div>

            <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono',monospace", letterSpacing: '0.08em', padding: '0 4px', marginBottom: 6 }}>WORKSPACE</div>
            {navItems.map(n => (
              <button key={n.id} className={`nav-btn ${view === n.id ? 'active' : ''}`} onClick={() => navigate(n.id)}>
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{n.icon}</span>{n.label}
              </button>
            ))}

            {profile?.role === 'admin' && (
              <>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono',monospace", letterSpacing: '0.08em', padding: '12px 4px 6px' }}>ADMIN</div>
                <button className={`nav-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => navigate('admin')}>
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>⚙</span>Admin Panel
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: 'auto', borderTop: `1px solid ${C.border}`, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {profile && <Avatar profile={profile} size={36} />}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}>{profile?.name}</div>
                <div style={{ fontSize: 11, color: '#B09FFF', fontFamily: "'DM Mono',monospace" }}>{profile?.role}</div>
              </div>
            </div>
            <button className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '7px' }} onClick={signOut}>Sign Out</button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Topbar */}
          <div className="topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', color: C.text }}>
                {{ board: 'Task Board', list: 'All Tasks', chat: 'Team Chat', team: 'My Team', admin: 'Admin Panel' }[view]}
              </div>
              <div style={{ fontSize: 11, color: C.muted }} className="hide-mobile">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
            {(view === 'board' || view === 'list') && profile?.role === 'admin' && (
              <button className="btn-primary" onClick={() => setShowNewTask(true)}>+ New Task</button>
            )}
          </div>

          {/* Content */}
          <div className="content">

            {/* BOARD */}
            {view === 'board' && (
              <>
                <div className="stats-grid">
                  {[
                    { label: 'Total Tasks',  value: stats.total,   color: C.accent },
                    { label: 'In Progress',  value: stats.working, color: C.teal },
                    { label: 'Pending',      value: stats.pending, color: C.amber },
                    { label: 'Completed',    value: stats.done,    color: C.green },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.label}</div>
                      <div className="pbar"><div className="pfill" style={{ width: `${stats.total ? (s.value / stats.total) * 100 : 0}%`, background: s.color }} /></div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Filter:</span>
                  <div className={`chip ${!filterMember ? 'active' : ''}`} onClick={() => setFilterMember(null)}>All</div>
                  {profiles.map(p => (
                    <div key={p.id} className={`chip ${filterMember === p.id ? 'active' : ''}`} onClick={() => setFilterMember(p.id)}>
                      <Avatar profile={p} size={20} />{p.name.split(' ')[0]}
                    </div>
                  ))}
                </div>

                <div className="kanban-grid">
                  {STATUSES.map(status => {
                    const cfg = STATUS_CFG[status]
                    const colTasks = filtered.filter(t => t.status === status)
                    return (
                      <div key={status}>
                        <div className="col-hdr" style={{ background: cfg.bg }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{cfg.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{status}</span>
                          </div>
                          <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: 20, padding: '1px 8px' }}>{colTasks.length}</span>
                        </div>
                        {colTasks.map(task => (
                          <TaskCard key={task.id} task={task} getProfile={getProfile}
                            onClick={async () => { const { data } = await supabase.from('comments').select('*').eq('task_id', task.id).order('created_at'); setSelectedTask({ ...task, comments: data || [] }) }} />
                        ))}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* LIST */}
            {view === 'list' && (
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      {['Task', 'Assigned To', 'Priority', 'Status', 'Deadline', 'Update'].map(h => (
                        <th key={h}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(task => {
                      const p = getProfile(task.assigned_to)
                      return (
                        <tr key={task.id} style={{ cursor: 'pointer' }}
                          onClick={async () => { const { data } = await supabase.from('comments').select('*').eq('task_id', task.id).order('created_at'); setSelectedTask({ ...task, comments: data || [] }) }}>
                          <td>
                            <div style={{ fontWeight: 500, color: C.text }}>{task.title}</div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>{(task.tags || []).map(t => <Tag key={t} label={t} />)}</div>
                          </td>
                          <td>{p && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar profile={p} size={24} /><span style={{ color: C.text }}>{p.name.split(' ')[0]}</span></div>}</td>
                          <td><span style={{ color: PRIORITY_CFG[task.priority]?.color || C.muted, fontSize: 12, fontWeight: 600 }}>{task.priority}</span></td>
                          <td><Badge status={task.status} /></td>
                          <td style={{ color: C.muted, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{task.deadline || '—'}</td>
                          <td>
                            <select className="inp" style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }} value={task.status}
                              onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); updateTaskStatus(task.id, e.target.value) }}>
                              {STATUSES.map(s => <option key={s} style={{ background: C.surface, color: C.text }}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CHAT */}
            {view === 'chat' && (
              <div style={{ display: 'flex', gap: 14, height: 'calc(100vh - 100px)' }}>
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
                    <span style={{ fontWeight: 600, color: C.text }}># general</span>
                    <span style={{ fontSize: 12, color: C.muted }}>Team channel</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {messages.map(msg => {
                      const sender = getProfile(msg.user_id)
                      const isMe = msg.user_id === session.user.id
                      return (
                        <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                          {!isMe && sender && <Avatar profile={sender} size={30} />}
                          <div style={{ maxWidth: '75%' }}>
                            {!isMe && <div style={{ fontSize: 11, color: C.muted, marginBottom: 3, marginLeft: 4 }}>{sender?.name}</div>}
                            <div style={{ padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? C.accent : C.card, color: '#F0EEF8', border: isMe ? 'none' : `1px solid ${C.border}`, fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.content}</div>
                            <div style={{ fontSize: 10, color: C.dim, marginTop: 3, textAlign: isMe ? 'right' : 'left', fontFamily: "'DM Mono',monospace" }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
                    <input className="inp" value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message…" style={{ flex: 1 }} />
                    <button className="btn-primary" onClick={sendMessage}>↑</button>
                  </div>
                </div>

                <div className="card hide-mobile" style={{ width: 190, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em', marginBottom: 14 }}>TEAM · {profiles.length}</div>
                  {profiles.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ position: 'relative' }}>
                        <Avatar profile={p} size={30} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, border: `2px solid ${C.card}`, position: 'absolute', bottom: 0, right: 0 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{p.name.split(' ')[0]}</div>
                        <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono',monospace" }}>{p.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TEAM */}
            {view === 'team' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
                {profiles.map(p => {
                  const memberTasks = tasks.filter(t => t.assigned_to === p.id)
                  const done = memberTasks.filter(t => t.status === 'Completed').length
                  return (
                    <div key={p.id} className="card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <Avatar profile={p} size={46} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: p.avatar_color || C.accent, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{p.role.toUpperCase()}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>Assigned</span>
                        <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.text }}>{memberTasks.length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>Completed</span>
                        <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.green }}>{done}</span>
                      </div>
                      <div className="pbar">
                        <div className="pfill" style={{ width: memberTasks.length ? `${(done / memberTasks.length) * 100}%` : '0%', background: p.avatar_color || C.accent }} />
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {memberTasks.slice(0, 3).map(t => (
                          <span key={t.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: C.surface, color: C.muted, border: `1px solid ${C.border}` }}>{t.title.split(' ').slice(0, 2).join(' ')}</span>
                        ))}
                        {memberTasks.length > 3 && <span style={{ fontSize: 10, color: '#B09FFF' }}>+{memberTasks.length - 3} more</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ADMIN */}
            {view === 'admin' && profile?.role === 'admin' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
                <div className="card" style={{ padding: 20, gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: C.text }}>Team Overview</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
                    {[
                      { label: 'Members',       value: profiles.length,                                 color: C.accent },
                      { label: 'Active Tasks',  value: tasks.filter(t => t.status !== 'Completed').length, color: C.teal },
                      { label: 'Completed',     value: tasks.filter(t => t.status === 'Completed').length, color: C.green },
                      { label: 'High Priority', value: tasks.filter(t => t.priority === 'High').length,    color: C.coral },
                    ].map(s => (
                      <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: C.text }}>Team Members</div>
                  {profiles.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}22` }}>
                      <Avatar profile={p} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{tasks.filter(t => t.assigned_to === p.id).length} tasks</div>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: p.role === 'admin' ? C.accentSoft : C.tealSoft, color: p.role === 'admin' ? '#B09FFF' : C.teal, fontFamily: "'DM Mono',monospace" }}>{p.role}</span>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: C.text }}>Task Distribution</div>
                  {profiles.map(p => {
                    const count = tasks.filter(t => t.assigned_to === p.id).length
                    return (
                      <div key={p.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: C.text }}>{p.name.split(' ')[0]}</span>
                          <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.muted }}>{count}</span>
                        </div>
                        <div className="pbar" style={{ height: 6 }}>
                          <div className="pfill" style={{ width: tasks.length ? `${(count / tasks.length) * 100}%` : '0%', background: p.avatar_color || C.accent }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} getProfile={getProfile} currentUserId={session.user.id}
          onClose={() => setSelectedTask(null)}
          onStatusChange={s => updateTaskStatus(selectedTask.id, s)}
          onAddComment={async text => {
            await supabase.from('comments').insert({ task_id: selectedTask.id, user_id: session.user.id, content: text })
            loadComments(selectedTask.id)
          }}
        />
      )}

      {showNewTask && (
        <NewTaskModal profiles={profiles} onClose={() => setShowNewTask(false)}
          onCreate={async form => {
            await supabase.from('tasks').insert({ ...form, created_by: session.user.id })
            loadTasks(); setShowNewTask(false)
          }}
        />
      )}
    </>
  )
}

function TaskCard({ task, getProfile, onClick }) {
  const p = getProfile(task.assigned_to)
  const cfg = STATUS_CFG[task.status] || STATUS_CFG.Pending
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed'
  return (
    <div className="task-card" onClick={onClick} style={{ borderLeft: `3px solid ${cfg.color}88` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1, marginRight: 8, color: '#F0EEF8' }}>{task.title}</div>
        {p && <Avatar profile={p} size={26} />}
      </div>
      {task.description && (
        <div style={{ fontSize: 12, color: '#A0A0B8', lineHeight: 1.5, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.description}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>{(task.tags || []).map(t => <Tag key={t} label={t} />)}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: isOverdue ? '#FF6B6B' : '#A0A0B8', fontFamily: "'DM Mono',monospace" }}>{isOverdue ? '⚠ ' : ''}{task.deadline || 'No deadline'}</span>
        <span style={{ color: PRIORITY_CFG[task.priority]?.color || '#A0A0B8', fontSize: 11, fontWeight: 600 }}>{task.priority}</span>
      </div>
    </div>
  )
}

function TaskModal({ task, getProfile, currentUserId, onClose, onStatusChange, onAddComment }) {
  const [comment, setComment] = useState('')
  const p = getProfile(task.assigned_to)
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>{(task.tags || []).map(t => <Tag key={t} label={t} />)}</div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px', color: '#F0EEF8' }}>{task.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#A0A0B8', cursor: 'pointer', fontSize: 20, marginLeft: 10, padding: 4 }}>✕</button>
        </div>
        {task.description && <div style={{ background: '#0F0F13', borderRadius: 10, padding: 14, marginBottom: 18, fontSize: 13, color: '#A0A0B8', lineHeight: 1.7 }}>{task.description}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Assigned to', value: p ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar profile={p} size={20} /><span style={{ color: '#F0EEF8' }}>{p.name}</span></div> : <span style={{ color: '#A0A0B8' }}>Unassigned</span> },
            { label: 'Deadline',    value: <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#F0EEF8' }}>{task.deadline || '—'}</span> },
            { label: 'Priority',    value: <span style={{ color: PRIORITY_CFG[task.priority]?.color || '#A0A0B8', fontWeight: 600 }}>{task.priority}</span> },
            { label: 'Status',      value: <Badge status={task.status} /> },
          ].map(item => (
            <div key={item.label} style={{ background: '#0F0F13', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, color: '#6A6A80', fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em', marginBottom: 5 }}>{item.label.toUpperCase()}</div>
              <div style={{ fontSize: 13 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: '#A0A0B8', fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em', marginBottom: 8 }}>UPDATE STATUS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => {
              const cfg = STATUS_CFG[s]; const active = task.status === s
              return <button key={s} onClick={() => onStatusChange(s)} style={{ padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontFamily: "'Outfit',sans-serif", fontWeight: 500, transition: 'all 0.18s', background: active ? cfg.bg : 'transparent', border: `1px solid ${active ? cfg.color : '#2A2A36'}`, color: active ? cfg.color : '#A0A0B8' }}>{cfg.icon} {s}</button>
            })}
          </div>
        </div>

        <div style={{ borderTop: `1px solid #2A2A36`, paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: '#A0A0B8', fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em', marginBottom: 12 }}>COMMENTS ({(task.comments || []).length})</div>
          {(task.comments || []).map((c, i) => {
            const sender = getProfile(c.user_id)
            return (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {sender && <Avatar profile={sender} size={28} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#A0A0B8', marginBottom: 3 }}>{sender?.name} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div style={{ fontSize: 13, background: '#0F0F13', borderRadius: 10, padding: '8px 12px', lineHeight: 1.5, color: '#F0EEF8' }}>{c.content}</div>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input className="inp" value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) { onAddComment(comment.trim()); setComment('') } }}
              placeholder="Add a comment…" style={{ flex: 1 }} />
            <button className="btn-primary" onClick={() => { if (comment.trim()) { onAddComment(comment.trim()); setComment('') } }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewTaskModal({ profiles, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', description: '', deadline: '', assigned_to: profiles[0]?.id || '', status: 'Pending', priority: 'Medium', tags: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F0EEF8' }}>Create New Task</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#A0A0B8', cursor: 'pointer', fontSize: 20, padding: 4 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label>TASK TITLE *</label><input className="inp" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Logo Design for Client X" /></div>
          <div><label>DESCRIPTION</label><textarea className="inp" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Task details…" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label>ASSIGN TO</label>
              <select className="inp" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label>DEADLINE</label><input className="inp" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} /></div>
            <div>
              <label>PRIORITY</label>
              <select className="inp" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label>STATUS</label>
              <select className="inp" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label>TAGS (comma separated)</label><input className="inp" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Design, Branding, UI" /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={() => { if (!form.title.trim()) return; onCreate({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }) }}>Create Task ↗</button>
          </div>
        </div>
      </div>
    </div>
  )
}
