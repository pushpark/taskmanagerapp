const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./dbsetup");

const app = express();
app.use(cors());
app.use(bodyParser.json());

//status validation middleware
const isValidStatus = (request, response, next) => {
  const status = request.body.status;
  const statusArray = ["To Do", "In Progress", "Completed"];
  const validStatus = statusArray.includes(status);
  if (validStatus) {
    next();
  } else {
    response.status(400);
    response.send("Invalid Status");
  }
};

// Register API
app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Database error", error: err.message });
    }

    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [username, hashedPassword],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to register user", error: err.message });
        }

        // Respond with success message and the userId
        res.status(201).json({
          message: "User registered successfully",
          userId: this.lastID,
        });
      }
    );
  });
});

//Login API
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: "Invalid username" });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: user.id }, "SECRET_KEY", { expiresIn: "1h" });
    res
      .status(200)
      .json({ token, user: { id: user.id, username: user.username } });
  });
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, "SECRET_KEY", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
};
//Read Tasks API
app.get("/api/tasks", authenticateToken, (req, res) => {
  id = req.user.id;

  db.all(`SELECT * FROM tasks WHERE user_id = ?`, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(rows);
  });
});

//Create task API
app.post("/api/tasks", isValidStatus, (req, res) => {
  const { title, description, status, userId } = req.body;

  db.run(
    `INSERT INTO Tasks (title, description, status, user_id) VALUES (?, ?, ?, ?)`,
    [title, description, status, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res
        .status(201)
        .json({ message: "Task added successfully", taskId: this.lastID });
    }
  );
});

//Delete task API
app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM Tasks WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Task deleted successfully" });
  });
});

//Edit task API
app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  if (status !== undefined) {
    const statusArray = ["To Do", "In Progress", "Completed"];
    const validStatus = statusArray.includes(status);
    if (!validStatus) {
      res.status(400);
      res.send("Invalid Status");
    }
  }

  db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err, task) => {
    const updatedTitle = title || task.title;
    const updatedDescription = description || task.description;
    const updatedStatus = status || task.status;

    db.run(
      `UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?`,
      [updatedTitle, updatedDescription, updatedStatus, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res
            .status(404)
            .json({ message: "Task not found or unchanged" });
        }
        res.status(200).json({ message: "Task updated successfully" });
      }
    );
  });
});

// Start the server
const PORT = 5002;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
