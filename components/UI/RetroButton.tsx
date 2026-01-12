
import React from 'react';

interface RetroButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  variant?: 'primary' | 'danger' | 'success';
  disabled?: boolean;
}

const RetroButton: React.FC<RetroButtonProps> = ({ onClick, children, active, className = '', variant = 'primary', disabled = false }) => {
  const baseStyles = "px-2 py-2 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-75 border-b-4 active:border-b-0 active:translate-y-1 select-none flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#e6e2d3] text-[#1a1a1a] border-[#8b8b7a] hover:bg-[#f0ece0]",
    danger: "bg-[#ff6b6b] text-white border-[#cc5555] hover:bg-[#ff8585]",
    success: "bg-[#33ff00] text-black border-[#28cc00] hover:bg-[#5cff33]"
  };

  const activeStyles = active ? "translate-y-1 border-b-0 brightness-110 shadow-inner" : "";

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${activeStyles} ${className}`}
    >
      {children}
    </button>
  );
};

export default RetroButton;
