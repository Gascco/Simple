document.addEventListener('DOMContentLoaded',()=>{
const cols={aceptado:document.getElementById('colEnEspera'),pendiente:document.getElementById('colEnEspera'),preparando:document.getElementById('colEnPreparacion'),listo:document.getElementById('colListo')};
const main=document.getElementById('kdsMainView'),detail=document.getElementById('recipeDetailView'),s=Simple.escape;
let orders=[],filter='all',search='',selected=null;
function render(){
 for(const el of new Set(Object.values(cols)))el.innerHTML='';
 for(const o of orders){
  if(!cols[o.estado]||(filter!=='all'&&o.canal!==filter))continue;
  if(!('#'+o.codigo+' '+o.items.map(i=>i.nombre_producto+' '+i.nota).join(' ')).toLowerCase().includes(search))continue;
  const next=o.estado==='preparando'?'listo':o.estado==='aceptado'?'preparando':null;
  const el=document.createElement('div');el.className='card order-card '+(next?'clickable-card':'ready-card');
  el.innerHTML='<div class="card-body"><div class="d-flex justify-content-between"><strong>#'+s(o.codigo)+'</strong><span class="badge bg-secondary">'+s(o.canal)+'</span></div><h6 class="mt-2">'+o.items.map(i=>s(i.cantidad+'x '+i.nombre_producto)).join(', ')+'</h6><p class="small text-muted">'+s(o.items.map(i=>i.nota||'').join(' '))+'</p><button class="btn '+(next?'btn-action-dark':'btn-action-disabled')+' w-100" '+(!next?'disabled':'')+' data-id="'+o.id+'" data-next="'+(next||'')+'">'+s(next==='listo'?'Marcar listo':next==='preparando'?'Iniciar preparación':'Listo')+'</button></div>';
  el.addEventListener('click',e=>{if(!e.target.closest('button'))showDetail(o);});
  cols[o.estado].appendChild(el);
 }
 document.getElementById('navBadge').textContent='Pedidos activos: '+orders.filter(o=>['aceptado','preparando'].includes(o.estado)).length;
}
function showDetail(o){
 selected=o;main.classList.add('d-none');detail.classList.remove('d-none');
 detail.querySelector('.order-detail-header').textContent='#'+o.codigo+' · '+o.canal+' · '+o.items.map(i=>i.cantidad+'x '+i.nombre_producto).join(', ');
 detail.querySelectorAll('.ingredient-card').forEach(el=>el.remove());
 detail.querySelector('.recipe-steps').innerHTML=o.items.map(i=>{
  let v=i.personalizacion;
  if(typeof v==='string'){try{v=JSON.parse(v);}catch{v=null;}}
  const content=v?Object.entries(v).map(([k,a])=>k+': '+(Array.isArray(a)?a.join(', '):a)).join(' | '):i.nota||'Producto estándar';
  return '<li class="mb-3"><strong>'+s(i.cantidad+'x '+i.nombre_producto)+'</strong>: '+s(content)+'</li>';
 }).join('');
 detail.querySelector('.note-input').value=o.items.map(i=>i.nota||'').filter(Boolean).join(' · ');
 document.getElementById('btnFinishRecipe').textContent=o.estado==='preparando'?'Marcar como listo':'Volver';
}
function back(){main.classList.remove('d-none');detail.classList.add('d-none');selected=null;}
async function move(id,next){await Simple.api('/pedidos/'+id+'/estado',{method:'PATCH',body:JSON.stringify({estado:next})});back();await load();}
for(const col of document.querySelectorAll('.kds-column'))col.addEventListener('click',async e=>{
 const btn=e.target.closest('button[data-next]');if(!btn||!btn.dataset.next)return;e.stopPropagation();
 btn.disabled=true;try{await move(btn.dataset.id,btn.dataset.next);}catch(err){alert(err.message);btn.disabled=false;}
});
document.getElementById('btnFinishRecipe').addEventListener('click',async()=>{
 if(!selected||selected.estado!=='preparando'){back();return;}
 try{await move(selected.id,'listo');}catch(err){alert(err.message);}
});
document.getElementById('navBackBtn').addEventListener('click',e=>{if(!detail.classList.contains('d-none')){e.preventDefault();back();}});
document.querySelectorAll('#filterContainer .btn-filter').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('#filterContainer .btn-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render();
}));
document.getElementById('searchInput').addEventListener('input',e=>{search=e.target.value.toLowerCase();render();});
async function load(){try{orders=await Simple.api('/pedidos');render();}catch(err){console.error(err);}}
load();setInterval(()=>{if(detail.classList.contains('d-none'))load();},10000);
});
