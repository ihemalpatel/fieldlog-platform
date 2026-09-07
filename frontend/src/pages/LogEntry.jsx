import React, { useState, useEffect } from 'react'
import { api } from '../api.js'
import DailyTests, { defaultTests } from '../components/DailyTests.jsx'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
function timeDiff(t1,t2){const[h1,m1]=t1.split(':').map(Number);const[h2,m2]=t2.split(':').map(Number);let m=(h2*60+m2)-(h1*60+m1);if(m<0)m+=1440;return m}
function minsToHHMM(m){const mm=Math.max(0,m);return`${String(Math.floor(mm/60)).padStart(2,'0')}:${String(mm%60).padStart(2,'0')}`}

function SectionLabel({ icon, label, color='blue' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
      <div style={{ width:24, height:24, borderRadius:7, background:`var(--${color}-light)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <i className={`fas ${icon}`} style={{ color:`var(--${color})`, fontSize:11 }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</span>
    </div>
  )
}

export default function LogEntry({ user, isAdmin, engineers }) {
  const today = new Date().toISOString().split('T')[0]
  const BREAK_PRESETS = [0, 15, 30, 45, 60, 90]

  const [form, setForm] = useState({
    user_id:           isAdmin ? (engineers[0]?.id || user.id) : user.id,
    date:              today,
    location:          '',
    start_time:        '23:00',
    end_time:          '08:00',
    break_mins:        60,
    start_km:          '',
    end_km:            '',
    car_plate:         '',
    short_desc:        '',
    special_requester: '',
    driver_name: '',
    site_id:           '',
  })
  const [dailyTests, setDailyTests] = useState(defaultTests())
  const [computed,   setComputed]   = useState({ totalMins:0, workMins:0, otMins:0, shift:0 })
  const [saving,     setSaving]     = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')
  const [recent,     setRecent]     = useState([])

  function upd(k,v){ setForm(f=>({...f,[k]:v})) }

  useEffect(() => {
    const total = timeDiff(form.start_time, form.end_time)
    const bm = parseInt(form.break_mins)||0
    const workMins = total - bm
    setComputed({ totalMins:total, workMins, otMins:Math.max(0,workMins-480), shift:(parseInt(form.end_km)||0)-(parseInt(form.start_km)||0) })
  }, [form.start_time, form.end_time, form.break_mins, form.start_km, form.end_km])

  useEffect(() => {
    const uid = isAdmin ? form.user_id : user.id
    if (uid) api.getReports({ engineer_id:uid }).then(r=>setRecent(r.slice(0,5))).catch(()=>{})
  }, [form.user_id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (computed.workMins <= 0) { setError('Work hours calculated to 0 — check your times and break'); return }
    setSaving(true)
    try {
      await api.createReport({
        ...form,
        break_mins:  parseInt(form.break_mins)||0,
        start_km:    parseInt(form.start_km)||0,
        end_km:      parseInt(form.end_km)||0,
        daily_tests: JSON.stringify(dailyTests),
      })
      setSuccess(true)
      // Auto-hide after 4 seconds
      setTimeout(() => setSuccess(false), 4000)
      setForm(f => ({...f, date:today, location:'', short_desc:'', special_requester:'', start_km:'', end_km:'', car_plate:'', site_id:''}))
      setDailyTests(defaultTests())
      const uid = isAdmin ? form.user_id : user.id
      api.getReports({ engineer_id:uid }).then(r=>setRecent(r.slice(0,5)))
      setTimeout(() => setSuccess(false), 4000)
    } catch(err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const dayName = form.date ? DAYS[new Date(form.date).getDay()] : ''
  const hasOT   = computed.otMins > 0
  const failCount = Object.values(dailyTests).filter(v=>v==='not_done').length

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }} className="fade-in">

      {/* ── FORM ───────────────────────────────────────── */}
      <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', background:'linear-gradient(135deg,var(--blue-light),var(--surface))', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700 }}>Daily report</h2>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:3, display:'flex', alignItems:'center', gap:6 }}>
              <i className="fas fa-calendar-day" style={{ color:'var(--blue)', fontSize:12 }} />
              {dayName && <span style={{ fontWeight:600, color:'var(--blue)' }}>{dayName}</span>}
              {form.date && <span>{form.date}</span>}
            </div>
          </div>
          {success && (
            <div style={{ background:'var(--green)', color:'#fff', padding:'8px 16px', borderRadius:'var(--radius-lg)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, boxShadow:'0 3px 10px rgba(22,163,74,.3)' }}>
              <i className="fas fa-circle-check" /> Report saved!
            </div>
          )}
          {/* Full-screen popup overlay */}
          {success && (
            <div style={{position:'fixed',inset:0,zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(15,27,61,.3)',backdropFilter:'blur(3px)'}}>
              <div style={{background:'#fff',borderRadius:20,padding:'36px 48px',textAlign:'center',boxShadow:'0 20px 60px rgba(15,27,61,.3)',border:'2px solid var(--green)',animation:'fadeIn .2s ease'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                  <i className="fas fa-check" style={{fontSize:28,color:'#fff'}}/>
                </div>
                <div style={{fontSize:20,fontWeight:800,color:'var(--navy)',marginBottom:6}}>Report Submitted!</div>
                <div style={{fontSize:14,color:'var(--text2)'}}>Your daily report has been saved successfully.<br/>Admin will verify it shortly.</div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ padding:'24px' }}>

          {/* Admin selector */}
          {isAdmin && (
            <div style={{ marginBottom:20, padding:'12px 16px', background:'var(--amber-light)', borderRadius:'var(--radius)', border:'1px solid var(--amber-mid)', display:'flex', alignItems:'center', gap:12 }}>
              <i className="fas fa-user-gear" style={{ color:'var(--amber)', fontSize:15 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--amber)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Submitting for engineer</div>
                <select value={form.user_id} onChange={e=>upd('user_id',e.target.value)} style={{ ...inp, fontWeight:500 }}>
                  {engineers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── Basic info ── */}
          <div style={{ marginBottom:24 }}>
            <SectionLabel icon="fa-circle-info" label="Basic information" />
            <div style={{ ...grid2, marginBottom:0 }}>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={form.date} onChange={e=>upd('date',e.target.value)} style={inp} required />
              </div>
              <div>
                <label style={lbl}>Location / City</label>
                <div style={{ position:'relative' }}>
                  <i className="fas fa-location-dot" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:13, pointerEvents:'none' }} />
                  <input type="text" placeholder="e.g. Frankfurt" value={form.location} onChange={e=>upd('location',e.target.value)} style={{ ...inp, paddingLeft:30 }} />
                </div>
              </div>
              <div>
                <label style={lbl}>Car plate</label>
                <div style={{ position:'relative' }}>
                  <i className="fas fa-car" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:12, pointerEvents:'none' }} />
                  <input type="text" placeholder="e.g. WI-HR 4427" value={form.car_plate} onChange={e=>upd('car_plate',e.target.value)} style={{ ...inp, paddingLeft:30 }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Shift times ── */}
          <div style={{ marginBottom:24 }}>
            <SectionLabel icon="fa-clock" label="Shift times" />
            <div style={{ ...grid2, marginBottom:14 }}>
              <div>
                <label style={lbl}>Starting time</label>
                <input type="time" value={form.start_time} onChange={e=>upd('start_time',e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>End time</label>
                <input type="time" value={form.end_time} onChange={e=>upd('end_time',e.target.value)} style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Break duration <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, color:'var(--text3)', fontSize:11 }}>(minutes)</span></label>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center', marginBottom:10 }}>
                {BREAK_PRESETS.map(m=>(
                  <button key={m} type="button" onClick={()=>upd('break_mins',m)} style={{
                    padding:'6px 13px', borderRadius:'var(--radius)', border:'1.5px solid', fontSize:12, fontWeight:600, cursor:'pointer',
                    borderColor:form.break_mins===m?'var(--blue)':'var(--border2)',
                    background:form.break_mins===m?'var(--blue)':'var(--surface)',
                    color:form.break_mins===m?'#fff':'var(--text2)',
                  }}>{m===0?'No break':`${m} min`}</button>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ fontSize:12, color:'var(--text3)' }}>Custom:</span>
                  <input type="number" min="0" max="480" step="5" value={form.break_mins} onChange={e=>upd('break_mins',parseInt(e.target.value)||0)} style={{ ...inp, width:70, textAlign:'center' }} />
                  <span style={{ fontSize:12, color:'var(--text3)' }}>min</span>
                </div>
              </div>
            </div>
            {/* Live calc */}
            {computed.totalMins > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[
                  ['On site',  minsToHHMM(computed.totalMins), 'text2',                  'fa-hourglass'],
                  ['Break',    `${parseInt(form.break_mins)||0} min`, 'text3',            'fa-mug-hot'],
                  ['Work hrs', minsToHHMM(computed.workMins),  'blue',                   'fa-business-time'],
                  ['Overtime', minsToHHMM(computed.otMins),    hasOT?'amber':'text3',    'fa-clock'],
                ].map(([l,v,c,ic])=>(
                  <div key={l} style={{ textAlign:'center', padding:'9px 6px', background:c==='blue'?'var(--blue-light)':c==='amber'?'var(--amber-light)':'var(--surface2)', borderRadius:'var(--radius)', border:`1px solid ${c==='blue'?'var(--blue-mid)':c==='amber'?'var(--amber-mid)':'var(--border)'}` }}>
                    <div style={{ fontSize:10, color:`var(--${c})`, marginBottom:3, opacity:c==='text3'?.5:1 }}><i className={`fas ${ic}`} style={{ marginRight:3 }} />{l}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:`var(--${c})`, opacity:c==='text3'?.5:1 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Odometer ── */}
          <div style={{ marginBottom:24 }}>
            <SectionLabel icon="fa-road" label="Odometer readings" />
            <div style={grid2}>
              <div>
                <label style={lbl}>Starting km</label>
                <input type="number" placeholder="e.g. 10529" value={form.start_km} onChange={e=>upd('start_km',e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>End km</label>
                <input type="number" placeholder="e.g. 10557" value={form.end_km} onChange={e=>upd('end_km',e.target.value)} style={inp} />
              </div>
            </div>
            {computed.shift > 0 && <div style={{ marginTop:6, fontSize:12, color:'var(--green)', fontWeight:500 }}><i className="fas fa-route" style={{ marginRight:4 }} />{computed.shift} km this shift</div>}
          </div>

          {/* ── Daily tests ── */}
          <div style={{ marginBottom:24 }}>
            <SectionLabel icon="fa-flask" label="Daily test results" color="green" />
            <DailyTests
              tests={dailyTests}
              onChange={setDailyTests}
              siteId={form.site_id}
              onSiteId={v => upd('site_id', v)}
            />
          </div>

          {/* ── Observations / additional tasks ── */}
          <div style={{ marginBottom:20 }}>
            <SectionLabel icon="fa-clipboard-list" label="Additional tasks & observations" />
            <textarea
              value={form.short_desc}
              onChange={e=>upd('short_desc',e.target.value)}
              placeholder={"Any additional tasks, CRs, or observations beyond daily tests…\ne.g. CR-2026-04-10-000033: UPF patch upgrade from CMSEV_B_9_0_14_10C"}
              style={{ ...inp, minHeight:90, resize:'vertical', lineHeight:1.6 }}
            />
            <div style={{ marginTop:12 }}>
              <label style={lbl}>Special tests requester <span style={{ fontWeight:400, textTransform:'none', color:'var(--text3)', fontSize:11 }}>(if someone requested a specific test)</span></label>
              <input type="text" placeholder="Full name of requester" value={form.special_requester} onChange={e=>upd('special_requester',e.target.value)} style={inp} />
            </div>
          </div>

          {error && (
            <div style={{ background:'var(--red-light)', color:'var(--red)', border:'1px solid var(--red-mid)', padding:'10px 14px', borderRadius:'var(--radius)', fontSize:13, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <i className="fas fa-circle-exclamation" />{error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:10, justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', paddingTop:18 }}>
            <div style={{ fontSize:12, color:'var(--text3)' }}>
              {failCount > 0 && <span style={{ color:'var(--red)', fontWeight:600 }}><i className="fas fa-triangle-exclamation" style={{ marginRight:4 }} />{failCount} test{failCount>1?'s':''} not done — reasons noted above each test</span>}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button"
                onClick={() => { setForm(f=>({...f,date:today,location:'',short_desc:'',special_requester:'',start_km:'',end_km:'',car_plate:'',site_id:''})); setDailyTests(defaultTests()) }}
                style={{ padding:'10px 18px', borderRadius:'var(--radius)', border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text2)', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                Clear
              </button>
              <button type="submit" disabled={saving} style={{
                padding:'10px 24px', background:saving?'var(--blue-mid)':'var(--blue)', color:'#fff',
                border:'none', borderRadius:'var(--radius)', fontSize:13, fontWeight:600,
                cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8,
                boxShadow:saving?'none':'0 3px 10px rgba(37,99,235,.3)'
              }}>
                {saving?<><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%' }} className="spin" />Saving…</>:<><i className="fas fa-floppy-disk" />Save report</>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Recent */}
        <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
          <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <i className="fas fa-history" style={{ color:'var(--blue)', fontSize:13 }} />
            <span style={{ fontWeight:600, fontSize:13 }}>Recent reports</span>
          </div>
          <div>
            {recent.length === 0 ? (
              <div style={{ textAlign:'center', padding:'24px', color:'var(--text3)', fontSize:13 }}>
                <i className="fas fa-inbox" style={{ fontSize:20, display:'block', marginBottom:6, opacity:.35 }} />No reports yet
              </div>
            ) : recent.map(r => {
              const sc = r.check_status==='Verified'?'green':r.check_status==='Issue'?'red':'amber'
              let tests = {}
              try { tests = JSON.parse(r.daily_tests||'{}') } catch{}
              const fails = Object.values(tests).filter(v=>v==='not_done').length
              return (
                <div key={r.id} style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-start' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{ width:8, height:8, borderRadius:'50%', marginTop:5, flexShrink:0, background:`var(--${sc})` }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{r.date} <span style={{ color:'var(--text3)', fontWeight:400, fontSize:11 }}>{r.day?.slice(0,3)}</span></div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginTop:1 }}>{r.location}{r.site_id ? ` · ${r.site_id}` : ''}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>{r.work_hours} · {r.shift_km} km</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'flex-end' }}>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:600, background:`var(--${sc}-light)`, color:`var(--${sc})`, border:`1px solid var(--${sc}-mid)` }}>{r.check_status}</span>
                    {fails > 0 && <span style={{ fontSize:10, color:'var(--red)', fontWeight:600 }}>{fails} test{fails>1?'s':''} not done</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Verification */}
        <div style={{ background:'var(--amber-light)', borderRadius:'var(--radius-lg)', border:'1px solid var(--amber-mid)', padding:'14px 16px' }}>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--amber)', marginBottom:6, display:'flex', alignItems:'center', gap:7 }}>
            <i className="fas fa-shield-halved" />Verification
          </div>
          <p style={{ fontSize:12, color:'var(--amber)', lineHeight:1.7, opacity:.9 }}>
            Reports submit as <strong>Pending</strong> and are verified by admin.
          </p>
        </div>

        {/* Test guide */}
        <div style={{ background:'var(--green-light)', borderRadius:'var(--radius-lg)', border:'1px solid var(--green-mid)', padding:'14px 16px' }}>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--green)', marginBottom:10, display:'flex', alignItems:'center', gap:7 }}>
            <i className="fas fa-circle-question" />Daily test guide
          </div>
          {[
            ['Done', 'Test completed successfully'],
            ['Not Done', 'Test not completed — a comment box appears to add reason'],
            ['N/A',  'Test not applicable or not requested today'],
          ].map(([label, desc]) => (
            <div key={label} style={{ display:'flex', gap:8, marginBottom:7, fontSize:12, alignItems:'flex-start' }}>
              <span style={{ fontWeight:700, color:'var(--green)', flexShrink:0, width:28 }}>{label}</span>
              <span style={{ color:'var(--green)', opacity:.8, lineHeight:1.4 }}>{desc}</span>
            </div>
          ))}
          <div style={{ marginTop:8, fontSize:11, color:'var(--green)', opacity:.7, lineHeight:1.5 }}>
            Click ✔ Done or ✘ Not Done for each test
          </div>
        </div>
      </div>
    </div>
  )
}

const inp   = { width:'100%', padding:'9px 12px', borderRadius:'var(--radius)', border:'1.5px solid var(--border2)', fontSize:13, color:'var(--text)', background:'var(--surface)' }
const grid2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 16px' }
const lbl   = { display:'block', marginBottom:6, fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.04em' }
