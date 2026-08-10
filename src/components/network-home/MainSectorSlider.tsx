import type { Sector } from '@/types';
import { PalmTreeIcon, AppleTreeIcon, AuctionIcon } from '@/components/network-home/SectorIcons';

type Props = {
  sectors: Sector[];
  activeSectorId: string | null;
  onSectorChange: (sectorId: string) => void;
};

export default function MainSectorSlider({
  sectors,
  activeSectorId,
  onSectorChange,
}: Props) {
  const renderIcon = (slug: string) => {
    switch (slug) {
      case 'palm':
        return <PalmTreeIcon className="w-12 h-12 transition-transform duration-500 group-hover:scale-110" />;
      case 'nursery':
        return <AppleTreeIcon className="w-12 h-12 transition-transform duration-500 group-hover:scale-110" />;
      case 'auctions':
        return <AuctionIcon className="w-12 h-12 transition-transform duration-500 group-hover:scale-110" />;
      default:
        return null;
    }
  };

  return (
    <div className="pt-3 pb-1.5">
      <div className="no-scrollbar touch-scroll overflow-x-auto px-3 sm:px-4">
        <div className="flex gap-3 pb-2.5" style={{ width: 'max-content' }}>
          {sectors.map((sector, idx) => {
            const isActive = sector.id === activeSectorId;

            return (
              <button
                key={sector.id}
                onClick={() => onSectorChange(sector.id)}
                className="group tap-scale relative flex-shrink-0 flex flex-col items-center justify-center spring-in"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div
                  className={`relative flex items-center justify-center rounded-2xl transition-all duration-500 overflow-hidden ${
                    isActive
                      ? 'border-2 border-siwar-600 shadow-md shadow-siwar-600/20'
                      : 'border border-gray-200/80 shadow-soft hover:border-gray-300 hover:shadow-card hover:-translate-y-0.5'
                  } bg-white`}
                  style={{ width: '68px', height: '68px' }}
                >
                  {renderIcon(sector.slug)}
                </div>

                <div className="text-center w-full px-0.5 mt-1.5">
                  <p
                    className={`font-bold leading-tight transition-all duration-300 ${
                      isActive ? 'text-siwar-700' : 'text-gray-600'
                    }`}
                    style={{
                      fontSize: '11px',
                      lineHeight: '1.15',
                      maxWidth: '72px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    {sector.name}
                  </p>
                </div>

                <div
                  className={`rounded-full transition-all duration-500 mt-1 ${
                    isActive ? 'w-8 h-0.5 bg-siwar-600' : 'w-0 h-0.5 bg-transparent'
                  }`}
                />
                {isActive && (
                  <span className="block w-1 h-1 rounded-full bg-siwar-600 mx-auto mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
