import type { SettlementScoutingState, TerritorialMapSnapshot, WorldLocation } from '../../hooks/useGameSocket';
import { TerritorialMapPanel } from './TerritorialMapPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  map: TerritorialMapSnapshot | null;
  ownLocation?: WorldLocation;
  loading?: boolean;
  error?: string | null;
  scouting?: SettlementScoutingState | null;
  scoutingLoading?: boolean;
  scoutingError?: string | null;
  onRefresh: (radius?: number) => void;
  onRefreshScouting?: () => void;
  onStartScouting?: (targetSettlementID: string) => void;
  focusSettlementID?: string | null;
}

export function TerritorialMapModal({ isOpen, onClose, map, ownLocation, loading, error, scouting, scoutingLoading, scoutingError, onRefresh, onRefreshScouting, onStartScouting, focusSettlementID }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center bg-slate-950/85 p-2 backdrop-blur-sm md:p-4">
      <div className="flex max-h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-cyan-500/45 bg-slate-950 shadow-2xl">
        <header className="flex shrink-0 items-start justify-between border-b border-slate-800 bg-slate-900/90 p-4">
          <div>
            <div className="font-pixel-heading text-xs text-cyan-200">🗺️ Mapa Territorial</div>
            <div className="mt-1 text-[10px] text-slate-400">Cartografia persistente do Reino do Avesso · cada coordenada representa um território do mundo</div>
          </div>
          <button type="button" onClick={onClose} className="pixel-btn pixel-btn-crimson px-2 py-1 text-[10px]">✕</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
          <TerritorialMapPanel
            map={map}
            ownLocation={ownLocation}
            loading={loading}
            error={error}
            scouting={scouting}
            scoutingLoading={scoutingLoading}
            scoutingError={scoutingError}
            onRefresh={onRefresh}
            onRefreshScouting={onRefreshScouting}
            onStartScouting={onStartScouting}
            focusSettlementID={focusSettlementID}
            compactHeader
          />
        </div>
      </div>
    </div>
  );
}
