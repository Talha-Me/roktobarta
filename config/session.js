const session = require('express-session');
const MongoStore = require('connect-mongo');

const createSessionConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return session({
    name: 'roktobarta_sid',
    secret: process.env.SESSION_SECRET || 'roktobarta_default_fallback_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/roktobarta',
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60, // 14 days
      autoRemove: 'native'
    }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
  });
};

module.exports = createSessionConfig;
