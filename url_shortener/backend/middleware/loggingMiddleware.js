const fetch = require('node-fetch');

const API_URL = "http://20.244.56.144/evaluation-service/logs";

const allowedStacks = ["backend", "frontend"];
const allowedLevels = ["debug", "info", "warn", "error", "fatal"];
const allowedPackages = {
  backend: ["cache", "controller", "cron_job", "db", "domain", "handler", "repository", "route", "service"],
  frontend: ["api", "component", "hook", "page", "state", "style"],
  both: ["auth", "config", "middleware", "utils"]
};

async function log(stack, level, packageName, message, additionalMetadata = {}) {
  try {
    if (!allowedStacks.includes(stack)) {
      throw new Error(`Invalid stack: ${stack}`);
    }
    if (!allowedLevels.includes(level)) {
      throw new Error(`Invalid level: ${level}`);
    }
    const validPackages = [...allowedPackages.both, ...allowedPackages[stack]];
    if (!validPackages.includes(packageName)) {
      throw new Error(`Invalid package '${packageName}' for stack '${stack}'`);
    }

    const timestamp = new Date().toISOString();
    const sessionId = `backend_session_${Date.now()}`;
    
    const enhancedMessage = `[${timestamp}] [Session: ${sessionId.substring(0, 8)}] ${message}`;

    const logData = { 
      stack, 
      level, 
      package: packageName, 
      message: enhancedMessage,
      metadata: {
        timestamp,
        sessionId,
        ...additionalMetadata
      }
    };

    const token = process.env.ACCESS_TOKEN;
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` })
      },
      body: JSON.stringify(logData)
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error("Logging failed:", error.message);
    return { error: error.message };
  }
}

module.exports = { log };
