const express = require('express');
const mariadb = require('mariadb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Create MariaDB Connection Pool
console.log('Environment:', { host: process.env.DB_HOST, user: process.env.DB_USER, database: process.env.DB_NAME });

const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test',
    connectionLimit: 5
});

let testConnectionAttempts = 0;

async function executeQuery(query, params = []) {
    let conn;
    try {
        conn = await pool.getConnection();
        const res = await conn.query(query, params);
        return res;
    } finally {
        if (conn) conn.release();
    }
}

// Routes
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    
    try {
        const existing = await executeQuery('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Username already exists' });
        }
        
        await executeQuery('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
        res.status(201).json({ success: true, message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error during signup' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const rows = await executeQuery('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            res.status(200).json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.get('/api/groceries', async (req, res) => {
    try {
        const items = await executeQuery('SELECT * FROM groceries');
        // Mariadb driver returns an array plus meta info in array fields, need to just return array
        res.status(200).json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error fetching groceries' });
    }
});

app.post('/api/groceries', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
        const result = await executeQuery('INSERT INTO groceries (name) VALUES (?)', [name]);
        res.status(201).json({ id: Number(result.insertId), name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error adding grocery' });
    }
});

app.delete('/api/groceries/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        await executeQuery('DELETE FROM groceries WHERE id = ?', [id]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error deleting grocery' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Node app is running on port ${PORT}`);
});
