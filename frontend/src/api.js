const BASE='/api'
const tok=()=>localStorage.getItem('mir_tok')
const hdrs=()=>{const h={'Content-Type':'application/json'};const t=tok();if(t)h['Authorization']=`Bearer ${t}`;return h}
const req=async(method,path,body)=>{
  const o={method,headers:hdrs()};if(body!==undefined)o.body=JSON.stringify(body)
  const r=await fetch(BASE+path,o);const d=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d
}
export const api={
  login:(e,p)=>req('POST','/login',{email:e,password:p}),
  me:()=>req('GET','/me'),
  forgotPassword:email=>req('POST','/forgot-password',{email}),
  resetPasswordToken:(token,password)=>req('POST','/reset-password',{token,password}),
  getReports:(p={})=>{const q=new URLSearchParams(p).toString();return req('GET',`/reports${q?'?'+q:''}`)},
  createReport:d=>req('POST','/reports',d),
  updateReport:(id,d)=>req('PUT',`/reports/${id}`,d),
  deleteReport:id=>req('DELETE',`/reports/${id}`),
  setCheck:(id,s)=>req('PATCH',`/reports/${id}/check`,{check_status:s}),
  exportCSV:(params={})=>{const fmt=params.format||'csv';const q=new URLSearchParams(params).toString();fetch(`${BASE}/reports/export${q?'?'+q:''}`,{headers:hdrs()}).then(r=>r.blob()).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`fieldlog_reports.${fmt}`;a.click()})},
  getPunch:date=>req('GET',`/punch${date?'?date='+date:''}`),
  punchIn:(date,custom_time)=>req('POST','/punch/in',{date,custom_time:custom_time||''}),
  punchOut:(date,custom_time)=>req('POST','/punch/out',{date,custom_time:custom_time||''}),
  getPunches:(p={})=>{const q=new URLSearchParams(p).toString();return req('GET',`/punches${q?'?'+q:''}`)},
  getMonthlyReport:(engineer_id,month)=>req('GET',`/monthly-report?engineer_id=${engineer_id}&month=${month}`),
  exportMonthly:(engineer_id,month,format='csv')=>{fetch(`${BASE}/monthly-report/export?engineer_id=${engineer_id}&month=${month}&format=${format}`,{headers:hdrs()}).then(r=>r.blob()).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`fieldlog_monthly_${month}.${format==='xlsx'?'xlsx':'csv'}`;a.click()})},
  getNotifs:()=>req('GET','/notifications'),
  readNotif:id=>req('PATCH',`/notifications/${id}/read`),
  readAllNotifs:()=>req('PATCH','/notifications/read-all'),
  getUsers:()=>req('GET','/users'),
  createUser:d=>req('POST','/users',d),
  updateUser:(id,d)=>req('PATCH',`/users/${id}`,d),
  deleteUser:id=>req('DELETE',`/users/${id}`),
  deleteUser:id=>req('DELETE',`/users/${id}`),
  resetUserPassword:(id,pw)=>req('PUT',`/users/${id}/password`,{password:pw}),
  getStats:()=>req('GET','/stats'),
  getEngineerStats:()=>req('GET','/engineer-stats'),
}
