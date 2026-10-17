// Template-built call script (docs/01 screen 3). Deterministic: every number comes from the PlanResult.
import { phoneDisplay } from "./data";
import { NEED_LABELS, ntd } from "./i18n";
import { CITY_EN, placeName } from "./places";
import type { PlanResult } from "./planEngine";
import type { Answers, Provider, Rules } from "./types";

export interface CallScript {
  who: { zh: string; en: string };
  phone?: string;
  say: { zh: string[]; en: string[] };
  docs: { zh: string[]; en: string[] };
}

const AGE_ZH: Record<Answers["age"], string> = { u50: "未滿50歲", "50_54": "50–54歲", "55_64": "55–64歲", "65plus": "65歲以上" };
const AGE_EN: Record<Answers["age"], string> = { u50: "under 50", "50_54": "aged 50–54", "55_64": "aged 55–64", "65plus": "aged 65+" };

export function buildCallScript(a: Answers, plan: PlanResult, rules: Rules, tierA: Provider | undefined): CallScript {
  const center = rules.online_application[a.city];
  const needsZh = a.needs.map((n) => NEED_LABELS[n].zh).join("、");
  const needsEn = a.needs.map((n) => NEED_LABELS[n].en.toLowerCase()).join(", ");
  const where = { zh: placeName(a.city, a.district, "zh"), en: placeName(a.city, a.district, "en") };

  const docs = { zh: ["長輩的身分證與健保卡", "你的聯絡電話，以及其他家人的聯絡方式"], en: ["Your parent's ID card and NHI card", "Your phone number and other family contacts"] };
  if (a.disabilityCert) {
    docs.zh.push("身心障礙證明");
    docs.en.push("Disability certificate");
  }
  if (a.household === "type1" || a.household === "type2") {
    docs.zh.push("低收／中低收入戶證明或津貼核定文件（區公所開立）");
    docs.en.push("Proof of low-income status or allowance (from the district office)");
  }
  if (a.status === "in_hospital" || a.dementia || a.pac) {
    docs.zh.push("診斷證明或出院病歷摘要");
    docs.en.push("Diagnosis certificate or discharge summary");
  }
  if (a.status === "assessed") {
    docs.zh.push("照顧計畫核定通知（有的話）");
    docs.en.push("Your care plan approval letter (if you have it)");
  }

  if (plan.callFirst === "ward_nurse") {
    return {
      who: { zh: "病房護理站（出院準備服務）", en: "The ward nurse station (discharge planning)" },
      say: {
        zh: [
          "您好，我是病人的家屬。",
          "我家長輩預計近期出院，出院後需要有人照顧，想申請「出院準備服務」。",
          "請問醫院可以在出院前完成長照需要等級評估，並幫我們銜接長照服務嗎？",
          needsZh ? `目前最擔心的是：${needsZh}。` : "",
          "請問要找哪一位出院準備護理師？需要準備哪些文件？",
        ].filter(Boolean),
        en: [
          "Hello, I'm a family member of the patient.",
          "My parent will be discharged soon and will need care at home. We'd like the discharge planning service (出院準備服務).",
          "Can the hospital do the long-term care assessment before discharge and connect us to services?",
          needsEn ? `What worries us most: ${needsEn}.` : "",
          "Who is the discharge planning nurse, and what documents should we bring?",
        ].filter(Boolean),
      },
      docs,
    };
  }

  if (plan.callFirst === "tier_a" && plan.level) {
    const zh = [`您好，我是${where.zh}一位長照個案的家屬，長輩已評估為第${plan.level}級。`];
    const en = [`Hello, I'm the family of a long-term care client in ${where.en}, assessed at level ${plan.level}.`];
    const reset = plan.alerts.find((x) => x.id === "carryover_reset");
    if (reset) {
      zh.push(`照顧及專業服務額度將於 ${reset.date} 歸零，想請您幫忙確認目前還有多少未使用的額度，並在期限前安排使用。`);
      en.push(`The care & professional services quota resets on ${reset.date}. Could you check how much is still unused and help us use it before then?`);
    }
    if (plan.respite && plan.respite.used === 0) {
      zh.push(`今年的喘息服務還沒有使用（額度 ${ntd(plan.respite.remaining)}），想預約喘息服務，讓主要照顧者休息。`);
      en.push(`We haven't used any respite this year (${ntd(plan.respite.remaining)} available). We'd like to book respite so the main caregiver can rest.`);
    }
    if (plan.devices?.mode === "group1_only") {
      zh.push(`輔具及居家無障礙還剩 ${ntd(plan.devices.group1.remaining)}，想討論還需要哪些輔具。`);
      en.push(`There's ${ntd(plan.devices.group1.remaining)} left for devices and home modification; we'd like to discuss what else would help.`);
    }
    if (needsZh) {
      zh.push(`目前的照顧需求：${needsZh}。`);
      en.push(`Current care needs: ${needsEn}.`);
    }
    zh.push("如果您不是我們的個管員，請幫我轉給負責的個管員，或告訴我該打給哪裡。");
    en.push("If you're not our case manager, please transfer me or tell me who to call.");
    return {
      who: tierA ? { zh: tierA.name, en: `${tierA.name_en ?? tierA.name} (case-management center)` } : { zh: "你的A單位個管員", en: "Your A-unit case manager" },
      phone: tierA ? phoneDisplay(tierA.phone) : undefined,
      say: { zh, en },
      docs,
    };
  }

  if (plan.callFirst === "hotline_1966") {
    return {
      who: { zh: "1966 長照專線", en: "1966 long-term care hotline" },
      phone: "1966",
      say: {
        zh: ["您好，我家長輩評估為第1級。", "想請問附近有哪些不需評估的社區據點或巷弄長照站？", "如果身體狀況變差，要怎麼申請複評？"],
        en: ["Hello, my parent was assessed at level 1.", "Which community stations near us need no assessment?", "If their condition gets worse, how do we request a reassessment?"],
      },
      docs,
    };
  }

  // city_center: never applied / waiting for assessment
  const waiting = a.status === "waiting";
  return {
    who: { zh: `${a.city}長期照顧管理中心`, en: `${CITY_EN[a.city]} Long-Term Care Management Center` },
    phone: center.center_phone,
    say: {
      zh: [
        waiting ? "您好，我們已經申請長照，正在等待到府評估，想確認進度。" : "您好，我想幫我家長輩申請長照服務。",
        `長輩${AGE_ZH[a.age]}，住在${where.zh}。`,
        needsZh ? `目前需要協助的是：${needsZh}。` : "",
        waiting ? "請問大約什麼時候會有照管專員來家裡評估？" : "請問要怎麼安排照管專員到府評估？大約要等多久？",
        "評估當天需要準備什麼？家人需要在場嗎？",
      ].filter(Boolean),
      en: [
        waiting ? "Hello, we've applied for long-term care and are waiting for the home assessment. I'd like to check the status." : "Hello, I'd like to apply for long-term care services for my parent.",
        `My parent is ${AGE_EN[a.age]} and lives in ${where.en}.`,
        needsEn ? `They need help with: ${needsEn}.` : "",
        waiting ? "When will the care manager come for the home assessment?" : "How do we book the care manager's home assessment, and how long is the wait?",
        "What should we prepare for the assessment day? Should family be there?",
      ].filter(Boolean),
    },
    docs,
  };
}
