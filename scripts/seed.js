require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function seed() {
  const categories = [
    ['Parfaits & Bowls', 'parfaits'],
    ['Postres Thanisfit', 'postres'],
    ['Yogures', 'yogures'],
    ['Bebidas', 'bebidas'],
    ['Personalizados', 'personalizados']
  ];
  for (const [nombre, slug] of categories) {
    await pool.execute('INSERT INTO categorias (nombre,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE slug=VALUES(slug)', [nombre,slug]);
  }
  const [cats] = await pool.query('SELECT id,slug FROM categorias');
  const catIds = Object.fromEntries(cats.map(x => [x.slug,x.id]));
  const html = fs.readFileSync(path.join(__dirname, '../html/caja.html'), 'utf8').split('<script>')[0];
  const regex = /class="card product-card[\s\S]*?<img src="([^"]+)"[\s\S]*?<h6 class="product-title[^"]*">([^<]+)<\/h6>[\s\S]*?class="btn btn-qty-circle btn-plus" data-name="([^"]+)" data-price="([^"]+)" data-details="([^"]+)"/g;
  let m;
  let products = 0;
  while ((m = regex.exec(html))) {
    const all = [...html.slice(0, m.index).matchAll(/id="tab-(parfaits|postres|yogures|bebidas|personalizados)"/g)];
    const category = all.length ? all[all.length - 1][1] : 'parfaits';
    await pool.execute(
      'INSERT INTO productos (categoria_id,nombre,descripcion,precio,imagen) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
      [catIds[category],m[3],m[5],Number(m[4]),m[1].replace('../Img/', '/Img/')]
    );
    products++;
  }
  await pool.execute(
    'INSERT INTO productos (categoria_id,nombre,descripcion,precio,imagen) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
    [catIds.personalizados, 'Parfait Personalizado', 'Elige yogurt, frutas y toppings', 18.50, '/Img/Parfait Clásico.jpg']
  );
  const ingredientRegex = /class="custom-select-card[^"]*"[^>]*data-category="(yogurt|fruta|topping)"[^>]*data-name="([^"]+)"/g;
  let countIngredients = 0;
  while ((m = ingredientRegex.exec(html))) {
    await pool.execute(
      'INSERT INTO ingredientes (tipo,nombre) VALUES (?,?) ON DUPLICATE KEY UPDATE id=id', [m[1],m[2]]
    );
    countIngredients++;
  }
  const adminPass = process.env.ADMIN_PASSWORD;
  const adminUser = process.env.ADMIN_USER || 'admin';
  if (!adminPass || adminPass.length < 8) throw new Error('Configura ADMIN_PASSWORD con 8 caracteres o más en .env antes de ejecutar setup.');
  const [users] = await pool.execute('SELECT id FROM usuarios WHERE usuario=?', [adminUser]);
  if (!users.length) {
    await pool.execute(
      'INSERT INTO usuarios (nombre,usuario,clave_hash,rol) VALUES (?,?,?,?)',
      [process.env.ADMIN_NAME || 'Administrador Simple',adminUser,await bcrypt.hash(adminPass,12),'administrador']
    );
  }

  const bannersHtml = fs.readFileSync(path.join(__dirname, '../html/banners_caja.html'), 'utf8');
  const bannerRegex = /<div class="banner-card-glow([^"]*)"[^>]*>([\s\S]*?)(?=<div class="banner-card-glow|<div class="d-flex justify-content-center align-items-center pt-2 border-top)/g;
  let bannerCount=0;
  for (const match of bannersHtml.matchAll(bannerRegex)) {
    const image = match[2].match(/<img src="\.\.\/Img\/([^"]+)"/);
    if (!image) continue;
    const title = match[2].match(/class="product-name[^"]*">([^<]+)/) ||
       match[2].match(/class="fw-bold text-white"[^>]*>([^<]+)/);
    const file='/Img/'+image[1],available = !match[1].includes('is-agotado');
    const [[existing]]=await pool.execute('SELECT id FROM banners WHERE imagen=? LIMIT 1',[file]);
    if(!existing)await pool.execute('INSERT INTO banners (titulo,imagen,orden,activo) VALUES (?,?,?,?)',
       [title?title[1]:image[1],file,bannerCount+1,available?1:0]);
    bannerCount++;
  }
  const [[admin]]=await pool.execute('SELECT id FROM usuarios WHERE usuario=?',[adminUser]);
  const sampleOrders = [
   { code:'0042', canal:'tienda', entrega:'tienda',estado:'aceptado', cliente:null,
     products:[['Parfait Personalizado',1,{yogurts:['Griego'],frutas:['Fresa','Arándano'],toppings:['Miel de abeja','Maní']}]] },
   { code:'0043', canal:'tienda', entrega:'tienda',estado:'preparando', cliente:null,
     products:[['Parfait Personalizado',1,{yogurts:['Vainilla'],frutas:['Fresa','Mango'],toppings:['Granola artesanal']}]] },
   { code:'0038', canal:'tienda', entrega:'tienda',estado:'listo', cliente:null,
     products:[['Parfait Clásico',1],['Jugo probiotico de fresa',1]] },
   { code:'0035', canal:'tienda', entrega:'tienda',estado:'entregado', cliente:null,
     products:[['Protein Parfait Bowl',1],['Carrot cake',1]] },
   { code:'1101', canal:'whatsapp', entrega:'delivery',estado:'aceptado',
     cliente:{nombre:'Juan Pérez',telefono:'+999 999 999',direccion:'Calle Los Cedros 123'},
     products:[['Parfait Personalizado',1,{yogurts:['Arándano'],frutas:['Fresa','Platano'],toppings:['Miel de abeja']}]] },
   { code:'1102', canal:'whatsapp', entrega:'recojo',estado:'pendiente',
     cliente:{nombre:'Maria Garcia',telefono:'+999 888 777',direccion:'Recojo en Tienda'},
     products:[['Parfait de Fresa & Griego',1],['Yogurt Cacao Bliss',1]] },
   { code:'1103', canal:'whatsapp', entrega:'delivery',estado:'pendiente',
     cliente:{nombre:'Carlos López',telefono:'+999 777 666',direccion:'Av. Balta 456'},
     products:[['Parfait Personalizado',1,{yogurts:['Griego'],frutas:['Fresa','Kiwi'],toppings:['Granola artesanal']}]] },
   { code:'1001', canal:'pedidosya', entrega:'delivery',estado:'preparando',
     cliente:{nombre:'Juan Pérez',telefono:'+999 999 999',direccion:'Delivery PedidosYa'},entregaCodigo:'442',
     products:[['Parfait Personalizado',1,{yogurts:['Griego'],frutas:['Fresa','Kiwi'],toppings:['Miel de abeja']}],['Jugo probiotico de fresa',1]] },
   { code:'1002', canal:'pedidosya', entrega:'delivery',estado:'pendiente',
     cliente:{nombre:'Juan Pérez',telefono:'+999 999 999',direccion:'Delivery PedidosYa'},entregaCodigo:'123',
     products:[['Parfait Personalizado',1,{yogurts:['Cacao'],frutas:['Fresa','Kiwi'],toppings:[]}],['Jugo probiotico de arandano',1]] },
   { code:'1003', canal:'pedidosya', entrega:'delivery',estado:'pendiente',
     cliente:{nombre:'Juan Pérez',telefono:'+999 777 666',direccion:'Delivery PedidosYa'},entregaCodigo:'456',
     products:[['Parfait Personalizado',1,{yogurts:['Griego'],frutas:['Fresa'],toppings:['Granola artesanal']}]] }
  ];
  let seeded=0;
  for(const sample of sampleOrders){
    const reference='DEMO-SIMPLE-'+sample.canal+'-'+sample.code;
    const [[found]]=await pool.execute('SELECT id FROM pedidos WHERE referencia_externa=? LIMIT 1',[reference]);
    if(found)continue;
    const connection=await pool.getConnection();
    try{
      await connection.beginTransaction();
      let customerId=null;
      if(sample.cliente){
        const [customer]=await connection.execute('INSERT INTO clientes (nombre,telefono,direccion) VALUES (?,?,?)',
          [sample.cliente.nombre,sample.cliente.telefono,sample.cliente.direccion]);
        customerId=customer.insertId;
      }
      let gross=0;
      const items=[];
      for(const [name,qty,custom] of sample.products){
        const [[product]]=await connection.execute('SELECT id,precio FROM productos WHERE nombre=?',[name]);
        if(!product)throw new Error('Producto ausente para prueba: '+name);
        const price=Number(product.precio),amount=Math.round(price*qty*100)/100;
        gross+=amount;items.push({id:product.id,name,qty,price,amount,custom:custom||null});
      }
      const envio=sample.entrega==='delivery'?1:0,total=Math.round((gross+envio)*100)/100;
      const subtotal=Math.round(total/1.18*100)/100,igv=Math.round((total-subtotal)*100)/100;
      const [order]=await connection.execute(
        'INSERT INTO pedidos (codigo,canal,entrega,cliente_id,usuario_id,estado,referencia_externa,codigo_entrega,subtotal,igv,envio,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [sample.code,sample.canal,sample.entrega,customerId,admin.id,sample.estado,reference,sample.entregaCodigo||null,subtotal,igv,envio,total]);
      for(const item of items){
        await connection.execute('INSERT INTO detalle_pedidos (pedido_id,producto_id,nombre_producto,cantidad,precio_unitario,total_linea,personalizacion,nota) VALUES (?,?,?,?,?,?,?,?)',
          [order.insertId,item.id,item.name,item.qty,item.price,item.amount,item.custom?JSON.stringify(item.custom):null,'']);
      }
      if(sample.canal==='tienda'){
        await connection.execute('INSERT INTO pagos (pedido_id,metodo,monto,recibido,vuelto,referencia,registrado_por) VALUES (?,?,?,?,?,?,?)',
          [order.insertId,'efectivo',total,total,0,'PAGO-PRUEBA',admin.id]);
      }
      await connection.execute('INSERT INTO historial_estados (pedido_id,usuario_id,estado_anterior,estado_nuevo) VALUES (?,?,?,?)',
         [order.insertId,admin.id,null,sample.estado]);
      await connection.commit();seeded++;
    }catch(error){await connection.rollback();throw error;}
    finally{connection.release();}
  }

  const [[productCount]] = await pool.query('SELECT COUNT(*) AS n FROM productos');
  if (productCount.n < 25) throw new Error('No se importó el catálogo completo (se esperan los 24 productos + personalizado).');
  console.log('Catálogo: ' + productCount.n + ' productos; ' + countIngredients + ' ingredientes; ' + bannerCount + ' elementos de banners; ' + seeded + ' pedidos de prueba añadidos.');
}
if (require.main === module) {
  seed().then(() => pool.end()).catch(e => { console.error(e.message); pool.end().finally(() => process.exit(1)); });
}
module.exports = { seed };
