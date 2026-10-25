require('dotenv').config();
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const flash = require('connect-flash');

const createSessionConfig = require('./config/session');
const setLocals = require('./middleware/locals');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app = express();

// View Engine Setup (EJS + Express Layouts)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// HTTP Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Security Headers (Helmet with Content-Security-Policy)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdnjs.cloudflare.com",
          "https://pagead2.googlesyndication.com",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://pagead2.googlesyndication.com",
          "https://www.google-analytics.com",
          "https://googleads.g.doubleclick.net"
        ],
        connectSrc: [
          "'self'",
          "https://www.google-analytics.com",
          "https://pagead2.googlesyndication.com"
        ],
        frameSrc: [
          "'self'",
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com"
        ]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Compression & Body Parsers
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection & parameter pollution
app.use(mongoSanitize());
app.use(hpp());

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Session & Flash Messages
app.use(createSessionConfig());
app.use(flash());

// Set template locals (User, Helpers, Flash, SEO)
app.use(setLocals);

// Expose a CSRF token to every rendered page (GET requests only; POST routes validate via csrfProtection)
const { csrfProtection: globalCsrfToken } = require('./middleware/security');
app.use((req, res, next) => (req.method === 'GET' ? globalCsrfToken(req, res, next) : next()));

// API Routes
app.use('/api', require('./routes/api'));

// Auth & User Routes
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/user'));

// Requests & Donors Routes
app.use('/', require('./routes/requests'));
app.use('/', require('./routes/donors'));

// Stories Routes
app.use('/', require('./routes/stories'));

// Blog Routes
app.use('/', require('./routes/blog'));

// Admin Panel Routes
app.use('/admin', require('./routes/admin'));

// Public & Legal Routes (Home, About, Contact, FAQ, Guide, Privacy, Terms, Disclaimer, Cookie)
app.use('/', require('./routes/public'));

// Alias /request to /requests
app.get('/request', (req, res) => res.redirect('/requests'));

// 404 & Global Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
