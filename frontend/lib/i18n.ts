"use client";

export type Locale = "ru" | "en" | "zh" | "es" | "de" | "fr";

export const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "en", label: "English", native: "English" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "fr", label: "French", native: "Français" },
];

// Russian-first UI. Other locales translated via Google Translate API.
export const UI_EN: Record<string, string> = {
  // Navigation
  "nav.how": "Как работает",
  "nav.patterns": "Паттерны",
  "nav.history": "История",
  "nav.elderCare": "Дом престарелых",
  "nav.commercial": "Аренда",
  "nav.medicalBill": "Мед. счёт",
  "nav.hub": "Все проверки",

  // Hero (hub / home)
  "hero.meta.vol": "2026",
  "hero.meta.label": "ПРОВЕРКА ДОКУМЕНТОВ",
  "hero.meta.for": "ДЛЯ ТЕХ, КТО НЕ МОЖЕТ ПОЗВОЛИТЬ ЮРИСТА",
  "hero.stats.label": "ПАТТЕРНЫ",
  "hero.stats.body": "ПОДВОДНЫХ КАМНЕЙ В БАЗЕ",
  "hero.privacy.label": "ПРИВАТНОСТЬ",
  "hero.privacy.body":
    "Без регистрации. PDF анализируется в памяти и удаляется. Результаты только в вашем браузере.",

  "hero.heading.line1": "ПРОВЕРЬ",
  "hero.heading.dont": "НЕ ПОДПИСЫВАЙ",
  "hero.heading.line2": "ДОКУМЕНТ.",
  "hero.heading.line3": "ВСЛЕПУЮ.",
  "hero.lead":
    "AI читает мелкий шрифт за вас. Загрузите любой договор — аренда, кредит, трудовой, страховка, медицинский счёт. Найдём подводные камни за",
  "hero.lead.time": "≈30 СЕК",
  "hero.whatWeFind": "ЧТО НАЙДЁМ",
  "hero.find.guarantees": "Личные поручительства без лимита",
  "hero.find.holdover": "Штрафы за задержку 200%",
  "hero.find.cam": "Скрытые эксплуатационные расходы",
  "hero.find.acceleration": "Автоматическое повышение цен",
  "hero.find.autoRenewal": "Ловушки автопродления",

  // Document type selector
  "doctype.label": "ШАГ 01 / ТИП ДОКУМЕНТА (необязательно — AI разберётся сам)",

  // Upload section
  "upload.step": "ШАГ 02 / ЗАГРУЗКА",
  "upload.drop": "Перетащите PDF сюда.",
  "upload.limits": "До 10МБ · анализ в памяти · ничего не сохраняется на сервере.",
  "upload.select": "ВЫБРАТЬ ФАЙЛ →",
  "upload.uploading": "Загружаем…",
  "upload.analyzing": "Анализируем…",
  "upload.extracting": "Читаем ваш PDF…",
  "upload.stage": "ЭТАП",
  "upload.timeHint": "ОБЫЧНО 20-30 СЕКУНД",
  "upload.whatToExpect": "ЧТО ПРОИЗОЙДЁТ",
  "upload.step1": "PDF разбирается в памяти (ничего не сохраняется)",
  "upload.step2": "AI проверяет 146 паттернов подводных камней",
  "upload.step3": "Вы получаете оценку риска + контр-формулировки",

  "demo.try": "ПОПРОБОВАТЬ ДЕМО (БЕЗ ЗАГРУЗКИ) →",

  // How it works
  "how.section": "§ 02 / КАК РАБОТАЕТ",
  "how.title": "Три шага. Ноль хранения данных. Один чёткий вердикт.",
  "how.stage": "ЭТАП",
  "how.extract": "Извлечение",
  "how.extractBody":
    "PyMuPDF разбирает каждую страницу. Файл живёт в памяти секунды, затем удаляется.",
  "how.forensics": "Анализ",
  "how.forensicsBody":
    "Бесплатные LLM сверяют текст со 126 паттернами подводных камней.",
  "how.verdict": "Вердикт",
  "how.verdictBody":
    "Оценка риска, объяснение простым языком, контр-формулировки. Сохраняется только в браузере.",

  // Severity scale
  "scale.section": "§ 03 / ШКАЛА ОПАСНОСТИ",
  "scale.title": "Красный — значит красный.",
  "scale.info": "ИНФО",
  "scale.info.desc": "Информационно — стандартный пункт, действий не требуется.",
  "scale.caution": "ВНИМАНИЕ",
  "scale.caution.desc": "Стоит обсудить — мелкий нюанс, обычно легко исправить.",
  "scale.warning": "ПРЕДУПРЕЖДЕНИЕ",
  "scale.warning.desc": "Реальный риск — обсудите до подписания.",
  "scale.critical": "КРИТИЧНО",
  "scale.critical.desc": "Красный флаг — не подписывайте без изменения.",
  "scale.dealBreaker": "НЕ ПОДПИСЫВАТЬ",
  "scale.dealBreaker.desc": "Не подписывайте как есть. Уходите если не уступят.",

  // Analysis view
  "analysis.underReview": "НА ПРОВЕРКЕ",
  "analysis.pages": "СТРАНИЦ",
  "analysis.clausesFlagged": "ПУНКТОВ ОБНАРУЖЕНО",
  "analysis.summary": "РЕЗЮМЕ",
  "analysis.translating": "ПЕРЕВОДИМ...",
  "analysis.top3": "ТОП-3 ПРОБЛЕМЫ",
  "analysis.flagged": "ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ",
  "analysis.noClauses": "Подводных камней не обнаружено.",
  "analysis.riskScore": "ОЦЕНКА РИСКА",
  "analysis.breakdown": "РАЗБИВКА ПО ОПАСНОСТИ",
  "analysis.another": "← ПРОВЕРИТЬ ДРУГОЙ ДОКУМЕНТ",
  "analysis.anotherBill": "← ПРОВЕРИТЬ ДРУГОЙ СЧЁТ",
  "analysis.showPreview": "⧉ ПОКАЗАТЬ PDF",
  "analysis.hidePreview": "✕ СКРЫТЬ PDF",
  "analysis.retry": "⟳ ЗАНОВО",
  "analysis.docText": "ТЕКСТ ДОКУМЕНТА (ПЕРЕВЕДЁН)",
  "analysis.page": "СТРАНИЦА",
  "analysis.disputeLetter": "⚡ СОСТАВИТЬ ПРЕТЕНЗИЮ",

  // Recommendation labels
  "rec.safe": "МОЖНО ПОДПИСЫВАТЬ",
  "rec.safeBody": "Существенных рисков не найдено. Проверьте выделенные заметки.",
  "rec.negotiate": "ТРЕБУЙТЕ ИЗМЕНЕНИЙ",
  "rec.negotiateBody":
    "Найдены существенные риски. Используйте контр-формулировки до подписания.",
  "rec.walkAway": "НЕ ПОДПИСЫВАТЬ",
  "rec.walkAwayBody": "Обнаружены критические проблемы. Не подписывайте без изменений.",
  "rec.fair": "СЧЁТ В ПОРЯДКЕ",
  "rec.fairBody": "Серьёзных ошибок не найдено. Проверьте заметки.",
  "rec.review": "ТРЕБУЕТ ПРОВЕРКИ",
  "rec.reviewBody": "Возможные ошибки. Запросите детализированный счёт до оплаты.",
  "rec.dispute": "ОСПОРЬТЕ СЧЁТ",
  "rec.disputeBody": "Найдены существенные переплаты. Не платите — оспорьте в клинике.",

  // Clause card
  "clause.plainEnglish": "ПРОСТЫМ ЯЗЫКОМ",
  "clause.whyRisky": "ПОЧЕМУ ОПАСНО",
  "clause.counter": "КОНТР-ФОРМУЛИРОВКА",
  "clause.benchmark": "РЫНОЧНЫЙ СТАНДАРТ",

  // Negotiation panel
  "negotiation.draft": "⚡ СОСТАВИТЬ ПРЕТЕНЗИЮ / ПИСЬМО",
  "negotiation.clauses": "пунктов",
  "negotiation.professional": "деловой",
  "negotiation.firm": "жёсткий",
  "negotiation.friendly": "мягкий",
  "negotiation.generating": "ГЕНЕРИРУЕМ…",
  "negotiation.regenerate": "ЗАНОВО",
  "negotiation.generate": "СОСТАВИТЬ",
  "negotiation.subject": "ТЕМА",
  "negotiation.body": "ТЕКСТ",
  "negotiation.copy": "⧉ КОПИРОВАТЬ",

  // Share + Export
  "share.link": "⧉ ПОДЕЛИТЬСЯ",
  "share.copied": "✓ ССЫЛКА СКОПИРОВАНА",
  "export.pdf": "⬇ СКАЧАТЬ PDF-ОТЧЁТ",
  "export.generating": "ГЕНЕРИРУЕМ…",

  // History page
  "history.section": "§ ЛОКАЛЬНАЯ ИСТОРИЯ",
  "history.title": "Ваш архив.",
  "history.empty.label": "ПУСТО",
  "history.empty.body": "Анализов пока нет. Загрузите документ для начала.",
  "history.empty.cta": "ЗАГРУЗИТЬ ДОКУМЕНТ →",
  "history.clearAll": "ОЧИСТИТЬ ВСЁ",
  "history.open": "ОТКРЫТЬ",
  "history.newAnalysis": "← НОВЫЙ АНАЛИЗ",

  // Sync panel
  "sync.active": "✓ ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ АКТИВНА",
  "sync.title": "─── ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ (E2E ШИФРОВАНИЕ) ───",
  "sync.intro":
    "Привяжите email для синхронизации между устройствами. Данные шифруются в браузере — на сервере только шифротекст.",
  "sync.linkEmail": "⧉ ПРИВЯЗАТЬ EMAIL",
  "sync.emailPlaceholder": "you@example.com",
  "sync.sending": "ОТПРАВЛЯЕМ...",
  "sync.sendLink": "ОТПРАВИТЬ ССЫЛКУ →",
  "sync.devMode": "DEV MODE · ТОКЕН",
  "sync.useToken": "ИСПОЛЬЗОВАТЬ ТОКЕН →",
  "sync.tokenPlaceholder": "вставьте токен...",
  "sync.verify": "ПРОВЕРИТЬ ТОКЕН",
  "sync.now": "⟳ СИНХРОНИЗИРОВАТЬ",
  "sync.signOut": "ВЫЙТИ",
  "sync.emailSent": "Ссылка отправлена — проверьте почту",

  // Footer
  "footer.tagline": "ПРОВЕРКА ДОКУМЕНТОВ · 2026 · БЕЗ ХРАНЕНИЯ",
  "footer.createdOn": "СОЗДАНО НА",
  "footer.agentspore": "AGENTSPORE ↗",
  "footer.disclaimer":
    "ОБРАЗОВАТЕЛЬНЫЙ ИНСТРУМЕНТ · НЕ ЮРИДИЧЕСКАЯ И НЕ МЕДИЦИНСКАЯ КОНСУЛЬТАЦИЯ · ДЛЯ ВАЖНЫХ РЕШЕНИЙ ОБРАТИТЕСЬ К СПЕЦИАЛИСТУ",

  // Hub page cards
  "hub.card.any.label": "УНИВЕРСАЛЬНАЯ ПРОВЕРКА",
  "hub.card.any.title": "Любой документ",
  "hub.card.any.hint": "Загрузите любой договор — AI определит тип и найдёт проблемы.",

  // 404
  "notFound.header": "ОШИБКА 404 / НЕТ В ХРАНИЛИЩЕ",
  "notFound.title": "Не найдено.",
  "notFound.body":
    "Этот анализ не сохранён в вашем браузере. Результаты хранятся локально — если вы очистили хранилище или открыли другое устройство, данные пропали.",
  "notFound.cta": "← ЗАГРУЗИТЬ НОВЫЙ ДОКУМЕНТ",
  "loading": "ЗАГРУЗКА…",
  "shared.readOnly": "ОБЩИЙ ДОСТУП · ТОЛЬКО ЧТЕНИЕ",

  // Industry labels (for display in analysis)
  "industry.restaurant": "Аренда",
  "industry.restaurant.hint": "Помещение",
  "industry.retail": "Розница",
  "industry.retail.hint": "Магазин, шоурум",
  "industry.office": "Офис",
  "industry.office.hint": "Коворкинг, агентство",
  "industry.medical": "Медицина",
  "industry.medical.hint": "Клиника",
  "industry.salon": "Салон",
  "industry.salon.hint": "Красота",
  "industry.fitness": "Фитнес",
  "industry.fitness.hint": "Зал, студия",
  "industry.warehouse": "Склад",
  "industry.warehouse.hint": "Логистика",
  "industry.elder_care": "Дом престарелых",
  "industry.elder_care.hint": "Уход за пожилыми",
  "industry.medical_bill": "Мед. счёт",
  "industry.medical_bill.hint": "Больница, клиника",
  "industry.employment": "Трудовой",
  "industry.employment.hint": "ТК РФ, NDA",
  "industry.loan": "Кредит",
  "industry.loan.hint": "Банк, МФО",
  "industry.purchase": "Купля-продажа",
  "industry.purchase.hint": "Недвижимость, авто",
  "industry.service": "Услуги",
  "industry.service.hint": "SaaS, подряд",
  "industry.insurance": "Страховка",
  "industry.insurance.hint": "ОСАГО, КАСКО, ДМС",
  "industry.auto_purchase": "Покупка авто",
  "industry.auto_purchase.hint": "Дилер, допы, кредит",
  "industry.hoa": "ТСЖ / HOA",
  "industry.hoa.hint": "Устав, взносы, штрафы",
  "industry.other": "Другой",
  "industry.other.hint": "Любой документ",
  "industry.label": "ШАГ 01 / ТИП ДОКУМЕНТА (необязательно)",
};

export function uiStringsList(): { keys: string[]; values: string[] } {
  const keys = Object.keys(UI_EN);
  return { keys, values: keys.map((k) => UI_EN[k]) };
}
