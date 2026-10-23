import {guestTrialScope,assertGuestResultScope} from '@/lib/growth/trial-scope';
import { answerTravelQuestion, classifyTripIntent, outOfScopeReply, planTrip, routeConversation, validateMessages } from '@/lib/travel/concierge';
import { TripRequirementsError } from '@/lib/travel/trip-requirements';
import type { ConciergeEvent } from '@/lib/travel/concierge-types';
import {admitGrowth,finishGrowth,GrowthDenied} from '@/lib/growth/trial';
import {storedTrip,storedMessages} from '@/lib/travel/trip-storage';
import {withModelBudget,ModelBudgetError} from '@/lib/growth/model-budget';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

  let admission;
  try{admission=await admitGrowth(request,payload.currentPlan?'edit':'generate',messages);}
  catch(error){return Response.json({error:error instanceof GrowthDenied?error.message:'Planning services are unavailable. Your itinerary is retained.'},{status:error instanceof GrowthDenied?error.status:503,headers:{'Cache-Control':'private, no-store'}});}
  if(admission.guest){messages=admission.inputMessages!;payload.currentPlan=admission.plan;}
  const encoder = new TextEncoder();
  let cancelled=false,finished=false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      return withModelBudget(admission.requestId,async()=>{
      const emit = (event: ConciergeEvent) => {if(!cancelled&&!request.signal.aborted)controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));};
      try {
        const locale = payload.locale === 'zh' || payload.locale === 'ko' ? payload.locale : 'en';
        const currentPlan = payload.currentPlan && typeof payload.currentPlan === 'object' ? payload.currentPlan as { days?: unknown } : null;
        const intent = admission.guest?'route-concierge':await classifyTripIntent(messages, Array.isArray(currentPlan?.days) && currentPlan.days.length > 0);
        emit({ type: 'intent', intent });
        if (intent === 'route-concierge') {
          const scope=admission.guest?guestTrialScope(messages,payload.currentPlan):undefined;
          const result = await planTrip(routeConversation(messages), payload.currentPlan, phase => emit({ type: 'phase', phase }), locale,scope);
          if(scope)assertGuestResultScope(result.plan,scope);
          await finishGrowth(admission.requestId,admission.guest?storedTrip(result.plan):null,admission.guest?storedMessages([...messages,{role:'assistant',text:result.reply}]):null);finished=true;
          emit({ type: 'result', ...result });
        } else if (intent === 'travel-assistant') {
          const result = await answerTravelQuestion(messages, locale);
          emit({ type: 'answer', ...result });
        } else {
          emit({ type: 'answer', reply: outOfScopeReply(locale) });
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : '';
        const message = error instanceof ModelBudgetError?error.message:zh
          ? error instanceof TripRequirementsError
            ? '行程未满足你要求的天数或日期，已有行程未改变。请重试；目前支持 1–10 天，请确认出发日期有效。'
            : /key|credential|service URL|base|HTTPS/i.test(detail)
            ? '旅行助手服务暂未就绪，请检查服务配置后重试。'
            : /itinerary model took too long/i.test(detail)
              ? '行程模型响应超时，已有行程未改变，请稍后重试。'
            : /connection to the itinerary model/i.test(detail)
              ? '行程模型连接中断，已有行程未改变，请稍后重试。'
            : /usable sources|web research|travel research|travel sources/i.test(detail)
              ? '暂时无法获取可用的旅行资料，请稍后重试。'
              : /usable itinerary|valid itinerary|empty plan/i.test(detail)
                ? '暂时无法生成完整行程，请补充目的地与旅行天数后重试。'
                : '暂时无法完成请求，请稍后重试。'
          : detail || 'Trip planning failed. Please retry.';
        emit({ type: 'error', message });
      } finally { if(!finished)await finishGrowth(admission.requestId).catch(()=>{});if(!cancelled)controller.close(); }
      });
    },
    cancel(){cancelled=true;},
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
