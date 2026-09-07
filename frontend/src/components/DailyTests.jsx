import React from 'react'
export const GROUPS=[
  {id:'routine',label:'Routine',icon:'fa-list-check',color:'blue',tests:[
    {id:'health_check',label:'Daily Health Check',sub:null},
    {id:'ping_test',label:'Ping Test',sub:null}]},
  {id:'volte',label:'VoLTE',icon:'fa-phone',color:'green',tests:[
    {id:'volte_mos_onnet',label:'VoLTE MOS',sub:'Onnet'},
    {id:'volte_mos_offnet',label:'VoLTE MOS',sub:'Offnet'},
    {id:'volte_short_onnet',label:'VoLTE Short Call',sub:'Onnet'},
    {id:'volte_short_offnet',label:'VoLTE Short Call',sub:'Offnet'}]},
  {id:'data',label:'Data',icon:'fa-wifi',color:'purple',tests:[
    {id:'multicall_onnet',label:'Multicall Data',sub:'Onnet'},
    {id:'multicall_offnet',label:'Multicall Data',sub:'Offnet'},
    {id:'youtube_onnet',label:'YouTube',sub:'Onnet'},
    {id:'youtube_offnet',label:'YouTube',sub:'Offnet'}]},
  {id:'network',label:'Network',icon:'fa-tower-broadcast',color:'amber',tests:[
    {id:'twamp_onnet',label:'TWAMP',sub:'Onnet'},
    {id:'twamp_offnet',label:'TWAMP',sub:'Offnet'},
    {id:'ping_at_dt',label:'Ping AT/DT Multicall',sub:null}]},
]
export const ALL_IDS=GROUPS.flatMap(g=>g.tests.map(t=>t.id))
export const defaultTests=()=>{const s={};ALL_IDS.forEach(id=>{s[id]='done';s[id+'_note']=''}); return s}

export default function DailyTests({tests,onChange,siteId,onSiteId,readOnly=false}){
  const set=(id,v)=>onChange({...tests,[id]:v})
  const setNote=(id,v)=>onChange({...tests,[id+'_note']:v})
  const allDone=()=>{const u={};ALL_IDS.forEach(id=>{u[id]='done'}); onChange({...tests,...u})}
  const notDoneCount=ALL_IDS.filter(id=>tests[id]==='not_done').length
  return(
    <div>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:160}}>
          <i className="fas fa-tower-cell" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',fontSize:12,pointerEvents:'none'}}/>
          <input type="text" placeholder="Site ID e.g. FRAM00004501" value={siteId} onChange={e=>onSiteId(e.target.value)} readOnly={readOnly}
            style={{width:'100%',padding:'8px 10px 8px 30px',borderRadius:'var(--radius)',border:'1.5px solid var(--border2)',fontSize:13,color:'var(--text)',background:'var(--surface)'}}/>
        </div>
        {!readOnly&&<button type="button" onClick={allDone} style={{padding:'8px 16px',borderRadius:'var(--radius)',border:'1.5px solid var(--green-mid)',background:'var(--green-light)',color:'var(--green)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
          <i className="fas fa-check-double" style={{fontSize:12}}/> All done today
        </button>}
        {notDoneCount>0&&<span style={{fontSize:12,fontWeight:600,color:'var(--red)',background:'var(--red-l)',padding:'4px 12px',borderRadius:20,border:'1px solid var(--red-m)'}}>{notDoneCount} not done</span>}
      </div>
      <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
        {GROUPS.map((g,gi)=>(
          <div key={g.id}>
            <div style={{padding:'7px 14px',background:`var(--${g.color}-light)`,borderTop:gi>0?'1px solid var(--border)':'none',display:'flex',alignItems:'center',gap:7}}>
              <i className={`fas ${g.icon}`} style={{fontSize:11,color:`var(--${g.color})`}}/>
              <span style={{fontSize:11,fontWeight:700,color:`var(--${g.color})`,textTransform:'uppercase',letterSpacing:'.06em'}}>{g.label}</span>
            </div>
            {g.tests.map(test=>{
              const st=tests[test.id]||'done', note=tests[test.id+'_note']||''
              const done=st==='done', nd=st==='not_done'
              return(
                <div key={test.id}>
                  <div style={{display:'flex',alignItems:'center',padding:'10px 14px',borderTop:'1px solid var(--border)',background:nd?'#fff5f5':'var(--surface)',gap:12}}>
                    <div style={{flex:1,display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                      <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:done?'var(--green)':nd?'var(--red)':'var(--border2)'}}/>
                      <span style={{fontSize:13,color:'var(--text)'}}>{test.label}</span>
                      {test.sub&&<span style={{fontSize:11,fontWeight:700,color:`var(--${g.color})`,background:`var(--${g.color}-light)`,padding:'1px 7px',borderRadius:20,border:`1px solid var(--${g.color}-mid)`,flexShrink:0}}>{test.sub}</span>}
                    </div>
                    {readOnly
                      ?<span style={{fontSize:12,fontWeight:700,padding:'3px 12px',borderRadius:20,background:done?'var(--green-light)':'var(--red-l)',color:done?'var(--green)':'var(--red)',border:`1px solid ${done?'var(--green-mid)':'var(--red-m)'}`,display:'flex',alignItems:'center',gap:5}}>
                        <i className={`fas ${done?'fa-check':'fa-xmark'}`} style={{fontSize:10}}/>{done?'Done':'Not Done'}
                      </span>
                      :<div style={{display:'flex',borderRadius:20,border:'1.5px solid var(--border2)',overflow:'hidden',flexShrink:0}}>
                        <button type="button" onClick={()=>set(test.id,'done')} style={{padding:'5px 16px',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5,transition:'all .12s',background:done?'var(--green)':'var(--surface)',color:done?'#fff':'var(--text3)'}}>
                          <i className="fas fa-check" style={{fontSize:10}}/> Done
                        </button>
                        <div style={{width:1,background:'var(--border2)'}}/>
                        <button type="button" onClick={()=>set(test.id,nd?'done':'not_done')} style={{padding:'5px 16px',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5,transition:'all .12s',background:nd?'var(--red)':'var(--surface)',color:nd?'#fff':'var(--text3)'}}>
                          <i className="fas fa-xmark" style={{fontSize:10}}/> Not Done
                        </button>
                      </div>}
                  </div>
                  {!readOnly&&(
                    <div style={{padding:'4px 14px 10px 32px',background:nd?'#fff5f5':'var(--surface2)',borderTop:`1px dashed ${nd?'var(--red-m)':'var(--border)'}`}}>
                      <input type="text" value={note} onChange={e=>setNote(test.id,e.target.value)} placeholder={nd?"Quick note — why not done? (optional)":"Quick note (optional)"}
                        style={{width:'100%',padding:'6px 10px',borderRadius:'var(--radius-sm)',border:`1px solid ${nd?'var(--red-m)':'var(--border2)'}`,background:'#fff',fontSize:12,color:'var(--text)'}}/>
                    </div>
                  )}
                  {nd&&readOnly&&note&&<div style={{padding:'3px 14px 8px 32px',background:'#fff5f5',fontSize:12,color:'var(--red)',fontStyle:'italic'}}>↳ {note}</div>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function TestsSummary({tests,siteId}){
  if(!tests||!Object.keys(tests).length) return null
  const nd=ALL_IDS.filter(id=>tests[id]==='not_done').map(id=>{
    const note=tests[id+'_note']||''
    for(const g of GROUPS){const t=g.tests.find(t=>t.id===id);if(t)return{name:t.sub?`${t.label} (${t.sub})`:t.label,note}}
    return{name:id,note}
  })
  const dc=ALL_IDS.filter(id=>!tests[id]||tests[id]==='done').length
  return(
    <div style={{fontSize:12,display:'flex',flexDirection:'column',gap:5}}>
      {siteId&&<span style={{color:'var(--text2)',display:'flex',alignItems:'center',gap:5}}><i className="fas fa-tower-cell" style={{fontSize:10,color:'var(--text3)'}}/>Site: <strong>{siteId}</strong></span>}
      <div style={{display:'flex',gap:10}}>
        <span style={{color:'var(--green)',fontWeight:600}}><i className="fas fa-check" style={{marginRight:4}}/>{dc} done</span>
        {nd.length>0&&<span style={{color:'var(--red)',fontWeight:600}}><i className="fas fa-xmark" style={{marginRight:4}}/>{nd.length} not done</span>}
      </div>
      {nd.map(({name,note})=>(
        <div key={name} style={{background:'var(--red-l)',border:'1px solid var(--red-m)',borderRadius:'var(--radius-sm)',padding:'5px 10px',color:'var(--red)'}}>
          <strong>{name}</strong>{note?` — ${note}`:''}
        </div>
      ))}
    </div>
  )
}
