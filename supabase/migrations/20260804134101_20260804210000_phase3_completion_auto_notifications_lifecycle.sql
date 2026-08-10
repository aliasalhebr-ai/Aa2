/*
# Phase 3 Completion — Auto-Notifications, Service Offer Lifecycle, Auction Workflow

## 1. Notification trigger function
A single SECURITY DEFINER function that inserts a notification row.
Called by triggers on opportunities, service_offers, logistics_requests, logistics_offers, auction_requests.

## 2. Service offer lifecycle
- Add 'in_progress' and 'completed' to opportunities status CHECK
- When a service offer is accepted: reject all other pending offers, update opportunity status to 'in_progress'
- When service is completed: update opportunity status to 'completed'
- Auto-notifications on offer submit, accept, reject

## 3. Logistics lifecycle enhancements
- Add loading_proof_url, delivery_proof_url columns to logistics_requests
- Auto-notification on status changes, offer received, offer accepted/rejected

## 4. Auction lifecycle
- Auto-notification on status changes (submitted, assigned, published, ended)
- Add current_bid, winner_user_id columns to auction_requests
*/

-- ═══════════════════════════════════════════════════════════
-- 1. Notification helper function (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_link_type text DEFAULT NULL,
  p_link_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link_type, link_id)
  VALUES (p_user_id, p_type, p_title, p_body, p_link_type, p_link_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. Opportunities: add in_progress and completed statuses
-- ═══════════════════════════════════════════════════════════

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_status_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_status_check
  CHECK (status IN ('draft', 'pending_review', 'active', 'in_progress', 'completed', 'closed', 'archived', 'rejected'));

-- ═══════════════════════════════════════════════════════════
-- 3. Service Offers: lifecycle triggers
-- ═══════════════════════════════════════════════════════════

-- When a service offer is accepted:
--  1. Reject all other pending offers on the same opportunity
--  2. Update opportunity status to 'in_progress'
--  3. Notify the opportunity owner
--  4. Notify the offer provider
CREATE OR REPLACE FUNCTION on_service_offer_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_opportunity_owner uuid;
  v_opportunity_title text;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Get opportunity owner
    SELECT created_by, title INTO v_opportunity_owner, v_opportunity_title
    FROM opportunities WHERE id = NEW.opportunity_id;

    -- Reject other pending offers
    UPDATE service_offers SET status = 'rejected'
    WHERE opportunity_id = NEW.opportunity_id
      AND id != NEW.id
      AND status = 'pending';

    -- Update opportunity to in_progress
    UPDATE opportunities SET status = 'in_progress'
    WHERE id = NEW.opportunity_id;

    -- Notify opportunity owner
    IF v_opportunity_owner IS NOT NULL THEN
      PERFORM notify_user(v_opportunity_owner, 'offer_accepted',
        'تم قبول عرض على طلبك',
        v_opportunity_title,
        'opportunity', NEW.opportunity_id);
    END IF;

    -- Notify offer provider
    PERFORM notify_user(NEW.provider_user_id, 'offer_accepted',
      'تم قبول عرضك',
      v_opportunity_title,
      'service_offer', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_offer_accepted ON service_offers;
CREATE TRIGGER trg_service_offer_accepted
  AFTER UPDATE ON service_offers
  FOR EACH ROW EXECUTE FUNCTION on_service_offer_accepted();

-- When a service offer is submitted (inserted): notify opportunity owner
CREATE OR REPLACE FUNCTION on_service_offer_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_opportunity_owner uuid;
  v_opportunity_title text;
BEGIN
  SELECT created_by, title INTO v_opportunity_owner, v_opportunity_title
  FROM opportunities WHERE id = NEW.opportunity_id;

  IF v_opportunity_owner IS NOT NULL AND v_opportunity_owner != NEW.provider_user_id THEN
    PERFORM notify_user(v_opportunity_owner, 'new_offer',
      'وصل عرض جديد على طلبك',
      v_opportunity_title,
      'opportunity', NEW.opportunity_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_offer_submitted ON service_offers;
CREATE TRIGGER trg_service_offer_submitted
  AFTER INSERT ON service_offers
  FOR EACH ROW EXECUTE FUNCTION on_service_offer_submitted();

-- When a service offer is rejected: notify provider
CREATE OR REPLACE FUNCTION on_service_offer_rejected()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_opportunity_title text;
BEGIN
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    SELECT title INTO v_opportunity_title FROM opportunities WHERE id = NEW.opportunity_id;
    PERFORM notify_user(NEW.provider_user_id, 'offer_rejected',
      'تم رفض عرضك',
      v_opportunity_title,
      'service_offer', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_offer_rejected ON service_offers;
CREATE TRIGGER trg_service_offer_rejected
  AFTER UPDATE ON service_offers
  FOR EACH ROW EXECUTE FUNCTION on_service_offer_rejected();

-- ═══════════════════════════════════════════════════════════
-- 4. Opportunities: review notification triggers
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_opportunity_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'active' AND NEW.created_by IS NOT NULL THEN
      PERFORM notify_user(NEW.created_by, 'opportunity_approved',
        'تم اعتماد طلبك ونشره',
        NEW.title,
        'opportunity', NEW.id);
    ELSIF NEW.status = 'rejected' AND NEW.created_by IS NOT NULL THEN
      PERFORM notify_user(NEW.created_by, 'opportunity_rejected',
        'تم رفض طلبك',
        COALESCE(NEW.rejection_reason, NEW.title),
        'opportunity', NEW.id);
    ELSIF NEW.status = 'pending_review' AND NEW.created_by IS NOT NULL THEN
      PERFORM notify_user(NEW.created_by, 'opportunity_edit_requested',
        'طلب تعديل على سجلك',
        NEW.title,
        'opportunity', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunity_status_change ON opportunities;
CREATE TRIGGER trg_opportunity_status_change
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION on_opportunity_status_change();

-- ═══════════════════════════════════════════════════════════
-- 5. Logistics: proof columns + notification triggers
-- ═══════════════════════════════════════════════════════════

ALTER TABLE logistics_requests
  ADD COLUMN IF NOT EXISTS loading_proof_url text;
ALTER TABLE logistics_requests
  ADD COLUMN IF NOT EXISTS delivery_proof_url text;

-- Logistics request status change notifications
CREATE OR REPLACE FUNCTION on_logistics_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg text;
BEGIN
  IF NEW.status != OLD.status THEN
    v_msg := CASE NEW.status
      WHEN 'under_review' THEN 'طلبك اللوجستي قيد المراجعة'
      WHEN 'available_to_providers' THEN 'طلبك اللوجستي متاح لمقدمي الخدمات'
      WHEN 'provider_selected' THEN 'تم اختيار مقدم الخدمة لطلبك'
      WHEN 'scheduled' THEN 'تم جدولة طلبك اللوجستي'
      WHEN 'in_progress' THEN 'بدأ تنفيذ طلبك اللوجستي'
      WHEN 'delivered' THEN 'تم تسليم طلبك اللوجستي'
      WHEN 'completed' THEN 'اكتمل طلبك اللوجستي'
      WHEN 'cancelled' THEN 'تم إلغاء طلبك اللوجستي'
      ELSE NULL
    END;
    IF v_msg IS NOT NULL AND NEW.created_by IS NOT NULL THEN
      PERFORM notify_user(New.created_by, 'logistics_status',
        v_msg, NEW.title, 'logistics_request', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_logistics_status_change ON logistics_requests;
CREATE TRIGGER trg_logistics_status_change
  AFTER UPDATE ON logistics_requests
  FOR EACH ROW EXECUTE FUNCTION on_logistics_status_change();

-- Logistics offer notifications
CREATE OR REPLACE FUNCTION on_logistics_offer_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_request_owner uuid;
  v_request_title text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT created_by, title INTO v_request_owner, v_request_title
    FROM logistics_requests WHERE id = NEW.logistics_request_id;
    IF v_request_owner IS NOT NULL AND v_request_owner != NEW.provider_user_id THEN
      PERFORM notify_user(v_request_owner, 'logistics_new_offer',
        'وصل عرض نقل جديد على طلبك',
        v_request_title,
        'logistics_request', NEW.logistics_request_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    IF NEW.status = 'accepted' THEN
      SELECT created_by, title INTO v_request_owner, v_request_title
      FROM logistics_requests WHERE id = NEW.logistics_request_id;
      PERFORM notify_user(NEW.provider_user_id, 'logistics_offer_accepted',
        'تم قبول عرض النقل الخاص بك',
        v_request_title,
        'logistics_offer', NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      PERFORM notify_user(NEW.provider_user_id, 'logistics_offer_rejected',
        'تم رفض عرض النقل الخاص بك',
        NULL,
        'logistics_offer', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_logistics_offer_insert ON logistics_offers;
CREATE TRIGGER trg_logistics_offer_insert
  AFTER INSERT ON logistics_offers
  FOR EACH ROW EXECUTE FUNCTION on_logistics_offer_change();

DROP TRIGGER IF EXISTS trg_logistics_offer_update ON logistics_offers;
CREATE TRIGGER trg_logistics_offer_update
  AFTER UPDATE ON logistics_offers
  FOR EACH ROW EXECUTE FUNCTION on_logistics_offer_change();

-- ═══════════════════════════════════════════════════════════
-- 6. Auction: notification triggers + extra columns
-- ═══════════════════════════════════════════════════════════

ALTER TABLE auction_requests
  ADD COLUMN IF NOT EXISTS current_bid numeric;
ALTER TABLE auction_requests
  ADD COLUMN IF NOT EXISTS winner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION on_auction_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg text;
BEGIN
  IF NEW.status != OLD.status THEN
    v_msg := CASE NEW.status
      WHEN 'submitted' THEN 'تم استلام طلب المزاد'
      WHEN 'under_review' THEN 'طلب المزاد قيد المراجعة'
      WHEN 'assigned_to_marketer' THEN 'تم تعيين مسوق لطلب المزاد'
      WHEN 'preparing' THEN 'بدأ تجهيز المزاد'
      WHEN 'ready_to_publish' THEN 'المزاد جاهز للنشر'
      WHEN 'published' THEN 'تم نشر المزاد'
      WHEN 'active' THEN 'المزاد نشط الآن'
      WHEN 'ended' THEN 'انتهى المزاد'
      WHEN 'sold' THEN 'تم بيع الأصل في المزاد'
      WHEN 'unsold' THEN 'لم يُبع الأصل في المزاد'
      WHEN 'cancelled' THEN 'تم إلغاء المزاد'
      ELSE NULL
    END;
    IF v_msg IS NOT NULL AND NEW.created_by IS NOT NULL THEN
      PERFORM notify_user(NEW.created_by, 'auction_status',
        v_msg, NEW.asset_title, 'auction_request', NEW.id);
    END IF;
    -- Notify marketer if assigned
    IF NEW.status = 'assigned_to_marketer' AND NEW.marketer_id IS NOT NULL AND NEW.marketer_id != NEW.created_by THEN
      PERFORM notify_user(NEW.marketer_id, 'auction_assigned',
        'تم تعيينك كمسوق لمزاد',
        NEW.asset_title,
        'auction_request', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auction_status_change ON auction_requests;
CREATE TRIGGER trg_auction_status_change
  AFTER UPDATE ON auction_requests
  FOR EACH ROW EXECUTE FUNCTION on_auction_status_change();

-- ═══════════════════════════════════════════════════════════
-- 7. Service offer lifecycle: complete service function
-- ═══════════════════════════════════════════════════════════

-- SECURITY DEFINER function to mark a service as completed
CREATE OR REPLACE FUNCTION complete_service(p_opportunity_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_title text;
  v_provider uuid;
BEGIN
  SELECT created_by, title INTO v_owner, v_title
  FROM opportunities WHERE id = p_opportunity_id;

  SELECT provider_user_id INTO v_provider
  FROM service_offers WHERE opportunity_id = p_opportunity_id AND status = 'accepted' LIMIT 1;

  UPDATE opportunities SET status = 'completed' WHERE id = p_opportunity_id;

  IF v_owner IS NOT NULL THEN
    PERFORM notify_user(v_owner, 'service_completed',
      'اكتملت الخدمة', v_title, 'opportunity', p_opportunity_id);
  END IF;
  IF v_provider IS NOT NULL THEN
    PERFORM notify_user(v_provider, 'service_completed',
      'اكتملت الخدمة', v_title, 'opportunity', p_opportunity_id);
  END IF;
END;
$$;

-- SECURITY DEFINER function to update logistics proof
CREATE OR REPLACE FUNCTION update_logistics_proof(
  p_request_id uuid,
  p_proof_type text,
  p_proof_url text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_proof_type = 'loading' THEN
    UPDATE logistics_requests SET loading_proof_url = p_proof_url WHERE id = p_request_id;
  ELSIF p_proof_type = 'delivery' THEN
    UPDATE logistics_requests SET delivery_proof_url = p_proof_url WHERE id = p_request_id;
  END IF;
END;
$$;
