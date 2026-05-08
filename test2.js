const { app } = require('electron');
const Database = require('better-sqlite3');

app.whenReady().then(() => {
  const db = new Database(process.env.APPDATA + '/momo-pos/momo.db');
  
  const items = db.prepare(`SELECT id,price,cost,name FROM items`).all();
  console.log('ITEMS query result:', items.slice(0, 2));

  app.quit();
});
