import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'
import EditReportModal from '../components/EditReportModal.jsx'
import { TestsSummary } from '../components/DailyTests.jsx'

const COLOR_MAP = {
  blue:   { bg:'var(--blue-light)',   text:'var(--blue)',   border:'var(--blue-mid)' },
  green:  { bg:'var(--green-light)',  text:'var(--green)',  border:'var(--green-mid)' },
  amber:  { bg:'var(--amber-light)',  text:'var(--amber)',  border:'var(--amber-mid)' },
  red:    { bg:'var(--red-light)',    text:'var(--red)',    border:'var(--red-mid)' },
  purple: { bg:'var(--purple-light)', text:'var(--purple)', border:'#ddd6fe' },
}
const ENG_COLORS = ['blue','green','amber','purple','red','blue','green','amber','purple','red']

function StatCard({ icon, label, value, color, trend }) {
  const c = COLOR_MAP[color]
  return (
    <div style={{
      background:'var(--surface)', borderRadius:'var(--radius-lg)',
      padding:'20px 22px', boxShadow:'var(--shadow)',
      border:'1px solid var(--border)',
      display:'flex', flexDirection:'column', gap:16
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{
          width:40, height:40, borderRadius:12, background:c.bg,
          border:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <i className={`fas fa-${icon}`} style={{ color:c.text, fontSize:16 }} />
        </div>
        {trend && <span style={{ fontSize:11, color:'var(--green)', background:'var(--green-light)', padding:'3px 8px', borderRadius:20, fontWeight:600 }}>{trend}</span>}
      </div>
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:700, color:c.text, letterSpacing:'-.02em', lineHeight:1 }}>{value}</div>
      </div>
    </div>
  )
}

function Badge({ status }) {
  const map = {
    Pending:  { bg:'var(--amber-light)',  color:'var(--amber)',  border:'var(--amber-mid)',  icon:'fa-clock' },
    Verified: { bg:'var(--green-light)',  color:'var(--green)',  border:'var(--green-mid)',  icon:'fa-circle-check' },
    Issue:    { bg:'var(--red-light)',    color:'var(--red)',    border:'var(--red-mid)',    icon:'fa-circle-exclamation' },
  }
  const s = map[status] || map.Pending
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`
    }}>
      <i className={`fas ${s.icon}`} style={{ fontSize:10 }} />
      {status}
    </span>
  )
}

function CheckActions({ reportId, current, onUpdate }) {
  const [loading, setLoading] = useState(false)

  async function setStatus(status) {
    if (status === current) return
    setLoading(true)
    try {
      await api.setCheck(reportId, status)
      onUpdate(reportId, status)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return <div style={{ width:14, height:14, border:'2px solid var(--border2)', borderTopColor:'var(--blue)', borderRadius:'50%' }} className="spin" />

  return (
    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
      <button
        title="Mark as Verified"
        onClick={e => { e.stopPropagation(); setStatus('Verified') }}
        style={{
          width:26, height:26, borderRadius:7, border:'none', cursor:'pointer',
          background: current === 'Verified' ? 'var(--green)' : 'var(--green-light)',
          color: current === 'Verified' ? '#fff' : 'var(--green)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all .15s'
        }}
        onMouseEnter={e => { if (current !== 'Verified') { e.currentTarget.style.background='var(--green)'; e.currentTarget.style.color='#fff' } }}
        onMouseLeave={e => { if (current !== 'Verified') { e.currentTarget.style.background='var(--green-light)'; e.currentTarget.style.color='var(--green)' } }}
      >
        <i className="fas fa-check" style={{ fontSize:11 }} />
      </button>
      <button
        title="Mark as Issue"
        onClick={e => { e.stopPropagation(); setStatus('Issue') }}
        style={{
          width:26, height:26, borderRadius:7, border:'none', cursor:'pointer',
          background: current === 'Issue' ? 'var(--red)' : 'var(--red-light)',
          color: current === 'Issue' ? '#fff' : 'var(--red)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all .15s'
        }}
        onMouseEnter={e => { if (current !== 'Issue') { e.currentTarget.style.background='var(--red)'; e.currentTarget.style.color='#fff' } }}
        onMouseLeave={e => { if (current !== 'Issue') { e.currentTarget.style.background='var(--red-light)'; e.currentTarget.style.color='var(--red)' } }}
      >
        <i className="fas fa-xmark" style={{ fontSize:12 }} />
      </button>
      {current !== 'Pending' && (
        <button
          title="Reset to Pending"
          onClick={e => { e.stopPropagation(); setStatus('Pending') }}
          style={{
            width:26, height:26, borderRadius:7, border:'none', cursor:'pointer',
            background:'var(--surface3)', color:'var(--text3)',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background='var(--border2)'; e.currentTarget.style.color='var(--text2)' }}
          onMouseLeave={e => { e.currentTarget.style.background='var(--surface3)'; e.currentTarget.style.color='var(--text3)' }}
        >
          <i className="fas fa-rotate-left" style={{ fontSize:10 }} />
        </button>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats,          setStats]          = useState(null)
  const [reports,        setReports]        = useState([])
  const [users,          setUsers]          = useState([])
  const [filterEng,      setFilterEng]      = useState('')
  const [filterMonth,    setFilterMonth]    = useState('')
  const [search,         setSearch]         = useState('')
  const [loading,        setLoading]        = useState(true)
  const [activeTab,      setActiveTab]      = useState('reports')
  const [expandedReport, setExpandedReport] = useState(null)
  const [editingReport,  setEditingReport]  = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, r, u] = await Promise.all([
        api.getStats(),
        api.getReports({ engineer_id:filterEng, month:filterMonth, search }),
        api.getUsers()
      ])
      setStats(s); setReports(r); setUsers(u.filter(u => u.role === 'engineer'))
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [filterEng, filterMonth, search])

  useEffect(() => { loadData() }, [loadData])

  async function deleteReport(id) {
    if (!confirm('Delete this report?')) return
    await api.deleteReport(id)
    setReports(r => r.filter(x => x.id !== id))
    loadData()
  }

  function updateReportStatus(id, status) {
    setReports(r => r.map(x => x.id === id ? {...x, check_status: status} : x))
  }

  const months = Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return{label:d.toLocaleDateString('en-GB',{month:'short',year:'numeric'}),value:d.toISOString().slice(0,7)}})
  const hasFilters = search || filterEng || filterMonth

  return (
    <div className="fade-in">
      {/* Stat cards */}
      {stats ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14, marginBottom:28 }}>
          <StatCard icon="file-lines"  label="Total reports"     value={stats.total_reports}                              color="blue"   />
          <StatCard icon="users"       label="Active engineers"  value={`${stats.active_engineers}/${stats.total_engineers}`} color="green"  />
          <StatCard icon="clock"       label="Total overtime"    value={stats.total_overtime}                             color="amber"  />
          <StatCard icon="road"        label="Km driven"         value={`${stats.total_km.toLocaleString()} km`}          color="purple" />
          <StatCard icon="hourglass-half" label="Pending review" value={reports.filter(r => r.check_status === 'Pending').length} color="amber" />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:28 }}>
          {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height:110, borderRadius:'var(--radius-lg)' }} />)}
        </div>
      )}

      {/* Tab bar + export */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <div style={{
          display:'flex', background:'var(--surface)', borderRadius:'var(--radius)',
          border:'1px solid var(--border)', padding:3, gap:2
        }}>
          {[['reports','table-list','All Reports'], ['engineers','users','Per Engineer']].map(([id, icon, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding:'6px 14px', borderRadius:'var(--radius-sm)', border:'none',
              background: activeTab === id ? 'var(--navy)' : 'transparent',
              color: activeTab === id ? '#fff' : 'var(--text2)',
              fontSize:13, fontWeight:500, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
              boxShadow: activeTab === id ? '0 1px 3px rgba(37,99,235,.3)' : 'none',
            }}>
              <i className={`fas fa-${icon}`} style={{ fontSize:12 }} />{label}
            </button>
          ))}
        </div>

        <div style={{ flex:1 }} />

        <button onClick={()=>api.exportCSV({format:'xlsx'})} style={{
          padding:'8px 16px', borderRadius:'var(--radius)', fontSize:13, fontWeight:600,
          border:'1px solid var(--blue-mid)', background:'var(--blue-light)', color:'var(--blue)',
          cursor:'pointer', display:'flex', alignItems:'center', gap:8, marginRight:8 }}>
          <i className="fas fa-file-excel" style={{ fontSize:14 }} /> Excel
        </button>
        <button onClick={()=>api.exportCSV({})} style={{
          padding:'8px 16px', borderRadius:'var(--radius)', fontSize:13, fontWeight:500,
          border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text2)',
          display:'flex', alignItems:'center', gap:7, cursor:'pointer',
          boxShadow:'var(--shadow-sm)'
        }}
          onMouseEnter={e => { e.currentTarget.style.background='var(--surface2)' }}
          onMouseLeave={e => { e.currentTarget.style.background='var(--surface)' }}
        >
          <i className="fas fa-file-csv" style={{ color:'var(--green)', fontSize:14 }} /> Export CSV
        </button>
      </div>

      {/* ── REPORTS TAB ─────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div style={{
          background:'var(--surface)', borderRadius:'var(--radius-lg)',
          border:'1px solid var(--border)', boxShadow:'var(--shadow)', overflow:'hidden'
        }}>
          {/* Filter bar */}
          <div style={{
            padding:'12px 16px', borderBottom:'1px solid var(--border)',
            background:'var(--surface2)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'
          }}>
            <div style={{ position:'relative' }}>
              <i className="fas fa-magnifying-glass" style={{
                position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                color:'var(--text3)', fontSize:13, pointerEvents:'none'
              }} />
              <input placeholder="Search name, date, location, car, site, driver…" value={search}
                onChange={e => setSearch(e.target.value)} style={{ ...fInp, paddingLeft:32, width:220 }} />
            </div>
            <select value={filterEng} onChange={e => setFilterEng(e.target.value)} style={fInp}>
              <option value="">All engineers</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={fInp}>
              <option value="">All months</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setFilterEng(''); setFilterMonth('') }} style={{
                ...fInp, cursor:'pointer', color:'var(--red)', borderColor:'var(--red-mid)',
                background:'var(--red-light)', display:'flex', alignItems:'center', gap:5
              }}>
                <i className="fas fa-xmark" /> Clear filters
              </button>
            )}
            {!loading && <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text3)' }}>
              {reports.length} result{reports.length !== 1 ? 's' : ''}
            </span>}
          </div>

          {/* Table */}
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--surface2)' }}>
                  {['','Day','Date','Engineer','Location','Verify','Start','End','Start km','End km','Shift km','Work hrs','OT','Car plate','Description',''].map((h,i) => (
                    <th key={i} style={{
                      padding:'10px 12px', textAlign:'left', fontWeight:600, fontSize:11,
                      color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em',
                      whiteSpace:'nowrap', borderBottom:'1px solid var(--border)',
                      background:'var(--surface2)'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:5}).map((_,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                      {Array.from({length:16}).map((_,j) => (
                        <td key={j} style={{ padding:'12px' }}>
                          <div className="skeleton" style={{ height:14, width: j===2?120: j===13?80:60, borderRadius:4 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={16} style={{ textAlign:'center', padding:'48px 20px', color:'var(--text3)' }}>
                      <i className="fas fa-inbox" style={{ fontSize:32, display:'block', marginBottom:10, opacity:.4 }} />
                      {hasFilters ? 'No reports match your filters' : 'No reports yet'}
                    </td>
                  </tr>
                ) : reports.map(r => {
                  const expanded = expandedReport === r.id
                  const hasOT = r.overtime && r.overtime !== '00:00'
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => setExpandedReport(expanded ? null : r.id)}
                        style={{
                          borderBottom:'1px solid var(--border)', cursor:'pointer',
                          background: expanded ? 'var(--blue-light)' : 'var(--surface)',
                          transition:'background .12s'
                        }}
                        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background='var(--surface2)' }}
                        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background='var(--surface)' }}
                      >
                        <td style={td}>
                          <i className={`fas fa-chevron-${expanded?'down':'right'}`}
                            style={{ fontSize:10, color:'var(--text3)', marginLeft:4 }} />
                        </td>
                        <td style={td}><span style={{ color:'var(--text3)', fontSize:12 }}>{r.day?.slice(0,3)}</span></td>
                        <td style={{ ...td, fontWeight:500 }}>{r.date}</td>
                        <td style={td}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{
                              width:26, height:26, borderRadius:'50%', flexShrink:0,
                              background:'var(--blue-light)', display:'flex', alignItems:'center',
                              justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--blue)'
                            }}>
                              {r.eng_name?.split(' ').map(w=>w[0]).slice(0,2).join('')}
                            </div>
                            <span style={{ fontWeight:500, fontSize:13 }}>{r.eng_name}</span>
                          </div>
                        </td>
                        <td style={td}>
                          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <i className="fas fa-location-dot" style={{ fontSize:11, color:'var(--text3)' }} />
                            {r.location}
                          </span>
                        </td>
                        <td style={td}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <Badge status={r.check_status} />
                            <CheckActions reportId={r.id} current={r.check_status} onUpdate={updateReportStatus} />
                          </div>
                        </td>
                        <td style={td}>{r.start_time}</td>
                        <td style={td}>{r.end_time}</td>
                        <td style={{ ...td, color:'var(--text2)' }}>{r.start_km?.toLocaleString()}</td>
                        <td style={{ ...td, color:'var(--text2)' }}>{r.end_km?.toLocaleString()}</td>
                        <td style={{ ...td, fontWeight:500 }}>{r.shift_km} km</td>
                        <td style={{ ...td, fontWeight:500, color:'var(--blue)' }}>{r.work_hours}</td>
                        <td style={{ ...td }}>
                          {hasOT
                            ? <span style={{ color:'var(--amber)', fontWeight:600, background:'var(--amber-light)', padding:'2px 7px', borderRadius:20, fontSize:11 }}>+{r.overtime}</span>
                            : <span style={{ color:'var(--text3)', fontSize:12 }}>—</span>
                          }
                        </td>
                        <td style={{ ...td, color:'var(--text2)', fontSize:12 }}>
                          <i className="fas fa-car-side" style={{ marginRight:5, color:'var(--text3)' }} />{r.car_plate}
                        </td>
                        <td style={{ ...td, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text2)' }}>
                          {r.short_desc?.split('\n')[0]}
                        </td>
                        <td style={td} onClick={e => e.stopPropagation()}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={e => { e.stopPropagation(); setEditingReport(r) }}
                              style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text3)', padding:'4px 8px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}
                              onMouseEnter={e => { e.currentTarget.style.color='var(--amber)'; e.currentTarget.style.background='var(--amber-light)'; e.currentTarget.style.borderColor='var(--amber-mid)' }}
                              onMouseLeave={e => { e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.background='none'; e.currentTarget.style.borderColor='var(--border)' }}
                              title="Edit this report">
                              <i className="fas fa-pen" style={{ fontSize:11 }} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); deleteReport(r.id) }}
                              style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text3)', padding:'4px 8px' }}
                              onMouseEnter={e => { e.currentTarget.style.color='var(--red)'; e.currentTarget.style.background='var(--red-light)'; e.currentTarget.style.borderColor='var(--red-mid)' }}
                              onMouseLeave={e => { e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.background='none'; e.currentTarget.style.borderColor='var(--border)' }}>
                              <i className="fas fa-trash" style={{ fontSize:11 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={16} style={{ background:'var(--blue-light)', borderBottom:'1px solid var(--blue-mid)', padding:'16px 24px' }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, fontSize:13 }}>
                              <div>
                                <div style={{ fontWeight:600, marginBottom:8, color:'var(--blue)', fontSize:12, textTransform:'uppercase', letterSpacing:'.05em' }}>
                                  <i className="fas fa-list-check" style={{ marginRight:6 }} />Description & Observations
                                </div>
                                <pre style={{ whiteSpace:'pre-wrap', fontFamily:'inherit', lineHeight:1.7, color:'var(--text2)', background:'#fff', padding:'12px 14px', borderRadius:'var(--radius)', border:'1px solid var(--blue-mid)' }}>{r.short_desc || '—'}</pre>
                              </div>
                              {r.special_requester && (
                                <div>
                                  <div style={{ fontWeight:600, marginBottom:8, color:'var(--blue)', fontSize:12, textTransform:'uppercase', letterSpacing:'.05em' }}>
                                    <i className="fas fa-flask" style={{ marginRight:6 }} />Special Test Requester
                                  </div>
                                  <div style={{ background:'#fff', padding:'12px 14px', borderRadius:'var(--radius)', border:'1px solid var(--blue-mid)', color:'var(--text)' }}>{r.special_requester}</div>
                                </div>
                              )}
                              {(() => {
                                let tests = {}
                                try { tests = JSON.parse(r.daily_tests||'{}') } catch{}
                                return Object.keys(tests).length > 0 ? (
                                  <div>
                                    <div style={{ fontWeight:600, marginBottom:8, color:'var(--blue)', fontSize:12, textTransform:'uppercase', letterSpacing:'.05em' }}>
                                      <i className="fas fa-vial" style={{ marginRight:6 }} />Daily tests
                                    </div>
                                    <div style={{ background:'#fff', padding:'12px 14px', borderRadius:'var(--radius)', border:'1px solid var(--blue-mid)' }}>
                                      <TestsSummary tests={tests} siteId={r.site_id} />
                                    </div>
                                  </div>
                                ) : null
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', background:'var(--surface2)', fontSize:12, color:'var(--text3)', display:'flex', alignItems:'center', gap:6 }}>
            <i className="fas fa-circle-info" style={{ fontSize:11 }} />
            Click any row to expand full description · {reports.length} report{reports.length!==1?'s':''}
          </div>
        </div>
      )}

      {/* ── ENGINEERS TAB ───────────────────────────────── */}
      {activeTab === 'engineers' && stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
          {stats.engineers.map((eng, i) => {
            const initials = eng.name.split(' ').map(w=>w[0]).slice(0,2).join('')
            const c = COLOR_MAP[ENG_COLORS[i % ENG_COLORS.length]]
            const pct = stats.total_reports > 0 ? Math.round(eng.report_count / stats.total_reports * 100) : 0
            return (
              <div key={eng.id} style={{
                background:'var(--surface)', borderRadius:'var(--radius-lg)',
                border:'1px solid var(--border)', padding:'20px 22px',
                boxShadow:'var(--shadow)', transition:'var(--transition)'
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='var(--shadow-md)'; e.currentTarget.style.borderColor=c.border }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.borderColor='var(--border)' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={{
                    width:44, height:44, borderRadius:14,
                    background: `linear-gradient(135deg, ${c.bg}, ${c.border})`,
                    border:`2px solid ${c.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:15, fontWeight:700, color:c.text, flexShrink:0
                  }}>{initials}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{eng.name}</div>
                    <div style={{ fontSize:12, color:'var(--text3)', marginTop:2, display:'flex', alignItems:'center', gap:5 }}>
                      <i className="fas fa-calendar" style={{ fontSize:10 }} />
                      {eng.last_report ? `Last: ${eng.last_report}` : 'No reports yet'}
                    </div>
                  </div>
                </div>

                {/* Mini stats */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                  {[
                    ['Reports', eng.report_count, 'blue', 'file-lines'],
                    ['Km driven', `${eng.total_km.toLocaleString()}`, 'green', 'road'],
                  ].map(([label, val, col, icon]) => (
                    <div key={label} style={{
                      background:'var(--surface2)', borderRadius:'var(--radius)', padding:'10px 12px',
                      border:'1px solid var(--border)'
                    }}>
                      <div style={{ fontSize:11, color:'var(--text3)', marginBottom:3, display:'flex', alignItems:'center', gap:5 }}>
                        <i className={`fas fa-${icon}`} style={{ fontSize:10 }} />{label}
                      </div>
                      <div style={{ fontSize:18, fontWeight:700, color:`var(--${col})` }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Activity bar */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)', marginBottom:5 }}>
                    <span>Share of all reports</span><span style={{ fontWeight:600 }}>{pct}%</span>
                  </div>
                  <div style={{ height:5, background:'var(--surface3)', borderRadius:10, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', width:`${pct}%`, borderRadius:10,
                      background:`linear-gradient(90deg, ${c.text}, ${c.border})`,
                      transition:'width .6s ease'
                    }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingReport && (
        <EditReportModal
          report={editingReport}
          isAdmin={true}
          onClose={() => setEditingReport(null)}
          onSaved={() => { loadData(); setEditingReport(null) }}
        />
      )}
    </div>
  )
}

const fInp = {
  padding:'7px 11px', borderRadius:'var(--radius)', fontSize:13,
  border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text)', outline:'none'
}

const td = { padding:'11px 12px', fontSize:13, whiteSpace:'nowrap', verticalAlign:'middle' }
