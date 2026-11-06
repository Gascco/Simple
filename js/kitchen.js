document.addEventListener('DOMContentLoaded',()=>{
  const ui=SimpleOrders;
  const main=document.getElementById('kdsMainView');
  const detail=document.getElementById('recipeDetailView');
  const cols={
    espera:document.getElementById('colEnEspera'),
    preparando:document.getElementById('colEnPreparacion'),
    listo:document.getElementById('colListo')
  };
  let orders=[],filter='all',search='',selected=null,busy=false;
  const filters=document.querySelectorAll('#filterContainer .btn-filter');
  const elapsed=o=>ui.timeAgo(o.actualizado_en||o.creado_en);
  function button(order){
    const next=order.estado==='aceptado'?'preparando':order.estado==='preparando'?'listo':null;
    if(!next)return '<button class="btn btn-action-disabled w-100" disabled>Listo</button>';
    const label=next==='preparando'?'Iniciar Preparación':'Marcar como Listo';
    return '<button class="btn '+(next==='preparando'?'btn-action-gray':'btn-action-dark')+' w-100" data-action="'+next+'" data-id="'+order.id+'">'+label+'</button>';
  }
  function makeCard(order){
    const stage=ui.stageKitchen(order.estado);
    const card=document.createElement('div');
    card.className='card order-card clickable-card '+({espera:'waiting-card',preparando:'prep-card',listo:'ready-card'}[stage]);
    card.dataset.id=order.id;
    card.dataset.origin=order.canal;
    card.tabIndex=0;
    card.setAttribute('role','button');
    card.setAttribute('aria-label','Ver receta de pedido '+order.codigo);
    card.innerHTML='<div class="card-body">'+
      '<div class="d-flex justify-content-between align-items-center mb-2">'+
      '<div class="d-flex align-items-center gap-2"><span class="order-id">#'+ui.escapeText(order.codigo||order.id)+'</span>'+ui.badge(order.canal)+'</div>'+
      '<span class="order-time">'+ui.escapeText(elapsed(order))+'</span></div>'+
      ui.productCardItems(order)+button(order)+'</div>';
    return card;
  }
  function draw(){
    for(const col of Object.values(cols))col.innerHTML='';
    for(const order of orders){
      const stage=ui.stageKitchen(order.estado);
      if(!stage)continue;
      if(filter!=='all'&&order.canal!==filter)continue;
      if(!('#'+order.codigo+' '+(order.cliente||'')+' '+(order.items||[]).map(i=>i.nombre_producto+' '+(i.nota||'')).join(' ')).toLowerCase().includes(search))continue;
      cols[stage].appendChild(makeCard(order));
    }
    document.getElementById('navBadge').textContent='Pedidos Activos: '+orders.filter(o=>['aceptado','preparando'].includes(o.estado)).length;
  }
  function showRecipe(order){
    selected=order;
    main.classList.add('d-none');
    detail.classList.remove('d-none');
    detail.classList.add('d-flex','flex-column');
    document.getElementById('navBadge').classList.add('d-none');
    const header=detail.querySelector('.order-detail-header');
    header.innerHTML='<span class="fs-4 font-normal">Pedido</span><span class="fs-4 fw-bold">#'+ui.escapeText(order.codigo||order.id)+'</span>'+
      ui.badge(order.canal)+'<span class="fs-4 fw-bold ms-3">'+ui.escapeText((order.items||[]).map(i=>i.nombre_producto).join(', '))+'</span>';
    const views=ui.recipeViews(order);
    const columns=detail.querySelector('.row.g-4.justify-content-center');
    columns.innerHTML='<div class="col-12 col-lg-7"><div id="dynamicIngredients">'+views.ingredientsHtml+'</div>'+
      '<div class="mt-4"><label class="fw-bold section-label mb-2">Nota</label><input class="form-control note-input rounded-pill" readonly value="'+ui.escapeText(views.note)+'"></div></div>'+
      '<div class="col-12 col-lg-5"><h5 class="fw-bold section-label mb-3">Receta</h5>'+
      '<div class="recipe-box p-4 rounded-4"><ol class="recipe-steps mb-0 ps-3">'+views.stepsHtml+'</ol></div></div>';
    const action=document.getElementById('btnFinishRecipe');
    action.textContent=order.estado==='preparando'?'Marcar como Listo':'Volver';
  }
  function back(){
    selected=null;
    main.classList.remove('d-none');
    detail.classList.add('d-none');
    detail.classList.remove('d-flex','flex-column');
    document.getElementById('navBadge').classList.remove('d-none');
  }
  async function setState(id,state){
    if(busy)return;
    busy=true;
    try{
      await Simple.api('/pedidos/'+id+'/estado',{method:'PATCH',body:JSON.stringify({estado:state})});
      back();
      await load();
    }catch(error){alert(error.message);}
    finally{busy=false;}
  }
  for(const col of Object.values(cols)){
    col.addEventListener('click',event=>{
      const button=event.target.closest('button[data-action]');
      if(button){
        event.stopPropagation();
        setState(button.dataset.id,button.dataset.action);
        return;
      }
      const card=event.target.closest('.order-card[data-id]');
      const order=orders.find(o=>String(o.id)===card?.dataset.id);
      if(order)showRecipe(order);
    });
    col.addEventListener('keydown',event=>{
      if(event.target.matches('.order-card')&&['Enter',' '].includes(event.key)){
        event.preventDefault();
        const order=orders.find(o=>String(o.id)===event.target.dataset.id);
        if(order)showRecipe(order);
      }
    });
  }
  document.getElementById('btnFinishRecipe').addEventListener('click',()=>{
    if(selected?.estado==='preparando')setState(selected.id,'listo');
    else back();
  });
  document.getElementById('navBackBtn').addEventListener('click',event=>{
    if(!detail.classList.contains('d-none')){event.preventDefault();back();}
  });
  filters.forEach(btn=>btn.addEventListener('click',()=>{
    filters.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    filter=btn.dataset.filter;
    draw();
  }));
  document.getElementById('searchInput').addEventListener('input',e=>{
    search=e.target.value.toLowerCase().trim();
    draw();
  });
  async function load(){
    try{
      orders=await Simple.api('/pedidos?estado=aceptado,preparando,listo');
      draw();
    }catch(error){console.error(error);}
  }
  Object.values(cols).forEach(col=>col.innerHTML='');
  load();
  setInterval(()=>{if(detail.classList.contains('d-none')&&!busy)load();},10000);
});
