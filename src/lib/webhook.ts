export const localDigits = (contactInfo: string): string => {
  return contactInfo.replace(/\D/g, "");
};

// Based on the user instruction:
// buildWebhookUrl(rawUrl, contact) => `${rawUrl.split("?")[0]}?${localDigits(contact.phone)}`
// We adapt it to use our contactInfo string.
export const buildWebhookUrl = (rawUrl: string, contactInfo: string) => {
  if (!rawUrl) return "";
  const base = rawUrl.split("?")[0];
  const digits = localDigits(contactInfo);
  return `${base}?${digits}`;
};

export const triggerWebhook = async (url: string) => {
  if (!url) return;
  try {
    await fetch(url, {
      mode: "no-cors",
      method: "POST",
      keepalive: true,
    });
  } catch (err) {
    console.error("Webhook trigger failed:", err);
    throw err;
  }
};
