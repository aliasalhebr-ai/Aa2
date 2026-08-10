-- Delete test opportunities created for detail page testing
DELETE FROM opportunity_items 
WHERE opportunity_id IN (
  SELECT id FROM opportunities 
  WHERE title IN (
    'بيع محصول ثمار النخيل - مزرعة القصيم',
    'خدمات النخيل المتكاملة - فريق متخصص',
    'تمر سكري فاخر - كمية محدودة'
  )
);

DELETE FROM opportunities 
WHERE title IN (
  'بيع محصول ثمار النخيل - مزرعة القصيم',
  'خدمات النخيل المتكاملة - فريق متخصص',
  'تمر سكري فاخر - كمية محدودة'
);
