require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception] Shutting down...', err);
  process.exit(1);
});

const startServer = async () => {
  // Connect to Database
  await connectDB();

  const PORT = parseInt(process.env.PORT || '5000', 10);
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`[Roktobarta Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`[URL] ${process.env.SITE_URL || `http://localhost:${PORT}`}`);
  });

  // Handle Unhandled Rejections
  process.on('unhandledRejection', (err) => {
    console.error('[Unhandled Rejection] Shutting down...', err);
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();
