import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Check, ChevronDown, Search } from 'lucide-react';

interface ComboBoxOption {
  label: string;
  value: string;
}

interface ComboBoxProps {
  options: ComboBoxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
}

export const ComboBox: React.FC<ComboBoxProps> = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select...', 
  className,
  searchable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable 
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 border border-blue-200/60 hover:border-blue-400 rounded-md bg-white text-sm text-gray-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption ? (
          <span className="truncate">{selectedOption.label}</span>
        ) : (
          <span className="text-gray-400 truncate">{placeholder}</span>
        )}
        <ChevronDown size={16} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto min-w-[200px]">
          {searchable && (
            <div className="sticky top-0 bg-white p-2 border-b border-gray-100 flex items-center gap-1.5">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                className="w-full text-xs p-1 outline-none text-gray-700 bg-gray-50 rounded"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-2">No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm bg-white text-gray-900 hover:bg-gray-100 flex items-center justify-between transition-colors',
                    value === option.value && 'bg-blue-50/70 text-blue-700 font-medium'
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="truncate mr-2">{option.label}</span>
                  {value === option.value && <Check size={14} className="shrink-0 text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
