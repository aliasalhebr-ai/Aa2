import { useState, useMemo } from 'react';
import type { NetworkPulseEvent, Company, FieldDefinition, VarietyEntry, OpportunityCardViewModel } from '@/types';
import NetworkPulseCard from './NetworkPulseCard';
import DetailPage from './DetailPage';
import { mapOpportunityToCardViewModel } from '@/lib/opportunityCardMapper';

const mockVarieties: VarietyEntry[] = [
  {
    variety_id: 'sukkari',
    variety_name: 'سكري',
    palm_count: 500,
    expected_production: '40',
    production_unit: 'ton',
    harvest_date: 'أغسطس 2026',
    readiness_status: 'جاهز',
    images: [
      'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
      'https://images.pexels.com/photos/3763025/pexels-photo-3763025.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
    ],
  },
  {
    variety_id: 'khalas',
    variety_name: 'خلاص',
    palm_count: 300,
    expected_production: '25',
    production_unit: 'ton',
    harvest_date: 'يوليو 2026',
    readiness_status: 'يحتاج_تهيئة',
    images: [
      'https://images.pexels.com/photos/3763025/pexels-photo-3763025.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
    ],
  },
];

const mockEvent: NetworkPulseEvent = {
  id: 'preview-001',
  activity_type: 'opportunity',
  activity_subtype: 'offer',
  title: 'مزرعة متعددة الأصناف - للبيع',
  description: 'مزرعة نخيل في القصيم',
  image: 'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  images: [
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ],
  city: 'القصيم',
  sector_id: 'palm',
  sub_sector_id: 'palm-fruits',
  company_id: 'company-001',
  quantity: null,
  quality: null,
  price: 'بالتفاوض',
  auction_status: null,
  time_remaining: null,
  created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  attributes: {
    varieties: mockVarieties,
    sale_model: 'full_harvest',
    season: 'موسم 2026',
  },
};

const mockCompany: Company = {
  id: 'company-001',
  name: 'مزرعة الواحة الذهبية',
  logo: null,
  is_verified: true,
  description: 'مزرعة نخيل متخصصة',
  city: 'القصيم',
  created_at: '',
  whatsapp_number: null,
};

export default function PalmFruitsPreview() {
  const [showDetail, setShowDetail] = useState(false);

  const totalPalms = mockVarieties.reduce((s, v) => s + (v.palm_count ?? 0), 0);
  const totalProduction = mockVarieties.reduce((s, v) => s + Number(v.expected_production ?? 0), 0);

  const { vm, imageUrl } = useMemo(() => {
    const viewModel = mapOpportunityToCardViewModel(mockEvent, {
      templateVersion: 1,
      specialtyName: 'ثمار النخيل',
      subSectorSlug: 'palm-fruits',
      fieldDefs: [] as FieldDefinition[],
      sectorLabel: 'النخيل',
      subSectorLabel: 'ثمار النخيل',
      company: mockCompany,
    });
    return { vm: viewModel, imageUrl: viewModel.image };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <div className="bg-siwar-700 text-white px-6 py-4">
        <h1 className="text-xl font-bold">معاينة بطاقة ثمار النخيل</h1>
        <p className="text-sm text-siwar-200 mt-1">
          البطاقة تعرض ملخصًا ذكيًا — اضغط عليها لفتح صفحة التفاصيل الكاملة
        </p>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Card preview */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">1. بطاقة نبض الشبكة (ملخص ذكي)</h2>
          <p className="text-sm text-gray-500 mb-4">
            تعرض البطاقة: الصورة، نوع العملية، التخصص، الوقت، العنوان، وصف مختصر، مؤشرات مختصرة، السعر، الموقع، الجهة، التوثيق، زر التفاصيل
          </p>
          <div className="max-w-sm mx-auto">
            <NetworkPulseCard
              viewModel={vm}
              imageUrl={imageUrl}
              onViewDetails={() => setShowDetail(true)}
              onSave={() => {}}
              onCompanyClick={() => {}}
            />
          </div>
        </div>

        {/* Data summary — what's stored but NOT shown in the card */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">2. البيانات المحفوظة (تظهر في صفحة التفاصيل فقط)</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="text-gray-500">عدد الأصناف: <span className="font-bold text-gray-800">{mockVarieties.length}</span></div>
              <div className="text-gray-500">إجمالي النخيل: <span className="font-bold text-gray-800">{totalPalms.toLocaleString('ar-EG')}</span></div>
              <div className="text-gray-500">الإنتاج المتوقع: <span className="font-bold text-gray-800">{totalProduction} طن</span></div>
              <div className="text-gray-500">الموسم: <span className="font-bold text-gray-800">2026</span></div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              {mockVarieties.map((v) => (
                <div key={v.variety_id} className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-gray-800">{v.variety_name}</span>
                  <span className="text-gray-500">{v.palm_count} نخلة</span>
                  <span className="text-gray-500">{v.expected_production} طن</span>
                  <span className="text-gray-500">{v.harvest_date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail page */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">3. صفحة التفاصيل (المعلومات الكاملة)</h2>
          <p className="text-sm text-gray-500 mb-4">
            صفحة التفاصيل تعرض جميع الصور، الأصناف، الأعداد، الإنتاج، المواصفات، السعر، الوصف الكامل — وتُفتح من البطاقة
          </p>
          <button
            onClick={() => setShowDetail(true)}
            className="px-6 py-3 bg-siwar-600 text-white rounded-xl font-bold hover:bg-siwar-700 transition-colors"
          >
            فتح صفحة التفاصيل
          </button>
        </div>

        <div className="text-center pb-8">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            رجوع للتطبيق
          </button>
        </div>
      </div>

      {showDetail && (
        <DetailPage
          event={mockEvent}
          company={mockCompany}
          fieldDefs={[]}
          isLoggedIn={false}
          onClose={() => setShowDetail(false)}
          onToast={() => {}}
        />
      )}
    </div>
  );
}
