const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "taskmanager.sqlite");

//Creating database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log("error:", err.message);
  } else {
    console.log("Connected to sqlite database");
  }
});

//Creating tables
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users(
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       username TEXT NOT NULL UNIQUE,
       password TEXT NOT NULL)`,
    (err) => {
      if (err) {
        console.log(`creating users table failed:${err.message}`);
      } else {
        console.log("users table created");
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS tasks(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'TO DO',
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE )`,
    (err) => {
      if (err) {
        console.log(`creating tasks table failed:${err.message}`);
      } else {
        console.log("tasks table created");
      }
    }
  );
});
module.exports = db;
