window.Simple={
 async api(path,options={}){
  const res=await fetch('/api'+path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  if(res.status===401){location.href='/login.html';throw Error('Sesión vencida');}
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||'Error del servidor');
  return data;
 },
 escape(value=''){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
 async init(){
  const {usuario}=await this.api('/auth/me');
  document.querySelectorAll('.user-name,.dropdown-user-name').forEach(el=>el.textContent=usuario.nombre);
  document.querySelectorAll('.role-subtitle,.dropdown-role-subtitle').forEach(el=>el.textContent=usuario.rol);
  const welcome=document.querySelector('.welcome-title');if(welcome)welcome.textContent='¡Hola, '+usuario.nombre+'!';
  const active=document.querySelector('.session-text');if(active)active.textContent='Sesión activa: '+usuario.nombre+' ('+usuario.usuario+')';
  document.querySelectorAll('a[href="login.html"]').forEach(el=>el.addEventListener('click',async e=>{
   e.preventDefault();try{await this.api('/auth/logout',{method:'POST'});location.href='/login.html';}catch(err){alert(err.message);}
  }));
 }
};
document.addEventListener('DOMContentLoaded',()=>Simple.init().catch(console.error));
