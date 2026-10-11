/** Allow only our English routes; reject protocol-relative URLs and callback loops. */
export function safeDestination(value: string | null | undefined, fallback = '/en/account') {
  if (!value || !/^\/en\/(account|plan|local-guide)(?:[/?#]|$)/.test(value) || /[\\\r\n]/.test(value)) return fallback;
  return value;
}
