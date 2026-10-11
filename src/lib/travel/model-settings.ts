// Shared server model configuration; never expose credentials in client responses.
export function modelSettings() {
  const customKey = process.env.TRIP_LLM_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const dashscopeKey = process.env.DASHSCOPE_API_KEY?.trim();
  const dashscope = !customKey && !openaiKey && Boolean(dashscopeKey);
  const key = customKey || openaiKey || dashscopeKey;
  const base = process.env.TRIP_LLM_BASE_URL?.trim() || (dashscope
    ? process.env.DASHSCOPE_BASE_URL?.trim() || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    : 'https://api.openai.com/v1');
  const model = process.env.TRIP_LLM_MODEL?.trim() || (dashscope
    ? process.env.QWEN_MODEL?.trim() || 'qwen-plus'
    : 'gpt-4.1-mini');
  if (!key) throw new Error('A language model key is missing. Add TRIP_LLM_API_KEY, OPENAI_API_KEY or DASHSCOPE_API_KEY to .env.local.');
  let url: URL;
  try { url = new URL(base); }
  catch { throw new Error('The model service URL is invalid.'); }
  if (url.protocol !== 'https:') throw new Error('The model service URL must use HTTPS.');
  if (key.startsWith('sk-sp-') || url.hostname.startsWith('token-plan.') || url.hostname === 'coding.dashscope.aliyuncs.com') {
    throw new Error('This Token/Coding Plan credential is for interactive coding tools, not a travel app backend. Configure a standard Model Studio API key and its matching pay-as-you-go base URL.');
  }
  return { key, base: base.replace(/\/$/, ''), model, qwen: /^qwen/i.test(model) };
}

