document.addEventListener('DOMContentLoaded',async()=>{
const canal=location.pathname.includes('pedidosya')?'pedidosya':'whatsapp';
const s=Simple.escape;
const root=document.querySelector('.container-fluid.px-0.flex-grow-1');
let products=[],ingredients=[],orders=[],selected=null,draft=false,items=[],dirty=false;
root.innerHTML='<div class="row g-0"><aside class="col-12 col-lg-3 border-end bg-white p-3" style="min-height:85vh"><div class="d-flex align-items-center justify-content-between mb-3"><h5 class="fw-bold m-0">Pedidos '+(canal==='whatsapp'?'WhatsApp':'PedidosYa')+'</h5><button class="btn btn-dark btn-sm" id="newOrder">+ Nuevo</button></div><input class="form-control mb-3" id="searchOrders" placeholder="Buscar cliente o pedido"><div id="orderList" class="d-flex flex-column gap-2"></div></aside><main class="col-12 col-lg-6 bg-white p-4"><h4 id="orderHeading">Selecciona o crea un pedido</h4><div class="row g-2 mb-3"><div class="col-md-6"><label class="form-label">Cliente</label><input class="form-control" id="clientName"></div><div class="col-md-6"><label class="form-label">Teléfono</label><input class="form-control" id="clientPhone"></div><div class="col-md-8"><label class="form-label">Dirección</label><input class="form-control" id="clientAddress"></div><div class="col-md-4"><label class="form-label">Tipo de entrega</label><select class="form-select" id="delivery"><option value="delivery">Delivery</option><option value="recojo">Recojo</option></select></div></div><div class="d-flex gap-2 mb-3"><select class="form-select" id="productSelect"></select><button class="btn btn-outline-dark" id="addProduct">Agregar</button></div><div id="itemList" class="d-flex flex-column gap-3"></div><p id="orderMessage" class="small mt-3 text-muted"></p></main><aside class="col-12 col-lg-3 bg-light border-start p-4"><h5>Resumen</h5><div id="priceSummary" class="border-bottom pb-3 my-3"></div><button class="btn btn-dark w-100 mb-2" id="saveOrder">Guardar pedido</button><button class="btn btn-outline-dark w-100 mb-2" id="acceptOrder">Aceptar pedido</button><button class="btn btn-outline-dark w-100 mb-2" id="dispatchOrder">Despachar / Entregar</button><div class="small text-muted mt-3">Carga manual: este módulo no recibe pedidos automáticamente de plataformas externas.</div></aside></div>';
const q=id=>document.getElementById(id);
const parseCustom=x=>{if(typeof x==='string'){try{return JSON.parse(x);}catch{return null;}}return x||null;};
async function loadCatalog(){
 products=await Simple.api('/productos');ingredients=await Simple.api('/ingredientes');
 q('productSelect').innerHTML=products.map(p=>'<option value="'+p.id+'">'+s(p.nombre)+' — S/. '+Number(p.precio).toFixed(2)+'</option>').join('');
}
const convert=o=>(o.items||[]).map(i=>({producto_id:i.producto_id,name:i.nombre_producto,qty:i.cantidad,price:Number(i.precio_unitario),personalizacion:parseCustom(i.personalizacion),note:i.nota||''}));
async function loadOrders(){
 orders=await Simple.api('/pedidos?canal='+canal);
 renderSidebar();
 if(!draft&&selected){
  const newCurrent=orders.find(o=>o.id===selected.id);
  if(newCurrent&&!dirty){selected=newCurrent;items=convert(newCurrent);renderEditor();}
 }
}
function renderSidebar(){
 const term=q('searchOrders').value.toLowerCase();
 const shown=orders.filter(o=>('#'+o.codigo+' '+(o.cliente||'')+' '+(o.telefono||'')).toLowerCase().includes(term));
 q('orderList').innerHTML=shown.length?shown.map(o=>'<button class="btn btn-light border text-start p-3 '+(selected&&o.id===selected.id?'border-dark':'')+'" data-id="'+o.id+'"><strong>#'+s(o.codigo)+'</strong><span class="badge bg-secondary ms-2">'+s(o.estado)+'</span><div>'+s(o.cliente||'Sin cliente')+'</div><small>'+s(o.telefono||'')+'</small></button>').join(''):'<p class="text-muted">Aún no hay pedidos registrados.</p>';
}
function amount(){const total=items.reduce((sum,i)=>sum+Number(i.price)*Number(i.qty),0)+(q('delivery').value==='delivery'?1:0);return Math.round(total*100)/100;}
function renderEditor(){
 const isEditable=draft||(selected&&['pendiente','aceptado'].includes(selected.estado));
 q('orderHeading').textContent=draft?'Nuevo pedido manual':selected?'Pedido #'+selected.codigo+' · '+selected.estado:'Selecciona o crea un pedido';
 q('clientName').value=selected&&!draft?(selected.cliente||''):'';
 q('clientPhone').value=selected&&!draft?(selected.telefono||''):'';
 q('clientAddress').value=selected&&!draft?(selected.direccion||''):'';
 q('delivery').value=selected&&!draft?selected.entrega:'delivery';
 for(const el of [q('clientName'),q('clientPhone'),q('clientAddress'),q('delivery')])el.disabled=!draft;
 q('productSelect').disabled=!isEditable;q('addProduct').disabled=!isEditable;
 q('saveOrder').disabled=!isEditable;
 q('acceptOrder').disabled=!draft&&(!selected||selected.estado!=='pendiente');
 const deliverable=selected&&['listo','despachado'].includes(selected.estado);
 q('dispatchOrder').disabled=!deliverable;
 q('dispatchOrder').textContent=selected&&selected.estado==='despachado'?'Marcar entregado':selected&&selected.entrega==='delivery'?'Despachar':'Marcar entregado';
 q('orderMessage').textContent=selected?'Canal: '+canal+' · Última actualización: '+new Date(selected.actualizado_en).toLocaleString('es-PE'):'Los pedidos manuales se guardan en la base de datos.';
 renderItems();
}
function renderItems(){
 const isEditable=draft||(selected&&['pendiente','aceptado'].includes(selected.estado));
 q('itemList').innerHTML=items.map((i,index)=>{
  const custom=i.personalizacion?Object.entries(i.personalizacion).map(([k,v])=>s(k)+': '+s((Array.isArray(v)?v:[]).join(', '))).join(' · '):'';
  return '<div class="card border-0 shadow-sm p-3"><div class="d-flex justify-content-between"><div><strong>'+s(i.qty)+'x '+s(i.name)+'</strong><p class="small text-muted m-0">'+custom+'</p><small>S/. '+Number(i.price*i.qty).toFixed(2)+'</small></div>'+(isEditable?'<button class="btn btn-outline-danger btn-sm" data-remove="'+index+'">Quitar</button>':'')+'</div><input class="form-control form-control-sm mt-2" data-note="'+index+'" placeholder="Nota del producto" value="'+s(i.note||'')+'" '+(isEditable?'':'disabled')+'></div>';
 }).join('');
 const total=amount(),subtotal=Math.round(total/1.18*100)/100;
 q('priceSummary').innerHTML='<div>Productos: '+items.length+'</div><div>Subtotal: S/. '+subtotal.toFixed(2)+'</div><div>IGV: S/. '+(total-subtotal).toFixed(2)+'</div><div>Envío: S/. '+(q('delivery').value==='delivery'?'1.00':'0.00')+'</div><h5 class="mt-3">Total: S/. '+total.toFixed(2)+'</h5>';
}
function newOrder(){
 draft=true;selected=null;items=[];dirty=true;renderSidebar();renderEditor();
}
async function selectOrder(id){
 if(dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;
 draft=false;dirty=false;selected=orders.find(o=>o.id===id)||null;items=selected?convert(selected):[];
 renderSidebar();renderEditor();
}
function selectIngredients(type,max){
 const names=ingredients.filter(i=>i.tipo===type).map(i=>i.nombre);
 const raw=prompt('Elige '+(type==='yogurt'?'yogurt':type==='fruta'?'frutas':'toppings')+' (máx '+max+'), separados por coma:\n'+names.join(', '));
 if(raw===null)return null;
 const values=raw.split(',').map(x=>x.trim()).filter(Boolean);
 if(values.length>max||values.some(x=>!names.includes(x))){alert('Elige nombres exactos del catálogo, hasta '+max);return null;}
 return values;
}
q('newOrder').addEventListener('click',newOrder);
q('searchOrders').addEventListener('input',renderSidebar);
q('orderList').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)selectOrder(Number(b.dataset.id));});
q('addProduct').addEventListener('click',()=>{
 const p=products.find(p=>p.id===Number(q('productSelect').value));if(!p)return;
 let custom=null;
 if(p.nombre==='Parfait Personalizado'){
  const yogurts=selectIngredients('yogurt',2);if(!yogurts||!yogurts.length)return;
  const frutas=selectIngredients('fruta',2);if(!frutas||!frutas.length)return;
  const toppings=selectIngredients('topping',3);if(toppings===null)return;
  custom={yogurts,frutas,toppings};
 }
 items.push({producto_id:p.id,name:p.nombre,qty:1,price:Number(p.precio),personalizacion:custom,note:''});
 dirty=true;renderItems();
});
q('itemList').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;items.splice(Number(b.dataset.remove),1);dirty=true;renderItems();});
q('itemList').addEventListener('input',e=>{const el=e.target.closest('[data-note]');if(el&&items[Number(el.dataset.note)]){items[Number(el.dataset.note)].note=el.value;dirty=true;}});
q('delivery').addEventListener('change',renderItems);
async function save(){
 if(!items.length)throw Error('Agrega un producto');
 if(draft){
  const nombre=q('clientName').value.trim();
  if(!nombre)throw Error('Ingresa el nombre del cliente');
  const payload={canal,entrega:q('delivery').value,cliente:{nombre,telefono:q('clientPhone').value,direccion:q('clientAddress').value},items};
  const result=await Simple.api('/pedidos',{method:'POST',body:JSON.stringify(payload)});
  draft=false;dirty=false;await loadOrders();selected=orders.find(o=>o.id===result.id);items=selected?convert(selected):[];renderSidebar();renderEditor();
 }else if(selected&&dirty){
  await Simple.api('/pedidos/'+selected.id+'/items',{method:'PUT',body:JSON.stringify({items})});
  dirty=false;await loadOrders();
 }
}
q('saveOrder').addEventListener('click',async()=>{try{await save();alert('Pedido guardado en MySQL');}catch(err){alert(err.message);}});
q('acceptOrder').addEventListener('click',async()=>{
 try{
  if(draft||dirty)await save();
  if(!selected||selected.estado!=='pendiente')return;
  await Simple.api('/pedidos/'+selected.id+'/estado',{method:'PATCH',body:JSON.stringify({estado:'aceptado'})});
  await loadOrders();alert('Pedido enviado a preparación');
 }catch(err){alert(err.message);}
});
q('dispatchOrder').addEventListener('click',async()=>{
 if(!selected)return;
 try{
  const estado=selected.estado==='despachado'?'entregado':selected.entrega==='delivery'?'despachado':'entregado';
  await Simple.api('/pedidos/'+selected.id+'/estado',{method:'PATCH',body:JSON.stringify({estado})});
  await loadOrders();
 }catch(err){alert(err.message);}
});
try{await loadCatalog();await loadOrders();if(orders.length)await selectOrder(orders[0].id);else newOrder();}
catch(err){alert('Error de conexión: '+err.message);}
setInterval(()=>{if(!draft&&!dirty)loadOrders().catch(console.error);},12000);
});
