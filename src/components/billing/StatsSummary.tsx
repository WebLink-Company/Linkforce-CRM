import React from 'react';
import { 
  FileText, AlertTriangle, CheckCircle, Clock, XCircle, TrendingUp,
  FileBarChart
} from 'lucide-react';
import InvoiceCard from './InvoiceCard';

interface StatsSummaryProps {
  stats: {
    draftInvoices: { count: number; total: number };
    pendingInvoices: { count: number; total: number };
    upcomingDueInvoices: { count: number; total: number };
    paidInvoices: { 
      monthlyTotal: number; 
      historicalTotal: number; 
      count: number;
      lastPaymentDate?: string;
    };
    issuedInvoices: {
      monthlyCount: number;
      monthlyTotal: number;
      historicalCount: number;
      historicalTotal: number;
    };
    overdueInvoices: { count: number; total: number };
    canceledInvoices: { monthlyCount: number; monthlyTotal: number };
    topProducts: Array<{ name: string; total: number }>;
  };
  onCardClick?: (type: string) => void;
  activeFilter?: string;
}

export default function StatsSummary({ stats, onCardClick, activeFilter }: StatsSummaryProps) {
  // Create array of top 3 products with their totals
  const topProductsDisplay = stats.topProducts.slice(0, 3).map((product, index) => ({
    name: product.name,
    total: product.total,
    rank: index + 1
  }));

  const cards = [
    {
      title: 'Borradores',
      icon: FileText,
      count: stats.draftInvoices.count,
      amount: stats.draftInvoices.total,
      color: 'text-yellow-400',
      bgGlow: 'bg-yellow-400/5',
      delay: 'animate-slide-up',
      onClick: () => onCardClick?.('draft'),
      isActive: activeFilter === 'draft'
    },
    {
      title: 'Facturas Vencidas',
      icon: AlertTriangle,
      count: stats.overdueInvoices.count,
      amount: stats.overdueInvoices.total,
      color: 'text-red-400',
      bgGlow: 'bg-red-400/5',
      delay: 'animate-slide-up-delay-1',
      onClick: () => onCardClick?.('overdue'),
      isActive: activeFilter === 'overdue'
    },
    {
      title: 'Facturas Emitidas',
      icon: FileBarChart,
      count: stats.issuedInvoices.monthlyCount,
      amount: stats.issuedInvoices.monthlyTotal,
      secondaryAmount: stats.issuedInvoices.historicalTotal,
      color: 'text-blue-400',
      bgGlow: 'bg-blue-400/5',
      delay: 'animate-slide-up-delay-2',
      onClick: () => onCardClick?.('issued'),
      isActive: activeFilter === 'issued'
    },
    {
      title: 'Facturas Cobradas',
      icon: CheckCircle,
      count: stats.paidInvoices.count,
      amount: stats.paidInvoices.monthlyTotal,
      secondaryAmount: stats.paidInvoices.historicalTotal,
      secondaryText: stats.paidInvoices.lastPaymentDate ? `Último pago: ${new Date(stats.paidInvoices.lastPaymentDate).toLocaleDateString()}` : undefined,
      color: 'text-emerald-400',
      bgGlow: 'bg-emerald-400/5',
      delay: 'animate-slide-up-delay-3',
      onClick: () => onCardClick?.('paid'),
      isActive: activeFilter === 'paid'
    },
    {
      title: 'Facturas Pendientes',
      icon: Clock,
      count: stats.pendingInvoices.count,
      amount: stats.pendingInvoices.total,
      color: 'text-orange-400',
      bgGlow: 'bg-orange-400/5',
      delay: 'animate-slide-up-delay-4',
      onClick: () => onCardClick?.('pending'),
      isActive: activeFilter === 'pending'
    },
    {
      title: 'Próximos Vencimientos',
      icon: AlertTriangle,
      count: stats.upcomingDueInvoices.count,
      amount: stats.upcomingDueInvoices.total,
      secondaryText: '(7 días)',
      color: 'text-yellow-400',
      bgGlow: 'bg-yellow-400/5',
      delay: 'animate-slide-up-delay-5',
      onClick: () => onCardClick?.('upcoming'),
      isActive: activeFilter === 'upcoming'
    },
    {
      title: 'Facturas Anuladas',
      icon: XCircle,
      amount: stats.canceledInvoices.monthlyTotal,
      count: stats.canceledInvoices.monthlyCount,
      color: 'text-gray-400',
      bgGlow: 'bg-gray-400/5',
      delay: 'animate-slide-up-delay-6',
      onClick: () => onCardClick?.('voided'),
      isActive: activeFilter === 'voided'
    },
    {
      title: 'Productos Más Vendidos',
      icon: TrendingUp,
      customContent: (
        <div className="space-y-2">
          {topProductsDisplay.map((product, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-300 truncate flex-1">
                {index + 1}. {product.name}
              </span>
              <span className="text-sm font-medium text-purple-400 ml-2">
                {new Intl.NumberFormat('es-DO', {
                  style: 'currency',
                  currency: 'DOP'
                }).format(product.total)}
              </span>
            </div>
          ))}
          {topProductsDisplay.length === 0 && (
            <div className="text-sm text-gray-400">No hay datos</div>
          )}
        </div>
      ),
      color: 'text-purple-400',
      bgGlow: 'bg-purple-400/5',
      delay: 'animate-slide-up-delay-7'
    }
  ];

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <InvoiceCard
          key={index}
          {...card}
        />
      ))}
    </div>
  );
}