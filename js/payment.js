document.addEventListener('DOMContentLoaded',async()=>{
 const id=new URLSearchParams(location.search).get('pedido');
 if(!id||!/^\d+$/.test(id)){alert('Selecciona primero productos en Caja');location.href='/caja.html';return;}
 const s=Simple.escape;
 let order;
 try{order=await Simple.api('/pedidos/'+id);}catch(e){alert(e.message);location.href='/caja.html';return;}
 if(order.estado!=='pendiente_pago'){alert('Este pedido ya no está pendiente de pago');location.href='/caja.html';return;}
 const container=document.getElementById('pagoBillContainer');
 container.innerHTML=order.items.map(i=>'<div class="bill-item d-flex justify-content-between border-bottom mb-3 pb-2"><div><strong>'+s(i.cantidad)+'x '+s(i.nombre_producto)+'</strong><small class="d-block text-muted">'+s(i.nota||'')+'</small></div><strong>S/. '+Number(i.total_linea).toFixed(2)+'</strong></div>').join('');
 document.getElementById('lblSubtotal').textContent='S/. '+Number(order.subtotal).toFixed(2);
 document.getElementById('lblIgv').textContent='S/. '+Number(order.igv).toFixed(2);
 document.getElementById('lblTotal').textContent='S/. '+Number(order.total).toFixed(2);
 const received=document.getElementById('txtEfectivoRecibido'),change=document.getElementById('txtVuelto'),confirm=document.getElementById('btnConfirmarOrden');
 const success=new bootstrap.Modal(document.getElementById('modalPagoExitoso'));
 let method='efectivo',digits='';
 const recalc=()=>{
  const n=Number(received.value||0),v=n-Number(order.total);
  change.value=v>=0?v.toFixed(2):'0.00';
  confirm.disabled=method==='efectivo'&&(!(n>=Number(order.total))||!Number.isFinite(n));
 };
 const methods=[['btnEfectivo','efectivo'],['btnTarjeta','tarjeta'],['btnYapePlin','yape']];
 for(const [name,key] of methods){
  document.getElementById(name).addEventListener('click',()=>{
   method=key;for(const [other] of methods)document.getElementById(other).classList.toggle('active',other===name);
   received.disabled=key!=='efectivo';
   confirm.disabled=false;
   if(key!=='efectivo'){
    change.value='0.00';
    alert('No se procesa automáticamente este pago. Verifica el cobro en el proveedor antes de confirmarlo.');
   }else recalc();
  });
 }
 document.querySelectorAll('.numpad-btn[data-val]').forEach(btn=>btn.addEventListener('click',()=>{
  if(method!=='efectivo')return;
  const v=btn.dataset.val;if(v==='.'&&digits.includes('.'))return;
  digits+=v;received.value=digits;recalc();
 }));
 document.getElementById('btnNumpadDelete').addEventListener('click',()=>{digits=digits.slice(0,-1);received.value=digits;recalc();});
 received.addEventListener('input',()=>{digits=received.value;recalc();});
 recalc();
 confirm.addEventListener('click',async()=>{
  if(confirm.disabled)return;
  const payload={metodo:method};
  if(method==='efectivo')payload.recibido=Number(received.value);
  else{
   const ref=prompt('Introduce el código real de operación o referencia, después de verificar el pago en la aplicación del proveedor:');
   if(!ref||!ref.trim())return;
   if(!confirmarVerificacion())return;
   payload.referencia=ref.trim();payload.confirmacion_manual=true;
  }
  confirm.disabled=true;
  try{await Simple.api('/pedidos/'+id+'/pago',{method:'POST',body:JSON.stringify(payload)});success.show();}
  catch(e){alert(e.message);recalc();}
 });
 function confirmarVerificacion(){return window.confirm('¿Confirmas que verificaste personalmente que el dinero fue recibido? Esta operación quedará registrada.');}
 document.getElementById('btnAceptarExito').addEventListener('click',()=>{location.href='/caja.html';});
});
