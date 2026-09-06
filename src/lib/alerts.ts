/**
 * Sends a critical alert when something breaks in production.
 * You can configure this to send to a Slack webhook, Discord webhook, or any other monitoring service.
 */
export async function sendCriticalAlert(error: Error | string, context?: Record<string, any>) {
  if (process.env.NODE_ENV !== 'production') {
    // We don't send webhook alerts in development, just log them
    console.error("CRITICAL ALERT (Dev Mode):", error, context);
    return;
  }

  const webhookUrl = process.env.CRITICAL_ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("Missing CRITICAL_ALERT_WEBHOOK_URL. Cannot send alert.");
    console.error("Error was:", error);
    return;
  }

  try {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? '' : error.stack;
    
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🚨 **CRITICAL PRODUCTION ERROR** 🚨\n\n**Error:** ${message}\n**Context:** ${JSON.stringify(context || {})}\n\n\`\`\`\n${stack}\n\`\`\``
      })
    });
  } catch (err) {
    console.error("Failed to send critical alert:", err);
  }
}
