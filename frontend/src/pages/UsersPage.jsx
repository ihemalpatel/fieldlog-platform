import React,{useState,useEffect}from 'react'
import{api}from'../api.js'

const ROLES={
  admin:   {label:'Admin',   color:'#0f1b3d',bg:'#eff4ff',border:'#bfcfee',icon:'fa-shield-halved',desc:'Full access'},
  manager: {label:'Manager', color:'#d97706',bg:'#fffbeb',border:'#fde68a',icon:'fa-user-tie',    desc:'Read-only dashboard'},
  hr:      {label:'HR',      color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe',icon:'fa-users',       desc:'Payroll & compliance'},
  engineer:{label:'Engineer',color:'#16a34a',bg:'#f0fdf4',border:'#bbf7d0',icon:'fa-hard-hat',    desc:'Submit daily reports'},
  driver:  {label:'Driver',  color:'#0891b2',bg:'#ecfeff',border:'#a5f3fc',icon:'fa-id-card',     desc:'Driver & car reports'},
}

const REPORT_TYPES=[
  {id:'attendance',  label:'Attendance Report', icon:'fa-calendar-check',  color:'blue'},
  {id:'daily',       label:'Daily Report',       icon:'fa-list-check',      color:'green'},
  {id:'driver',      label:'Driver Report',      icon:'fa-steering-wheel',  color:'purple'},
  {id:'car_fuel',    label:'Car — Fuel',         icon:'fa-gas-pump',        color:'amber'},
  {id:'car_maintenance',label:'Car — Maintenance',icon:'fa-screwdriver-wrench',color:'red'},
]

export default function UsersPage({onUsersChanged}){
  const[users,      setUsers]      =useState([])
  const[showAdd,    setShowAdd]    =useState(false)
  const[form,       setForm]       =useState({name:'',email:'',password:'pass123',role:'engineer',allowed_reports:['attendance','daily','driver','car_fuel','car_maintenance']})
  const[resetModal, setResetModal] =useState(null)
  const[accessModal,setAccessModal]=useState(null)
  const[deleteModal,setDeleteModal]=useState(null)
  const[newPw,      setNewPw]      =useState('')
  const[msg,        setMsg]        =useState({text:'',type:''})

  useEffect(()=>{load()},[])

  const load=async()=>{try{setUsers(await api.getUsers())}catch(e){}}
  const flash=(text,type='green')=>{setMsg({text,type});setTimeout(()=>setMsg({text:'',type:''}),4000)}

  async function addUser(e){
    e.preventDefault()
    try{
      await api.createUser(form)
      flash(`${form.name} added — welcome email sent`)
      setForm({name:'',email:'',password:'pass123',role:'engineer',allowed_reports:['attendance','daily','driver','car_fuel','car_maintenance']})
      setShowAdd(false);load();onUsersChanged&&onUsersChanged()
    }catch(ex){flash(ex.message,'red')}
  }

  async function doReset(){
    if(!newPw)return
    try{await api.resetUserPassword(resetModal.id,newPw);flash(`Password reset for ${resetModal.name}`);setResetModal(null);setNewPw('')}
    catch(ex){flash(ex.message,'red')}
  }

  async function doDelete(){
    try{await api.deleteUser(deleteModal.id);flash(`${deleteModal.name} deleted — notification email sent`);setDeleteModal(null);load();onUsersChanged&&onUsersChanged()}
    catch(ex){flash(ex.message,'red')}
  }

  async function saveAccess(uid,allowed){
    try{await api.updateUser(uid,{allowed_reports:allowed});flash('Report access updated');setAccessModal(null);load()}
    catch(ex){flash(ex.message,'red')}
  }

  const groups=Object.fromEntries(Object.keys(ROLES).map(r=>[r,users.filter(u=>u.role===r)]))
  const ini=name=>name.split(' ').map(w=>w[0]).slice(0,2).join('')

  const toggleType=(list,id)=>list.includes(id)?list.filter(x=>x!==id):[...list,id]

  return(
    <div className="fade-in">
      {msg.text&&<div style={{padding:'11px 16px',borderRadius:'var(--radius)',marginBottom:16,fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:10,background:`var(--${msg.type}-light)`,color:`var(--${msg.type})`,border:`1px solid var(--${msg.type}-mid)`}}>
        <i className={`fas fa-${msg.type==='green'?'circle-check':'circle-exclamation'}`}/>{msg.text}
      </div>}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:13,color:'var(--text3)'}}>
          {users.length} accounts · {groups.engineer.length} engineers · {groups.manager.length} managers · {groups.hr.length} HR
        </div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{padding:'9px 18px',borderRadius:'var(--radius)',fontSize:13,fontWeight:600,cursor:'pointer',border:'none',background:showAdd?'var(--surface2)':'var(--navy)',color:showAdd?'var(--text2)':'#fff',display:'flex',alignItems:'center',gap:8,boxShadow:showAdd?'none':'0 3px 10px rgba(15,27,61,.25)'}}>
          <i className={`fas fa-${showAdd?'xmark':'user-plus'}`}/>{showAdd?'Cancel':'Add member'}
        </button>
      </div>

      {showAdd&&(
        <div style={{background:'var(--surface)',border:'2px solid var(--navy)',borderRadius:'var(--radius-lg)',padding:'22px 24px',marginBottom:22,boxShadow:'0 0 0 4px var(--blue-light)'}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <i className="fas fa-user-plus" style={{color:'var(--navy)'}}/>New team member
          </div>
          <form onSubmit={addUser}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:16}}>
              {[['Full name','name','text','John Smith'],['Email','email','email','john@company.com'],['Password','password','text','']].map(([l,k,t,ph])=>(
                <div key={k}><label style={LBL}>{l}</label><input required={k!=='password'} type={t} placeholder={ph} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={INP}/></div>
              ))}
              <div><label style={LBL}>Role</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={INP}>
                  <option value="engineer">👷 Engineer</option>
                  <option value="driver">🚗 Driver</option>
                  <option value="manager">👔 Manager</option>
                  <option value="hr">👥 HR</option>
                  <option value="admin">⚙ Admin</option>
                </select>
              </div>
            </div>
            {/* Report access */}
            <div style={{marginBottom:16}}>
              <label style={LBL}>Report access</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {REPORT_TYPES.map(t=>{
                  const on=form.allowed_reports.includes(t.id)
                  return(
                    <button key={t.id} type="button" onClick={()=>setForm(f=>({...f,allowed_reports:toggleType(f.allowed_reports,t.id)}))} style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid`,borderColor:on?`var(--${t.color})`:'var(--border2)',background:on?`var(--${t.color}-light)`:'var(--surface)',color:on?`var(--${t.color})`:'var(--text3)',display:'flex',alignItems:'center',gap:5}}>
                      <i className={`fas ${t.icon}`} style={{fontSize:10}}/>{t.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <button type="submit" style={{padding:'10px 24px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:'var(--radius)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7,boxShadow:'0 2px 8px rgba(15,27,61,.3)'}}>
              <i className="fas fa-plus"/>Add &amp; send welcome email
            </button>
          </form>
        </div>
      )}

      {/* User groups */}
      {[['admin','Administrators'],['manager','Managers'],['hr','HR'],['engineer','Field Engineers'],['driver','Drivers']].map(([role,title])=>{
        if(!groups[role].length) return null
        const cfg=ROLES[role]
        return(
          <div key={role} style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <i className={`fas ${cfg.icon}`} style={{color:cfg.color,fontSize:14}}/>
              <span style={{fontSize:13,fontWeight:700}}>{title}</span>
              <span style={{fontSize:12,color:'var(--text3)',background:'var(--surface3)',padding:'1px 8px',borderRadius:20}}>{groups[role].length}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:8}}>
              {groups[role].map(u=>{
                const allowed=(u.allowed_reports||'').split(',').filter(Boolean)
                return(
                  <div key={u.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'13px 16px',boxShadow:'var(--shadow)',transition:'all .15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=cfg.color+'44';e.currentTarget.style.boxShadow='var(--shadow-md)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='var(--shadow)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                      <div style={{width:38,height:38,borderRadius:12,flexShrink:0,background:cfg.bg,border:`2px solid ${cfg.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:cfg.color}}>{ini(u.name)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13}}>{u.name}</div>
                        <div style={{fontSize:12,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                      </div>
                      <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:700,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,flexShrink:0}}>{cfg.label}</span>
                    </div>
                    {/* Report access badges */}
                    {(role==='engineer'||role==='driver')&&(
                      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
                        {REPORT_TYPES.map(t=>{
                          const on=allowed.includes(t.id)
                          return<span key={t.id} style={{fontSize:10,padding:'2px 7px',borderRadius:20,fontWeight:600,background:on?`var(--${t.color}-light)`:'var(--surface3)',color:on?`var(--${t.color})`:'var(--text3)',border:`1px solid ${on?`var(--${t.color}-mid)`:'var(--border)'}`,display:'flex',alignItems:'center',gap:4,opacity:on?1:.5}}>
                            <i className={`fas ${t.icon}`} style={{fontSize:8}}/>{t.label}
                          </span>
                        })}
                      </div>
                    )}
                    <div style={{display:'flex',gap:7}}>
                      {(role==='engineer'||role==='driver')&&<button onClick={()=>setAccessModal({...u,allowed:allowed})} style={{flex:1,...SMALL_BTN}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue-mid)';e.currentTarget.style.color='var(--blue)';e.currentTarget.style.background='var(--blue-light)'}} onMouseLeave={e=>{Object.assign(e.currentTarget.style,{borderColor:'var(--border)',color:'var(--text3)',background:'transparent'})}}>
                        <i className="fas fa-shield-check" style={{fontSize:10}}/>Access
                      </button>}
                      <button onClick={()=>setResetModal(u)} style={{flex:1,...SMALL_BTN}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--amber-mid)';e.currentTarget.style.color='var(--amber)';e.currentTarget.style.background='var(--amber-light)'}} onMouseLeave={e=>{Object.assign(e.currentTarget.style,{borderColor:'var(--border)',color:'var(--text3)',background:'transparent'})}}>
                        <i className="fas fa-key" style={{fontSize:10}}/>Reset PW
                      </button>
                      <button onClick={()=>setDeleteModal(u)} style={{...SMALL_BTN}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--red-m)';e.currentTarget.style.color='var(--red)';e.currentTarget.style.background='var(--red-l)'}} onMouseLeave={e=>{Object.assign(e.currentTarget.style,{borderColor:'var(--border)',color:'var(--text3)',background:'transparent'})}}>
                        <i className="fas fa-trash" style={{fontSize:10}}/>Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Reset password modal */}
      {resetModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,27,61,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400,backdropFilter:'blur(4px)'}} onClick={()=>setResetModal(null)}>
          <div style={{background:'var(--surface)',borderRadius:'var(--radius-xl)',padding:30,width:360,boxShadow:'var(--shadow-lg)',border:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
              <div style={{width:40,height:40,borderRadius:12,background:'var(--amber-light)',border:'1px solid var(--amber-mid)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="fas fa-key" style={{color:'var(--amber)',fontSize:16}}/>
              </div>
              <div><div style={{fontSize:15,fontWeight:700}}>Reset password</div><div style={{fontSize:13,color:'var(--text2)'}}>{resetModal.name}</div></div>
            </div>
            <label style={LBL}>New password</label>
            <input type="password" placeholder="Enter new password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={{...INP,marginBottom:18}} autoFocus/>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>{setResetModal(null);setNewPw('')}} style={{padding:'9px 16px',borderRadius:'var(--radius)',border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={doReset} style={{padding:'9px 18px',background:'var(--amber)',color:'#fff',border:'none',borderRadius:'var(--radius)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>
                <i className="fas fa-key"/>Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,27,61,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400,backdropFilter:'blur(4px)'}} onClick={()=>setDeleteModal(null)}>
          <div style={{background:'var(--surface)',borderRadius:'var(--radius-xl)',padding:30,width:380,boxShadow:'var(--shadow-lg)',border:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:40,height:40,borderRadius:12,background:'var(--red-l)',border:'1px solid var(--red-m)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="fas fa-trash" style={{color:'var(--red)',fontSize:16}}/>
              </div>
              <div><div style={{fontSize:15,fontWeight:700}}>Delete user?</div><div style={{fontSize:13,color:'var(--text2)'}}>{deleteModal.name}</div></div>
            </div>
            <div style={{fontSize:13,color:'var(--text2)',background:'var(--red-l)',border:'1px solid var(--red-m)',borderRadius:'var(--radius)',padding:'10px 14px',marginBottom:18,lineHeight:1.6}}>
              This permanently deletes the account and <strong>all their reports and punches</strong>. A notification email will be sent to {deleteModal.email}.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setDeleteModal(null)} style={{padding:'9px 16px',borderRadius:'var(--radius)',border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={doDelete} style={{padding:'9px 18px',background:'var(--red)',color:'#fff',border:'none',borderRadius:'var(--radius)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>
                <i className="fas fa-trash"/>Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report access modal */}
      {accessModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,27,61,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400,backdropFilter:'blur(4px)',padding:20}} onClick={()=>setAccessModal(null)}>
          <div style={{background:'var(--surface)',borderRadius:'var(--radius-xl)',padding:28,width:460,boxShadow:'var(--shadow-lg)',border:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Report access</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>{accessModal.name} — select which report types this engineer can see</div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:22}}>
              {REPORT_TYPES.map(t=>{
                const on=accessModal.allowed.includes(t.id)
                return(
                  <div key={t.id} onClick={()=>setAccessModal(a=>({...a,allowed:toggleType(a.allowed,t.id)}))}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:'var(--radius)',cursor:'pointer',border:`2px solid ${on?`var(--${t.color})`:'var(--border)'}`,background:on?`var(--${t.color}-light)`:'var(--surface)',transition:'all .15s'}}>
                    <div style={{width:32,height:32,borderRadius:9,background:on?`var(--${t.color})`:'var(--surface3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <i className={`fas ${t.icon}`} style={{fontSize:13,color:on?'#fff':`var(--text3)`}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13,color:on?`var(--${t.color})`:'var(--text)'}}>{t.label}</div>
                    </div>
                    <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${on?`var(--${t.color})`:'var(--border2)'}`,background:on?`var(--${t.color})`:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {on&&<i className="fas fa-check" style={{fontSize:10,color:'#fff'}}/>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setAccessModal(null)} style={{padding:'9px 16px',borderRadius:'var(--radius)',border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={()=>saveAccess(accessModal.id,accessModal.allowed)} style={{padding:'9px 20px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:'var(--radius)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(15,27,61,.3)'}}>
                <i className="fas fa-shield-check"/>Save access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const LBL={display:'block',fontSize:12,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:5}
const INP={width:'100%',padding:'9px 12px',borderRadius:'var(--radius)',border:'1.5px solid var(--border2)',fontSize:13,color:'var(--text)',background:'var(--surface)'}
const SMALL_BTN={padding:'5px 10px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'transparent',fontSize:12,color:'var(--text3)',cursor:'pointer',display:'flex',alignItems:'center',gap:4}
