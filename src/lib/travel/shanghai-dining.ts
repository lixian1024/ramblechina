import { diningNearGooglePlace as diningNearShanghaiStop } from './google-maps';
import { scheduleShanghaiMeals } from './shanghai-quality';
import type { VerifiedTrip } from './concierge-types';

/** Run after the final route repair so meal candidates follow actual meal anchors. */
export async function attachShanghaiDining(plan: VerifiedTrip, zh: boolean) {
  await Promise.all(plan.days.map(async day => {
    if (!/^(?:上海(?:市)?|shanghai)$/i.test(day.city.trim())) return;
    const lookups = new Map<string, ReturnType<typeof diningNearShanghaiStop>>();
    day.dining = await Promise.all((day.meals || []).map(async meal => {
      const anchor = day.stops.find(stop => stop.id === meal.nearStopId)?.place;
      if (anchor && !lookups.has(anchor.id)) lookups.set(anchor.id, diningNearShanghaiStop(anchor).catch(() => []));
      const options = anchor ? await lookups.get(anchor.id)! : [];
      return { kind: meal.kind, nearStopId: meal.nearStopId, status: options.length ? 'map-listed' as const : 'unavailable' as const, options };
    }));
    if (day.dining.some(meal => meal.options.length)) {
      // Replace model-authored dining assertions, including claims the research explicitly lacks.
      // Only provider listings below supply food identities, categories and location evidence.
      const names = day.stops.map(stop => zh ? stop.nameChinese || stop.name : stop.nameEnglish || stop.name).join(' → ');
      day.note = zh ? `按 ${names} 顺序游览，保持在同一片区，避免为用餐跨区绕行。餐饮候选来自当天路线附近的Google地点列表；营业、菜单、预约及饮食适配未验证。`
        : `Follow ${names} within this area, keeping meal breaks close to the route rather than adding a cross-district detour. Dining options below come from nearby Google listings; hours, menus, reservations and dietary suitability are unverified.`;
      scheduleShanghaiMeals(day, zh);
    } else {
      const note = (day.note || '').split(/(?<=[.!?。！？])\s*/).map(sentence => {
        if (/\d{2}:\d{2}|^Meal windows are planning suggestions|^用餐为计划时段/.test(sentence) || !/food|snacks?|dumplings?|buns?|noodles?|dishes?|cuisine|restaurants?|dining|cafes?|bistros?|美食|小吃|小笼|生煎|面条|餐厅|咖啡|本帮/i.test(sentence)) return sentence;
        return `${zh ? '未验证的餐饮想法：' : 'Unverified dining idea: '}${sentence}`;
      }).join(' ');
      day.note = `${zh ? '这份草稿中的餐饮想法未验证，不能视为有来源支持的餐厅事实；请现场确认。'
        : 'Dining ideas in this draft note are unverified, not checked restaurant facts; confirm them locally.'} ${note}`;
    }
    for (const meal of day.dining.filter(meal => meal.status === 'unavailable')) {
      day.checks.push(zh ? `${meal.kind === 'lunch' ? '午餐' : '晚餐'}附近的餐饮候选无法核实；保留用餐时间，请确认附近营业中的餐厅。`
        : `${meal.kind === 'lunch' ? 'Lunch' : 'Dinner'} dining lookup unavailable: the meal break is reserved, but a nearby restaurant still needs confirmation.`);
    }
  }));
}
