# دراسة معمارية قبل المرحلة الخامعة

## 1. تقسيم OpportunityForm

تم تقسيم النموذج (1055 سطر) إلى 9 ملفات مستقلة:

| الملف | المسؤولية | الأسطر |
|------|----------|--------|
| `opportunity-form/shared.tsx` | الأنواع المشتركة، خرائط التسميات، مكونات الحقول العامة | ~170 |
| `opportunity-form/useOpportunityFormState.ts` | إدارة الحالة، التحميل، التحقق | ~260 |
| `opportunity-form/OpportunityHeaderSection.tsx` | العنوان، الوصف، المدينة | ~60 |
| `opportunity-form/OpportunityItemsSection.tsx` | قائمة العناصر، رفع الصور، النباتات/الأصناف | ~290 |
| `opportunity-form/OpportunityTimingSection.tsx` | توقيت الاحتياج، الدفعات، النطاق | ~200 |
| `opportunity-form/OpportunityImagesSection.tsx` | الصور العامة للفرصة | ~100 |
| `opportunity-form/OpportunityPublisherSection.tsx` | اختيار الجهة الناشرة | ~70 |
| `opportunity-form/OpportunityReviewSection.tsx` | أزرار الحفظ والإرسال | ~60 |
| `OpportunityForm.tsx` (المنسق) | تجميع الأقسام + منطق الإرسال | ~120 |

### مبدأ المصدر الوحيد للحالة

`useOpportunityFormState` هو **المصدر الوحيد** لحالة النموذج (Single Source of Truth). الأقسام الستة مكونات Presentational — تستقبل الحالة كـ prop واحد (`state`) وتُطلق تحديثات عبر دواله (`setTitle`, `updateItem`, `setTiming`, ...). لا يُنشئ أي قسم نسخة محلية من الحالة، ولا يملك `useState` مستقلاً لأي حقل. هذا يضمن:

- **لا تعارض**: لا يمكن لقسمين أن يعدلا نفس الحقل بشكل متعارض.
- **تحقق مركزي**: `validate()` يرى أحدث قيمة لكل حقل لأن الحالة كلها في الـ hook.
- **إعادة استخدام**: أي قسم يمكن استخدامه مستقلاً بتمرير `state` إليه.

**النتيجة**: TypeScript و Build نجحا. لا تغيير في السلوك.

---

## 2. دراسة: نقل حقول attributes إلى أعمدة مستقلة

### الحقول المدروسة

| الحقل | الاستخدام الحالي | الاستخدام المتوقع عبر القطاعات |
|-------|-----------------|-------------------------------|
| `min_price` | attributes في demand | مرتفع — مطلوب للفلاتر والمطابقة والتحليلات |
| `max_price` | attributes في demand | مرتفع — مرتبط بـ min_price، نفس الاستخدام |
| `pricing_type` | attributes في demand/offer | مرتفع — فلترة أساسية (ثابت/نطاق/مزاد) |
| `pricing_unit` | attributes | مرتفع — وحدة السعر (للوحدة/للمشروع)، مطلوب للمطابقة |
| `min_height` | attributes في demand | مرتفع — أي قطاع يتعامل مع نباتات يحتاج نطاق ارتفاع |
| `max_height` | attributes في demand | مرتفع — مرتبط بـ min_height دائمًا |
| `height_unit` | attributes | مرتفع — وحدة قياس الارتفاع (سم/م)، مطلوب للفلترة الموحدة |
| `required_supply_date` | attributes في demand | مرتفع — موعد التوريد المطلوب للاحتياج |
| `available_from` | attributes في offer | مرتفع — تاريخ توفر العرض |
| `notes` | attributes | متغير — حسب التكرار والعمومية |

### التحليل

#### 2.1 السعر — نقل كامل لأعمدة مستقلة

السعر مطلوب لثلاثة أنظمة: الفلاتر (تصفية حسب نطاق السعر)، المطابقة (مطابقة احتياج بعرض ضمن النطاق)، والتحليلات (متوسط الأسعار، توزيعها). هذه العمليات تحتاج فهرسة واستعلام SQL مباشر — JSON لا يصلح.

| العمود الجديد | النوع | الوصف |
|---------------|------|------|
| `minimum_price` | numeric | الحد الأدنى للسعر (NULL إذا pricing_type = fixed) |
| `maximum_price` | numeric | الحد الأعلى للسعر (NULL إذا pricing_type = fixed) |
| `pricing_type` | text | `fixed` / `range_unit` / `range_project` / `negotiable` / `auction` / `quote` / `budget` |
| `pricing_unit` | text | وحدة التسعير: `per_unit` / `per_project` / `per_kg` / ... |

#### 2.2 الارتفاع — تصميم بثلاثة أعمدة

| العمود الجديد | النوع | الوصف |
|---------------|------|------|
| `minimum_height` | numeric | الحد الأدنى للارتفاع |
| `maximum_height` | numeric | الحد الأعلى للارتفاع |
| `height_unit` | text | وحدة القياس: `cm` / `m` (افتراضي: `cm`) |

`height_unit` ضروري لأن قطاعات مختلفة قد تستخدم وحدات مختلفة (مشتل: سم، غابات: م). الفلترة الموحدة تتطلب معرفة الوحدة كعمود مستقل لتحويل القيم عند الاستعلام.

#### 2.3 التواريخ — فصل بين الاحتياج والعرض

| العمود الجديد | النوع | الوصف |
|---------------|------|------|
| `required_supply_date` | date | موعد التوريد المطلوب — **فرصة الاحتياج فقط** |
| `available_from` | date | تاريخ توفر العنصر — **فرصة العرض فقط** |

الفصل ضروري لأن:
- `required_supply_date` تستخدم في مطابقة العرض مع الاحتياج (هل العرض متوفر قبل الموعد المطلوب؟)
- `available_from` تستخدم في فلترة "عروض متوفرة الآن" أو "متوفرة من تاريخ كذا"
- دمجهما في حقل واحد (`supply_date`) يفقد الدلالة ويصعب الفلترة

#### 2.4 الملاحظات (notes)

| السيناريو | القرار | السبب |
|-----------|--------|------|
| `notes` حقل عام متكرر عبر معظم القطاعات | **عمود مستقل `notes text`** | يُقرأ في كل بطاقة وتفاصيل، استعلام مباشر أسرع من JSON |
| `notes` حقل خاص ونادر (قطاع محدد) | **إبقاء في attributes** | عمود مستقل سيكون NULL لمعظم الصفوف، JSON أنسب |

**التوصية الحالية**: `notes` على مستوى العنصر (item) حقل عام متكرر → **عمود مستقل**. أما ملاحظات مستوى الفرصة فتبقى في `description`.

### Migration المقترح (للتنفيذ لاحقًا — لا يُنفذ الآن)

```sql
-- أعمدة السعر
ALTER TABLE opportunity_items
  ADD COLUMN minimum_price numeric,
  ADD COLUMN maximum_price numeric,
  ADD COLUMN pricing_type text,
  ADD COLUMN pricing_unit text;

-- أعمدة الارتفاع
ALTER TABLE opportunity_items
  ADD COLUMN minimum_height numeric,
  ADD COLUMN maximum_height numeric,
  ADD COLUMN height_unit text DEFAULT 'cm';

-- أعمدة التواريخ (فصل demand/offer)
ALTER TABLE opportunity_items
  ADD COLUMN required_supply_date date,
  ADD COLUMN available_from date;

-- عمود الملاحظات العام
ALTER TABLE opportunity_items
  ADD COLUMN notes text;

-- ترحيل البيانات الموجودة من attributes
UPDATE opportunity_items
SET
  minimum_price   = NULLIF(attributes->>'min_price', '')::numeric,
  maximum_price   = NULLIF(attributes->>'max_price', '')::numeric,
  pricing_type    = NULLIF(attributes->>'pricing_type', ''),
  pricing_unit    = NULLIF(attributes->>'pricing_unit', ''),
  minimum_height  = NULLIF(attributes->>'min_height', '')::numeric,
  maximum_height  = NULLIF(attributes->>'max_height', '')::numeric,
  height_unit     = COALESCE(NULLIF(attributes->>'height_unit', ''), 'cm'),
  required_supply_date = NULLIF(attributes->>'required_supply_date', '')::date,
  available_from  = NULLIF(attributes->>'available_from', '')::date,
  notes           = NULLIF(attributes->>'notes', '')
WHERE attributes ?| ARRAY[
  'min_price','max_price','pricing_type','pricing_unit',
  'min_height','max_height','height_unit',
  'required_supply_date','available_from','notes'
];

-- ربط تعريفات الحقول بالأعمدة الجديدة
UPDATE opportunity_item_field_definitions
SET column_name = CASE field_key
  WHEN 'min_price' THEN 'minimum_price'
  WHEN 'max_price' THEN 'maximum_price'
  WHEN 'pricing_type' THEN 'pricing_type'
  WHEN 'pricing_unit' THEN 'pricing_unit'
  WHEN 'min_height' THEN 'minimum_height'
  WHEN 'max_height' THEN 'maximum_height'
  WHEN 'height_unit' THEN 'height_unit'
  WHEN 'required_supply_date' THEN 'required_supply_date'
  WHEN 'available_from' THEN 'available_from'
  WHEN 'notes' THEN 'notes'
END
WHERE field_key IN (
  'min_price','max_price','pricing_type','pricing_unit',
  'min_height','max_height','height_unit',
  'required_supply_date','available_from','notes'
);

-- فهارس للفلاتر الشائعة
CREATE INDEX idx_opp_items_price_range
  ON opportunity_items(minimum_price, maximum_price)
  WHERE minimum_price IS NOT NULL;

CREATE INDEX idx_opp_items_pricing_type
  ON opportunity_items(pricing_type)
  WHERE pricing_type IS NOT NULL;

CREATE INDEX idx_opp_items_height_range
  ON opportunity_items(minimum_height, maximum_height)
  WHERE minimum_height IS NOT NULL;

CREATE INDEX idx_opp_items_supply_date
  ON opportunity_items(required_supply_date)
  WHERE required_supply_date IS NOT NULL;

CREATE INDEX idx_opp_items_available_from
  ON opportunity_items(available_from)
  WHERE available_from IS NOT NULL;
```

### التوصية النهائية للحقول

| الحقل | القرار | السبب |
|-------|--------|------|
| `minimum_price` | **عمود مستقل** | فلترة + مطابقة + تحليلات |
| `maximum_price` | **عمود مستقل** | فلترة + مطابقة + تحليلات |
| `pricing_type` | **عمود مستقل** | فلترة أساسية، تعداد محدود |
| `pricing_unit` | **عمود مستقل** | مطابقة، وحدة التسعير |
| `minimum_height` | **عمود مستقل** | فلترة عبر القطاعات |
| `maximum_height` | **عمود مستقل** | فلترة عبر القطاعات |
| `height_unit` | **عمود مستقل** | فلترة موحدة (تحويل الوحدات) |
| `required_supply_date` (demand) | **عمود مستقل** | مطابقة العرض مع الاحتياج |
| `available_from` (offer) | **عمود مستقل** | فلترة "متوفر الآن" |
| `notes` (عام متكرر) | **عمود مستقل** | قراءة متكررة في البطاقات |
| `notes` (خاص/nادر) | **إبقاء في attributes** | عمود NULL لمعظم الصفوف |

---

## 3. دراسة: فصل التوريد على دفعات

### الوضع الحالي

جميع بيانات التوريد على دفعات محفوظة في `opportunities.attributes` كـ JSON:
```json
{
  "allows_batch_delivery": true,
  "batch_count": 3,
  "batch_start_date": "2026-09-01",
  "batch_end_date": "2026-11-30",
  "batch_quantity": "10000",
  "batch_frequency": "monthly"
}
```

### المشكلة

- `allows_batch_delivery` و `batch_count` و تواريخ بداية/نهاية التوريد تُستخدم في الفلترة والعرض بشكل متكرر
- استخراجها من JSON في كل استعلام مكلف وغير قابل للفهرسة
- التفاصيل المرنة (كمية لكل دفعة، تكرار مخصص، ملاحظات جدولة) متغيرة بطبيعتها ولا تصلح كأعمدة ثابتة

### الاقتراح

#### 3.1 نقل لأربعة أعمدة مستقلة

| العمود | النوع | الوصف |
|--------|------|------|
| `delivery_mode` | text | `single` (افتراضي) أو `batch` — يحل محل `allows_batch_delivery` |
| `batch_count` | integer | عدد الدفعات (NULL إذا delivery_mode = single) |
| `delivery_start_date` | date | تاريخ بداية التوريد (للوضع الفردي والدفعات) |
| `delivery_end_date` | date | تاريخ نهاية التوريد (للوضع الفردي والدفعات) |

`delivery_start_date` و `delivery_end_date` مفيدان حتى في الوضع الفردي (موعد التسليم المتوقع)، ويصيران إلزاميين في وضع الدفعات.

#### 3.2 إبقاء تفاصيل الدفعات المرنة في JSON مؤقتًا

| الحقل في JSON (`delivery_schedule`) | النوع | الوصف |
|-------------------------------------|------|------|
| `quantity_per_batch` | text | كمية تقريبية لكل دفعة (نص حر: "10000 شتلة") |
| `frequency` | text | تكرار الدفعات: `weekly` / `biweekly` / `monthly` / `custom` |
| `custom_schedule` | jsonb | جدول مخصص للدفعات (إن وُجد) |

هذه التفاصيل مرنة بطبيعتها (قد تختلف من فرصة لأخرى) ولا تحتاج فلترة مستقلة، لذا JSON أنسب مؤقتًا.

#### 3.3 اقتراح مستقبلي: جدول `opportunity_delivery_batches`

عندما يحتاج النظام جدولة دفعات دقيقة (كل دفعة بكمية وتاريخ وموقع محدد)، يُنفذ جدول مستقل:

| العمود | النوع | الوصف |
|--------|------|------|
| `id` | uuid | مفتاح |
| `opportunity_id` | uuid | مرجع opportunities |
| `batch_number` | integer | رقم الدفعة (1, 2, 3, ...) |
| `scheduled_date` | date | تاريخ الدفعة |
| `quantity` | numeric | كمية الدفعة |
| `unit` | text | وحدة الكمية |
| `location` | text | موقع التسليم (إن اختلف) |
| `status` | text | `pending` / `delivered` / `cancelled` |
| `notes` | text | ملاحظات الدفعة |
| `created_at` | timestamptz | |

**هذا الجدول دراسة مستقبلية فقط — لا يُنفذ الآن.** يُ activat عند الحاجة لتتبع حالة كل دفعة على حدة.

### Migration المقترح (للتنفيذ لاحقًا — لا يُنفذ الآن)

```sql
ALTER TABLE opportunities
  ADD COLUMN delivery_mode text DEFAULT 'single',
  ADD COLUMN batch_count integer,
  ADD COLUMN delivery_start_date date,
  ADD COLUMN delivery_end_date date;

-- ترحيل البيانات
UPDATE opportunities
SET
  delivery_mode = CASE
    WHEN attributes->>'allows_batch_delivery' = 'true' THEN 'batch'
    ELSE 'single'
  END,
  batch_count = NULLIF(attributes->>'batch_count', '')::integer,
  delivery_start_date = NULLIF(attributes->>'batch_start_date', '')::date
    OR NULLIF(attributes->>'supply_date', '')::date,
  delivery_end_date = NULLIF(attributes->>'batch_end_date', '')::date
WHERE attributes ? 'allows_batch_delivery'
   OR attributes ? 'batch_start_date'
   OR attributes ? 'batch_end_date'
   OR attributes ? 'supply_date';

-- تجميع تفاصيل الجدولة المرنة في مفتاح JSON منظم
UPDATE opportunities
SET attributes = attributes
  - 'batch_start_date' - 'batch_end_date'
  - 'batch_quantity' - 'batch_frequency'
  - 'batch_count' - 'allows_batch_delivery'
  - 'supply_date'
  || jsonb_build_object('delivery_schedule', jsonb_build_object(
    'quantity_per_batch', attributes->>'batch_quantity',
    'frequency', attributes->>'batch_frequency'
  ))
WHERE attributes->>'allows_batch_delivery' = 'true';

-- فهارس
CREATE INDEX idx_opportunities_delivery_mode
  ON opportunities(delivery_mode)
  WHERE delivery_mode = 'batch';

CREATE INDEX idx_opportunities_delivery_dates
  ON opportunities(delivery_start_date, delivery_end_date)
  WHERE delivery_start_date IS NOT NULL;
```

### التوصية النهائية للتوريد

| الحقل | القرار | السبب |
|------|--------|------|
| `allows_batch_delivery` → `delivery_mode` | **عمود مستقل** | فلترة متكررة، فهرسة |
| `batch_count` | **عمود مستقل** | فلترة + عرض في البطاقة |
| `batch_start_date` → `delivery_start_date` | **عمود مستقل** | فلترة زمنية، مطابقة |
| `batch_end_date` → `delivery_end_date` | **عمود مستقل** | فلترة زمنية، مطابقة |
| `batch_quantity` → `delivery_schedule.quantity_per_batch` | **JSON مؤقتًا** | نص حر، عرض فقط |
| `batch_frequency` → `delivery_schedule.frequency` | **JSON مؤقتًا** | تعداد، عرض فقط |
| جدول `opportunity_delivery_batches` | **مستقبلاً** | تتبع دفعات دقيقة |

---

## 4. تصور محرك Workflow مستقبلي

> **هذا التصور دراسة مستقبلية فقط. لا تُنشأ جداوله الآن. لا يُنفذ في المرحلة الخامعة.**

### المشكلة الحالية

انتقال الفرصة بين المراحل (draft → pending_review → approved → published → closed) مكتوب بـ if/else داخل الكود. إضافة مرحلة جديدة أو تغيير المسار يتطلب تعديل الكود.

### الهدف

نظام workflow تعريفي من قاعدة البيانات، ينتقل بالفرصة بين المراحل اعتمادًا على:
- الحالة الحالية
- إجراء يقوم به مستخدم (approve, reject, publish, close)
- شروط (مثال: يجب وجود جهة ناشرة، يجب وجود عنصر واحد)
- أدوار صلاحية (المالك، المدير، النظام)

### التصور

#### جدول: `workflow_definitions`

| العمود | النوع | الوصف |
|--------|------|------|
| `id` | uuid | مفتاح |
| `entity_type` | text | 'opportunity', 'logistics_request', 'auction_request' |
| `operation_type` | text | 'offer', 'demand', 'project', ... (NULL = يطبق على الجميع) |
| `version` | integer | نسخة التعريف |
| `is_active` | boolean | نسخة نشطة واحدة لكل entity_type + operation_type |
| `created_at` | timestamptz | |

#### جدول: `workflow_stages`

| العمود | النوع | الوصف |
|--------|------|------|
| `id` | uuid | مفتاح |
| `workflow_def_id` | uuid | مرجع workflow_definitions |
| `stage_key` | text | 'draft', 'pending_review', 'approved', 'published', 'closed' |
| `label` | text | تسمية عربية للعرض |
| `display_order` | integer | ترتيب العرض |
| `is_initial` | boolean | هل هي الحالة الابتدائية؟ |
| `is_terminal` | boolean | هل هي حالة نهائية؟ |

#### جدول: `workflow_transitions`

| العمود | النوع | الوصف |
|--------|------|------|
| `id` | uuid | مفتاح |
| `workflow_def_id` | uuid | مرجع |
| `from_stage_id` | uuid | المرحلة المصدر |
| `to_stage_id` | uuid | المرحلة الوجهة |
| `action_key` | text | 'submit', 'approve', 'reject', 'publish', 'close', 'withdraw' |
| `action_label` | text | تسمية الإجراء للعرض |
| `allowed_roles` | text[] | ['owner', 'admin', 'system'] |
| `guard_function` | text | اسم دالة PL/pgSQL اختيارية للتحقق (مثال: 'guard_has_publisher') |
| `on_enter_function` | text | دالة تُنفذ عند الدخول للمرحلة (مثال: 'notify_matched_suppliers') |
| `on_exit_function` | text | دالة تُنفذ عند الخروج من المرحلة |
| `display_order` | integer | ترتيب عرض الإجراءات |

#### دالة RPC مركزية: `execute_workflow_transition`

```sql
CREATE FUNCTION execute_workflow_transition(
  p_entity_type text,        -- 'opportunity'
  p_entity_id uuid,          -- معرف الفرصة
  p_action_key text,         -- 'approve', 'reject', ...
  p_actor_id uuid            -- المستخدم الذي ينفذ الإجراء
) RETURNS jsonb
```

**منطق الدالة:**
1. تحميل الحالة الحالية للفرصة من `opportunities.status`
2. البحث عن transition في `workflow_transitions` حيث `from_stage = الحالة الحالية` و `action_key = الإجراء`
3. التحقق من `allowed_roles` (هل المستخدم مالك أو مدير؟)
4. تنفيذ `guard_function` إن وُجد (مثال: التحقق من وجود جهة ناشرة)
5. تحديث `opportunities.status = to_stage.stage_key`
6. تنفيذ `on_enter_function` إن وُجد (مثال: إرسال إشعار)
7. تسجيل الانتقال في `workflow_audit_log`
8. إرجاع الحالة الجديدة

#### جدول: `workflow_audit_log`

| العمود | النوع |
|--------|------|
| `id` | uuid |
| `entity_type` | text |
| `entity_id` | uuid |
| `from_stage` | text |
| `to_stage` | text |
| `action_key` | text |
| `actor_id` | uuid |
| `metadata` | jsonb |
| `created_at` | timestamptz |

### مثال: مسار فرصة الاحتياج

```
[draft] --submit--> [pending_review] --approve--> [published] --close--> [closed]
                                    --reject--> [rejected] --edit--> [draft]
[published] --receive_offer--> [offers_received] --accept_offer--> [contracted]
```

كل سهم = صف في `workflow_transitions`. لا حاجة لكتابة if في الكود.

### الفوائد

1. **إضافة مرحلة جديدة** = INSERT في `workflow_stages` + `workflow_transitions` (لا تعديل كود)
2. **تغيير مسار** = UPDATE على transition (لا تعديل كود)
3. **قطاعات مختلفة بمسارات مختلفة** = `operation_type` في `workflow_definitions`
4. **تدقيق كامل** = `workflow_audit_log` يسجل كل انتقال
5. **شروط مخصصة** = `guard_function` تستدعي دالة PL/pgSQL محددة (قابلة لإعادة الاستخدام)

### حدود التصور (ما لا يغطيه)

- **الإجراءات الجانبية المعقدة** (مثال: مطابقة الموردين تلقائيًا) تحتاج منطقًا خارج النظام التعريفي — يُنفذ عبر `on_enter_function` كدالة مخصصة
- **الإجراءات المتوازية** (مثال: موافقة من مديرين) تحتاج نموذجًا أوسع (parallel gateways) — خارج نطاق هذا التصور
- **المهلات الزمنية** (مثال: إغلاق تلقائي بعد 30 يومًا) تحتاج cron job + تعريف timeout في `workflow_stages`

### متى يُنفذ؟

هذا تصور فقط. لا تُنشأ الجداول الآن. لا يُنفذ في المرحلة الخامعة. يُناقش ويُعتمد قبل البدء في تنفيذه كمرحلة مستقلة.

---

## ملخص التوصيات

| البند | القرار | التوقيت |
|-------|--------|---------|
| تقسيم OpportunityForm | **تم تنفيذه** | الآن |
| `useOpportunityFormState` كمصدر وحيد للحالة | **مؤكد** | الآن |
| نقل `minimum_price`/`maximum_price`/`pricing_type`/`pricing_unit` لأعمدة | **موصى به** | Migration لاحق |
| نقل `minimum_height`/`maximum_height`/`height_unit` لأعمدة | **موصى به** | Migration لاحق |
| فصل `required_supply_date` (demand) عن `available_from` (offer) | **موصى به** | Migration لاحق |
| نقل `notes` لعمود مستقل (إن كان عامًا متكررًا) | **موصى به** | Migration لاحق |
| فصل `delivery_mode`/`batch_count`/`delivery_start_date`/`delivery_end_date` لأعمدة | **موصى به** | Migration لاحق |
| تفاصيل الدفعات المرنة في JSON (`delivery_schedule`) | **موصى به مؤقتًا** | مع Migration أعلاه |
| جدول `opportunity_delivery_batches` | **مستقبلاً** | مرحلة لاحقة |
| محرك Workflow التعريفي | **تصور فقط** | مرحلة مستقبلية بعد الاعتماد |

توقفت هنا. لا أبدأ المرحلة الخامعة حتى تعتمد الدراسة.
