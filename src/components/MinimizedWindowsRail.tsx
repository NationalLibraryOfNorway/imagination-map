import React from 'react';
import './MinimizedWindowsRail.css';

export interface MinimizedWindowItem {
  id: string;
  iconClassName: string;
  label: string;
  onRestore: () => void;
}

interface MinimizedWindowsRailProps {
  items: MinimizedWindowItem[];
}

export const MinimizedWindowsRail: React.FC<MinimizedWindowsRailProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div className="minimized-windows-rail" aria-label="Minimerte vinduer">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="minimized-window-chip"
          onClick={item.onRestore}
          title={`Gjenåpne ${item.label}`}
          aria-label={`Gjenåpne ${item.label}`}
        >
          <i className={item.iconClassName} aria-hidden="true"></i>
        </button>
      ))}
    </div>
  );
};
