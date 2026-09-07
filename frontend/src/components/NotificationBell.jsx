import React,{useState,useEffect,useRef} from 'react'
import{api}from'../api.js'
export default function NotificationBell(){
  const[notifs,setNotifs]=useState([]);const[open,setOpen]=useState(false);const ref=useRef(null)
  const load=()=>api.getNotifs().then(setNotifs).catch(()=>{})
  useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[])
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  const unread=notifs.filter(n=>!n.is_read).length
  const markRead=async id=>{await api.readNotif(id);setNotifs(ns=>ns.map(n=>n.id===id?{...n,is_read:1}:n))}
  const markAll=async()=>{await api.readAllNotifs();setNotifs(ns=>ns.map(n=>({...n,is_read:1})))}
  const ago=ts=>{if(!ts)return'';const d=(Date.now()-new Date(ts+' UTC').getTime())/1000;if(d<60)return'just now';if(d<3600)return`${Math.floor(d/60)}m ago`;if(d<86400)return`${Math.floor(d/3600)}h ago`;return`${Math.floor(d/86400)}d ago`}
  const COL={admin_edit:'var(--amber)',status_verified:'var(--green)',status_issue:'var(--red)'}
  const ICO={admin_edit:'fa-pen-to-square',status_verified:'fa-circle-check',status_issue:'fa-circle-exclamation'}
  return(
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:34,height:34,borderRadius:'var(--radius)',cursor:'pointer',border:`1px solid ${open?'rgba(255,255,255,.3)':'rgba(255,255,255,.15)'}`,background:open?'rgba(255,255,255,.15)':'rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
        <i className="fas fa-bell" style={{fontSize:14,color:unread>0?'#fff':'rgba(255,255,255,.5)'}}/>
        {unread>0&&<span style={{position:'absolute',top:-5,right:-5,width:18,height:18,borderRadius:'50%',background:'var(--red)',color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid var(--navy)'}}>{unread>9?'9+':unread}</span>}
      </button>
      {open&&(
        <div style={{position:'absolute',top:44,right:0,width:320,background:'var(--surface)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)',boxShadow:'var(--shadow-lg)',zIndex:300,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontWeight:600,fontSize:14,display:'flex',alignItems:'center',gap:8}}>
              <i className="fas fa-bell" style={{color:'var(--brand)',fontSize:13}}/>Notifications
              {unread>0&&<span style={{background:'var(--red)',color:'#fff',fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:20}}>{unread} new</span>}
            </span>
            {unread>0&&<button onClick={markAll} style={{fontSize:12,color:'var(--brand)',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>Mark all read</button>}
          </div>
          <div style={{maxHeight:380,overflowY:'auto'}}>
            {notifs.length===0
              ?<div style={{padding:'32px 16px',textAlign:'center',color:'var(--text3)',fontSize:13}}><i className="fas fa-bell-slash" style={{fontSize:24,display:'block',marginBottom:8,opacity:.3}}/>No notifications</div>
              :notifs.map(n=>{
                const col=COL[n.type]||'var(--brand)',ico=ICO[n.type]||'fa-circle-info'
                return(
                  <div key={n.id} onClick={()=>!n.is_read&&markRead(n.id)}
                    style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:n.is_read?'transparent':'var(--blue-light)',cursor:n.is_read?'default':'pointer',display:'flex',gap:11,alignItems:'flex-start'}}
                    onMouseEnter={e=>e.currentTarget.style.background=n.is_read?'var(--surface2)':'var(--surface3)'}
                    onMouseLeave={e=>e.currentTarget.style.background=n.is_read?'transparent':'var(--blue-light)'}>
                    <div style={{width:30,height:30,borderRadius:9,flexShrink:0,background:n.is_read?'var(--surface3)':col+'18',border:`1px solid ${n.is_read?'var(--border)':col+'33'}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <i className={`fas ${ico}`} style={{fontSize:12,color:n.is_read?'var(--text3)':col}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,lineHeight:1.5,color:n.is_read?'var(--text2)':'var(--text)',fontWeight:n.is_read?400:500}}>{n.message}</div>
                      <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{ago(n.created_at)}</div>
                    </div>
                    {!n.is_read&&<div style={{width:7,height:7,borderRadius:'50%',background:'var(--brand2)',flexShrink:0,marginTop:5}}/>}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
