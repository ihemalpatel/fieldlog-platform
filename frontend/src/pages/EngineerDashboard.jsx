import React, { useState, useEffect } from 'react'
import { api } from '../api.js'
import PunchCard from '../components/PunchCard.jsx'

const MONTHS = Array.from({length:12},(_,i)=>{
  const d=new Date(); d.setMonth(d.getMonth()-i)
  return {label:d.toLocaleDateString('en-GB',{month:'long',year:'numeric'}), value:d.toISOString().slice(0,7)}
})

export default function EngineerDashboard({ user }) {
  const [stats,    setStats]    = useState(null)
  const [monthly,  setMonthly]  = useState(null)
  const [month,    setMonth]    = useState(MONTHS[0].value)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { loadStats() }, [])
  useEffect(() => { loadMonthly() }, [month])

  async function loadStats() {
    try { setStats(await api.getEngineerStats()) } catch(e){}
    setLoading(false)
  }

  async function loadMonthly() {
    try { setMonthly(await api.getMonthlyReport(user.id, month)) } catch(e){}
  }

  const statusColor = s => s==='Verified'?'var(--green)':s==='Issue'?'var(--red)':'var(--amber)'
  const statusBg    = s => s==='Verified'?'var(--green-light)':s==='Issue'?'var(--red-l)':'var(--amber-light)'
  const statusBorder= s => s==='Verified'?'var(--green-mid)':s==='Issue'?'var(--red-m)':'var(--amber-mid)'

  return (
    <div className="fade-in">
      {/* Punch Card */}
      <PunchCard user={user}/>

      {/* Stats cards */}
      {stats && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:24}}>
          {[
            ['This Month',   stats.this_month_reports+' reports', 'blue',  'fa-file-lines'],
            ['Work Hours',   stats.work_hours,                    'blue',  'fa-business-time'],
            ['Overtime',     stats.overtime,                      stats.overtime!=='00:00'?'amber':'text3','fa-clock'],
            ['Km Driven',    stats.km+' km',                      'green', 'fa-road'],
            ['Verified',     stats.verified,                      'green', 'fa-circle-check'],
            ['Pending',      stats.pending,                       'amber', 'fa-hourglass-half'],
            ['All Time',     stats.all_time_reports+' reports',   'purple','fa-database'],
          ].map(([l,v,col,ico])=>(
            <div key={l} style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',padding:'14px 16px',boxShadow:'var(--shadow)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:28,height:28,borderRadius:8,background:`var(--${col==='text3'?'surface3':col+'-light'})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className={`fas ${ico}`} style={{fontSize:12,color:`var(--${col})`}}/>
                </div>
                <span style={{fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>{l}</span>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:`var(--${col})`}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly report section */}
      <div style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
          <div style={{fontWeight:700,fontSize:15,display:'flex',alignItems:'center',gap:8}}>
            <i className="fas fa-calendar-days" style={{color:'var(--brand)'}}/>
            Monthly Report
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <select value={month} onChange={e=>setMonth(e.target.value)} style={{padding:'7px 12px',borderRadius:'var(--radius)',border:'1.5px solid var(--border2)',fontSize:13,color:'var(--text)',background:'var(--surface)'}}>
              {MONTHS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button onClick={()=>api.exportMonthly(user.id,month,'csv')} style={{padding:'7px 16px',borderRadius:'var(--radius)',border:'1px solid var(--green-mid)',background:'var(--green-light)',color:'var(--green)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              <i className="fas fa-file-csv" style={{fontSize:12}}/>CSV
            </button>
            <button onClick={()=>api.exportMonthly(user.id,month,'xlsx')} style={{padding:'7px 16px',borderRadius:'var(--radius)',border:'1px solid var(--blue-mid)',background:'var(--blue-light)',color:'var(--blue)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              <i className="fas fa-file-excel" style={{fontSize:12}}/>Excel
            </button>
          </div>
        </div>

        {monthly && (
          <>
            {/* Month summary */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,borderBottom:'1px solid var(--border)'}}>
              {[
                ['Reports',  monthly.summary.total_reports,    'blue'],
                ['Work Hrs', monthly.summary.total_work_hours, 'blue'],
                ['Overtime', monthly.summary.total_overtime,   'amber'],
                ['Km',       monthly.summary.total_km+' km',   'green'],
              ].map(([l,v,c],i)=>(
                <div key={l} style={{padding:'12px 16px',borderRight:i<3?'1px solid var(--border)':'none',textAlign:'center'}}>
                  <div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:700,color:`var(--${c})`}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Report table */}
            <div style={{overflowX:'auto'}}>
              {monthly.reports.length===0?(
                <div style={{textAlign:'center',padding:'40px',color:'var(--text3)'}}>
                  <i className="fas fa-inbox" style={{fontSize:28,display:'block',marginBottom:10,opacity:.3}}/>
                  No reports for {month}
                </div>
              ):(
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{background:'var(--surface2)'}}>
                      {['Date','Day','Punch In','Punch Out','Start','End','Work','OT','KM','Type','Status'].map(h=>(
                        <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.04em',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.reports.map(r=>{
                      const ps=monthly.punches.filter(p=>p.date===r.date)
                      const pin=ps.map(p=>p.punch_in).filter(Boolean).join(', ')
                      const pout=ps.map(p=>p.punch_out).filter(Boolean).join(', ')
                      return(
                        <tr key={r.id} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={TD}>{r.date}</td>
                          <td style={{...TD,color:'var(--text3)'}}>{r.day?.slice(0,3)}</td>
                          <td style={{...TD,color:'var(--green)',fontWeight:500}}>{pin||'—'}</td>
                          <td style={{...TD,color:'var(--red)',fontWeight:500}}>{pout||'—'}</td>
                          <td style={TD}>{r.start_time||'—'}</td>
                          <td style={TD}>{r.end_time||'—'}</td>
                          <td style={{...TD,fontWeight:600,color:'var(--blue)'}}>{r.work_hours}</td>
                          <td style={{...TD,color:r.overtime&&r.overtime!=='00:00'?'var(--amber)':'var(--text3)',fontWeight:r.overtime&&r.overtime!=='00:00'?600:400}}>
                            {r.overtime&&r.overtime!=='00:00'?'+'+r.overtime:'—'}
                          </td>
                          <td style={TD}>{r.shift_km} km</td>
                          <td style={TD}>
                            <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'var(--surface2)',color:'var(--text2)',border:'1px solid var(--border)',textTransform:'capitalize'}}>
                              {(r.report_type||'daily').replace('_',' ')}
                            </span>
                          </td>
                          <td style={TD}>
                            <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:statusBg(r.check_status),color:statusColor(r.check_status),border:`1px solid ${statusBorder(r.check_status)}`}}>
                              {r.check_status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const TD = {padding:'10px 12px',fontSize:13,whiteSpace:'nowrap',verticalAlign:'middle'}
