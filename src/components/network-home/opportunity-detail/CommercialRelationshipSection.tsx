import { Tag, Handshake, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { OpportunityDetailItem, OfferDetails, DemandDetails, PartnershipDetails } from '@/types';

type Props = {
  opportunityType: string;
  item: OpportunityDetailItem | null;
  offerDetails: OfferDetails | null;
  demandDetails: DemandDetails | null;
  partnershipDetails: PartnershipDetails | null;
};

type ActionConfig = {
  icon: LucideIcon;
  label: string;
  description: string;
  accentClass: string;
  enabled: boolean;
};

function resolveActions(opportunityType: string, item: OpportunityDetailItem | null): ActionConfig[] {
  const actions: ActionConfig[] = [];
  const itemName = item?.name ?? null;

  if (opportunityType === 'offer') {
    actions.push({
      icon: Tag,
      label: 'طلب الكمية',
      description: itemName ? `اطلب ${itemName}` : 'اطلب الكمية المطلوبة',
      accentClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      enabled: true,
    });
  } else if (opportunityType === 'demand') {
    actions.push({
      icon: Tag,
      label: 'تقديم عرض',
      description: itemName ? `قدم عرضك لـ ${itemName}` : 'قدم عرضك لهذا العنصر',
      accentClass: 'bg-sky-50 text-sky-700 border-sky-200',
      enabled: true,
    });
  } else if (opportunityType === 'partnership') {
    actions.push({
      icon: Users,
      label: 'الانضمام للشراكة',
      description: 'انضم كشريك في هذا المشروع',
      accentClass: 'bg-teal-50 text-teal-700 border-teal-200',
      enabled: true,
    });
  }

  return actions;
}

export default function CommercialRelationshipSection({
  opportunityType,
  item,
  offerDetails,
  demandDetails,
  partnershipDetails,
}: Props) {
  const actions = resolveActions(opportunityType, item);

  return (
    <div className="px-4 py-3 space-y-3 border-t border-gray-50">
      <div className="flex items-center gap-2">
        <Handshake className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-bold text-gray-800">العلاقة التجارية</h3>
      </div>

      {actions.length > 0 ? (
        <div className="space-y-2">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                disabled={!action.enabled}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${action.accentClass}`}
              >
                <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="text-sm font-bold">{action.label}</p>
                  <p className="text-[11px] opacity-70 truncate">{action.description}</p>
                </div>
                {!action.enabled && (
                  <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">قريبًا</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">لا توجد إجراءات متاحة</p>
      )}

      {opportunityType === 'offer' && offerDetails && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-1.5">
          <h4 className="text-xs font-bold text-gray-600">التوفر</h4>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${offerDetails.availableNow ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[11px] font-medium text-gray-700">
              {offerDetails.availableNow ? 'متاح الآن' : offerDetails.availableFromDate ?? 'إنتاج مستقبلي'}
            </span>
            {offerDetails.isNegotiable !== null && (
              <span className={`text-[10px] px-2 py-0.5 rounded ${offerDetails.isNegotiable ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                {offerDetails.isNegotiable ? 'قابل للتفاوض' : 'سعر ثابت'}
              </span>
            )}
          </div>
        </div>
      )}

      {opportunityType === 'demand' && demandDetails && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-1.5">
          <h4 className="text-xs font-bold text-gray-600">موعد التوريد</h4>
          <p className="text-[11px] font-medium text-gray-700">
            {demandDetails.isFlexibleTiming ? 'موعد مرن' : demandDetails.requiredSupplyDate ?? 'غير محدد'}
          </p>
          {demandDetails.offerDeadline && (
            <p className="text-[10px] text-amber-600">آخر عرض: {demandDetails.offerDeadline}</p>
          )}
        </div>
      )}

      {opportunityType === 'partnership' && partnershipDetails && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-1.5">
          <h4 className="text-xs font-bold text-gray-600">معلومات الشراكة</h4>
          <p className="text-[11px] font-medium text-gray-700">
            {partnershipDetails.partnershipType ?? 'شراكة'}
          </p>
          {partnershipDetails.joinDeadline && (
            <p className="text-[10px] text-amber-600">آخر موعد للانضمام: {partnershipDetails.joinDeadline}</p>
          )}
          {partnershipDetails.expectedDuration && (
            <p className="text-[10px] text-gray-500">المدة: {partnershipDetails.expectedDuration}</p>
          )}
        </div>
      )}
    </div>
  );
}
