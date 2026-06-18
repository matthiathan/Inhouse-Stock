import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Check, ChevronDown } from 'lucide-react';

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
}

export const ComboBox: React.FC<ComboBoxProps> = ({ options, value, onChange, placeholder = 'Select...', className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption ? selectedOption.label : <span className="text-gray-500">{placeholder}</span>}
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center justify-between',
                value === option.value && 'bg-indigo-50 text-indigo-700'
              )}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
              {value === option.value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
