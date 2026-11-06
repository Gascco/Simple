const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const orders=require('../js/order-components.js');

test('pedidos pendientes de WhatsApp y PedidosYa no se muestran en Cocina',()=>{
 for(const canal of ['whatsapp','pedidosya']){
  assert.equal(orders.stageKitchen('pendiente'),null,canal);
  assert.equal(orders.stageCash('pendiente'),'espera',canal);
 }
});
test('Cocina solo muestra pedidos aceptados, preparando y listos',()=>{
 assert.equal(orders.stageKitchen('aceptado'),'espera');
 assert.equal(orders.stageKitchen('preparando'),'preparando');
 assert.equal(orders.stageKitchen('listo'),'listo');
 for(const estado of ['pendiente','pendiente_pago','despachado','entregado','cancelado'])
  assert.equal(orders.stageKitchen(estado),null,estado);
});
test('Tarjetas de Caja agrupan estados en sus tres columnas originales',()=>{
 assert.equal(orders.stageCash('aceptado'),'espera');
 assert.equal(orders.stageCash('preparando'),'preparando');
 assert.equal(orders.stageCash('listo'),'listo');
 assert.equal(orders.stageCash('despachado'),'listo');
 assert.equal(orders.stageCash('entregado'),'historial');
});
test('Receta personalizada conserva yogures frutas y toppings con imagenes',()=>{
 const pedido={codigo:'1001',items:[{
  nombre_producto:'Parfait Personalizado',cantidad:1,
  personalizacion:{yogurts:['Griego'],frutas:['Fresa','Kiwi'],toppings:['Miel de abeja']}
 }]};
 const result=orders.recipeViews(pedido);
 for(const name of ['Yogurt','Frutas','Toppins','Y-Griego.jpg','Fresa.jpg','Kiwi.jpg','Miel.jpg'])
  assert.ok(result.ingredientsHtml.includes(name),name);
});
test('Recetas separadas para varios productos',()=>{
 const pedido={codigo:'1002',items:[
  {nombre_producto:'Parfait Clásico',cantidad:2,descripcion_producto:'Yogurt Griego, Fresa, Mango, Miel'},
  {nombre_producto:'Carrot cake',cantidad:1,descripcion_producto:'Porción Integral Thanisfit'}
 ]};
 const view=orders.recipeViews(pedido);
 assert.ok(view.ingredientsHtml.includes('2x Parfait Clásico'));
 assert.ok(view.ingredientsHtml.includes('1x Carrot cake'));
 assert.ok(view.ingredientsHtml.includes('Y-Griego.jpg'));
 assert.equal((view.stepsHtml.match(/<strong>\d+x /g)||[]).length,2);
});
test('Los tableros preservan la estructura original de columnas',()=>{
 const kitchen=fs.readFileSync(path.join(__dirname,'../html/cocina.html'),'utf8');
 const cash=fs.readFileSync(path.join(__dirname,'../html/pedidos_caja.html'),'utf8');
 for(const id of ['colEnEspera','colEnPreparacion','colListo','recipeDetailView','btnFinishRecipe'])
  assert.ok(kitchen.includes('id="'+id+'"'),id);
 for(const id of ['viewPedidosActivos','viewHistorialPedidos','btnTabActivos','btnTabHistorial'])
  assert.ok(cash.includes('id="'+id+'"'),id);
 assert.ok(kitchen.includes('/js/order-components.js'));
 assert.ok(cash.includes('/js/order-components.js'));
});
