const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser')
const session = require('express-session');
const dotenv = require('dotenv')
const mysql = require('mysql2')

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
  })
);

const port = 8000;

const pool = mysql.createPool({
 host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PW || '',
  database: process.env.MYSQL_DB,
});


// Hardcoded user data
const users = [
  { username: 'masum', password: 'masum@717225#', role: 'admin' },
  { username: 'nanto', password: 'nanto@123#', role: 'manager' },
  { username: 'nesu', password: 'nesu@123#', role: 'manager' },
];

// Login endpoint
app.post('/splendid/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = user;
    res.json({ success: true, user });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

// Logout endpoint
app.post('/splendid/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      res.json({ success: false, message: 'Error logging out' });
    } else {
      res.json({ success: true, message: 'Logged out successfully' });
    }
  });
});

app.get('/splendid/check-login', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});



app.get('/splendid/api/v1/receipt', (req, res) => {
  const chairNoFilter = req.query.chairNo || '';
  const startDateFilter = req.query.startDate; // Add this line
  const endDateFilter = req.query.endDate; // Add this line

  let sql = 'SELECT * FROM receipt';

  if (chairNoFilter) {
    if (sql.includes('WHERE')) {
      sql += ` AND chairNo = '${chairNoFilter}'`;
    } else {
      sql += ` WHERE chairNo = '${chairNoFilter}'`;
    }
  }

  if (startDateFilter && endDateFilter) {
    // Add this block
    if (sql.includes('WHERE')) {
      sql += ` AND DATE(date) BETWEEN DATE('${startDateFilter}') AND DATE('${endDateFilter}')`;
    } else {
      sql += ` WHERE DATE(date) BETWEEN DATE('${startDateFilter}') AND DATE('${endDateFilter}')`;
    }
  }

  sql += ' ORDER BY date DESC';

  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(results);
  });
})

app.post('/splendid/api/v1/receipt/add', (req, res) => {
  const {
    fullName,
    phone,
    address,
    email,
    service,
    customFields,
    discount,
    tax,
    subTotal,
    chairNo,
  } = req.body;
  const q =
    'INSERT INTO receipt (fullName, phone, address, email, services, customFields, discount, tax, subtotal, chairNo) VALUES (?,?,?,?,?,?,?,?,?,?)';

  pool.query(
    q,
    [
      fullName,
      phone,
      address,
      email,
      service,
      customFields,
      discount,
      tax,
      subTotal,
      chairNo,
    ],
    (err, result) => {
      if (err) {
        res.status(500).json({ err });
        return;
      }

      res.status(200).json({ msg: `Success of adding ${fullName}` });
    }
  );
})

app.post('/splendid/api/v1/receipt/delete', (req, res) => {
  const { id } = req.body;
  const q = 'DELETE FROM receipt WHERE id = ?';

  pool.query(q, [id], (err, result) => {
    if (err) {
      res.status(500).json({ err });
      return;
    }

    res.status(200).json({ msg: `Successfully deleted id ${id}` });
  });
})

app.get('/splendid/api/v1/receipt/get', (req, res) => {
  const { name } = req.query;
  const q =
    'SELECT * FROM receipt WHERE LOWER(fullName) Like ? OR phone LIKE ?';

  const query = '%' + name.toLowerCase() + '%';

  pool.query(q, [query, query], (err, result) => {
    if (err) {
      res.status(500).json({ err });
      return;
    }

    res.send(result);
  });
})


app.get('/splendid/api/v1/services', (req, res) => {
  pool.query('SELECT * FROM services', (err, result) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.send(result);
  });
})


app.post('/splendid/api/v1/services/add', (req, res) => {
  const { title, price, category } = req.body;
  const q = 'INSERT INTO services (title, price, category) VALUES (?,?,?)';

  pool.query(q, [title, price, category], (err, result) => {
    if (err) {
      res.status(500).json({ err });
      return;
    }

    res.status(200).json({ msg: `Success of adding ${title}` });
  });
})

app.post('/splendid/api/v1/services/update', (req, res) => {
  const { id, title, price } = req.body;
  const q = 'UPDATE services SET title = ? , price= ? WHERE id = ?';

  pool.query(q, [title, price, id], (err, result) => {
    if (err) {
      res.status(500).json({ err });
      return;
    }

    res.status(200).json({ msg: `Success of updating ${title}` });
  });
})

app.post('/splendid/api/v1/services/delete', (req, res) => {
  const { id } = req.body;
  const q = 'DELETE FROM services WHERE id = ?';

  pool.query(q, [id], (err, result) => {
    if (err) {
      res.status(500).json({ err });
      return;
    }

    res.status(200).json({ msg: `Successfully deleted id ${id}` });
  });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
