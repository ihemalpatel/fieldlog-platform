import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function MonthlyReport({ user }) {
  const isViewer = ['admin','manager','hr'].includes(user.role)
  const thisMonth = new Date().toISOString().slice(0,7)

  const [month,      setMonth]      = useState(thisMonth)
  const [engineers,  setEngineers]  = useState([])
  const [selectedEng,setSelectedEng]= useState(String(user.id))
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (isViewer) api.getUsers().then(u=>setEngineers(u.filter(x=>x.role==='engineer'))).catch(()=>{})
  }, [])

  useEffect(() => { load() }, [month, selectedEng])

  async function load() {
    if (!selectedEng) return
    setLoading(true); setData(null)
    try { setData(await api.getMonthlyReport(selectedEng, month)) }
    catch(e) {}
    setLoading(false)
  }

  const months = Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return{label:d.toLocaleDateString('en-GB',{month:'long',year:'numeric'}),value:d.toISOString().slice(0,7)}})

  const fmt = t => t || '—'
  const statusColor = s => s==='Verified'?'var(--green)':s==='Issue'?'var(--red)':'var(--amber)'
  const statusBg    = s => s==='Verified'?'var(--green-light)':s==='Issue'?'var(--red-l)':'var(--amber-light)'

  return (
    <div className="fade-in">
      {/* Filters */}
      <div style={{display:'flex',gap:12,alignItems:'flex-end',marginBottom:24,flexWrap:'wrap'}}>
        <div>
          <label style={LBL}>Month</label>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={SEL}>
            {months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        {isViewer && (
          <div>
            <label style={LBL}>Engineer</label>
            <select value={selectedEng} onChange={e=>setSelectedEng(e.target.value)} style={SEL}>
              {engineers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        )}
        {data && (
          <>
          <button onClick={()=>api.exportMonthly(selectedEng,month,'csv')} style={{
            padding:'9px 18px',borderRadius:'var(--radius)',border:'1px solid var(--green-mid)',
            background:'var(--green-light)',color:'var(--green)',fontSize:13,fontWeight:600,
            cursor:'pointer',display:'flex',alignItems:'center',gap:7
          }}>
            <i className="fas fa-file-csv"/>CSV
          </button>
          <button onClick={()=>api.exportMonthly(selectedEng,month,'xlsx')} style={{
            padding:'9px 18px',borderRadius:'var(--radius)',border:'1px solid var(--blue-mid)',
            background:'var(--blue-light)',color:'var(--blue)',fontSize:13,fontWeight:600,
            cursor:'pointer',display:'flex',alignItems:'center',gap:7
          }}>
            <i className="fas fa-file-excel"/>Excel
          </button>
          </>
        )}
      </div>

      {loading && (
        <div style={{textAlign:'center',padding:'48px',color:'var(--text3)'}}>
          <div style={{width:32,height:32,border:'3px solid var(--border2)',borderTopColor:'var(--brand)',borderRadius:'50%',margin:'0 auto 12px'}} className="spin"/>
          Loading monthly report…
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:24}}>
            {[
              ['Reports',      data.summary.total_reports,      'blue',   'fa-file-lines'],
              ['Work Hours',   data.summary.total_work_hours,   'blue',   'fa-business-time'],
              ['Overtime',     data.summary.total_overtime,     data.summary.total_overtime!=='00:00'?'amber':'text3','fa-clock'],
              ['Km Driven',    data.summary.total_km+' km',     'green',  'fa-road'],
              ['Verified',     data.summary.verified,           'green',  'fa-circle-check'],
              ['Pending',      data.summary.pending,            'amber',  'fa-clock'],
              ['Issue',        data.summary.issue,              data.summary.issue>0?'red':'text3','fa-circle-exclamation'],
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

          {/* Report table */}
          <div style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden',marginBottom:20}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface2)',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:8}}>
              <i className="fas fa-table-list" style={{color:'var(--brand)'}}/>
              Daily Reports — {data.engineer.name} — {month}
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'var(--surface2)'}}>
                    {['Date','Day','Punch In','Punch Out','Start','End','Work','OT','KM','Car','Driver','Site','Status'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.04em',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.reports.length===0?(
                    <tr><td colSpan={13} style={{textAlign:'center',padding:'32px',color:'var(--text3)'}}>
                      <i className="fas fa-inbox" style={{fontSize:24,display:'block',marginBottom:8,opacity:.3}}/>No reports for {month}
                    </td></tr>
                  ):data.reports.map(r=>{
                    const punches = data.punches.filter(p=>p.date===r.date)
                    const firstPunch = punches[0]
                    const lastPunch = punches[punches.length-1]
                    return(
                      <tr key={r.id} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={TD}>{r.date}</td>
                        <td style={{...TD,color:'var(--text3)'}}>{r.day?.slice(0,3)}</td>
                        <td style={{...TD,color:'var(--green)',fontWeight:500}}>
                          {firstPunch ? <div>{firstPunch.punch_in}{punches.length>1&&<div style={{fontSize:10,color:'var(--text3)'}}>+{punches.length-1} more</div>}</div> : '—'}
                        </td>
                        <td style={{...TD,color:'var(--red)',fontWeight:500}}>
                          {lastPunch?.punch_out || (lastPunch?.punch_in ? <span style={{color:'var(--amber)',fontSize:11}}>Open</span> : '—')}
                        </td>
                        <td style={TD}>{fmt(r.start_time)}</td>
                        <td style={TD}>{fmt(r.end_time)}</td>
                        <td style={{...TD,fontWeight:600,color:'var(--blue)'}}>{fmt(r.work_hours)}</td>
                        <td style={{...TD,color:r.overtime&&r.overtime!=='00:00'?'var(--amber)':'var(--text3)',fontWeight:r.overtime&&r.overtime!=='00:00'?600:400}}>
                          {r.overtime&&r.overtime!=='00:00'?'+'+r.overtime:'—'}
                        </td>
                        <td style={TD}>{r.shift_km} km</td>
                        <td style={{...TD,color:'var(--text2)'}}>{fmt(r.car_plate)}</td>
                        <td style={{...TD,color:'var(--text2)'}}>{fmt(r.driver_name)||'Self'}</td>
                        <td style={{...TD,color:'var(--text2)',fontSize:11}}>{fmt(r.site_id)}</td>
                        <td style={TD}>
                          <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:statusBg(r.check_status),color:statusColor(r.check_status)}}>
                            {r.check_status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const LBL = {display:'block',marginBottom:5,fontSize:12,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.04em'}
const SEL = {padding:'9px 12px',borderRadius:'var(--radius)',border:'1.5px solid var(--border2)',fontSize:13,color:'var(--text)',background:'var(--surface)'}
const TD  = {padding:'10px 12px',fontSize:13,whiteSpace:'nowrap',verticalAlign:'middle'}
