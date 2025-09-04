const API_URL = "http://20.244.56.144/evaluation-service/logs";

const allowedStacks = ["backend", "frontend"];
const allowedLevels = ["debug", "info", "warn", "error", "fatal"];
const allowedPackages = {
  backend: ["cache", "controller", "cron_job", "db", "domain", "handler", "repository", "route", "service"],
  frontend: ["api", "component", "hook", "page", "state", "style"],
  both: ["auth", "config", "middleware", "utils"]
};

async function Log(stack, level, packageName, message) {
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

    const logData = { stack, level, package: packageName, message };

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
    console.log("Log sent:", result);
    return result;

  } catch (error) {
    console.error("Logging failed:", error.message);
    return { error: error.message };
  }
}
// const expiresAt = 1756966002;
// const date = new Date(expiresAt * 1000);
// console.log(date.toString());

module.exports = Log;
