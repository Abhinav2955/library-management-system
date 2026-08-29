const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('./logger');

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: true,   // snake_case columns in MySQL
    timestamps: true,
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ MySQL connection established');
  } catch (err) {
    logger.error('❌ Unable to connect to MySQL', { error: err.message });
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
