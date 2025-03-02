import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, DollarSign, Clock, TrendingUp, UserPlus, Repeat } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  customersWithDebt: number;
  monthlyBilling: number;
  averagePaymentDays: number;
  newCustomers: number;
  frequentCustomers: number;
}

export default function CustomerStats() {
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
    customersWithDebt: 0,
    monthlyBilling: 0,
    averagePaymentDays: 0,
    newCustomers: 0,
    frequentCustomers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total customers
      const { count: totalCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get active customers
      const { count: activeCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('status', 'active');

      // Get customers with debt
      const { data: customersWithDebt } = await supabase
        .from('invoices')
        .select('customer_id')
        .eq('status', 'issued')
        .in('payment_status', ['pending', 'partial'])
        .is('voided_at', null);

      const uniqueDebtors = new Set(customersWithDebt?.map(inv => inv.customer_id));

      // Get monthly billing
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: monthlyData } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'issued')
        .is('voided_at', null)
        .gte('issue_date', startOfMonth.toISOString());

      const monthlyBilling = monthlyData?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;

      // Get new customers in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: newCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get frequent customers (with high total_purchases)
      const { count: frequentCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gt('total_purchases', 3);

      // Calculate average payment days
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_date,
          invoice:invoices(
            issue_date
          )
        `)
        .gte('payment_date', thirtyDaysAgo.toISOString());

      let totalDays = 0;
      let paymentCount = 0;

      payments?.forEach(payment => {
        if (payment.invoice?.issue_date) {
          const issueDate = new Date(payment.invoice.issue_date);
          const paymentDate = new Date(payment.payment_date);
          const days = Math.round((paymentDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
          totalDays += days;
          paymentCount++;
        }
      });

      const averagePaymentDays = paymentCount > 0 ? Math.round(totalDays / paymentCount) : 0;

      setStats({
        totalCustomers: totalCount || 0,
        activeCustomers: activeCount || 0,
        inactiveCustomers: (totalCount || 0) - (activeCount || 0),
        customersWithDebt: uniqueDebtors.size,
        monthlyBilling,
        averagePaymentDays,
        newCustomers: newCount || 0,
        frequentCustomers: frequentCount || 0
      });
    } catch (error) {
      console.error('Error loading customer stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 h-32 rounded-lg border border-white/10"></div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total de Clientes',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-blue-400',
      bgGlow: 'bg-blue-400/5'
    },
    {
      title: 'Clientes Activos',
      value: stats.activeCustomers,
      icon: UserCheck,
      color: 'text-emerald-400',
      bgGlow: 'bg-emerald-400/5'
    },
    {
      title: 'Clientes Inactivos',
      value: stats.inactiveCustomers,
      icon: UserX,
      color: 'text-red-400',
      bgGlow: 'bg-red-400/5'
    },
    {
      title: 'Con Deuda Pendiente',
      value: stats.customersWithDebt,
      icon: DollarSign,
      color: 'text-yellow-400',
      bgGlow: 'bg-yellow-400/5'
    },
    {
      title: 'Facturación Mensual',
      value: new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP'
      }).format(stats.monthlyBilling),
      icon: TrendingUp,
      color: 'text-purple-400',
      bgGlow: 'bg-purple-400/5'
    },
    {
      title: 'Promedio de Pago',
      value: `${stats.averagePaymentDays} días`,
      icon: Clock,
      color: 'text-indigo-400',
      bgGlow: 'bg-indigo-400/5'
    },
    {
      title: 'Clientes Nuevos',
      value: stats.newCustomers,
      icon: UserPlus,
      color: 'text-cyan-400',
      bgGlow: 'bg-cyan-400/5'
    },
    {
      title: 'Clientes Frecuentes',
      value: stats.frequentCustomers,
      icon: Repeat,
      color: 'text-pink-400',
      bgGlow: 'bg-pink-400/5'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.title}
            className={`relative bg-gray-800/50 rounded-lg border border-white/10 p-6 overflow-hidden
                       ${`animate-slide-up-delay-${index}`}`}
          >
            {/* Background glow effect */}
            <div className={`absolute inset-0 ${card.bgGlow} opacity-20 blur-xl`}></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">{card.title}</h3>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className={`text-2xl font-semibold ${card.color}`}>
                {card.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}