import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const BREAKS = [0,15,30,45,60,90]

function diff(t1,t2){const[h1,m1]=t1.split(':').map(Number);const[h2,m2]=t2.split(':').map(Number);let m=(h2*60+m2)-(h1*60+m1);if(m<0)m+=1440;return m}
function fmt(m){return`${String(Math.floor(Math.max(0,m)/60)).padStart(2,'0')}:${String(Math.max(0,m)%60).padStart(2,'0')}`}
function brkToMins(bt){if(!bt)return 60;if(String(bt).includes(':')){const[h,m]=String(bt).split(':').map(Number);return h*60+m}return parseInt(bt)||60}

export default function EditReportModal({ report, isAdmin, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: report.date||'', location: report.location||'', car_plate: report.car_plate||'',
    start_time: report.start_time||'23:00', end_time: report.end_time||'08:00',
    break_mins: brkToMins(report.break_time),
    start_km: report.start_km||'', end_km: report.end_km||'',
    short_desc: report.short_desc||'', special_requester: report.special_requester||'',
    admin_note: report.admin_note||'', site_id: report.site_id||'',
    daily_tests: (() => { try { return JSON.parse(report.daily_tests||'{}') } catch { return {} } })()
  })
  const [computed, setComputed] = useState({work:0,ot:0,shift:0})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function upd(k,v){ setForm(f=>({...f,[k]:v})) }

  useEffect(()=>{
    const total = diff(form.start_time, form.end_time)
    const bm = parseInt(form.break_mins)||0
    const work = total - bm
    const ot = Math.max(0,work-480)
    const shift = (parseInt(form.end_km)||0)-(parseInt(form.start_km)||0)
    setComputed({work,ot,shift})
  },[form.start_time,form.end_time,form.break_mins,form.start_km,form.end_km])

  async function save(e) {
    e.preventDefault(); setErr('')
    if (computed.work<=0){setErr('Work hours invalid — check times and break');return}
    setSaving(true)
    try {
      await api.updateReport(report.id,{...form,break_mins:parseInt(form.break_mins)||0,start_km:parseInt(form.start_km)||0,end_km:parseInt(form.end_km)||0,daily_tests:JSON.stringify(form.daily_tests)})
      onSaved(); onClose()
    } catch(ex){setErr(ex.message)} finally{setSaving(false)}
  }

  const day = form.date ? DAYS[new Date(form.date).getDay()] : ''

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,27,61,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400,backdropFilter:'blur(4px)',padding:20}} onClick={onClose}>
      <div style={{background:'var(--surface)',borderRadius:'var(--radius-xl)',width:'100%',maxWidth:640,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--shadow-lg)',border:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:'18px 24px',borderBottom:'1px solid var(--border)',background:isAdmin?'var(--amber-light)':'var(--blue-light)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,display:'flex',alignItems:'center',gap:8}}>
              <i className={`fas ${isAdmin?'fa-user-shield':'fa-pen-to-square'}`} style={{color:isAdmin?'var(--amber)':'var(--blue)'}}/>
              {isAdmin?'Admin edit':'Edit report'}
            </div>
            <div style={{fontSize:13,color:'var(--text2)',marginTop:2}}>{day} · {form.date} · {report.eng_name}</div>
            {!isAdmin&&<div style={{marginTop:6,fontSize:11,color:'var(--amber)',background:'var(--amber-light)',border:'1px solid var(--amber-mid)',padding:'3px 10px',borderRadius:20,display:'inline-flex',alignItems:'center',gap:5}}>
              <i className="fas fa-rotate-left" style={{fontSize:10}}/>Saving resets status to Pending
            </div>}
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:'var(--radius)',border:'1px solid var(--border)',background:'var(--surface)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)'}}>
            <i className="fas fa-xmark"/>
          </button>
        </div>

        <form onSubmit={save} style={{padding:24}}>
          {isAdmin&&(
            <div style={{marginBottom:18,padding:'12px 14px',background:'var(--amber-light)',borderRadius:'var(--radius)',border:'1px solid var(--amber-mid)'}}>
              <label style={LBL}><i className="fas fa-note-sticky" style={{marginRight:5,color:'var(--amber)'}}/>Admin note to engineer <span style={{fontWeight:400,textTransform:'none',fontSize:11,color:'var(--text3)'}}>(engineer will see this)</span></label>
              <input type="text" placeholder="e.g. Corrected end km from vehicle log" value={form.admin_note} onChange={e=>upd('admin_note',e.target.value)} style={INP}/>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px',marginBottom:18}}>
            {[['Date','date','date'],['Location','location','text'],['Car plate','car_plate','text']].map(([l,k,t])=>(
              <div key={k}><label style={LBL}>{l}</label><input type={t} value={form[k]} onChange={e=>upd(k,e.target.value)} style={INP}/></div>
            ))}
          </div>

          <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
            <div style={SEC}>Shift times</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px',marginBottom:12}}>
              <div><label style={LBL}>Start time</label><input type="time" value={form.start_time} onChange={e=>upd('start_time',e.target.value)} style={INP}/></div>
              <div><label style={LBL}>End time</label><input type="time" value={form.end_time} onChange={e=>upd('end_time',e.target.value)} style={INP}/></div>
            </div>
            <label style={LBL}>Break (minutes)</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              {BREAKS.map(m=>(
                <button key={m} type="button" onClick={()=>upd('break_mins',m)} style={{padding:'5px 13px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:'1.5px solid',borderColor:form.break_mins===m?'var(--blue)':'var(--border2)',background:form.break_mins===m?'var(--blue)':'var(--surface)',color:form.break_mins===m?'#fff':'var(--text2)'}}>
                  {m===0?'No break':`${m} min`}
                </button>
              ))}
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:12,color:'var(--text3)'}}>Custom:</span>
                <input type="number" min="0" max="480" value={form.break_mins} onChange={e=>upd('break_mins',parseInt(e.target.value)||0)} style={{...INP,width:70,textAlign:'center'}}/>
                <span style={{fontSize:12,color:'var(--text3)'}}>min</span>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginTop:12}}>
              {[['On site',fmt(diff(form.start_time,form.end_time)),'text2'],['Break',`${parseInt(form.break_mins)||0}m`,'text3'],['Work',fmt(computed.work),'blue'],['OT',fmt(computed.ot),computed.ot>0?'amber':'text3']].map(([l,v,c])=>(
                <div key={l} style={{textAlign:'center',padding:'8px',background:`var(--${['text2','text3'].includes(c)?'surface2':c+'-light'})`,borderRadius:'var(--radius)',border:`1px solid var(--${['text2','text3'].includes(c)?'border':c+'-mid'})`}}>
                  <div style={{fontSize:10,color:`var(--${c})`,opacity:.7,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:`var(--${c})`}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
            <div style={SEC}>Odometer</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px'}}>
              <div><label style={LBL}>Start km</label><input type="number" value={form.start_km} onChange={e=>upd('start_km',e.target.value)} style={INP}/></div>
              <div><label style={LBL}>End km</label><input type="number" value={form.end_km} onChange={e=>upd('end_km',e.target.value)} style={INP}/></div>
            </div>
            {computed.shift>0&&<div style={{fontSize:12,color:'var(--green)',marginTop:6,fontWeight:500}}><i className="fas fa-route" style={{marginRight:4}}/>{computed.shift} km this shift</div>}
          </div>

          <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:18}}>
            <div style={SEC}>Tasks & observations</div>
            <textarea value={form.short_desc} onChange={e=>upd('short_desc',e.target.value)} placeholder="1. Daily Health Check&#10;2. Ping Test&#10;3. ..."
              style={{...INP,minHeight:90,resize:'vertical',lineHeight:1.6,marginBottom:12}}/>
            <label style={LBL}>Special tests requester <span style={{fontWeight:400,textTransform:'none',fontSize:11}}>optional</span></label>
            <input type="text" value={form.special_requester} onChange={e=>upd('special_requester',e.target.value)} style={INP}/>
          </div>

          {err&&<div style={{background:'var(--red-l)',color:'var(--red)',border:'1px solid var(--red-m)',padding:'10px 14px',borderRadius:'var(--radius)',fontSize:13,marginBottom:14,display:'flex',alignItems:'center',gap:8}}><i className="fas fa-circle-exclamation"/>{err}</div>}

          <div style={{display:'flex',gap:10,justifyContent:'flex-end',borderTop:'1px solid var(--border)',paddingTop:16}}>
            <button type="button" onClick={onClose} style={{padding:'9px 18px',borderRadius:'var(--radius)',border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Cancel</button>
            <button type="submit" disabled={saving} style={{padding:'9px 22px',background:isAdmin?'var(--amber)':'var(--navy)',color:'#fff',border:'none',borderRadius:'var(--radius)',fontSize:13,fontWeight:600,cursor:saving?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:8,opacity:saving?.7:1}}>
              {saving?<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%'}} className="spin"/>Saving…</>:<><i className={`fas ${isAdmin?'fa-shield-check':'fa-floppy-disk'}`}/>{isAdmin?'Save & notify':'Save & resubmit'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const LBL = {display:'block',marginBottom:5,fontSize:12,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.04em'}
const INP = {width:'100%',padding:'9px 12px',borderRadius:'var(--radius)',border:'1.5px solid var(--border2)',fontSize:13,color:'var(--text)',background:'var(--surface)'}
const SEC = {fontSize:12,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10}
