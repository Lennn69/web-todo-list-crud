import express from 'express';
import cors from 'cors';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Get all Todos
app.get('/api/todos', (req, res) => {
  try {
    const query = db.prepare('SELECT * FROM todos ORDER BY created_at DESC');
    const todos = query.all();
    
    const formattedTodos = todos.map(todo => ({
      ...todo,
      completed: Boolean(todo.completed)
    }));

    res.json(formattedTodos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// 2. Create a Todo
app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const insert = db.prepare('INSERT INTO todos (title) VALUES (?)');
    const result = insert.run(title.trim());
    
    res.status(201).json({
      id: result.lastInsertRowid,
      title: title.trim(),
      completed: false
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// 3. Dynamic Update (Strictly checks for undefined before doing validation checks)
app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;

  const updates = [];
  const params = [];

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
    updates.push('title = ?');
    params.push(title.trim());
  }

  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'Completed status must be a boolean' });
    }
    updates.push('completed = ?');
    params.push(completed ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  params.push(id);

  try {
    const sqlQuery = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
    const updateStmt = db.prepare(sqlQuery);
    const result = updateStmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json({ 
      message: 'Todo updated successfully',
      id: Number(id),
      ...(title !== undefined && { title: title.trim() }),
      ...(completed !== undefined && { completed })
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// 4. Delete a Todo
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;

  try {
    const deleteStmt = db.prepare('DELETE FROM todos WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json({ message: 'Todo deleted successfully', id: Number(id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running securely at http://localhost:${PORT}`);
});