require('dotenv').config();
const path=require('node:path');
const express=require('express');
const session=require('express-session');
const MySQLStore=require('express-mysql-session')(session);
const {pool,config}=require('./db');
const {router,requireAuth,requireRole}=require('./routes');
if(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)throw new Error('SESSION_SECRET debe tener 32 caracteres como mínimo');
const app=express();app.disable('x-powered-by');
if(process.env.NODE_ENV==='production')app.set('trust proxy',1);
app.use(express.json({limit:'150kb'}));
app.use(express.urlencoded({extended:false}));
app.use(session({name:'simple.sid',secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,
  store:new MySQLStore({host:config.host,port:config.port,user:config.user,password:config.password,database:config.database,createDatabaseTable:true,schema:{tableName:'sesiones'}}),
  cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000}}));
app.use((req,res,next)=>{
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('origin')){
    try{if(new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Origen no autorizado'});}
    catch{return res.status(403).json({error:'Origen no autorizado'});}
  }
  next();
});
app.use('/api',router);
for(const folder of ['Img','css','js'])app.use('/'+folder,express.static(path.join(__dirname,'..',folder)));
app.use('/CSS',express.static(path.join(__dirname,'../css')));
const pages={'login.html':null,'loading.html':null,'roles.html':['administrador','caja','cocina'],
'caja.html':['administrador','caja'],'pago.html':['administrador','caja'],
'pedidos_caja.html':['administrador','caja'],'pedidos_whatsapp.html':['administrador','caja'],
'pedidos_pedidosya.html':['administrador','caja'],'banners_caja.html':['administrador','caja'],'banners_tv.html':['administrador','caja'],
'cocina.html':['administrador','cocina']};
app.get('/',(req,res)=>res.redirect(req.session.user?'/roles.html':'/login.html'));
for(const [file,roles] of Object.entries(pages)){
  app.get('/'+file,...(roles?[requireAuth,requireRole(...roles)]:[]),(req,res)=>{
    if(!roles&&req.session.user)return res.redirect('/roles.html');
    res.set('Cache-Control','no-store');res.sendFile(path.join(__dirname,'../html',file));
  });
}
app.get('/html/:page',(req,res)=>Object.hasOwn(pages,req.params.page)?res.redirect('/'+req.params.page):res.sendStatus(404));
app.use('/api',(req,res)=>res.status(404).json({error:'Ruta no encontrada'}));
app.use((err,req,res,next)=>{console.error(err);res.status(err.status||500).json({error:err.status?err.message:'Error interno del servidor'});});
app.use((req,res)=>res.sendStatus(404));
const port=Number(process.env.PORT||3000);
pool.query('SELECT 1').then(()=>app.listen(port,()=>console.log('Simple: http://localhost:'+port))).catch(e=>{console.error(e.message);process.exit(1);});
