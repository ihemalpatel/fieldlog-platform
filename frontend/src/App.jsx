import React,{useState,useEffect}from 'react'
import Login from './pages/Login.jsx'
import EngineerDashboard from './pages/EngineerDashboard.jsx'
import NewReport from './pages/NewReport.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import MyReports from './pages/MyReports.jsx'
import MonthlyReport from './pages/MonthlyReport.jsx'
import UsersPage from './pages/UsersPage.jsx'
import NotificationBell from './components/NotificationBell.jsx'
import{api}from'./api.js'

const NAV={
  admin:[
    {id:'dashboard',label:'Dashboard',icon:'fa-gauge-high'},
    {id:'newreport',label:'New Report',icon:'fa-pen-to-square'},
    {id:'monthly',  label:'Monthly',  icon:'fa-calendar-days'},
    {id:'users',    label:'Team',     icon:'fa-users'},
  ],
  manager:[
    {id:'dashboard',label:'Dashboard',icon:'fa-gauge-high'},
    {id:'monthly',  label:'Monthly',  icon:'fa-calendar-days'},
  ],
  hr:[
    {id:'dashboard',label:'Dashboard',icon:'fa-gauge-high'},
    {id:'monthly',  label:'Monthly',  icon:'fa-calendar-days'},
  ],
  engineer:[
    {id:'home',     label:'Home',     icon:'fa-house'},
    {id:'newreport',label:'New Report',icon:'fa-pen-to-square'},
    {id:'myreports',label:'My Reports',icon:'fa-clock-rotate-left'},
  ],
}
const ROLE_COLORS={admin:'#0f1b3d',manager:'#d97706',hr:'#7c3aed',engineer:'#16a34a'}
const META={
  dashboard:{title:'Dashboard',           sub:'Live overview of all engineer activity'},
  home:     {title:'My Dashboard',        sub:()=>new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})},
  newreport:{title:'New Report',          sub:'Select report type and fill in details'},
  myreports:{title:'My Reports',          sub:'View and edit your submitted reports'},
  monthly:  {title:'Monthly Report',      sub:'Attendance, hours, overtime and km by month'},
  users:    {title:'Team Management',     sub:'Manage engineers, assign report access'},
}

export default function App(){
  const[user,setUser]=useState(null)
  const[page,setPage]=useState('dashboard')
  const[engineers,setEngineers]=useState([])
  const[checking,setChecking]=useState(true)

  useEffect(()=>{
    const t=localStorage.getItem('mir_tok')
    if(t){
      api.me()
        .then(({user})=>{
          setUser(user)
          setPage(['admin','manager','hr'].includes(user.role)?'dashboard':'home')
          if(user.role==='admin') loadEngineers()
        })
        .catch(()=>localStorage.removeItem('mir_tok'))
        .finally(()=>setChecking(false))
    }else setChecking(false)
  },[])

  const loadEngineers=()=>api.getUsers().then(u=>setEngineers(u.filter(x=>x.role==='engineer')))

  function onLogin(u){
    setUser(u)
    setPage(['admin','manager','hr'].includes(u.role)?'dashboard':'home')
    if(u.role==='admin') loadEngineers()
  }
  function onLogout(){localStorage.removeItem('mir_tok');setUser(null);setPage('dashboard')}

  if(checking)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:14,background:'#0f1b3d'}}>
      <img src="/logo.svg" alt="FieldLog" style={{width:64,marginBottom:4}}/>
      <div style={{width:32,height:32,border:'3px solid rgba(255,255,255,.2)',borderTopColor:'#fff',borderRadius:'50%'}} className="spin"/>
      <span style={{color:'rgba(255,255,255,.4)',fontSize:13}}>Loading FieldLog…</span>
    </div>
  )
  if(!user)return<Login onLogin={onLogin}/>

  const role=user.role
  const isAdmin=role==='admin'
  const isViewer=role==='manager'||role==='hr'
  const isEng=role==='engineer'
  const navItems=NAV[role]||NAV.engineer
  const initials=user.name.split(' ').map(w=>w[0]).slice(0,2).join('')
  const roleColor=ROLE_COLORS[role]||'#16a34a'
  const meta=META[page]||{}
  const subtitle=typeof meta.sub==='function'?meta.sub():meta.sub

  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* TOPBAR */}
      <header style={{background:'var(--navy)',borderBottom:'1px solid rgba(255,255,255,.07)',padding:'0 24px',display:'flex',alignItems:'center',height:58,position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 12px rgba(15,27,61,.5)'}}>
        <div style={{display:'flex',alignItems:'center',gap:11,marginRight:40,flexShrink:0}}>
          <img src="/logo.svg" alt="FieldLog" style={{width:36,height:26}}/>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'.05em',lineHeight:1.1}}>FIELDLOG</div>
            <div style={{fontSize:8,fontWeight:600,color:'rgba(255,255,255,.35)',letterSpacing:'.12em',textTransform:'uppercase'}}>Attendance Project</div>
          </div>
        </div>
        <nav style={{display:'flex',gap:2,flex:1}}>
          {navItems.map(n=>{
            const a=page===n.id
            return(
              <button key={n.id} onClick={()=>setPage(n.id)} style={{padding:'7px 14px',borderRadius:'var(--radius)',border:'none',display:'flex',alignItems:'center',gap:7,fontSize:13,fontWeight:500,cursor:'pointer',transition:'all .15s',background:a?'rgba(255,255,255,.12)':'transparent',color:a?'#fff':'rgba(255,255,255,.5)',boxShadow:a?'inset 0 0 0 1px rgba(255,255,255,.15)':'none'}}>
                <i className={`fas ${n.icon}`} style={{fontSize:13}}/>{n.label}
              </button>
            )
          })}
        </nav>
        <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <NotificationBell/>
          <div style={{width:1,height:26,background:'rgba(255,255,255,.12)',margin:'0 2px'}}/>
          <div style={{textAlign:'right',lineHeight:1.3}}>
            <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{user.name}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>{role}</div>
          </div>
          <div style={{width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${roleColor},${roleColor}99)`,border:'2px solid rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>{initials}</div>
          <button onClick={onLogout} style={{padding:'6px 12px',borderRadius:'var(--radius)',fontSize:12,fontWeight:500,border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.06)',color:'rgba(255,255,255,.6)',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(220,38,38,.25)';e.currentTarget.style.color='#fca5a5';e.currentTarget.style.borderColor='rgba(220,38,38,.4)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.06)';e.currentTarget.style.color='rgba(255,255,255,.6)';e.currentTarget.style.borderColor='rgba(255,255,255,.15)'}}>
            <i className="fas fa-arrow-right-from-bracket" style={{fontSize:12}}/>Sign out
          </button>
        </div>
      </header>

      {/* PAGE HEADER */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'16px 28px 14px',borderLeft:`4px solid ${roleColor}`}}>
        <h1 style={{fontSize:21,fontWeight:800,letterSpacing:'-.02em',color:'var(--navy)'}}>{meta.title}</h1>
        <p style={{fontSize:13,color:'var(--text3)',marginTop:3}}>{subtitle}</p>
      </div>

      {/* MAIN */}
      <main style={{flex:1,padding:'24px 28px 48px'}} className="fade-in">
        {page==='home'      && isEng   && <EngineerDashboard user={user}/>}
        {page==='dashboard' && (isAdmin||isViewer) && <AdminDashboard engineers={engineers} readOnly={isViewer}/>}
        {page==='newreport'              && <NewReport user={user} isAdmin={isAdmin} engineers={engineers}/>}
        {page==='myreports' && isEng    && <MyReports user={user}/>}
        {page==='monthly'               && <MonthlyReport user={user}/>}
        {page==='users'     && isAdmin  && <UsersPage onUsersChanged={loadEngineers}/>}
      </main>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid rgba(255,255,255,.07)',padding:'12px 28px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--navy)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="/logo.svg" alt="FieldLog" style={{width:20,height:15}}/>
          <span style={{fontSize:12,color:'rgba(255,255,255,.3)'}}>FieldLog · Field Reporting System · {new Date().getFullYear()}</span>
        </div>
        <span style={{fontSize:12,color:'rgba(255,255,255,.2)',textTransform:'capitalize'}}>{role}</span>
      </footer>
    </div>
  )
}
