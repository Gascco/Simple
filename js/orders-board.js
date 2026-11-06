document.addEventListener('DOMContentLoaded',()=>{
  const ui=SimpleOrders,board=document.getElementById('viewPedidosActivos'),history=document.getElementById('viewHistorialPedidos');
  const boardColumns=[...board.querySelectorAll(':scope > .col-12.col-lg-4 .orders-list')];
  const historyGrid=history.querySelector('.row.g-4');
  let orders=[],filter='all',search='',busy=false,visibleHistory=false;
  const stages=[['pendiente','aceptado'],['preparando'],['listo','despachado']];
  if(boardColumns.length!==3||!historyGrid){console.error('No se encontraron las columnas originales de Pedidos');return;}
  function action(order){
    const next={pendiente:'aceptado',aceptado:'preparando',preparando:'listo',listo:order.entrega==='delivery'?'despachado':'entregado',despachado:'entregado'}[order.estado];
    if(!next)return '<button class="btn btn-action-disabled w-100" disabled>'+ui.escapeText(order.estado)+'</button>';
    const label={aceptado:'Aceptar Pedido',preparando:'Iniciar Preparación',listo:'Marcar como Listo',despachado:'Despachar Pedido',entregado:'Marcar como Entregado'}[next];
    return '<button class="btn '+(next==='preparando'||next==='aceptado'?'btn-action-gray':'btn-action-dark')+' w-100" data-order-id="'+order.id+'" data-next="'+next+'">'+label+'</button>';
  }
  function card(order,finished=false){
    const cls=finished?'history-card':order.estado==='preparando'?'prep-card':['listo','despachado'].includes(order.estado)?'ready-card':'waiting-card';
    const element=document.createElement('div');
    element.className='card order-card '+cls;
    element.dataset.origin=order.canal;
    element.dataset.id=order.codigo||order.id;
    element.dataset.dbId=order.id;
    element.tabIndex=0;
    element.setAttribute('role','button');
    element.setAttribute('aria-label','Ver detalle del pedido '+order.codigo);
    element.innerHTML='<div class="card-body">'+
      '<div class="d-flex justify-content-between align-items-center mb-2">'+
      '<div class="d-flex align-items-center gap-2"><span class="order-id">#'+ui.escapeText(order.codigo||order.id)+'</span>'+ui.badge(order.canal)+'</div>'+
      '<span class="order-time">'+ui.escapeText(ui.timeAgo(order.actualizado_en||order.creado_en))+'</span></div>'+
      ui.productCardItems(order)+
      (finished?'<button class="btn btn-action-disabled w-100" disabled>'+ui.escapeText(order.estado==='cancelado'?'Cancelado':'Entregado')+'</button>':action(order))+
      '</div>';
    return element;
  }
  function matches(order){
    if(filter!=='all'&&order.canal!==filter)return false;
    const haystack=('#'+order.codigo+' '+(order.cliente||'')+' '+(order.items||[]).map(i=>i.nombre_producto+' '+(i.nota||'')).join(' ')).toLowerCase();
    return haystack.includes(search);
  }
  function render(){
    boardColumns.forEach(col=>col.replaceChildren());
    historyGrid.replaceChildren();
    for(const order of orders){
      if(!matches(order))continue;
      const stage=ui.stageCash(order.estado);
      if(stage==='historial'){
        const wrap=document.createElement('div');
        wrap.className='col-12 col-md-6 col-lg-4 card-history-item';
        wrap.dataset.origin=order.canal;
        wrap.dataset.id=order.codigo||order.id;
        wrap.appendChild(card(order,true));
        historyGrid.appendChild(wrap);
      }else{
        const index=stages.findIndex(s=>s.includes(order.estado));
        if(index>=0)boardColumns[index].appendChild(card(order));
      }
    }
  }
  const modalEl=document.createElement('div');
  modalEl.className='modal fade order-recipe-modal';
  modalEl.tabIndex=-1;
  modalEl.setAttribute('aria-hidden','true');
  modalEl.innerHTML='<div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">'+
    '<div class="modal-header"><h5 class="modal-title fw-bold">Detalle del Pedido</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>'+
    '<div class="modal-body"><div class="order-detail-header d-inline-flex flex-wrap align-items-center gap-3 mb-4 px-4 py-2"></div>'+
    '<div class="row g-4"><div class="col-12 col-lg-7" id="cashRecipeIngredients"></div>'+
    '<div class="col-12 col-lg-5"><h5 class="fw-bold section-label mb-3">Receta</h5>'+
    '<div class="recipe-box p-4 rounded-4"><ol id="cashRecipeSteps" class="recipe-steps mb-0 ps-3"></ol></div></div></div></div>'+
    '<div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Cerrar</button></div></div></div>';
  document.body.appendChild(modalEl);
  const detailModal=new bootstrap.Modal(modalEl);
  function viewDetails(id){
    const order=orders.find(o=>String(o.id)===String(id));
    if(!order)return;
    modalEl.querySelector('.order-detail-header').innerHTML='<strong class="fs-4">Pedido #'+ui.escapeText(order.codigo||order.id)+'</strong>'+ui.badge(order.canal)+
      '<strong>'+ui.escapeText((order.items||[]).map(i=>i.nombre_producto).join(', '))+'</strong>';
    const view=ui.recipeViews(order);
    modalEl.querySelector('#cashRecipeIngredients').innerHTML=view.ingredientsHtml+
      '<div class="mt-4"><label class="fw-bold section-label mb-2">Nota</label><input type="text" class="form-control note-input rounded-pill" readonly value="'+ui.escapeText(view.note)+'"></div>';
    modalEl.querySelector('#cashRecipeSteps').innerHTML=view.stepsHtml;
    detailModal.show();
  }
  async function updateState(id,next){
    if(busy)return;
    busy=true;
    try{
      await Simple.api('/pedidos/'+id+'/estado',{method:'PATCH',body:JSON.stringify({estado:next})});
      await load();
    }catch(e){alert(e.message);}
    finally{busy=false;}
  }
  for(const container of [board,history]){
    container.addEventListener('click',e=>{
      const action=e.target.closest('button[data-order-id]');
      if(action){e.stopPropagation();updateState(action.dataset.orderId,action.dataset.next);return;}
      const row=e.target.closest('.order-card[data-db-id]');
      if(row)viewDetails(row.dataset.dbId);
    });
    container.addEventListener('keydown',e=>{
      if(e.target.matches('.order-card[data-db-id]')&&['Enter',' '].includes(e.key)){
        e.preventDefault();viewDetails(e.target.dataset.dbId);
      }
    });
  }
  const filterButtons=document.querySelectorAll('#filterContainer .btn-filter');
  filterButtons.forEach(btn=>btn.addEventListener('click',()=>{
    filterButtons.forEach(x=>x.classList.remove('active'));btn.classList.add('active');
    filter=btn.dataset.filter;render();
  }));
  document.getElementById('searchInput').addEventListener('input',e=>{
    search=e.target.value.toLowerCase().trim();render();
  });
  for(const [id,show] of [['btnTabActivos',false],['btnTabHistorial',true]]){
    document.getElementById(id).addEventListener('click',()=>{
      visibleHistory=show;
      board.classList.toggle('d-none',show);
      history.classList.toggle('d-none',!show);
      document.getElementById('btnTabActivos').classList.toggle('active',!show);
      document.getElementById('btnTabHistorial').classList.toggle('active',show);
    });
  }
  const clock=()=>document.getElementById('liveClock').textContent=new Date().toLocaleTimeString('es-PE');
  async function load(){
    try{orders=await Simple.api('/pedidos');render();}
    catch(e){console.error('Pedidos no disponibles:',e);}
  }
  boardColumns.forEach(col=>col.replaceChildren());
  historyGrid.replaceChildren();
  clock();setInterval(clock,1000);
  load();setInterval(()=>{if(!busy&&!modalEl.classList.contains('show'))load();},12000);
});
