// ============================================================
// Energy Level Indicator Component
// ============================================================

import type { EnergyLevel } from '../types';

interface EnergyIndicatorProps {
  level: EnergyLevel;
  showLabel?: boolean;
}

const ENERGY_CONFIG: Record<EnergyLevel, { label: string; className: string; bars: number }> = {
  high: { label: 'HIGH ENERGY', className: 'energy-high', bars: 4 },
  secondary: { label: 'SECONDARY', className: 'energy-secondary', bars: 3 },
  low: { label: 'LOW ENERGY', className: 'energy-low', bars: 2 },
  rest: { label: 'REST DAY', className: 'energy-rest', bars: 0 },
};

export default function EnergyIndicator({ level, showLabel = true }: EnergyIndicatorProps) {
  const config = ENERGY_CONFIG[level];

  return (
    <div className={`energy-indicator ${config.className}`}>
      <div className="energy-bars">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`energy-bar ${i <= config.bars ? 'active' : ''}`} />
        ))}
      </div>
      {showLabel && <span className="energy-label">{config.label}</span>}
    </div>
  );
}
