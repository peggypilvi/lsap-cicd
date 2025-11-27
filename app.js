const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const unusedVariable = 'this will cause lint error';  // 加這行

app.get('/', (req, res) => {
  res.json({ message: 'Hello from LSAP CI/CD App!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
