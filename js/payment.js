document.addEventListener('DOMContentLoaded',async()=>{
 const id=new URLSearchParams(location.search).get('pedido');
 if(!id||!/^\d+$/.test(id)){alert('Selecciona productos en Caja antes de pagar');location.href='/caja.html';return;}
 let order;
 try{order=await Simple.api('/pedidos/'+id);}
 catch(e){alert(e.message);location.href='/caja.html';return;}
 if(order.estado!=='pendiente_pago'){alert('El pedido ya no está pendiente de pago');location.href='/caja.html';return;}
 const s=Simple.escape,byId=id=>document.getElementById(id),money=n=>'S/. '+Number(n).toFixed(2);
 const bill=byId('pagoBillContainer');
 bill.innerHTML='';
 for(const item of order.items){
  const row=document.createElement('div');
  row.className='bill-item d-flex align-items-start justify-content-between mb-3 pb-2 border-bottom';
  row.innerHTML='<div class="d-flex gap-2"><span class="badge bg-light text-dark border px-2 py-1 align-self-start fw-bold">'+s(item.cantidad)+'x</span><div><h6 class="m-0 fw-bold" style="font-size:15px">'+s(item.nombre_producto)+'</h6><small class="text-muted d-block">'+s(item.nota||'')+'</small></div></div><span class="fw-bold">'+money(item.total_linea)+'</span>';
  bill.appendChild(row);
 }
 byId('lblSubtotal').innerText=money(order.subtotal);
 byId('lblIgv').innerText=money(order.igv);
 byId('lblTotal').innerText=money(order.total);
 const total=Number(order.total),input=byId('txtEfectivoRecibido'),vuelto=byId('txtVuelto'),confirm=byId('btnConfirmarOrden');
 const modalTarjeta=new bootstrap.Modal(byId('modalTarjetaEspera'));
 const modalYape=new bootstrap.Modal(byId('modalYapeEspera'));
 const modalError=new bootstrap.Modal(byId('modalErrorPago'));
 const modalExito=new bootstrap.Modal(byId('modalPagoExitoso'));
 const modalOrdenConfirmada=new bootstrap.Modal(byId('modalOrdenConfirmada'));
 const methods=[['btnEfectivo','efectivo'],['btnTarjeta','tarjeta'],['btnYapePlin','yape']];
 let method='efectivo',digits='',timer=null,seconds=59,processing=false,paid=false,attempt=0,completedExternal=false;
 function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
 function showAfterHide(current,next){
  const element=current._element;
  if(element.classList.contains('show')){
   element.addEventListener('hidden.bs.modal',()=>next.show(),{once:true});
   current.hide();
  }else next.show();
 }
 function setActive(value){
  method=value;
  for(const [button,key] of methods)byId(button).classList.toggle('active',key===value);
  input.disabled=value!=='efectivo';
  if(value!=='efectivo'){input.value='';vuelto.value='';}
  validate();
 }
 function validate(){
  if(paid||processing){confirm.disabled=true;return;}
  if(method==='efectivo'){
   const received=Number(input.value||0);
   const change=received-total;
   vuelto.value=Number.isFinite(received)&&change>=0?change.toFixed(2):'0.00';
   confirm.disabled=!Number.isFinite(received)||received<total||received<=0;
  }else confirm.disabled=!completedExternal;
 }
 async function savePayment(external){
  if(paid||processing)return;
  processing=true;validate();
  const payload=external?
    {metodo:method,simulado:true,referencia:'SIM-'+Date.now()+'-'+Math.floor(Math.random()*100000)}:
    {metodo:'efectivo',recibido:Number(input.value)};
  try{
   await Simple.api('/pedidos/'+id+'/pago',{method:'POST',body:JSON.stringify(payload)});
   paid=true;completedExternal=true;modalOrdenConfirmada.show();
  }catch(err){
   if(!external)completedExternal=false;
   modalError.show();
   console.error('Error al registrar el pago:',err);
  }finally{processing=false;validate();}
 }
 function showError(){
  stopTimer();
  completedExternal=false;
  validate();
  if(method==='tarjeta')showAfterHide(modalTarjeta,modalError);
  else if(method==='yape')showAfterHide(modalYape,modalError);
  else modalError.show();
 }
 function simulateExternal(kind){
  if(paid||processing)return;
  stopTimer();attempt++;const currentAttempt=attempt;
  completedExternal=false;setActive(kind);
  const modal=kind==='tarjeta'?modalTarjeta:modalYape;
  const label=byId(kind==='tarjeta'?'timerTarjeta':'timerYape');
  seconds=59;label.textContent='(La transacción expirará en '+seconds+' s)';
  modal.show();
  let elapsed=0;
  timer=setInterval(async()=>{
   if(currentAttempt!==attempt){stopTimer();return;}
   seconds--;elapsed++;
   label.textContent='(La transacción expirará en '+Math.max(seconds,0)+' s)';
   if(seconds<=0){showError();return;}
   if(elapsed>=10){
    stopTimer();
    completedExternal=true;
    validate();
    showAfterHide(modal,modalExito);
   }
  },1000);
 }
 byId('btnEfectivo').addEventListener('click',()=>{
  if(paid||processing)return;
  attempt++;stopTimer();setActive('efectivo');
 });
 byId('btnTarjeta').addEventListener('click',()=>simulateExternal('tarjeta'));
 byId('btnYapePlin').addEventListener('click',()=>simulateExternal('yape'));
 for(const b of document.querySelectorAll('.numpad-btn[data-val]')){
  b.addEventListener('click',()=>{
   if(method!=='efectivo'||processing||paid)return;
   const value=b.dataset.val;if(value==='.'&&digits.includes('.'))return;
   if(digits.length>=12)return;
   digits+=value;input.value=digits;validate();
  });
 }
 byId('btnNumpadDelete').addEventListener('click',()=>{
  if(method!=='efectivo'||processing||paid)return;
  digits=digits.slice(0,-1);input.value=digits;validate();
 });
 byId('btnCancelTarjeta').addEventListener('click',()=>{attempt++;showError();});
 byId('btnCancelYape').addEventListener('click',()=>{attempt++;showError();});
 confirm.addEventListener('click',()=>{
  if(confirm.disabled||processing||paid)return;
  if(method==='efectivo')void savePayment(false);
  else if(completedExternal)void savePayment(true);
 });
 byId('btnAceptarExito').addEventListener('click',()=>{
  modalExito.hide();
  validate();
 });
 byId('btnAceptarOrden').addEventListener('click',()=>{
  if(!paid)return;
  modalOrdenConfirmada.hide();
  location.href='/caja.html';
 });
 validate();
});
