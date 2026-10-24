import type {PackErrorCode} from '@/lib/trip-pack/api-types';
const errors:Record<PackErrorCode,[string,string]>={
 sign_in:['Sign in again to open your private files.','请重新登录以查看私人文件。'],unavailable:['Trip Pack is temporarily unavailable. Please try again later.','旅行包暂不可用，请稍后再试。'],forbidden:['This file belongs to another account, or test checkout is not available for your account.','此文件属于其他账户，或你的账户尚未开放测试结账。'],invalid_input:['Check your saved trip and hotel details, then try again.','请检查已保存的行程和酒店信息后重试。'],not_found:['This trip or order could not be found. It may have been deleted. Open My account to check your saved trips.','找不到此行程或订单，可能已被删除。请在我的账户查看已保存行程。'],conflict:['Your saved trip changed. Refresh the preview before preparing another file.','已保存的行程发生变化，请刷新预览后再生成文件。'],unsupported_trip:['Some stops or dates need attention. Edit your saved trip using the details below; no stops will be silently removed.','部分地点或日期需要处理。请按下方提示修改已保存的行程；我们不会悄悄删除地点。'],rate_limit:['Too many requests. Please wait a little before trying again.','请求过于频繁，请稍等片刻再试。'],busy:['A file is already being prepared. Please wait, then refresh. Your previous download is kept.','文件正在生成，请稍候刷新。原文件仍保留。'],file_limit:['This file is too large. Please shorten long notes in your saved trip.','文件过大，请缩短已保存行程中过长的备注。'],invalid_file:['We could not prepare a valid PDF. No new purchase is needed; please contact support if this continues.','未能生成有效的 PDF。无需重新购买；若问题持续，请联系支持。'],terms_required:['Please read and accept the Terms and Refund policy before continuing.','请阅读并同意服务条款及退款政策后继续。'],already_paid:['Payment is already confirmed. Refresh the payment status to open your file.','付款已确认，请刷新付款状态以查看文件。'],expired:['The 90-day update window has ended. Your last available PDF can still be downloaded.','90 天更新期已结束，仍可下载最后一份可用 PDF。'],revoked:['Access has been revoked following a refund or dispute. Contact support if you need help.','退款或争议处理后访问权限已撤销，如需帮助请联系支持。'],payment_pending:['Awaiting payment confirmation. Refresh payment status after checkout; returning here does not confirm payment.','正在等待付款确认。结账后请刷新付款状态；返回此页不代表付款成功。'],checkout_uncertain:['Checkout could not be confirmed. Contact service@ramblechina.com with your order reference before starting another purchase.','无法确认结账状态。再次购买前，请将订单编号发送至 service@ramblechina.com 咨询。'],invalid_signature:['We could not confirm the payment response. Please contact support.','无法确认付款信息，请联系支持。'],invalid_payment:['We could not verify this payment. Please contact support with your order reference.','无法核实此笔付款，请提供订单编号联系支持。']};
export function packError(code:PackErrorCode|undefined,zh:boolean){return code&&errors[code]?errors[code][zh?1:0]:zh?'暂时无法连接，请重试。':'We could not connect. Please retry.';}
/** Preserve the affected day/stop and entered place name without exposing schema paths. */
export function packIssue(issue:string,zh:boolean):string{
 if(!zh)return /^(?:plan\.|messages\.|\d+\.)/.test(issue)?'Some saved trip details are incomplete. Check dates, place names and visit times in the planner, then save again.':issue;
 const location=issue.match(/^Day (\d+)(?:, stop (\d+))?:\s*/);
 const prefix=location?`第 ${location[1]} 天${location[2]?`，第 ${location[2]} 个地点`:''}：`:'';
 const body=location?issue.slice(location[0].length):issue;
 const unsupported=body.match(/unsupported destination "([^"]+)"/);
 if(unsupported)return `${prefix}尚未支持“${unsupported[1]}”。请对照本页支持地点确认名称并保存行程；我们不会自动删除此地点。`;
 const conflict=body.match(/conflicting venue identity for "([^"]+)"/);
 if(conflict)return `${prefix}“${conflict[1]}”的地点名称相互冲突，请在规划器确认准确地点后保存。`;
 const translations:Record<string,string>={
  'only Shanghai is supported.':'目前仅支持上海，请检查行程城市。',
  'dates must be consecutive from the saved start date.':'每天日期必须从已保存的出发日连续排列。',
  'The saved start date is invalid.':'已保存的出发日期无效，请修改并保存。',
  'The saved day count does not match the requested day count.':'已保存行程的天数与你的要求不一致，请在规划器确认。',
  'Enter both a valid hotel name and address, or leave the optional hotel card empty.':'请同时填写有效酒店名称及地址；不需要酒店卡时请将两项留空。',
  'A saved Shanghai itinerary with 1-3 dated days and supported stops is required.':'请先保存一份包含 1–3 个连续日期及支持地点的上海行程。',
  'The requested trip date or day count is invalid.':'要求的旅行日期或天数无效，请在规划器确认后保存。'
 };
 if(translations[body])return prefix+translations[body];
 if(issue.includes('Monday closure'))return '豫园内园与周一闭园规则冲突，目前未核实该日期的例外。请确认日期或地点后保存。';
 if(issue.includes('overlap')||issue.includes('exceed')||issue.includes('beyond the day'))return '部分停留时间重叠或超过一天，请在规划器检查每日时间并保存。';
 const date=issue.match(/requested start date (\d{4}-\d{2}-\d{2})/);if(date)return `已保存出发日与你要求的 ${date[1]} 不一致，请确认后保存。`;
 return prefix+'已保存行程信息尚不完整，请在规划器检查日期、地点名称和停留时间，保存后刷新预览。如问题持续，请联系支持。';
}
