// Turns an API error (with the backend's optional errors[] list) into one readable message.
export const explain = (e: any, max = 6): string => {
  const list: string[] = Array.isArray(e?.errors) ? e.errors.filter(Boolean) : [];
  if (list.length > 1) return `${e.message}\n\n- ${list.slice(0, max).join("\n- ")}${list.length > max ? `\n...and ${list.length - max} more` : ""}`;
  return e?.message || "Something went wrong";
};
