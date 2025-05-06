module.exports = {
  apps: [{
    name: "kodjo-english-app",
    script: "dist/index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID,
      ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,
      ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID,
      SESSION_SECRET: process.env.SESSION_SECRET,
      DATABASE_TYPE: process.env.DATABASE_TYPE,
      DATABASE_PATH: process.env.DATABASE_PATH
    }
  }]
};
