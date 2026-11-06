(function(root){
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const images={
    'griego':'Y-Griego.jpg','yogurt griego':'Y-Griego.jpg',
    'arandano':'Arandano.jpg','yogurt arandano':'Y-Arandano.jpg',
    'fresa':'Fresa.jpg','yogurt fresa':'Y-Fresa.jpg',
    'cacao':'Y-Cacao.jpg','yogurt cacao':'Y-Cacao.jpg',
    'platano':'Platano.jpg','kiwi':'Kiwi.jpg','mango':'Mango.jpg',
    'aguaymanto':'Aguaymanto.jpg','pina':'Pina.jpg','uva':'Uvas.jpg','uvas':'Uvas.jpg',
    'granola':'Granola.jpg','granola artesanal':'Granola.jpg',
    'miel':'Miel.jpg','miel de abeja':'Miel.jpg','algarrobina':'Algarrobina.jpg',
    'almendras':'Almendras.jpg','mani':'Mani.jpg','pecanas':'Pecanas.jpg',
    'coco':'Coco.jpg','acai organico':'Açai Power Bowl.jpg'
  };
  const knownYogurts=['griego','arandano','fresa','cacao','vainilla','natural','yogurt griego','yogurt natural','yogurt fresa','yogurt arandano','yogurt cacao'];
  const fruits=['fresa','arandano','platano','kiwi','mango','aguaymanto','pina','uva','uvas','coco','frutas mixtas','acai organico'];
  const toppings=['granola','granola artesanal','miel','miel de abeja','algarrobina','almendras','mani','pecanas'];
  function custom(item){
    const data=item.personalizacion;
    if(!data)return null;
    if(typeof data==='object'&&!Array.isArray(data))return data;
    if(typeof data==='string'){try{const parsed=JSON.parse(data);return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:null;}catch{return null;}}
    return null;
  }
  function namedGroup(name){
    const n=norm(name);
    if(n.startsWith('yogurt ')||n==='griego'||n==='vainilla'||n==='natural')return 'yogurt';
    if(toppings.includes(n))return 'topping';
    if(fruits.includes(n))return 'fruta';
    if(knownYogurts.includes(n))return 'yogurt';
    return 'otro';
  }
  function recipe(item){
    const choice=custom(item);
    const groups={yogurt:[],fruta:[],topping:[],otro:[]};
    const arr=v=>Array.isArray(v)?v.map(String).map(v=>v.trim()).filter(Boolean):[];
    if(choice){
      groups.yogurt=arr(choice.yogurts||choice.yogur);
      groups.fruta=arr(choice.frutas);
      groups.topping=arr(choice.toppings);
    }else{
      const description=String(item.descripcion_producto||item.nota||'');
      for(const part of description.split(/[,|]/).map(v=>v.trim()).filter(Boolean)){
        const group=namedGroup(part);
        groups[group].push(part);
      }
    }
    return groups;
  }
  function summary(item){
    const groups=recipe(item);
    const entries=[['Yogurt',groups.yogurt],['Frutas',groups.fruta],['Toppins',groups.topping],['Detalles',groups.otro]];
    const lines=entries.filter(([,a])=>a.length).map(([label,values])=>'<li>'+escapeText(label)+': '+escapeText(values.join(', '))+'</li>');
    if(item.nota&&custom(item)&&!String(item.nota).startsWith('Yogurt:'))lines.push('<li>Nota: '+escapeText(item.nota)+'</li>');
    return lines.length?'<ul class="item-details text-muted mb-3">'+lines.join('')+'</ul>':'';
  }
  function badge(canal){
    const names={tienda:'Tienda',whatsapp:'WhatsApp',pedidosya:'PedidosYa'};
    return '<span class="badge badge-'+(Object.hasOwn(names,canal)?canal:'tienda')+'">'+escapeText(names[canal]||canal)+'</span>';
  }
  function timeAgo(date){
    const time=new Date(date).getTime();
    if(!Number.isFinite(time))return '';
    const minutes=Math.max(0,Math.floor((Date.now()-time)/60000));
    if(minutes<1)return 'Hace un momento';
    if(minutes<60)return 'Hace '+minutes+' min';
    const hours=Math.floor(minutes/60);
    if(hours<24)return 'Hace '+hours+' h';
    return 'Hace '+Math.floor(hours/24)+' días';
  }
  function stageKitchen(estado){
    return {aceptado:'espera',preparando:'preparando',listo:'listo'}[estado]||null;
  }
  function stageCash(estado){
    return {pendiente:'espera',aceptado:'espera',preparando:'preparando',listo:'listo',despachado:'listo',entregado:'historial',cancelado:'historial'}[estado]||null;
  }
  function productCardItems(order){
    return (order.items||[]).map(item=>'<div class="mb-2"><h6 class="item-title mb-1">'+escapeText(item.cantidad)+'x '+escapeText(item.nombre_producto)+'</h6>'+summary(item)+'</div>').join('');
  }
  function ingredientImage(name,group){
    const n=norm(name);
    const key=group==='yogurt'&&!n.startsWith('yogurt ')?'yogurt '+n:n;
    const file=images[key]||images[n];
    return file?'/Img/'+encodeURIComponent(file):null;
  }
  function ingredientCard(name,group){
    const src=ingredientImage(name,group);
    return '<div class="ingredient-card">'+(src?'<img src="'+escapeText(src)+'" class="ingredient-img" alt="'+escapeText(name)+'">':'<div class="ingredient-img ingredient-placeholder d-flex align-items-center justify-content-center"><span>'+escapeText(name)+'</span></div>')+'<span class="ingredient-name">'+escapeText(name)+'</span></div>';
  }
  function recipeViews(order){
    const sections=[],steps=[];
    for(const item of order.items||[]){
      const groups=recipe(item);
      const name=item.nombre_producto;
      const title=escapeText(item.cantidad)+'x '+escapeText(name);
      const groupDefs=[['Yogurt',groups.yogurt,'yogurt'],['Frutas',groups.fruta,'fruta'],['Toppins',groups.topping,'topping']];
      let body='';
      for(const [label,parts,key] of groupDefs){
        if(parts.length)body+='<div class="mb-4"><h5 class="fw-bold section-label mb-3">'+label+'</h5><div class="d-flex flex-wrap gap-3">'+parts.map(n=>ingredientCard(n,key)).join('')+'</div></div>';
      }
      if(!body){
        const image=item.imagen?.startsWith('/Img/')?item.imagen:null;
        body='<div class="mb-4"><h5 class="fw-bold section-label mb-3">Producto</h5><div class="d-flex flex-wrap gap-3"><div class="ingredient-card">'+(image?'<img src="'+escapeText(encodeURI(image))+'" class="ingredient-img" alt="'+escapeText(name)+'">':'')+'<span class="ingredient-name">'+escapeText(name)+'</span></div></div></div>';
      }
      if(groups.otro.length)body+='<p class="text-muted">'+escapeText(groups.otro.join(', '))+'</p>';
      const notes=custom(item)?item.nota||'':item.nota&&item.nota!==item.descripcion_producto?item.nota:'';
      sections.push('<div class="recipe-product mb-4"><h5 class="fw-bold mb-3">'+title+'</h5>'+body+(notes?'<div class="mt-2"><label class="fw-bold section-label mb-2">Nota</label><input class="form-control note-input rounded-pill" readonly value="'+escapeText(notes)+'"></div>':'')+'</div>');
      steps.push('<li class="mb-3"><strong>'+title+'</strong><ol class="mt-2 ps-3">'+
       (groups.yogurt.length?'<li class="mb-2"><strong>Base:</strong> preparar con '+escapeText(groups.yogurt.join(', '))+'.</li>':'')+
       (groups.fruta.length?'<li class="mb-2"><strong>Frutas:</strong> agregar '+escapeText(groups.fruta.join(', '))+'.</li>':'')+
       (groups.topping.length?'<li class="mb-2"><strong>Toppins:</strong> finalizar con '+escapeText(groups.topping.join(', '))+'.</li>':'')+
       (groups.otro.length?'<li class="mb-2"><strong>Ingredientes:</strong> '+escapeText(groups.otro.join(', '))+'.</li>':'')+
       (!groups.yogurt.length&&!groups.fruta.length&&!groups.topping.length&&!groups.otro.length?'<li>Preparar el producto según la receta de tienda.</li>':'')+
       (notes?'<li><strong>Nota:</strong> '+escapeText(notes)+'</li>':'')+
       '</ol></li>');
    }
    return {ingredientsHtml:sections.join(''),stepsHtml:steps.join(''),note:(order.items||[]).map(i=>i.nota||'').filter(Boolean).join(' · ')};
  }
  function recipeEntryTransition(estado){
    return estado==='aceptado'?'preparando':null;
  }
  function recipeFinishTransition(estado){
    return estado==='preparando'?'listo':null;
  }
  const api={escapeText,norm,custom,recipe,summary,badge,timeAgo,stageKitchen,stageCash,productCardItems,ingredientCard,recipeViews,recipeEntryTransition,recipeFinishTransition};
  root.SimpleOrders=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
