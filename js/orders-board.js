document.addEventListener('DOMContentLoaded',()=>{
const board=document.getElementById('viewPedidosActivos'),history=document.getElementById('viewHistorialPedidos'),s=Simple.escape;
let orders=[],filter='all',search='';
const stages=[['En Espera',['pendiente','aceptado']],['En Preparación',['preparando']],['Listo',['listo','despachado']]];
const card=(o,finished=false)=>{
 const items=o.items.map(i=>'<div>'+s(i.cantidad)+'x '+s(i.nombre_producto)+'</div><small class="text-muted">'+s(i.nota||'')+'</small>').join('');
 const next={pendiente:'aceptado',aceptado:'preparando',preparando:'listo',listo:o.entrega==='delivery'?'despachado':'entregado',despachado:'entregado'}[o.estado];
 return '<div class="card order-card" data-id="'+o.id+'" data-origin="'+o.canal+'"><div class="card-body"><div class="d-flex justify-content-between"><strong>#'+s(o.codigo||o.id)+'</strong><span class="badge bg-secondary">'+s(o.canal)+'</span></div><div class="mt-2">'+items+'</div><div class="small mt-2 text-muted">'+s(o.cliente||'Tienda')+' · '+s(o.estado)+'</div>'+(!finished&&next?'<button class="btn btn-action-dark w-100 mt-2 btn-update" data-id="'+o.id+'" data-next="'+next+'">'+s({aceptado:'Aceptar pedido',preparando:'Iniciar preparación',listo:'Marcar como listo',despachado:'Despachar',entregado:'Marcar entregado'}[next])+'</button>':'')+'</div></div>';
};
function render(){
 const match=o=>(filter==='all'||o.canal===filter)&&('#'+o.codigo+' '+(o.cliente||'')+' '+o.items.map(i=>i.nombre_producto).join(' ')).toLowerCase().includes(search);
 board.innerHTML='<div class="row g-4">'+stages.map(([t,status])=>'<div class="col-12 col-lg-4"><div class="column-header mb-3">'+t+'</div><div class="orders-list d-flex flex-column gap-3">'+orders.filter(o=>status.includes(o.estado)&&match(o)).map(o=>card(o)).join('')+'</div></div>').join('')+'</div>';
 history.innerHTML='<div class="row g-3">'+orders.filter(o=>['entregado','cancelado'].includes(o.estado)&&match(o)).map(o=>'<div class="col-lg-4 card-history-item">'+card(o,true)+'</div>').join('')+'</div>';
}
async function load(){try{orders=await Simple.api('/pedidos');render();}catch(e){console.error(e);}}
board.addEventListener('click',async e=>{
 const b=e.target.closest('.btn-update');if(!b)return;b.disabled=true;
 try{await Simple.api('/pedidos/'+b.dataset.id+'/estado',{method:'PATCH',body:JSON.stringify({estado:b.dataset.next})});await load();}
 catch(err){alert(err.message);b.disabled=false;}
});
document.querySelectorAll('#filterContainer .btn-filter').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('#filterContainer .btn-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render();
}));
document.getElementById('searchInput').addEventListener('input',e=>{search=e.target.value.toLowerCase();render();});
for(const [id,showHistory] of [['btnTabActivos',false],['btnTabHistorial',true]]){
 document.getElementById(id).addEventListener('click',()=>{
  board.classList.toggle('d-none',showHistory);history.classList.toggle('d-none',!showHistory);
  document.getElementById('btnTabActivos').classList.toggle('active',!showHistory);
  document.getElementById('btnTabHistorial').classList.toggle('active',showHistory);
 });
}
const clock=()=>document.getElementById('liveClock').textContent=new Date().toLocaleTimeString('es-PE');
clock();setInterval(clock,1000);load();setInterval(load,12000);
});
