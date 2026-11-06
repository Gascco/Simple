document.addEventListener('DOMContentLoaded',async()=>{
  const displayOnly=document.body.dataset.displayOnly==='true';
  const cards=[...document.querySelectorAll('.banner-card-glow')];
  const normalized=src=>{
    const url=new URL(src,location.href);
    return '/Img/'+decodeURIComponent(url.pathname.split('/').pop());
  };
  const title=card=>card.querySelector('.product-name')?.textContent?.trim()||card.querySelector('.fw-bold.text-white')?.textContent?.trim()||card.querySelector('img')?.alt||'Producto';
  const bannerImage=card=>card.querySelector('img')?.getAttribute('src');
  async function refresh(){
    const rows=await Simple.api('/banners/disponibilidad');
    const map=new Map(rows.map(b=>[b.imagen,Boolean(b.activo)]));
    for(const card of cards){
      const image=bannerImage(card);
      if(!image)continue;
      const path=normalized(image);
      if(map.has(path))card.classList.toggle('is-agotado',!map.get(path));
      card.style.cursor=displayOnly?'default':'pointer';
      card.title=displayOnly?'':('Clic para cambiar disponibilidad de '+title(card));
    }
  }
  if(!displayOnly){
    for(const card of cards){
      card.addEventListener('click',async()=>{
        const image=bannerImage(card);
        if(!image)return;
        const activo=card.classList.contains('is-agotado');
        card.style.pointerEvents='none';
        try{
          await Simple.api('/banners/disponibilidad',{method:'PUT',body:JSON.stringify({imagen:normalized(image),titulo:title(card),activo})});
          card.classList.toggle('is-agotado',!activo);
        }catch(err){alert(err.message);}
        finally{card.style.pointerEvents='';}
      });
    }
    const header=document.querySelector('.topbar-nav');
    if(header){
      const a=document.createElement('a');a.className='btn btn-light btn-sm ms-2';a.href='/banners_tv.html';a.target='_blank';a.rel='noopener';a.textContent='Ver en pantalla / TV';
      header.lastElementChild?.prepend(a);
    }
  }
  try{await refresh();}catch(err){console.error('Disponibilidad:',err);}
  setInterval(()=>refresh().catch(console.error),12000);
});