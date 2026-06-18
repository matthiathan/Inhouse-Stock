
import React from 'react';
import { cn } from '../../lib/utils'; // Assuming this utility exists based on framework instructions

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
      secondary: 'bg-emerald-600 text-white hover:bg-emerald-700',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50',
    };

    return (
      <button
        ref={ref}
        className={cn('px-4 py-2 rounded-md font-medium transition-colors', variants[variant], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
