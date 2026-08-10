import type { OpportunityDetailViewModel, OpportunityDetailItem } from '@/types';
import SelectedItemGallery from './SelectedItemGallery';
import SelectedItemInformation from './SelectedItemInformation';
import CommercialRelationshipSection from './CommercialRelationshipSection';
import ContactSection from './ContactSection';

type Props = {
  selectedItem: OpportunityDetailItem | null;
  vm: OpportunityDetailViewModel;
  isLoggedIn: boolean;
  onToast: (message: string, type: 'success' | 'error') => void;
};

export default function SelectedItemContent({ selectedItem, vm, isLoggedIn, onToast }: Props) {
  if (!selectedItem) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-gray-400">لا توجد عناصر في هذه الفرصة</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-100">
      {/* 4a. Gallery — only selected item images */}
      <SelectedItemGallery
        itemImages={selectedItem.images}
        itemCoverImage={selectedItem.coverImage}
        fallbackImage={vm.generalImages.length > 0 ? vm.generalImages[0] : null}
      />

      {/* 4b. Information — professional specs */}
      <SelectedItemInformation item={selectedItem} />

      {/* 4c. Commercial Relationship */}
      <CommercialRelationshipSection
        opportunityType={vm.opportunityType}
        item={selectedItem}
        offerDetails={vm.offerDetails}
        demandDetails={vm.demandDetails}
        partnershipDetails={vm.partnershipDetails}
      />

      {/* 4d. Contact — linked to selected item */}
      <ContactSection
        vm={vm}
        isLoggedIn={isLoggedIn}
        onToast={onToast}
        selectedItemName={selectedItem.name}
      />
    </div>
  );
}
