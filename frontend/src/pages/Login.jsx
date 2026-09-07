import React, { useState } from 'react'
import { api } from '../api.js'

export default function Login({ onLogin }) {
  const [mode,   setMode]   = useState('login') // login | forgot | reset
  const [email,  setEmail]  = useState('')
  const [pw,     setPw]     = useState('')
  const [token,  setToken]  = useState('')
  const [newPw,  setNewPw]  = useState('')
  const [err,    setErr]    = useState('')
  const [msg,    setMsg]    = useState('')
  const [busy,   setBusy]   = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function doLogin(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const { token, user } = await api.login(email, pw)
      localStorage.setItem('mir_tok', token); onLogin(user)
    } catch(ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  async function doForgot(e) {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true)
    try {
      const d = await api.forgotPassword(email)
      setMsg(d.message || 'Check your email for the reset link.')
      // Dev mode: show token so user can test
      if (d.dev_token) {
        setMsg(`Dev mode: copy this token → ${d.dev_token}\nPaste it in the "Reset Password" screen.`)
        setToken(d.dev_token)
      }
    } catch(ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  async function doReset(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      await api.resetPasswordToken(token, newPw)
      setMsg('Password reset! You can now sign in.')
      setTimeout(() => { setMode('login'); setMsg('') }, 2000)
    } catch(ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  const features = [
    ['fa-clock',        'Auto-calculates work hours and overtime'],
    ['fa-list-check',   'Daily test checklist: VoLTE, Data, Network'],
    ['fa-shield-halved','Admin verification for every report'],
    ['fa-bell',         'Notifications when admin edits or verifies'],
    ['fa-users',        'Manager and HR read-only dashboard access'],
    ['fa-fingerprint',  'Daily punch-in / punch-out tracking'],
  ]

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'#0f1b3d'}}>
      {/* Left panel */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px 72px',overflow:'hidden',position:'relative'}}>
        <div style={{position:'absolute',top:-120,right:-80,width:380,height:380,borderRadius:'50%',background:'rgba(37,99,235,.07)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-80,left:-60,width:280,height:280,borderRadius:'50%',background:'rgba(220,38,38,.05)',pointerEvents:'none'}}/>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:48}}>
          <img src="/logo.svg" alt="FieldLog" style={{width:66,height:48}}/>
          <div>
            <div style={{fontSize:25,fontWeight:900,color:'#fff',letterSpacing:'.06em'}}>FIELDLOG</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:'.14em',textTransform:'uppercase'}}>Field Reporting System</div>
          </div>
        </div>
        <h1 style={{fontSize:32,fontWeight:800,color:'#fff',lineHeight:1.2,letterSpacing:'-.02em',marginBottom:14}}>
          Attendance &amp;<br/><span style={{color:'#60a5fa'}}>Field Reports,</span><br/>simplified.
        </h1>
        <p style={{fontSize:14,color:'rgba(255,255,255,.5)',lineHeight:1.75,maxWidth:360,marginBottom:36}}>
          One platform for your entire field team. Log daily work, complete test checklists, and let management verify everything live.
        </p>
        {features.map(([ico,txt]) => (
          <div key={txt} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
            <div style={{width:30,height:30,borderRadius:9,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className={`fas ${ico}`} style={{fontSize:12,color:'#60a5fa'}}/>
            </div>
            <span style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>{txt}</span>
          </div>
        ))}
      </div>

      {/* Right panel */}
      <div style={{width:440,display:'flex',alignItems:'center',justifyContent:'center',padding:32,background:'rgba(255,255,255,.03)',borderLeft:'1px solid rgba(255,255,255,.07)'}}>
        <div style={{background:'#fff',borderRadius:20,padding:'40px 36px',width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,.4)'}}>

          {/* Card header */}
          <div style={{textAlign:'center',marginBottom:24}}>
            <div style={{width:48,height:48,borderRadius:14,background:'#0f1b3d',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
              <img src="/logo.svg" alt="FieldLog" style={{width:28,height:20}}/>
            </div>
            <h2 style={{fontSize:19,fontWeight:800,color:'#0f1b3d'}}>
              {mode==='login'?'Sign in':mode==='forgot'?'Reset Password':'Set New Password'}
            </h2>
            <p style={{fontSize:12,color:'#8a9bbf',marginTop:3}}>FieldLog</p>
          </div>

          {/* Messages */}
          {msg && <div style={{background:'#f0fdf4',color:'#16a34a',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:14,border:'1px solid #bbf7d0',whiteSpace:'pre-line'}}>{msg}</div>}
          {err && <div style={{background:'#fef2f2',color:'#dc2626',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:14,border:'1px solid #fecaca',display:'flex',alignItems:'center',gap:8}}><i className="fas fa-circle-exclamation"/>{err}</div>}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={doLogin}>
              <div style={{marginBottom:14}}>
                <label style={LBL}>Email</label>
                <div style={{position:'relative'}}>
                  <i className="fas fa-envelope" style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#8a9bbf',fontSize:13,pointerEvents:'none'}}/>
                  <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={{...INP,paddingLeft:34}}/>
                </div>
              </div>
              <div style={{marginBottom:8}}>
                <label style={LBL}>Password</label>
                <div style={{position:'relative'}}>
                  <i className="fas fa-lock" style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#8a9bbf',fontSize:13,pointerEvents:'none'}}/>
                  <input type={showPw?'text':'password'} required value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={{...INP,paddingLeft:34,paddingRight:38}}/>
                  <button type="button" onClick={()=>setShowPw(s=>!s)} style={{position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#8a9bbf',cursor:'pointer',fontSize:13}}>
                    <i className={`fas fa-eye${showPw?'-slash':''}`}/>
                  </button>
                </div>
              </div>
              {/* Forgot password link */}
              <div style={{textAlign:'right',marginBottom:18}}>
                <button type="button" onClick={()=>{setMode('forgot');setErr('');setMsg('')}} style={{background:'none',border:'none',color:'#1e3a8a',fontSize:12,cursor:'pointer',fontWeight:600}}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={busy} style={BTN(busy)}>
                {busy?<><div style={SPIN} className="spin"/>Signing in…</>:<><i className="fas fa-arrow-right-to-bracket"/>Sign in to FieldLog</>}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={doForgot}>
              <p style={{fontSize:13,color:'#3d5080',marginBottom:16,lineHeight:1.6}}>
                Enter your email address and we'll send you a password reset link.
              </p>
              <div style={{marginBottom:18}}>
                <label style={LBL}>Email address</label>
                <div style={{position:'relative'}}>
                  <i className="fas fa-envelope" style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#8a9bbf',fontSize:13,pointerEvents:'none'}}/>
                  <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={{...INP,paddingLeft:34}}/>
                </div>
              </div>
              <button type="submit" disabled={busy} style={BTN(busy)}>
                {busy?<><div style={SPIN} className="spin"/>Sending…</>:<><i className="fas fa-paper-plane"/>Send reset link</>}
              </button>
              {token && (
                <div style={{marginTop:14}}>
                  <label style={LBL}>Paste reset token (dev mode)</label>
                  <div style={{display:'flex',gap:8}}>
                    <input value={token} onChange={e=>setToken(e.target.value)} style={{...INP,flex:1,fontSize:11}}/>
                    <button type="button" onClick={()=>setMode('reset')} style={{padding:'9px 14px',background:'#0f1b3d',color:'#fff',border:'none',borderRadius:10,fontSize:12,cursor:'pointer',fontWeight:600}}>
                      Continue
                    </button>
                  </div>
                </div>
              )}
              <button type="button" onClick={()=>{setMode('login');setErr('');setMsg('')}} style={LINK}>← Back to sign in</button>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={doReset}>
              <div style={{marginBottom:14}}>
                <label style={LBL}>Reset token</label>
                <input value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste token from email" style={INP}/>
              </div>
              <div style={{marginBottom:18}}>
                <label style={LBL}>New password</label>
                <input type="password" required value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Enter new password" style={INP}/>
              </div>
              <button type="submit" disabled={busy} style={BTN(busy)}>
                {busy?<><div style={SPIN} className="spin"/>Resetting…</>:<><i className="fas fa-key"/>Set new password</>}
              </button>
              <button type="button" onClick={()=>{setMode('forgot');setErr('');setMsg('')}} style={LINK}>← Back</button>
            </form>
          )}

          {/* Credentials hint */}
          {mode === 'login' && (
            <div style={{marginTop:18,padding:'12px 14px',background:'#f5f7fc',borderRadius:10,border:'1px solid #eaeff8',fontSize:11,color:'#3d5080',lineHeight:2}}>
              <div style={{fontWeight:700,marginBottom:2,color:'#0f1b3d',display:'flex',alignItems:'center',gap:6}}><i className="fas fa-circle-info" style={{color:'#1e3a8a'}}/>Default credentials</div>
              <div>Admin: <code style={CODE('#eff4ff','#1e3a8a')}>admin@fieldlog.com</code> / <code style={CODE('#eff4ff','#1e3a8a')}>admin123</code></div>
              <div>Manager: <code style={CODE('#fffbeb','#d97706')}>manager@fieldlog.com</code> / <code style={CODE('#fffbeb','#d97706')}>manager123</code></div>
              <div>HR: <code style={CODE('#f5f3ff','#7c3aed')}>hr@fieldlog.com</code> / <code style={CODE('#f5f3ff','#7c3aed')}>hr123</code></div>
              <div>Engineer: <code style={CODE('#f5f7fc','#3d5080')}>hemal@fieldlog.com</code> / <code style={CODE('#f5f7fc','#3d5080')}>pass123</code></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const LBL = {display:'block',marginBottom:5,fontSize:12,fontWeight:700,color:'#3d5080',textTransform:'uppercase',letterSpacing:'.05em'}
const INP = {width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #eaeff8',fontSize:14,color:'#0f1b3d',background:'#fff'}
const BTN = busy => ({width:'100%',padding:'12px',fontSize:14,fontWeight:700,border:'none',borderRadius:14,cursor:busy?'not-allowed':'pointer',background:busy?'#93c5fd':'linear-gradient(135deg,#0f1b3d,#1e3a8a)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:busy?'none':'0 4px 14px rgba(15,27,61,.35)'})
const SPIN = {width:16,height:16,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%'}
const LINK = {background:'none',border:'none',color:'#1e3a8a',fontSize:13,cursor:'pointer',fontWeight:600,marginTop:14,display:'block',textAlign:'center'}
const CODE = (bg,color) => ({background:bg,color,padding:'1px 5px',borderRadius:4,fontSize:10})
