const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.send("Server is running");
});

const db = new sqlite3.Database("./lostfound.db", (err) => {
    if (err) console.log(err);
    else console.log("SQLite Connected ✅");
});

db.run(`
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    category TEXT,
    brand TEXT,
    color TEXT,
    venue TEXT,
    description TEXT,
    email TEXT,
    image TEXT,
    status TEXT DEFAULT 'pending'
)
`);

// ADD LOST
app.post("/add-lost", (req, res) => {
    const { category, brand, color, venue, desc, email, image } = req.body;

    db.run(`
    INSERT INTO items (type, category, brand, color, venue, description, email, image, status)
    VALUES ('lost', ?, ?, ?, ?, ?, ?, ?, 'pending')
    `,
    [category, brand, color, venue, desc, email, image],
    (err) => {
        if (err) return res.status(500).send(err);
        res.send("ok");
    });
});

// ADD FOUND (FINAL CORRECT LOGIC)
app.post("/add-found", (req, res) => {
    const { category, brand, color, venue, desc, image } = req.body;

    db.get(`
    SELECT * FROM items 
    WHERE type='lost'
    AND LOWER(category)=LOWER(?)
    AND LOWER(brand)=LOWER(?)
    AND LOWER(color)=LOWER(?)
    `,
    [category, brand, color],
    (err, row) => {

        if (err) return res.status(500).send(err);

        if (row) {

            // 🔥 IF ALREADY FOUND
            if (row.status === "found") {
                return res.json({ match: true, email: row.email });
            }

            // 🔥 FIRST TIME MATCH
            db.run(
                "UPDATE items SET status='found' WHERE id=?",
                [row.id],
                (err) => {
                    if (err) return res.status(500).send(err);
                    return res.json({ match: true, email: row.email });
                }
            );

        } else {

            db.run(`
            INSERT INTO items (type, category, brand, color, venue, description, image, status)
            VALUES ('found', ?, ?, ?, ?, ?, ?, 'pending')
            `,
            [category, brand, color, venue, desc, image],
            (err) => {
                if (err) return res.status(500).send(err);
                res.json({ match: false });
            });
        }
    });
});

// GET ITEMS
app.get("/items", (req, res) => {
    db.all("SELECT * FROM items", [], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running"));
