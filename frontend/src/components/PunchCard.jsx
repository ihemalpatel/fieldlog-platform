import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

function timeDiff(t1,t2){
  if(!t1||!t2) return ''
  const[h1,m1]=t1.split(':').map(Number),[h2,m2]=t2.split(':').map(Number)
  let m=(h2*60+m2)-(h1*60+m1);if(m<0)m+=1440
  return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
}

export default function PunchCard({user}){
  const today=new Date().toISOString().split('T')[0]
  const[punches,setPunches]=useState([])
  const[busy,setBusy]=useState(false)
  const[msg,setMsg]=useState({text:'',type:''})
  const[customIn,setCustomIn]=useState('')
  const[customOut,setCustomOut]=useState('')
  const[showCustomIn,setShowCustomIn]=useState(false)
  const[showCustomOut,setShowCustomOut]=useState(false)

  useEffect(()=>{load()},[])

  async function load(){
    try{const d=await api.getPunch(today);setPunches(Array.isArray(d)?d:[])}catch(e){}
  }

  function flash(text,type='green'){setMsg({text,type});setTimeout(()=>setMsg({text:'',type:''}),3500)}

  async function doPunchIn(){
    setBusy(true)
    try{
      const t=customIn||''
      await api.punchIn(today,t)
      flash(`✅ Punched in at ${customIn||new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`)
      setCustomIn('');setShowCustomIn(false);load()
    }catch(e){flash(`⚠️ ${e.message}`,'amber')}
    setBusy(false)
  }

  async function doPunchOut(){
    setBusy(true)
    try{
      const t=customOut||''
      await api.punchOut(today,t)
      flash(`✅ Punched out at ${customOut||new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`,'red')
      setCustomOut('');setShowCustomOut(false);load()
    }catch(e){flash(`⚠️ ${e.message}`,'amber')}
    setBusy(false)
  }

  const lastPunch=punches[punches.length-1]
  const isOpen=lastPunch&&lastPunch.punch_in&&!lastPunch.punch_out
  const canIn=!isOpen, canOut=isOpen

  const totalMins=punches.reduce((sum,p)=>{
    if(!p.punch_in||!p.punch_out) return sum
    const[h1,m1]=p.punch_in.split(':').map(Number),[h2,m2]=p.punch_out.split(':').map(Number)
    let m=(h2*60+m2)-(h1*60+m1);if(m<0)m+=1440;return sum+m
  },0)
  const totalTime=totalMins>0?`${String(Math.floor(totalMins/60)).padStart(2,'0')}:${String(totalMins%60).padStart(2,'0')}`:''

  return(
    <div style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden',marginBottom:20}}>
      <div style={{background:'linear-gradient(135deg,var(--navy),var(--brand))',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <i className="fas fa-fingerprint" style={{color:'#fff',fontSize:18}}/>
          <div>
            <div style={{fontWeight:700,color:'#fff',fontSize:14}}>Daily Punch</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.6)'}}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>
          </div>
        </div>
        {totalTime&&<div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.06em'}}>Time on site</div>
          <div style={{fontSize:18,fontWeight:700,color:isOpen?'#fbbf24':'#60a5fa'}}>{totalTime}{isOpen&&' ↑'}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>{punches.length} punch{punches.length!==1?'es':''}</div>
        </div>}
      </div>

      <div style={{padding:'16px 20px'}}>
        {/* Punch In section */}
        <div style={{marginBottom:10}}>
          <div style={{display:'flex',gap:8,marginBottom:showCustomIn?8:0}}>
            <button onClick={doPunchIn} disabled={busy||!canIn} style={{flex:1,padding:'10px',borderRadius:'var(--radius)',border:'none',fontWeight:700,fontSize:13,cursor:canIn&&!busy?'pointer':'not-allowed',background:canIn?'var(--green)':'var(--surface3)',color:canIn?'#fff':'var(--text3)',display:'flex',alignItems:'center',justifyContent:'center',gap:7,boxShadow:canIn?'0 3px 10px rgba(22,163,74,.3)':'none',transition:'all .15s'}}>
              <i className="fas fa-right-to-bracket" style={{fontSize:12}}/>{isOpen?'Currently In':'Punch In'}
            </button>
            <button type="button" onClick={()=>{setShowCustomIn(s=>!s);setShowCustomOut(false)}} disabled={!canIn} style={{padding:'10px 12px',borderRadius:'var(--radius)',border:'1px solid var(--border2)',background:showCustomIn?'var(--green-light)':'var(--surface2)',color:showCustomIn?'var(--green)':'var(--text3)',fontSize:11,fontWeight:600,cursor:canIn?'pointer':'not-allowed',whiteSpace:'nowrap'}}>
              <i className="fas fa-clock" style={{marginRight:4}}/>Custom
            </button>
          </div>
          {showCustomIn&&canIn&&(
            <div style={{display:'flex',gap:8,alignItems:'center',padding:'10px',background:'var(--green-light)',borderRadius:'var(--radius)',border:'1px solid var(--green-mid)'}}>
              <span style={{fontSize:12,color:'var(--green)',fontWeight:600,whiteSpace:'nowrap'}}>Punch In at:</span>
              <input type="time" value={customIn} onChange={e=>setCustomIn(e.target.value)} style={{padding:'6px 10px',borderRadius:'var(--radius-sm)',border:'1px solid var(--green-mid)',fontSize:13,flex:1}}/>
              <button onClick={doPunchIn} disabled={busy||!customIn} style={{padding:'6px 14px',borderRadius:'var(--radius-sm)',border:'none',background:'var(--green)',color:'#fff',fontSize:12,fontWeight:700,cursor:customIn?'pointer':'not-allowed'}}>Confirm</button>
            </div>
          )}
        </div>

        {/* Punch Out section */}
        <div style={{marginBottom:12}}>
          <div style={{display:'flex',gap:8,marginBottom:showCustomOut?8:0}}>
            <button onClick={doPunchOut} disabled={busy||!canOut} style={{flex:1,padding:'10px',borderRadius:'var(--radius)',border:'none',fontWeight:700,fontSize:13,cursor:canOut&&!busy?'pointer':'not-allowed',background:canOut?'var(--red)':'var(--surface3)',color:canOut?'#fff':'var(--text3)',display:'flex',alignItems:'center',justifyContent:'center',gap:7,boxShadow:canOut?'0 3px 10px rgba(220,38,38,.3)':'none',transition:'all .15s'}}>
              <i className="fas fa-right-from-bracket" style={{fontSize:12}}/>{canOut?'Punch Out':'Not Punched In'}
            </button>
            <button type="button" onClick={()=>{setShowCustomOut(s=>!s);setShowCustomIn(false)}} disabled={!canOut} style={{padding:'10px 12px',borderRadius:'var(--radius)',border:'1px solid var(--border2)',background:showCustomOut?'var(--red-l)':'var(--surface2)',color:showCustomOut?'var(--red)':'var(--text3)',fontSize:11,fontWeight:600,cursor:canOut?'pointer':'not-allowed',whiteSpace:'nowrap'}}>
              <i className="fas fa-clock" style={{marginRight:4}}/>Custom
            </button>
          </div>
          {showCustomOut&&canOut&&(
            <div style={{display:'flex',gap:8,alignItems:'center',padding:'10px',background:'var(--red-l)',borderRadius:'var(--radius)',border:'1px solid var(--red-m)'}}>
              <span style={{fontSize:12,color:'var(--red)',fontWeight:600,whiteSpace:'nowrap'}}>Punch Out at:</span>
              <input type="time" value={customOut} onChange={e=>setCustomOut(e.target.value)} style={{padding:'6px 10px',borderRadius:'var(--radius-sm)',border:'1px solid var(--red-m)',fontSize:13,flex:1}}/>
              <button onClick={doPunchOut} disabled={busy||!customOut} style={{padding:'6px 14px',borderRadius:'var(--radius-sm)',border:'none',background:'var(--red)',color:'#fff',fontSize:12,fontWeight:700,cursor:customOut?'pointer':'not-allowed'}}>Confirm</button>
            </div>
          )}
        </div>

        {isOpen&&<div style={{fontSize:12,color:'var(--amber)',background:'var(--amber-light)',border:'1px solid var(--amber-mid)',padding:'7px 12px',borderRadius:'var(--radius)',marginBottom:10,display:'flex',alignItems:'center',gap:7}}><i className="fas fa-circle-dot" style={{fontSize:10}}/>Punched in since {lastPunch.punch_in} — remember to Punch Out</div>}

        {punches.length>0&&(
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:7}}>Today</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {punches.map((p,i)=>{
                const dur=timeDiff(p.punch_in,p.punch_out)
                return(
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 12px',borderRadius:'var(--radius)',background:'var(--surface2)',border:'1px solid var(--border)'}}>
                    <span style={{fontSize:11,fontWeight:600,color:'var(--text3)',width:18}}>#{i+1}</span>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--green)'}}>{p.punch_in}</span>
                    <i className="fas fa-arrow-right" style={{fontSize:9,color:'var(--text3)'}}/>
                    <span style={{fontSize:13,fontWeight:600,color:p.punch_out?'var(--red)':'var(--amber)',flex:1}}>{p.punch_out||'Active…'}</span>
                    {dur&&<span style={{fontSize:11,fontWeight:600,color:'var(--blue)',background:'var(--blue-light)',padding:'2px 8px',borderRadius:20}}>{dur}</span>}
                    {!p.punch_out&&<span style={{fontSize:9,color:'var(--amber)',fontWeight:700,background:'var(--amber-light)',padding:'2px 6px',borderRadius:20,border:'1px solid var(--amber-mid)'}}>ACTIVE</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {punches.length===0&&<div style={{textAlign:'center',padding:'10px',color:'var(--text3)',fontSize:13}}><i className="fas fa-hand-pointer" style={{display:'block',fontSize:20,marginBottom:6,opacity:.3}}/>No punches yet — click Punch In to start</div>}

        {msg.text&&<div style={{marginTop:10,fontSize:13,fontWeight:500,textAlign:'center',padding:'8px 12px',borderRadius:'var(--radius)',background:msg.type==='red'?'var(--red-l)':msg.type==='amber'?'var(--amber-light)':'var(--green-light)',color:msg.type==='red'?'var(--red)':msg.type==='amber'?'var(--amber)':'var(--green)',border:`1px solid ${msg.type==='red'?'var(--red-m)':msg.type==='amber'?'var(--amber-mid)':'var(--green-mid)'}`}}>{msg.text}</div>}
      </div>
    </div>
  )
}
