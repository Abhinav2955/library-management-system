const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./docs/openapi.json');

const env = require('./config/env');
const logger = require('./config/logger');
const v1Routes = require('./routes/v1.routes');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// --- Security & parsing middleware ---
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true, // required so the refresh-token cookie is sent/received
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// --- Logging ---
app.use(
  morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// --- Rate limiting (general backstop; auth routes have their own stricter limiter) ---
app.use('/api', apiLimiter);

// --- Health check for uptime monitoring / load balancers ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});
// --- Interactive API documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));

// --- API routes ---
app.use('/api/v1', v1Routes);

// --- 404 + centralized error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
