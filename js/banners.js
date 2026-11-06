document.addEventListener('DOMContentLoaded',async()=>{
 const main=document.querySelector('main.banners-admin-container');
 const s=Simple.escape;
 main.innerHTML='<div class="container py-4"><div class="d-flex justify-content-between align-items-center mb-4"><div><h2 class="fw-bold">Banners</h2><p class="text-muted">Registra banners asociados a imágenes del catálogo.</p></div><a href="/caja.html" class="btn btn-outline-dark">Volver a Caja</a></div><form id="bannerForm" class="row g-2 mb-4"><div class="col-md-4"><input class="form-control" id="bannerTitle" placeholder="Título del banner" maxlength="140" required></div><div class="col-md-5"><select class="form-select" id="bannerImage"></select></div><div class="col-md-3"><button class="btn btn-dark w-100">Agregar banner</button></div></form><div id="bannerList" class="row g-3"></div></div>';
 async function load(){
  const [banners,products]=await Promise.all([Simple.api('/banners'),Simple.api('/productos')]);
  const opts=[...new Map(products.filter(p=>p.imagen).map(p=>[p.imagen,{url:p.imagen,nombre:p.nombre}])).values()];
  document.getElementById('bannerImage').innerHTML=opts.map(o=>'<option value="'+s(o.url)+'">'+s(o.nombre)+'</option>').join('');
  document.getElementById('bannerList').innerHTML=banners.length?banners.map(b=>'<div class="col-md-4"><div class="card h-100 p-3"><img src="'+encodeURI(b.imagen)+'" class="w-100 rounded-3" style="height:180px;object-fit:cover"><h5 class="mt-3">'+s(b.titulo)+'</h5><p>Estado: '+(b.activo?'Activo':'Oculto')+'</p><button class="btn btn-outline-dark toggle-banner" data-id="'+b.id+'" data-active="'+(b.activo?0:1)+'">'+(b.activo?'Ocultar':'Mostrar')+'</button></div></div>').join(''):'<p class="text-muted">No hay banners registrados. Agrega el primero.</p>';
 }
 document.getElementById('bannerForm').addEventListener('submit',async e=>{
  e.preventDefault();try{
   await Simple.api('/banners',{method:'POST',body:JSON.stringify({titulo:document.getElementById('bannerTitle').value,imagen:document.getElementById('bannerImage').value})});
   document.getElementById('bannerTitle').value='';await load();
  }catch(error){alert(error.message);}
 });
 document.getElementById('bannerList').addEventListener('click',async e=>{
  const b=e.target.closest('.toggle-banner');if(!b)return;
  try{await Simple.api('/banners/'+b.dataset.id,{method:'PATCH',body:JSON.stringify({activo:b.dataset.active==='1'})});await load();}
  catch(error){alert(error.message);}
 });
 try{await load();}catch(error){alert(error.message);}
});
