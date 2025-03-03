import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface InvoiceCardProps {
  title: string;
  icon: typeof LucideIcon;
  count?: number;
  amount?: number;
  secondaryAmount?: number;
  secondaryText?: string;
  color: string;
  bgGlow: string;
  delay: string;
  onClick?: () => void;
  customContent?: React.ReactNode;
  isActive?: boolean;
}

export default function InvoiceCard({
  title,
  icon: Icon,
  count,
  amount,
  secondaryAmount,
  secondaryText,
  color,
  bgGlow,
  delay,
  onClick,
  customContent,
  isActive
}: InvoiceCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`relative bg-gray-800/50 rounded-lg border p-6 overflow-hidden 
                 ${onClick ? 'cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1' : ''} 
                 ${isActive ? 'border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-white/10'}
                 ${delay} group`}
    >
      {/* Background glow effect */}
      <div className={`absolute inset-0 ${bgGlow} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-30`}></div>
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/5"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-medium transition-colors duration-300 ${isActive ? color : 'text-gray-400'}`}>
            {title}
          </h3>
          <Icon className={`h-5 w-5 ${color} transform transition-transform duration-300 group-hover:scale-110`} />
        </div>
        
        {customContent ? (
          customContent
        ) : (
          <>
            {amount !== undefined && (
              <div className={`text-2xl font-semibold ${color} transform transition-all duration-300`}>
                {new Intl.NumberFormat('es-DO', {
                  style: 'currency',
                  currency: 'DOP'
                }).format(amount)}
              </div>
            )}

            {count !== undefined && (
              <div className="text-sm text-gray-400 mt-1">
                {count} facturas
              </div>
            )}

            {secondaryAmount !== undefined && (
              <div className="text-sm text-gray-400 mt-1">
                {secondaryText || 'Total histórico'}: {' '}
                {new Intl.NumberFormat('es-DO', {
                  style: 'currency',
                  currency: 'DOP'
                }).format(secondaryAmount)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute inset-x-0 -bottom-px h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
      )}
    </div>
  );
}