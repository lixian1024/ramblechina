import { answerTravelQuestion, classifyTripIntent, outOfScopeReply, planTrip, routeConversation, validateMessages } from '@/lib/travel/concierge';
import type { ConciergeEvent } from '@/lib/travel/concierge-types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const size = Number(request.headers.get('content-length') || 0);
  if (size > 160_000) return Response.json({ error: 'Trip request is too large.' }, { status: 413 });
  let payload: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 160_000) return Response.json({ error: 'Trip request is too large.' }, { status: 413 });
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch { return Response.json({ error: 'Invalid trip request.' }, { status: 400 }); }
  const zh = payload.locale === 'zh';
  let messages;
  try { messages = validateMessages(payload.messages); }
  catch (error) { return Response.json({ error: zh ? '请填写有效的旅行问题或行程需求。' : error instanceof Error ? error.message : 'Invalid trip request.' }, { status: 400 }); }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ConciergeEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const locale = payload.locale === 'zh' || payload.locale === 'ko' ? payload.locale : 'en';
        const currentPlan = payload.currentPlan && typeof payload.currentPlan === 'object' ? payload.currentPlan as { days?: unknown } : null;
        const intent = await classifyTripIntent(messages, Array.isArray(currentPlan?.days) && currentPlan.days.length > 0);
        emit({ type: 'intent', intent });
        if (intent === 'route-concierge') {
          const result = await planTrip(routeConversation(messages), payload.currentPlan, phase => emit({ type: 'phase', phase }), locale);
          emit({ type: 'result', ...result });
        } else if (intent === 'travel-assistant') {
          const result = await answerTravelQuestion(messages, locale);
          emit({ type: 'answer', ...result });
        } else {
          emit({ type: 'answer', reply: outOfScopeReply(locale) });
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : '';
        const message = zh
          ? /key|credential|service URL|base|HTTPS/i.test(detail)
            ? '旅行助手服务暂未就绪，请检查服务配置后重试。'
            : /usable sources|web research|travel research|travel sources/i.test(detail)
              ? '暂时无法获取可用的旅行资料，请稍后重试。'
              : /usable itinerary|valid itinerary|empty plan/i.test(detail)
                ? '暂时无法生成完整行程，请补充目的地与旅行天数后重试。'
                : '暂时无法完成请求，请稍后重试。'
          : detail || 'Trip planning failed. Please retry.';
        emit({ type: 'error', message });
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
