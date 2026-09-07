import React, { useState, useEffect } from 'react'
import { api } from '../api.js'
import EditReportModal from '../components/EditReportModal.jsx'

function StatusBadge({ status }) {
  const cfg = {
    Pending:  { bg:'var(--amber-light)', color:'var(--amber)', border:'var(--amber-mid)', icon:'fa-clock' },
    Verified: { bg:'var(--green-light)', color:'var(--green)', border:'var(--green-mid)', icon:'fa-circle-check' },
    Issue:    { bg:'var(--red-l)',       color:'var(--red)',   border:'var(--red-m)',     icon:'fa-circle-exclamation' },
  }[status] || { bg:'var(--amber-light)', color:'var(--amber)', border:'var(--amber-mid)', icon:'fa-clock' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
      <i className={`fas ${cfg.icon}`} style={{ fontSize:9 }}/>{status}
    </span>
  )
}

function PunchSummary({ punches }) {
  if (!punches || punches.length === 0) return <span style={{ color:'var(--text3)', fontSize:12 }}>—</span>
  const first = punches[0]
  const last  = punches[punches.length - 1]
  const totalMins = punches.reduce((sum, p) => {
    if (!p.punch_in || !p.punch_out) return sum
    const [h1,m1] = p.punch_in.split(':').map(Number)
    const [h2,m2] = p.punch_out.split(':').map(Number)
    let m = (h2*60+m2) - (h1*60+m1); if (m<0) m+=1440; return sum+m
  }, 0)
  const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
  return (
    <div style={{ fontSize:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <span style={{ color:'var(--green)', fontWeight:600 }}>{first.punch_in}</span>
        <i className="fas fa-arrow-right" style={{ fontSize:9, color:'var(--text3)' }}/>
        <span style={{ color:last.punch_out?'var(--red)':'var(--amber)', fontWeight:600 }}>
          {last.punch_out || 'Open'}
        </span>
      </div>
      {punches.length > 1 && <div style={{ fontSize:10, color:'var(--text3)' }}>{punches.length} punches · {fmt(totalMins)} total</div>}
      {punches.length === 1 && last.punch_out && <div style={{ fontSize:10, color:'var(--text3)' }}>{fmt(totalMins)}</div>}
    </div>
  )
}

export default function MyReports({ user }) {
  const [reports,     setReports]     = useState([])
  const [punchMap,    setPunchMap]     = useState({}) // date -> [punches]
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState(null)
  const [filterMonth, setFilterMonth] = useState('')
  const [expanded,    setExpanded]    = useState(null)

  const months = Array.from({length:12},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-i)
    return { label:d.toLocaleDateString('en-GB',{month:'short',year:'numeric'}), value:d.toISOString().slice(0,7) }
  })

  function load() {
    setLoading(true)
    const params = filterMonth ? { month: filterMonth } : {}
    const punchParams = filterMonth ? { month: filterMonth } : {}
    Promise.all([
      api.getReports(params),
      api.getPunches(punchParams)
    ]).then(([reps, punches]) => {
      setReports(reps)
      // Group punches by date: { '2026-07-13': [punch1, punch2] }
      const map = {}
      const pList = Array.isArray(punches) ? punches : []
      pList.forEach(p => {
        if (!map[p.date]) map[p.date] = []
        map[p.date].push(p)
      })
      setPunchMap(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterMonth])

  // Summary stats
  const totalWork = reports.reduce((s,r) => { if(!r.work_hours||!r.work_hours.includes(':')) return s; const[h,m]=r.work_hours.split(':').map(Number); return s+h*60+m }, 0)
  const totalOT   = reports.reduce((s,r) => { if(!r.overtime||!r.overtime.includes(':')) return s; const[h,m]=r.overtime.split(':').map(Number); return s+h*60+m }, 0)
  const totalKm   = reports.reduce((s,r) => s+(r.shift_km||0), 0)
  const verified  = reports.filter(r=>r.check_status==='Verified').length
  const pending   = reports.filter(r=>r.check_status==='Pending').length
  const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`

  return (
    <div className="fade-in">
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:24 }}>
        {[
          ['Total',    reports.length,    'blue',   'fa-file-lines'],
          ['Verified', verified,          'green',  'fa-circle-check'],
          ['Pending',  pending,           'amber',  'fa-clock'],
          ['Work Hrs', fmt(totalWork),    'blue',   'fa-business-time'],
          ['Overtime', fmt(totalOT),      totalOT>0?'amber':'text3', 'fa-hourglass-half'],
          ['Km',       `${totalKm} km`,   'green',  'fa-road'],
        ].map(([l,v,col,ico])=>(
          <div key={l} style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', padding:'14px 16px', boxShadow:'var(--shadow)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
              <div style={{ width:26,height:26,borderRadius:8,background:`var(--${col==='text3'?'surface3':col+'-light'})`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <i className={`fas ${ico}`} style={{ fontSize:11,color:`var(--${col})` }}/>
              </div>
              <span style={{ fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em' }}>{l}</span>
            </div>
            <div style={{ fontSize:20,fontWeight:700,color:`var(--${col})` }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        {/* Filter bar */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', display:'flex', gap:10, alignItems:'center' }}>
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={SEL}>
            <option value="">All months</option>
            {months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {filterMonth && (
            <button onClick={()=>setFilterMonth('')} style={{ padding:'7px 12px', borderRadius:'var(--radius)', border:'1px solid var(--red-m)', background:'var(--red-l)', color:'var(--red)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <i className="fas fa-xmark"/> Clear
            </button>
          )}
          <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text3)' }}>{reports.length} report{reports.length!==1?'s':''}</span>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                {['','Day','Date','Punch In/Out','Location','Status','Start','End','Work Hrs','OT','Shift KM','Car','Actions'].map((h,i)=>(
                  <th key={i} style={{ padding:'9px 12px', textAlign:'left', fontWeight:600, fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:3}).map((_,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    {Array.from({length:13}).map((_,j)=>(
                      <td key={j} style={{ padding:'12px' }}><div className="skeleton" style={{ height:14, width:60, borderRadius:4 }}/></td>
                    ))}
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr><td colSpan={13} style={{ textAlign:'center', padding:'48px', color:'var(--text3)' }}>
                  <i className="fas fa-inbox" style={{ fontSize:28, display:'block', marginBottom:8, opacity:.3 }}/>
                  No reports {filterMonth ? `for ${filterMonth}` : 'yet'} — submit your first daily log!
                </td></tr>
              ) : reports.map(r => {
                const isExp   = expanded === r.id
                const hasOT   = r.overtime && r.overtime !== '00:00'
                const punches = punchMap[r.date] || []
                const adminEd = r.edited_by_admin
                return (
                  <React.Fragment key={r.id}>
                    <tr
                      onClick={() => setExpanded(isExp ? null : r.id)}
                      style={{ borderBottom:'1px solid var(--border)', cursor:'pointer', background:isExp?'var(--blue-light)':adminEd?'#fffbeb':'var(--surface)', transition:'background .12s' }}
                      onMouseEnter={e=>{ if(!isExp) e.currentTarget.style.background=adminEd?'#fef3c7':'var(--surface2)' }}
                      onMouseLeave={e=>{ if(!isExp) e.currentTarget.style.background=adminEd?'#fffbeb':'var(--surface)' }}
                    >
                      <td style={TD}>
                        <i className={`fas fa-chevron-${isExp?'down':'right'}`} style={{ fontSize:10, color:'var(--text3)', marginLeft:4 }}/>
                      </td>
                      <td style={{ ...TD, color:'var(--text3)', fontSize:12 }}>{r.day?.slice(0,3)}</td>
                      <td style={{ ...TD, fontWeight:600 }}>{r.date}</td>
                      {/* PUNCH IN/OUT column */}
                      <td style={TD}>
                        <PunchSummary punches={punches}/>
                      </td>
                      <td style={TD}>
                        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <i className="fas fa-location-dot" style={{ fontSize:10, color:'var(--text3)' }}/>
                          {r.location || '—'}
                        </span>
                      </td>
                      <td style={TD}>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          <StatusBadge status={r.check_status}/>
                          {adminEd && <span style={{ fontSize:10, color:'var(--amber)', fontWeight:600 }}><i className="fas fa-pen" style={{ fontSize:9, marginRight:3 }}/>Admin edited</span>}
                        </div>
                      </td>
                      <td style={TD}>{r.start_time}</td>
                      <td style={TD}>{r.end_time}</td>
                      <td style={{ ...TD, fontWeight:600, color:'var(--blue)' }}>{r.work_hours}</td>
                      <td style={TD}>
                        {hasOT
                          ? <span style={{ color:'var(--amber)', fontWeight:600, background:'var(--amber-light)', padding:'2px 7px', borderRadius:20, fontSize:11 }}>+{r.overtime}</span>
                          : <span style={{ color:'var(--text3)', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ ...TD, fontWeight:500 }}>{r.shift_km} km</td>
                      <td style={{ ...TD, color:'var(--text2)', fontSize:12 }}>
                        <i className="fas fa-car-side" style={{ marginRight:4, color:'var(--text3)' }}/>{r.car_plate||'—'}
                      </td>
                      <td style={TD} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setEditing(r)} style={{ padding:'5px 12px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text2)', display:'flex', alignItems:'center', gap:5 }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue-mid)';e.currentTarget.style.color='var(--blue)';e.currentTarget.style.background='var(--blue-light)'}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)';e.currentTarget.style.background='var(--surface)'}}>
                          <i className="fas fa-pen" style={{ fontSize:11 }}/>Edit
                        </button>
                      </td>
                    </tr>

                    {isExp && (
                      <tr>
                        <td colSpan={13} style={{ background:'var(--blue-light)', borderBottom:'1px solid var(--blue-mid)', padding:'16px 24px' }}>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, fontSize:13 }}>
                            <div>
                              <div style={{ fontWeight:600, marginBottom:8, color:'var(--blue)', fontSize:11, textTransform:'uppercase', letterSpacing:'.05em' }}>
                                <i className="fas fa-list-check" style={{ marginRight:5 }}/>Description
                              </div>
                              <pre style={{ whiteSpace:'pre-wrap', fontFamily:'inherit', lineHeight:1.7, color:'var(--text2)', background:'#fff', padding:'10px 14px', borderRadius:'var(--radius)', border:'1px solid var(--blue-mid)', fontSize:12 }}>
                                {r.short_desc || '—'}
                              </pre>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                              {/* Punch breakdown */}
                              <div>
                                <div style={{ fontWeight:600, marginBottom:6, color:'var(--blue)', fontSize:11, textTransform:'uppercase', letterSpacing:'.05em' }}>
                                  <i className="fas fa-fingerprint" style={{ marginRight:5 }}/>Punch Times
                                </div>
                                {punches.length === 0 ? (
                                  <div style={{ fontSize:12, color:'var(--text3)', fontStyle:'italic' }}>No punch recorded for this day</div>
                                ) : (
                                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                                    {punches.map((p,i) => {
                                      const [h1,m1]=(p.punch_in||'00:00').split(':').map(Number)
                                      const [h2,m2]=(p.punch_out||'00:00').split(':').map(Number)
                                      const mins = p.punch_out ? (h2*60+m2)-(h1*60+m1) : 0
                                      const dur = mins>0 ? `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}` : ''
                                      return (
                                        <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', background:'#fff', borderRadius:'var(--radius)', border:'1px solid var(--blue-mid)', fontSize:12 }}>
                                          <span style={{ color:'var(--text3)', fontWeight:600, minWidth:20 }}>#{i+1}</span>
                                          <i className="fas fa-right-to-bracket" style={{ color:'var(--green)', fontSize:11 }}/>
                                          <span style={{ color:'var(--green)', fontWeight:700 }}>{p.punch_in}</span>
                                          <i className="fas fa-arrow-right" style={{ color:'var(--text3)', fontSize:10 }}/>
                                          <i className="fas fa-right-from-bracket" style={{ color:p.punch_out?'var(--red)':'var(--amber)', fontSize:11 }}/>
                                          <span style={{ color:p.punch_out?'var(--red)':'var(--amber)', fontWeight:700 }}>{p.punch_out||'Still in'}</span>
                                          {dur && <span style={{ marginLeft:'auto', fontSize:11, fontWeight:600, color:'var(--blue)', background:'var(--blue-light)', padding:'1px 7px', borderRadius:20 }}>{dur}</span>}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                              {/* Other details */}
                              {(r.driver_name||r.site_id||r.special_requester||adminEd) && (
                                <div>
                                  <div style={{ fontWeight:600, marginBottom:6, color:'var(--blue)', fontSize:11, textTransform:'uppercase', letterSpacing:'.05em' }}>Details</div>
                                  <div style={{ background:'#fff', borderRadius:'var(--radius)', border:'1px solid var(--blue-mid)', padding:'10px 12px', fontSize:12, lineHeight:1.8 }}>
                                    {r.driver_name && <div><strong>Driver:</strong> {r.driver_name}</div>}
                                    {r.site_id && <div><strong>Site:</strong> {r.site_id}</div>}
                                    {r.special_requester && <div><strong>Special requester:</strong> {r.special_requester}</div>}
                                    {r.car_plate && <div><strong>Car:</strong> {r.car_plate}</div>}
                                  </div>
                                </div>
                              )}
                              {adminEd && (
                                <div style={{ background:'var(--amber-light)', border:'1px solid var(--amber-mid)', borderRadius:'var(--radius)', padding:'10px 12px', fontSize:12 }}>
                                  <div style={{ fontWeight:600, color:'var(--amber)', marginBottom:4 }}><i className="fas fa-pen-to-square" style={{ marginRight:5 }}/>Admin correction</div>
                                  <div style={{ color:'var(--amber)', lineHeight:1.5 }}>
                                    Edited by <strong>{r.last_edited_by}</strong>{r.last_edited_at?` on ${r.last_edited_at.split(' ')[0]}`:''}
                                    {r.admin_note && <><br/><em>"{r.admin_note}"</em></>}
                                  </div>
                                </div>
                              )}
                            </div>
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
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', background:'var(--surface2)', fontSize:12, color:'var(--text3)' }}>
          <i className="fas fa-circle-info" style={{ fontSize:10, marginRight:5 }}/>
          Click a row to see punch times, description and full details · Use Edit to correct mistakes
        </div>
      </div>

      {editing && (
        <EditReportModal
          report={editing}
          isAdmin={false}
          onClose={()=>setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

const SEL = { padding:'7px 11px', borderRadius:'var(--radius)', fontSize:13, border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text)', outline:'none' }
const TD  = { padding:'11px 12px', fontSize:13, whiteSpace:'nowrap', verticalAlign:'middle' }
