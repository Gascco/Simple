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
  const html = fs.readFileSync(path.join(__dirname, '../html/caja.html'), 'utf8');
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
  const [[productCount]] = await pool.query('SELECT COUNT(*) AS n FROM productos');
  if (productCount.n < 25) throw new Error('No se importó el catálogo completo (se esperan los 24 productos + personalizado).');
  console.log('Catálogo: ' + productCount.n + ' productos; ' + countIngredients + ' ingredientes identificados; usuario admin preparado.');
}
if (require.main === module) {
  seed().then(() => pool.end()).catch(e => { console.error(e.message); pool.end().finally(() => process.exit(1)); });
}
module.exports = { seed };
