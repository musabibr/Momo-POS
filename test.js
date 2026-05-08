const { app } = require('electron');
const Database = require('better-sqlite3');

app.whenReady().then(() => {
  const db = new Database(process.env.APPDATA + '/momo-pos/momo.db');
  console.log('ITEMS:', db.prepare('SELECT id, name, cost FROM items LIMIT 5').all());
  console.log('ORDER_ITEMS:', db.prepare('SELECT id, unit_price, unit_cost FROM order_items LIMIT 5').all());
  app.quit();
});
