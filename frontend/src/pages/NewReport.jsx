import React, { useState } from 'react'
import { api } from '../api.js'
import DailyTests, { defaultTests, GROUPS, ALL_IDS } from '../components/DailyTests.jsx'

const REPORT_TYPES = [
  { id:'attendance',      label:'Attendance Report',     icon:'fa-calendar-check',  color:'blue',   desc:'Punch times, shift hours, break duration' },
  { id:'daily',           label:'Daily Report',          icon:'fa-list-check',      color:'green',  desc:'Full daily report with test checklist' },
  { id:'driver',          label:'Driver Report',         icon:'fa-steering-wheel',  color:'purple', desc:'Trip details, route, mileage, driver info' },
  { id:'car_fuel',        label:'Car Report — Fuel',     icon:'fa-gas-pump',        color:'amber',  desc:'Fuel fill-up details and cost' },
  { id:'car_maintenance', label:'Car Report — Maintenance', icon:'fa-screwdriver-wrench', color:'red', desc:'Car maintenance, repairs, service details' },
]

const BREAKS = [0,15,30,45,60,90]
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function getDay(d) { return DAYS[new Date(d).getDay()] }
function diff(t1,t2){const[h1,m1]=t1.split(':').map(Number);const[h2,m2]=t2.split(':').map(Number);let m=(h2*60+m2)-(h1*60+m1);if(m<0)m+=1440;return m}
function fmt(m){return`${String(Math.floor(Math.max(0,m)/60)).padStart(2,'0')}:${String(Math.max(0,m)%60).padStart(2,'0')}`}

function buildSummaryText({date, location, site_id, daily_tests, short_desc, extra_data}) {
  const dateStr = date ? new Date(date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : ''
  const TEST_LABELS = {
    health_check:'Daily Health Check',ping_test:'Ping Test',
    volte_mos_onnet:'VoLTE MOS - Onnet',volte_mos_offnet:'VoLTE MOS - Offnet',
    volte_short_onnet:'VoLTE Short Call - Onnet',volte_short_offnet:'VoLTE Short Call - Offnet',
    multicall_onnet:'Multicall Data - Onnet',multicall_offnet:'Multicall Data - Offnet',
    youtube_onnet:'Youtube - Onnet',youtube_offnet:'Youtube - Offnet',
    twamp_onnet:'TWAMP - Onnet',twamp_offnet:'TWAMP - Offnet',
    ping_at_dt:'Ping AT/DT Multicall',
  }
  let tests = {}
  try { tests = typeof daily_tests==='string' ? JSON.parse(daily_tests) : daily_tests } catch{}

  const notDone = ALL_IDS.filter(id=>tests[id]==='not_done')
  const lines = [dateStr, location||'', site_id ? `Site Id : ${site_id}` : '']
  if (Object.keys(tests).length > 0) {
    ALL_IDS.forEach(id => {
      const label = TEST_LABELS[id] || id
      const done = !tests[id] || tests[id]==='done'
      lines.push(`${label} : ${done?'✔️':'❌'}`)
    })
  }
  const issues = notDone.map(id=>{const note=tests[id+'_note']||'';return TEST_LABELS[id]+(note?` (${note})`:'')} )
  lines.push(issues.length===0 ? '--No issue observed' : `--Issues: ${issues.join(', ')}`)
  lines.push('-----------------------------')
  if (short_desc) lines.push(`Other task ${short_desc}`)
  return lines.filter(Boolean).join('\n')
}

export default function NewReport({ user, engineers, isAdmin }) {
  const allowedTypes = (user.allowed_reports || ['attendance','daily','driver','car_fuel','car_maintenance'])
  const availableTypes = REPORT_TYPES.filter(t => isAdmin || allowedTypes.includes(t.id))

  const today = new Date().toISOString().split('T')[0]
  const [reportType, setReportType] = useState(availableTypes[0]?.id || 'daily')
  const [form, setForm] = useState({
    date:today, location:'', car_plate:'', driver_name:'', site_id:'',
    start_time:'23:00', end_time:'08:00', break_mins:60,
    start_km:'', end_km:'', short_desc:'', special_requester:'',
    user_id:'', daily_tests: defaultTests(),
    // Driver report fields
    trips:'', route:'', total_distance:'', trip_purpose:'',
    // Fuel fields
    fuel_liters:'', fuel_cost:'', fuel_station:'', odometer_at_fill:'',
    // Maintenance fields
    maintenance_type:'', maintenance_cost:'', garage:'', next_service_km:'', maintenance_notes:'',
    city:'', engineer_carried:'',
  })
  const [photos, setPhotos] = useState({start_photo:'', end_photo:''})
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')
  const [popup,   setPopup]   = useState(null) // {text: ..., report: ...}
  const [copied,  setCopied]  = useState(false)

  const upd = (k,v) => setForm(f=>({...f,[k]:v}))
  const totalMins = diff(form.start_time, form.end_time)
  const workMins  = totalMins - (parseInt(form.break_mins)||0)
  const otMins    = Math.max(0, workMins - 480)
  const shiftKm   = (parseInt(form.end_km)||0) - (parseInt(form.start_km)||0)

  function handlePhoto(key, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      // Compress via canvas to keep DB small
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 900
        const scale = Math.min(1, maxW / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        setPhotos(p => ({...p, [key]: canvas.toDataURL('image/jpeg', 0.7)}))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const extra = {}
      if (reportType==='driver') {
        if (!photos.start_photo || !photos.end_photo) { setErr('Please upload BOTH odometer photos (Sign-In and Sign-Out) — required for driver reports'); setBusy(false); return }
        extra.city=form.city; extra.engineer_carried=form.engineer_carried
      }
      if (reportType==='car_fuel')        { extra.fuel_liters=form.fuel_liters; extra.fuel_cost=form.fuel_cost; extra.fuel_station=form.fuel_station; extra.odometer_at_fill=form.odometer_at_fill }
      if (reportType==='car_maintenance') { extra.maintenance_type=form.maintenance_type; extra.maintenance_cost=form.maintenance_cost; extra.garage=form.garage; extra.next_service_km=form.next_service_km; extra.maintenance_notes=form.maintenance_notes }

      const payload = {
        report_type: reportType,
        date:form.date, location:form.location, car_plate:form.car_plate,
        driver_name:form.driver_name, site_id:form.site_id,
        start_time:form.start_time, end_time:form.end_time,
        break_mins:parseInt(form.break_mins)||0,
        start_km:parseInt(form.start_km)||0, end_km:parseInt(form.end_km)||0,
        short_desc:form.short_desc, special_requester:form.special_requester,
        daily_tests: JSON.stringify(form.daily_tests),
        extra_data: extra,
        photos: reportType==='driver' ? photos : {},
      }
      if (isAdmin && form.user_id) payload.user_id = form.user_id

      const res = await api.createReport(payload)

      // Build summary text for daily reports
      if (reportType === 'daily') {
        const summaryText = buildSummaryText({
          date:form.date, location:form.location, site_id:form.site_id,
          daily_tests:form.daily_tests, short_desc:form.short_desc
        })
        setPopup({ text: summaryText, work_hours: res.work_hours, overtime: res.overtime })
      } else {
        setPopup({ text: null, work_hours: res.work_hours, overtime: res.overtime })
      }

      // Reset form
      setForm(f=>({...f, short_desc:'', special_requester:'', site_id:'',
                         start_km:'', end_km:'', daily_tests:defaultTests(),
                         trips:'', route:'', total_distance:'', trip_purpose:'',
                         fuel_liters:'', fuel_cost:'', fuel_station:'', odometer_at_fill:'',
                         maintenance_type:'', maintenance_cost:'', garage:'', next_service_km:'', maintenance_notes:'',
                         city:'', engineer_carried:''}))
      setPhotos({start_photo:'', end_photo:''})
    } catch(ex) { setErr(ex.message) }
    setBusy(false)
  }

  function copyText() {
    if (!popup?.text) return
    navigator.clipboard.writeText(popup.text).then(()=>{setCopied(true); setTimeout(()=>setCopied(false),2500)})
  }

  const selectedType = REPORT_TYPES.find(t=>t.id===reportType)

  return (
    <div className="fade-in">
      {/* Report type selector */}
      <div style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',padding:'20px',marginBottom:20,boxShadow:'var(--shadow)'}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:12}}>Select report type</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>
          {availableTypes.map(t=>{
            const active=reportType===t.id
            return(
              <button key={t.id} type="button" onClick={()=>setReportType(t.id)} style={{
                padding:'12px 14px',borderRadius:'var(--radius)',cursor:'pointer',textAlign:'left',
                border:`2px solid ${active?`var(--${t.color})`:'var(--border)'}`,
                background:active?`var(--${t.color}-light)`:'var(--surface)',
                transition:'all .15s'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <i className={`fas ${t.icon}`} style={{fontSize:14,color:active?`var(--${t.color})`:'var(--text3)'}}/>
                  <span style={{fontSize:13,fontWeight:700,color:active?`var(--${t.color})`:'var(--text)'}}>{t.label}</span>
                </div>
                <div style={{fontSize:11,color:active?`var(--${t.color})`:'var(--text3)',lineHeight:1.4}}>{t.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit}>
        <div style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',overflow:'hidden',boxShadow:'var(--shadow)'}}>
          {/* Form header */}
          <div style={{padding:'14px 20px',background:`var(--${selectedType?.color||'blue'}-light)`,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
            <i className={`fas ${selectedType?.icon}`} style={{fontSize:16,color:`var(--${selectedType?.color||'blue'})`}}/>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:`var(--${selectedType?.color||'blue'})`}}>{selectedType?.label}</div>
              <div style={{fontSize:12,color:'var(--text3)'}}>{new Date(form.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
          </div>

          <div style={{padding:'20px'}}>
            {/* Admin user selector */}
            {isAdmin && (
              <div style={{marginBottom:18,padding:'12px 14px',background:'var(--amber-light)',borderRadius:'var(--radius)',border:'1px solid var(--amber-mid)'}}>
                <label style={LBL}>Submit as engineer</label>
                <select value={form.user_id} onChange={e=>upd('user_id',e.target.value)} style={INP}>
                  <option value="">Myself (Admin)</option>
                  {engineers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}

            {/* Common fields */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px',marginBottom:16}}>
              <div><label style={LBL}>Date</label><input type="date" required value={form.date} onChange={e=>upd('date',e.target.value)} style={INP}/></div>
              <div><label style={LBL}>Location</label><input type="text" placeholder="e.g. Frankfurt CDC1" value={form.location} onChange={e=>upd('location',e.target.value)} style={INP}/></div>
              <div><label style={LBL}>Car plate</label><input type="text" placeholder="e.g. WI-HR 4427" value={form.car_plate} onChange={e=>upd('car_plate',e.target.value)} style={INP}/></div>
              <div><label style={LBL}>Driver name <span style={{fontWeight:400,color:'var(--text3)',textTransform:'none',fontSize:11}}>(blank = self-driving)</span></label><input type="text" placeholder="Driver name or leave blank" value={form.driver_name} onChange={e=>upd('driver_name',e.target.value)} style={INP}/></div>
            </div>

            {/* Attendance + Daily + Driver: times */}
            {['attendance','daily','driver'].includes(reportType) && (
              <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                <div style={SEC}>Shift Times</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px',marginBottom:12}}>
                  <div><label style={LBL}>Shift start</label><input type="time" value={form.start_time} onChange={e=>upd('start_time',e.target.value)} style={INP}/></div>
                  <div><label style={LBL}>Shift end</label><input type="time" value={form.end_time} onChange={e=>upd('end_time',e.target.value)} style={INP}/></div>
                </div>
                <label style={LBL}>Break duration</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
                  {BREAKS.map(m=>(
                    <button key={m} type="button" onClick={()=>upd('break_mins',m)} style={{padding:'5px 13px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:'1.5px solid',borderColor:form.break_mins===m?'var(--blue)':'var(--border2)',background:form.break_mins===m?'var(--blue)':'var(--surface)',color:form.break_mins===m?'#fff':'var(--text2)'}}>
                      {m===0?'No break':`${m} min`}
                    </button>
                  ))}
                  <input type="number" min="0" max="480" value={form.break_mins} onChange={e=>upd('break_mins',parseInt(e.target.value)||0)} style={{...INP,width:80,textAlign:'center'}}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {[['On site',fmt(totalMins),'text2'],['Break',`${parseInt(form.break_mins)||0}m`,'text3'],['Work',fmt(workMins),'blue'],['OT',fmt(otMins),otMins>0?'amber':'text3']].map(([l,v,c])=>(
                    <div key={l} style={{textAlign:'center',padding:'8px',background:'var(--surface2)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
                      <div style={{fontSize:10,color:`var(--${c})`,opacity:.7,marginBottom:2}}>{l}</div>
                      <div style={{fontSize:14,fontWeight:700,color:`var(--${c})`}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Odometer — all except fuel/maintenance */}
            {['attendance','daily'].includes(reportType) && (
              <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                <div style={SEC}>Odometer</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px'}}>
                  <div><label style={LBL}>Start km</label><input type="number" placeholder="Start odometer" value={form.start_km} onChange={e=>upd('start_km',e.target.value)} style={INP}/></div>
                  <div><label style={LBL}>End km</label><input type="number" placeholder="End odometer" value={form.end_km} onChange={e=>upd('end_km',e.target.value)} style={INP}/></div>
                </div>
                {shiftKm>0 && <div style={{fontSize:12,color:'var(--green)',marginTop:6,fontWeight:500}}><i className="fas fa-route" style={{marginRight:5}}/>{shiftKm} km this shift</div>}
              </div>
            )}

            {/* DAILY: tests + site */}
            {reportType === 'daily' && (
              <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                <div style={SEC}>Test Checklist</div>
                <DailyTests tests={form.daily_tests} onChange={v=>upd('daily_tests',v)} siteId={form.site_id} onSiteId={v=>upd('site_id',v)}/>
              </div>
            )}

            {/* DRIVER: simplified form */}
            {reportType === 'driver' && (
              <>
                <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                  <div style={SEC}>Trip Details</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px'}}>
                    <div><label style={LBL}>City</label><input type="text" placeholder="e.g. Frankfurt" value={form.city} onChange={e=>upd('city',e.target.value)} style={INP}/></div>
                    <div><label style={LBL}>Engineer carried</label><input type="text" placeholder="Engineer name(s)" value={form.engineer_carried} onChange={e=>upd('engineer_carried',e.target.value)} style={INP}/></div>
                    <div><label style={LBL}>Start KM</label><input type="number" placeholder="Odometer at start" value={form.start_km} onChange={e=>upd('start_km',e.target.value)} style={INP}/></div>
                    <div><label style={LBL}>End KM</label><input type="number" placeholder="Odometer at end" value={form.end_km} onChange={e=>upd('end_km',e.target.value)} style={INP}/></div>
                  </div>
                  {shiftKm>0 && <div style={{fontSize:12,color:'var(--green)',marginTop:8,fontWeight:500}}><i className="fas fa-route" style={{marginRight:5}}/>{shiftKm} km driven</div>}
                </div>

                {/* MANDATORY odometer photos */}
                <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                  <div style={{...SEC,display:'flex',alignItems:'center',gap:8}}>
                    Odometer Photos <span style={{fontSize:10,fontWeight:700,color:'var(--red)',background:'var(--red-l)',border:'1px solid var(--red-m)',padding:'2px 8px',borderRadius:20,textTransform:'none'}}>REQUIRED</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    {[['start_photo','Sign-In photo','Photo of odometer at shift start','green'],['end_photo','Sign-Out photo','Photo of odometer at shift end','red']].map(([key,title,hint,col])=>(
                      <div key={key}>
                        <label style={LBL}>{title}</label>
                        <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:photos[key]?'8px':'22px 14px',borderRadius:'var(--radius)',border:`2px dashed ${photos[key]?`var(--${col}-mid)`:'var(--border2)'}`,background:photos[key]?`var(--${col}-light)`:'var(--surface2)',cursor:'pointer',textAlign:'center',minHeight:110,overflow:'hidden'}}>
                          {photos[key]
                            ? <><img src={photos[key]} alt={title} style={{maxWidth:'100%',maxHeight:130,borderRadius:8,objectFit:'cover'}}/><span style={{fontSize:11,fontWeight:600,color:`var(--${col})`}}><i className="fas fa-circle-check" style={{marginRight:4}}/>Uploaded — tap to change</span></>
                            : <><i className="fas fa-camera" style={{fontSize:22,color:'var(--text3)'}}/><span style={{fontSize:12,color:'var(--text2)',fontWeight:600}}>{title}</span><span style={{fontSize:11,color:'var(--text3)'}}>{hint}</span></>}
                          <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>handlePhoto(key, e.target.files[0])}/>
                        </label>
                      </div>
                    ))}
                  </div>
                  {(!photos.start_photo||!photos.end_photo)&&<div style={{marginTop:10,fontSize:12,color:'var(--amber)',background:'var(--amber-light)',border:'1px solid var(--amber-mid)',padding:'8px 12px',borderRadius:'var(--radius)'}}><i className="fas fa-circle-info" style={{marginRight:6}}/>Both photos are required before you can submit this report.</div>}
                </div>
              </>
            )}

            {/* CAR FUEL */}
            {reportType === 'car_fuel' && (
              <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                <div style={SEC}>Fuel Details</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px'}}>
                  <div><label style={LBL}>Fuel (liters)</label><input type="number" step="0.01" placeholder="e.g. 45.5" value={form.fuel_liters} onChange={e=>upd('fuel_liters',e.target.value)} style={INP}/></div>
                  <div><label style={LBL}>Cost (€)</label><input type="number" step="0.01" placeholder="e.g. 72.80" value={form.fuel_cost} onChange={e=>upd('fuel_cost',e.target.value)} style={INP}/></div>
                  <div><label style={LBL}>Station / Location</label><input type="text" placeholder="e.g. Aral Frankfurt" value={form.fuel_station} onChange={e=>upd('fuel_station',e.target.value)} style={INP}/></div>
                  <div><label style={LBL}>Odometer at fill</label><input type="number" placeholder="Current km reading" value={form.odometer_at_fill} onChange={e=>upd('odometer_at_fill',e.target.value)} style={INP}/></div>
                </div>
              </div>
            )}

            {/* CAR MAINTENANCE */}
            {reportType === 'car_maintenance' && (
              <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                <div style={SEC}>Maintenance Details</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px'}}>
                  <div><label style={LBL}>Maintenance type</label><input type="text" placeholder="e.g. Oil change, Tyre replacement" value={form.maintenance_type} onChange={e=>upd('maintenance_type',e.target.value)} style={INP}/></div>
                  <div><label style={LBL}>Cost (€)</label><input type="number" step="0.01" placeholder="e.g. 150.00" value={form.maintenance_cost} onChange={e=>upd('maintenance_cost',e.target.value)} style={INP}/></div>
                  <div><label style={LBL}>Garage / Workshop</label><input type="text" placeholder="e.g. Bosch Service Frankfurt" value={form.garage} onChange={e=>upd('garage',e.target.value)} style={INP}/></div>
                  <div><label style={LBL}>Next service at (km)</label><input type="number" placeholder="e.g. 120000" value={form.next_service_km} onChange={e=>upd('next_service_km',e.target.value)} style={INP}/></div>
                  <div style={{gridColumn:'1/-1'}}><label style={LBL}>Notes</label><textarea placeholder="Details about the maintenance work..." value={form.maintenance_notes} onChange={e=>upd('maintenance_notes',e.target.value)} style={{...INP,minHeight:80,resize:'vertical'}}/></div>
                </div>
              </div>
            )}

            {/* Tasks / Observations — daily + driver */}
            {['daily','attendance'].includes(reportType) && (
              <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                <div style={SEC}>Tasks &amp; Observations</div>
                <textarea value={form.short_desc} onChange={e=>upd('short_desc',e.target.value)}
                  placeholder={reportType==='driver'?"Route details, special requests, notes...":`1. Daily Health Check\n2. Ping Test\n3. Other tasks...`}
                  style={{...INP,minHeight:90,resize:'vertical',lineHeight:1.6,marginBottom:12}}/>
                <label style={LBL}>Special test requester <span style={{fontWeight:400,textTransform:'none',fontSize:11}}>optional</span></label>
                <input type="text" value={form.special_requester} onChange={e=>upd('special_requester',e.target.value)} style={INP}/>
              </div>
            )}

            {reportType==='driver' && (
              <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:16}}>
                <label style={LBL}>Special request <span style={{fontWeight:400,textTransform:'none',fontSize:11}}>optional</span></label>
                <input type="text" placeholder="Any special request or note" value={form.special_requester} onChange={e=>upd('special_requester',e.target.value)} style={INP}/>
              </div>
            )}

            {err && <div style={{background:'var(--red-l)',color:'var(--red)',border:'1px solid var(--red-m)',padding:'10px 14px',borderRadius:'var(--radius)',fontSize:13,marginBottom:14,display:'flex',alignItems:'center',gap:8}}><i className="fas fa-circle-exclamation"/>{err}</div>}

            <button type="submit" disabled={busy} style={{width:'100%',padding:'13px',fontSize:14,fontWeight:700,border:'none',borderRadius:'var(--radius-lg)',cursor:busy?'not-allowed':'pointer',background:busy?'#93c5fd':`linear-gradient(135deg,var(--navy),var(--brand))`,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:busy?'none':'0 4px 14px rgba(15,27,61,.35)'}}>
              {busy?<><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%'}} className="spin"/>Saving…</>:<><i className="fas fa-paper-plane"/>Submit {selectedType?.label}</>}
            </button>
          </div>
        </div>
      </form>

      {/* SUCCESS POPUP */}
      {popup && (
        <div style={{position:'fixed',inset:0,zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(15,27,61,.5)',backdropFilter:'blur(4px)',padding:20}}>
          <div style={{background:'#fff',borderRadius:20,padding:'32px',width:'100%',maxWidth:520,boxShadow:'0 24px 80px rgba(15,27,61,.3)'}}>
            {/* Header */}
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{width:60,height:60,borderRadius:'50%',background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                <i className="fas fa-check" style={{fontSize:26,color:'#fff'}}/>
              </div>
              <div style={{fontSize:20,fontWeight:800,color:'var(--navy)',marginBottom:4}}>Report Submitted!</div>
              {popup.work_hours && (
                <div style={{fontSize:13,color:'var(--text2)'}}>
                  Work hours: <strong style={{color:'var(--blue)'}}>{popup.work_hours}</strong>
                  {popup.overtime && popup.overtime!=='00:00' && <> · Overtime: <strong style={{color:'var(--amber)'}}>{popup.overtime}</strong></>}
                </div>
              )}
            </div>

            {/* Summary text — daily reports only */}
            {popup.text && (
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>Daily Summary — copy and share</div>
                <div style={{background:'#f5f7fc',borderRadius:'var(--radius)',border:'1px solid var(--border)',padding:'14px',fontFamily:'monospace',fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:260,overflowY:'auto',color:'var(--navy)',marginBottom:12}}>
                  {popup.text}
                </div>
                <button onClick={copyText} style={{width:'100%',padding:'11px',borderRadius:'var(--radius)',border:'none',background:copied?'var(--green)':'var(--navy)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'background .2s',marginBottom:10}}>
                  <i className={`fas ${copied?'fa-check':'fa-copy'}`}/>
                  {copied?'Copied to clipboard!':'Copy Summary Text'}
                </button>
              </div>
            )}

            <button onClick={()=>setPopup(null)} style={{width:'100%',padding:'10px',borderRadius:'var(--radius)',border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const LBL={display:'block',marginBottom:5,fontSize:12,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.04em'}
const INP={width:'100%',padding:'9px 12px',borderRadius:'var(--radius)',border:'1.5px solid var(--border2)',fontSize:13,color:'var(--text)',background:'var(--surface)'}
const SEC={fontSize:12,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:12}
