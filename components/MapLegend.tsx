import React from 'react';

const POLLUTION_LEGEND_DATA = [
    { type: 'Нефтяное', color: '#ef4444' },
    { type: 'Химическое', color: '#a855f7' },
    { type: 'Физическое', color: '#f97316' },
];

const MapLegend: React.FC = () => {
  return (
    <div className="bg-gray-800/70 backdrop-blur-md border border-gray-700 rounded-md p-3 shadow-lg">
      <h3 className="font-bold text-sm text-white mb-2">Легенда</h3>
      <ul className="space-y-1">
        {POLLUTION_LEGEND_DATA.map(item => (
          <li key={item.type} className="flex items-center space-x-2 text-xs text-gray-300">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            ></span>
            <span>{item.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MapLegend;
