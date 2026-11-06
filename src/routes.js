const express=require('express');
const bcrypt=require('bcryptjs');
const {pool}=require('./db');
const router=express.Router();
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const fail=(status,message)=>Object.assign(new Error(message),{status});
const validId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0;
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const channels=['tienda','whatsapp','pedidosya'];
const statuses=['pendiente_pago','pendiente','aceptado','preparando','listo','despachado','entregado','cancelado'];
function requireAuth(req,res,next){
 if(!req.session.user){
  if(req.baseUrl==='/api')return res.status(401).json({error:'Debes iniciar sesión'});
  return res.redirect('/login.html');
 }
 next();
}
function requireRole(...roles){return(req,res,next)=>{
 if(!req.session.user||!roles.includes(req.session.user.rol))return req.baseUrl==='/api'?res.status(403).json({error:'Acceso denegado'}):res.status(403).send('Acceso denegado');
 next();
};}
const caja=requireRole('administrador','caja');
router.post('/auth/login',wrap(async(req,res,next)=>{
 const username=String(req.body.usuario||'').trim(),password=String(req.body.password||'');
 if(!username||!password)throw fail(400,'Ingresa usuario y contraseña');
 const [[u]]=await pool.execute('SELECT id,nombre,usuario,rol,activo,clave_hash FROM usuarios WHERE usuario=?',[username]);
 if(!u||!u.activo||!await bcrypt.compare(password,u.clave_hash))throw fail(401,'Credenciales incorrectas');
 req.session.regenerate(err=>{
  if(err)return next(err);
  req.session.user={id:u.id,nombre:u.nombre,usuario:u.usuario,rol:u.rol};
  req.session.save(err=>err?next(err):res.json({usuario:req.session.user}));
 });
}));
router.get('/auth/me',requireAuth,(req,res)=>res.json({usuario:req.session.user}));
router.post('/auth/logout',requireAuth,(req,res,next)=>{
 req.session.destroy(err=>err?next(err):res.clearCookie('simple.sid').json({ok:true}));
});
router.use(requireAuth);
router.get('/productos',wrap(async(req,res)=>{
 const [rows]=await pool.query('SELECT p.id,p.nombre,p.descripcion,p.precio,p.imagen,p.activo,c.slug AS categoria FROM productos p JOIN categorias c ON c.id=p.categoria_id WHERE p.activo=1 ORDER BY p.id');
 res.json(rows);
}));
router.get('/ingredientes',wrap(async(req,res)=>{
 const [rows]=await pool.query('SELECT * FROM ingredientes WHERE activo=1 ORDER BY tipo,id');res.json(rows);
}));
async function allOrders(query){
 let sql='SELECT p.*,c.nombre AS cliente,c.telefono,c.direccion,u.nombre AS empleado FROM pedidos p LEFT JOIN clientes c ON c.id=p.cliente_id LEFT JOIN usuarios u ON u.id=p.usuario_id WHERE 1=1';
 const params=[];
 if(query.canal){if(!channels.includes(query.canal))throw fail(400,'Canal inválido');sql+=' AND p.canal=?';params.push(query.canal);}
 if(query.estado){const s=String(query.estado).split(',');if(!s.every(x=>statuses.includes(x)))throw fail(400,'Estado inválido');sql+=' AND p.estado IN ('+s.map(()=>'?').join(',')+')';params.push(...s);}
 const [rows]=await pool.execute(sql+' ORDER BY p.id DESC LIMIT 250',params);
 if(rows.length){
  const ids=rows.map(x=>x.id),[items]=await pool.query('SELECT d.*,p.imagen,p.descripcion AS descripcion_producto FROM detalle_pedidos d LEFT JOIN productos p ON p.id=d.producto_id WHERE d.pedido_id IN ('+ids.map(()=>'?').join(',')+') ORDER BY d.id',ids);
  const groups=new Map();
  for(const item of items){if(!groups.has(item.pedido_id))groups.set(item.pedido_id,[]);groups.get(item.pedido_id).push(item);}
  rows.forEach(o=>o.items=groups.get(o.id)||[]);
 }
 return rows;
}
router.get('/pedidos',wrap(async(req,res)=>res.json(await allOrders(req.query))));
router.get('/pedidos/:id',wrap(async(req,res)=>{
 if(!validId(req.params.id))throw fail(400,'Id inválido');
 const [[order]]=await pool.execute('SELECT p.*,c.nombre AS cliente,c.telefono,c.direccion FROM pedidos p LEFT JOIN clientes c ON c.id=p.cliente_id WHERE p.id=?',[req.params.id]);
 if(!order)throw fail(404,'Pedido no encontrado');
 const [items]=await pool.execute('SELECT d.*,p.imagen,p.descripcion AS descripcion_producto FROM detalle_pedidos d LEFT JOIN productos p ON p.id=d.producto_id WHERE d.pedido_id=? ORDER BY d.id',[req.params.id]);
 res.json({...order,items});
}));
async function trx(fn){
 const db=await pool.getConnection();
 try{await db.beginTransaction();const result=await fn(db);await db.commit();return result;}
 catch(e){await db.rollback();throw e;}finally{db.release();}
}
async function prepareItems(db,items){
 if(!Array.isArray(items)||items.length<1||items.length>80)throw fail(400,'Debe haber de 1 a 80 productos');
 const out=[];
 for(const item of items){
  let product;
  if(validId(item.producto_id))[[product]]=await db.execute('SELECT id,nombre,precio FROM productos WHERE id=? AND activo=1',[item.producto_id]);
  else if(typeof item.name==='string')[[product]]=await db.execute('SELECT id,nombre,precio FROM productos WHERE nombre=? AND activo=1',[item.name.trim()]);
  if(!product)throw fail(400,'Producto no encontrado: '+String(item.name||item.producto_id));
  const qty=Number(item.qty??item.cantidad);
  if(!Number.isInteger(qty)||qty<1||qty>100)throw fail(400,'Cantidad inválida');
  const custom=item.personalizacion??(item.isCustom?{yogurts:item.yogurts||[],frutas:item.frutas||[],toppings:item.toppings||[]}:null);
  if(custom!==null){
   if(product.nombre!=='Parfait Personalizado'||typeof custom!=='object'||Array.isArray(custom))throw fail(400,'Personalización inválida');
   const yo=custom.yogurts||[],fr=custom.frutas||[],top=custom.toppings||[];
   if(!Array.isArray(yo)||!Array.isArray(fr)||!Array.isArray(top)||yo.length<1||yo.length>2||fr.length<1||fr.length>2||top.length>3)throw fail(400,'Ingredientes inválidos');
   for(const [type,list] of [['yogurt',yo],['fruta',fr],['topping',top]]){
    for(const name of list){const [[exists]]=await db.execute('SELECT id FROM ingredientes WHERE nombre=? AND tipo=? AND activo=1',[name,type]);if(!exists)throw fail(400,'Ingrediente no disponible: '+String(name));}
   }
  }
  const nota=String(item.note??item.nota??item.details??'').slice(0,500);
  out.push({id:product.id,name:product.nombre,qty,price:round(product.precio),custom,nota});
 }
 return out;
}
async function replaceItems(db,id,items,shipping){
 const clean=await prepareItems(db,items);
 const total=round(clean.reduce((sum,i)=>sum+i.price*i.qty,0)+shipping),subtotal=round(total/1.18),igv=round(total-subtotal);
 await db.execute('DELETE FROM detalle_pedidos WHERE pedido_id=?',[id]);
 for(const i of clean)await db.execute('INSERT INTO detalle_pedidos (pedido_id,producto_id,nombre_producto,cantidad,precio_unitario,total_linea,personalizacion,nota) VALUES (?,?,?,?,?,?,?,?)',
  [id,i.id,i.name,i.qty,i.price,round(i.qty*i.price),i.custom?JSON.stringify(i.custom):null,i.nota]);
 await db.execute('UPDATE pedidos SET subtotal=?,igv=?,envio=?,total=? WHERE id=?',[subtotal,igv,shipping,total,id]);
}
router.post('/pedidos',caja,wrap(async(req,res)=>{
 const canal=req.body.canal||'tienda';
 if(!channels.includes(canal))throw fail(400,'Canal inválido');
 const entrega=req.body.entrega||(canal==='tienda'?'tienda':'delivery');
 if(!['tienda','recojo','delivery'].includes(entrega))throw fail(400,'Entrega inválida');
 const cliente=req.body.cliente||{},nombre=String(cliente.nombre||'').trim();
 if(canal!=='tienda'&&!nombre)throw fail(400,'Nombre de cliente obligatorio');
 const envio=canal==='tienda'||entrega!=='delivery'?0:1;
 const id=await trx(async db=>{
  let clienteId=null;
  if(nombre){const [c]=await db.execute('INSERT INTO clientes (nombre,telefono,direccion) VALUES (?,?,?)',[nombre.slice(0,140),String(cliente.telefono||'').slice(0,35),String(cliente.direccion||'').slice(0,300)]);clienteId=c.insertId;}
  const estado=canal==='tienda'?'pendiente_pago':'pendiente';
  const [result]=await db.execute('INSERT INTO pedidos (canal,entrega,cliente_id,usuario_id,estado,referencia_externa,codigo_entrega,notas) VALUES (?,?,?,?,?,?,?,?)',
   [canal,entrega,clienteId,req.session.user.id,estado,String(req.body.referencia_externa||'').slice(0,120)||null,String(req.body.codigo_entrega||'').slice(0,40)||null,String(req.body.notas||'').slice(0,2000)]);
  await replaceItems(db,result.insertId,req.body.items,envio);
  await db.execute('UPDATE pedidos SET codigo=? WHERE id=?',['V'+String(result.insertId).padStart(4,'0'),result.insertId]);
  await db.execute('INSERT INTO historial_estados (pedido_id,usuario_id,estado_nuevo) VALUES (?,?,?)',[result.insertId,req.session.user.id,estado]);
  return result.insertId;
 });
 res.status(201).json({id});
}));
const moves={pendiente:['aceptado','cancelado'],aceptado:['preparando','cancelado'],preparando:['listo','cancelado'],
 listo:['despachado','entregado'],despachado:['entregado'],pendiente_pago:['cancelado'],entregado:[],cancelado:[]};
router.patch('/pedidos/:id/estado',wrap(async(req,res)=>{
 const id=req.params.id,estado=String(req.body.estado||'');
 if(!validId(id)||!Object.hasOwn(moves,estado))throw fail(400,'Id o estado inválido');
 const result=await trx(async db=>{
  const [[order]]=await db.execute('SELECT estado,entrega FROM pedidos WHERE id=? FOR UPDATE',[id]);
  if(!order)throw fail(404,'Pedido no encontrado');
  if(!moves[order.estado].includes(estado))throw fail(409,'Cambio de estado no permitido');
  if(req.session.user.rol==='cocina'&&!['preparando','listo'].includes(estado))throw fail(403,'No autorizado');
  if(estado==='despachado'&&order.entrega!=='delivery')throw fail(409,'No es un pedido delivery');
  await db.execute('UPDATE pedidos SET estado=? WHERE id=?',[estado,id]);
  await db.execute('INSERT INTO historial_estados (pedido_id,usuario_id,estado_anterior,estado_nuevo) VALUES (?,?,?,?)',[id,req.session.user.id,order.estado,estado]);
  return {id:Number(id),estado};
 });res.json(result);
}));
router.put('/pedidos/:id/items',caja,wrap(async(req,res)=>{
 const id=req.params.id;if(!validId(id))throw fail(400,'Id inválido');
 await trx(async db=>{
  const [[order]]=await db.execute('SELECT estado,envio FROM pedidos WHERE id=? FOR UPDATE',[id]);
  if(!order)throw fail(404,'Pedido inexistente');
  if(!['pendiente','aceptado'].includes(order.estado))throw fail(409,'Pedido ya en preparación o finalizado');
  await replaceItems(db,id,req.body.items,order.envio);
 });res.json({ok:true});
}));
router.post('/pedidos/:id/pago',caja,wrap(async(req,res)=>{
 const id=req.params.id,metodo=String(req.body.metodo||'');
 if(!validId(id)||!['efectivo','tarjeta','yape','plin'].includes(metodo))throw fail(400,'Id o método inválido');
 const result=await trx(async db=>{
  const [[o]]=await db.execute('SELECT total,estado,canal FROM pedidos WHERE id=? FOR UPDATE',[id]);
  if(!o)throw fail(404,'Pedido inexistente');
  if(o.canal!=='tienda'||o.estado!=='pendiente_pago')throw fail(409,'Este pedido no admite pago');
  const recibido=round(req.body.recibido),ref=String(req.body.referencia||'').trim().slice(0,120);
  if(metodo==='efectivo'){if(!Number.isFinite(recibido)||recibido<o.total)throw fail(400,'Efectivo insuficiente');}
  else if(req.body.simulado===true && process.env.NODE_ENV!=='production') {
    if(!ref.startsWith('SIM-'))throw fail(400,'Falta referencia de la simulación');
  }
  else if(req.body.confirmacion_manual!==true||!ref)throw fail(400,'Verifica el pago y proporciona referencia');
  await db.execute('INSERT INTO pagos (pedido_id,metodo,monto,recibido,vuelto,referencia,registrado_por) VALUES (?,?,?,?,?,?,?)',
   [id,metodo,o.total,metodo==='efectivo'?recibido:null,metodo==='efectivo'?round(recibido-o.total):0,ref||null,req.session.user.id]);
  await db.execute("UPDATE pedidos SET estado='aceptado' WHERE id=?",[id]);
  await db.execute('INSERT INTO historial_estados (pedido_id,usuario_id,estado_anterior,estado_nuevo) VALUES (?,?,?,?)',[id,req.session.user.id,'pendiente_pago','aceptado']);
  return {ok:true,id:Number(id),total:o.total};
 });res.json(result);
}));
router.get('/banners',caja,wrap(async(req,res)=>{const [rows]=await pool.query('SELECT * FROM banners ORDER BY orden,id');res.json(rows);}));

router.get('/banners/disponibilidad',caja,wrap(async(req,res)=>{
 const [rows]=await pool.query('SELECT imagen,titulo,activo FROM banners ORDER BY orden,id');
 res.json(rows);
}));
router.put('/banners/disponibilidad',caja,wrap(async(req,res)=>{
 const imagen=String(req.body.imagen||'').trim(),titulo=String(req.body.titulo||'').trim();
 if(!imagen.startsWith('/Img/')||imagen.length>350||!titulo||titulo.length>140||typeof req.body.activo!=='boolean')
   throw fail(400,'Datos del banner inválidos');
 const [[existing]]=await pool.execute('SELECT id FROM banners WHERE imagen=? LIMIT 1',[imagen]);
 if(existing) await pool.execute('UPDATE banners SET titulo=?,activo=? WHERE id=?',[titulo,req.body.activo?1:0,existing.id]);
 else await pool.execute('INSERT INTO banners (titulo,imagen,activo) VALUES (?,?,?)',[titulo,imagen,req.body.activo?1:0]);
 res.json({ok:true,imagen,activo:req.body.activo});
}));
router.post('/banners',requireRole('administrador'),wrap(async(req,res)=>{
 const titulo=String(req.body.titulo||'').trim(),imagen=String(req.body.imagen||'').trim();
 if(!titulo||!imagen.startsWith('/Img/'))throw fail(400,'Título o imagen inválida');
 const [result]=await pool.execute('INSERT INTO banners (titulo,imagen,orden) VALUES (?,?,?)',[titulo.slice(0,140),imagen.slice(0,350),Number(req.body.orden)||0]);
 res.status(201).json({id:result.insertId});
}));
router.patch('/banners/:id',requireRole('administrador'),wrap(async(req,res)=>{
 if(!validId(req.params.id))throw fail(400,'Id inválido');
 await pool.execute('UPDATE banners SET activo=? WHERE id=?',[req.body.activo===true?1:0,req.params.id]);res.json({ok:true});
}));
router.patch('/productos/:id',requireRole('administrador'),wrap(async(req,res)=>{
 if(!validId(req.params.id))throw fail(400,'Id inválido');
 const fields=[],params=[];
 if(req.body.precio!==undefined){
  const price=Number(req.body.precio);if(!Number.isFinite(price)||price<0||price>99999)throw fail(400,'Precio inválido');
  fields.push('precio=?');params.push(round(price));
 }
 if(req.body.activo!==undefined){fields.push('activo=?');params.push(req.body.activo===true?1:0);}
 if(!fields.length)throw fail(400,'No hay cambios');
 params.push(req.params.id);await pool.execute('UPDATE productos SET '+fields.join(',')+' WHERE id=?',params);res.json({ok:true});
}));
router.get('/usuarios',requireRole('administrador'),wrap(async(req,res)=>{const [rows]=await pool.query('SELECT id,nombre,usuario,correo,rol,activo FROM usuarios');res.json(rows);}));
router.post('/usuarios',requireRole('administrador'),wrap(async(req,res)=>{
 const {nombre,usuario,password,rol}=req.body;
 if(!nombre||!usuario||!password||String(password).length<8||!['administrador','caja','cocina'].includes(rol))throw fail(400,'Datos de usuario inválidos');
 const [result]=await pool.execute('INSERT INTO usuarios (nombre,usuario,clave_hash,rol) VALUES (?,?,?,?)',
  [String(nombre).slice(0,120),String(usuario).slice(0,60),await bcrypt.hash(String(password),12),rol]);
 res.status(201).json({id:result.insertId});
}));
module.exports={router,requireAuth,requireRole};
