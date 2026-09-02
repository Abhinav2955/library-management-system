const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporterPromise = null;

const getTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      logger.info(`📧 Using configured SMTP host: ${env.SMTP_HOST}`);
      return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
    }

    const testAccount = await nodemailer.createTestAccount();
    logger.info('📧 No SMTP configured — using an Ethereal test inbox (preview links will be logged)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  })();

  return transporterPromise;
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.SMTP_FROM || '"Athenaeum Library" <no-reply@athenaeum.local>',
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`📧 Email preview (Ethereal — no real inbox was used): ${previewUrl}`);
  }
  return info;
};

module.exports = { sendEmail };