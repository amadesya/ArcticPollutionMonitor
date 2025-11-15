import React, { useState } from 'react';
import { Filters } from '../types';

const POLLUTION_TYPES: Array<'Химическое' | 'Нефтяное' | 'Физическое'> = ['Химическое', 'Нефтяное', 'Физическое'];
const HAZARD_LEVELS: Array<'Низкий' | 'Средний' | 'Высокий'> = ['Низкий', 'Средний', 'Высокий'];
const IMPACT_AREAS: Array<'Вода' | 'Почва'> = ['Вода', 'Почва'];
const CONFIDENCE_LEVELS: Array<'Низкая' | 'Средняя' | 'Высокая'> = ['Низкая', 'Средняя', 'Высокая'];


interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (category: keyof Filters, value: string) => void;
  onResetFilters: () => void;
}

interface CheckboxProps {
  label: string;
  category: keyof Filters;
  isChecked: boolean;
  onChange: (category: keyof Filters, value: string) => void;
}

const FilterCheckbox: React.FC<CheckboxProps> = ({ label, category, isChecked, onChange }) => (
  <label className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
    <input
      type="checkbox"
      checked={isChecked}
      onChange={() => onChange(category, label)}
      className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-500"
    />
    <span>{label}</span>
  </label>
);

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFilterChange, onResetFilters }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const totalActiveFilters = filters.type.length + filters.hazardLevel.length + filters.impactArea.length + filters.confidence.length;

  return (
    <div className="flex-shrink-0 bg-gray-900/50 p-3 rounded-md border border-gray-700">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex justify-between items-center text-left"
        aria-expanded={isOpen}
      >
        <h3 className="font-semibold flex items-center">
          ФИЛЬТРЫ ОТОБРАЖЕНИЯ
          {totalActiveFilters > 0 && (
            <span className="ml-2 bg-cyan-500 text-gray-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {totalActiveFilters}
            </span>
          )}
        </h3>
        <i className={`ph-bold ${isOpen ? 'ph-caret-up' : 'ph-caret-down'} text-lg`}></i>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Тип Загрязнения</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {POLLUTION_TYPES.map(type => (
                <FilterCheckbox key={type} label={type} category="type" isChecked={filters.type.includes(type)} onChange={onFilterChange} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Уровень Опасности</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {HAZARD_LEVELS.map(level => (
                <FilterCheckbox key={level} label={level} category="hazardLevel" isChecked={filters.hazardLevel.includes(level)} onChange={onFilterChange} />
              ))}
            </div>
          </div>
           <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Область Воздействия</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {IMPACT_AREAS.map(area => (
                <FilterCheckbox key={area} label={area} category="impactArea" isChecked={filters.impactArea.includes(area)} onChange={onFilterChange} />
              ))}
            </div>
          </div>
           <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Уровень Уверенности</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {CONFIDENCE_LEVELS.map(level => (
                <FilterCheckbox key={level} label={level} category="confidence" isChecked={filters.confidence.includes(level)} onChange={onFilterChange} />
              ))}
            </div>
          </div>
          <button
            onClick={onResetFilters}
            disabled={totalActiveFilters === 0}
            className="w-full mt-2 px-3 py-1.5 text-sm bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <i className="ph ph-x-circle"></i>
            <span>Сбросить фильтры</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;