const API_URL = "http://20.244.56.144/evaluation-service/logs";

const allowedStacks = ["backend", "frontend"];
const allowedLevels = ["debug", "info", "warn", "error", "fatal"];
const allowedPackages = {
  backend: ["cache", "controller", "cron_job", "db", "domain", "handler", "repository", "route", "service"],
  frontend: ["api", "component", "hook", "page", "state", "style"],
  both: ["auth", "config", "middleware", "utils"]
};

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('url_shortener_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('url_shortener_session_id', sessionId);
  }
  return sessionId;
};

async function Log(stack, level, packageName, message, additionalMetadata = {}) {
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
    
    const sessionId = getSessionId();
    const userAgent = navigator.userAgent;
    const timestamp = new Date().toISOString();
    
    const enhancedMessage = `[${timestamp}] [Session: ${sessionId.substring(0, 8)}] ${message}`;
    
    const logData = { 
      stack, 
      level, 
      package: packageName, 
      message: enhancedMessage,
      metadata: {
        sessionId,
        userAgent,
        timestamp,
        url: window.location.href,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
        language: navigator.language,
        ...additionalMetadata
      }
    };

    const token = process.env.REACT_APP_ACCESS_TOKEN;
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
    return { error: error.message };
  }
}

export { Log };
export default Log;

export const log = Log;
