module.exports = {
  apps: [
    {
      name: "boba-api",
      script: "build/index.js",
      instances: 1,
      exec_mode: "cluster",
      interpreter: "~/.bun/bin/bun",
      listen_timeout: 16000,
    },
    {
      name: "boba-cron",
      script: "build/cron/cron.util.js",
      instances: 1,
      exec_mode: "fork",
      interpreter: "~/.bun/bin/bun",
      max_memory_restart: "1G",
      env: {
        PORT: 4101,
        NODE_ENV: "production",
      },
      listen_timeout: 16000,
    },
  ],
};
