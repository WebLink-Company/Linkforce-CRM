import { BaseAPI } from './base';
import { supabase } from '../supabase';
import type { PurchaseOrder, PurchaseOrderItem } from '../../types/payables';

class PurchasesAPI extends BaseAPI {
  constructor() {
    super('purchase_orders');
  }

  async createPurchaseOrder(order: Omit<PurchaseOrder, 'id' | 'number' | 'created_at' | 'updated_at'>, items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id'>[]) {
    try {
      // Get the next purchase order number
      const { data: number, error: numberError } = await supabase
        .rpc('generate_po_number');

      if (numberError) throw numberError;

      // Create purchase order
      const { data: purchaseOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .insert([{
          ...order,
          number,
          status: 'draft',
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (orderError) throw orderError;
      if (!purchaseOrder) throw new Error('Failed to create purchase order');

      // Create purchase order items
      const purchaseItems = items.map(item => ({
        ...item,
        purchase_order_id: purchaseOrder.id
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(purchaseItems);

      if (itemsError) throw itemsError;

      return { data: purchaseOrder, error: null };
    } catch (error) {
      console.error('Error creating purchase order:', error);
      return { data: null, error };
    }
  }

  async issuePurchaseOrder(orderId: string) {
    try {
      // Start a transaction using RPC
      const { data, error } = await supabase.rpc('issue_purchase_order', {
        p_order_id: orderId
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error issuing purchase order:', error);
      return { success: false, error };
    }
  }

  async createPayment(orderId: string, payment: {
    amount: number;
    payment_method_id: string;
    payment_date: string;
    reference_number?: string;
    notes?: string;
  }) {
    try {
      // Create payment using RPC to handle all the business logic
      const { data, error } = await supabase.rpc('create_purchase_payment', {
        p_order_id: orderId,
        p_payment_method_id: payment.payment_method_id,
        p_amount: payment.amount,
        p_payment_date: payment.payment_date,
        p_reference_number: payment.reference_number,
        p_notes: payment.notes
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error creating payment:', error);
      return { success: false, error };
    }
  }

  async receiveInvoice(orderId: string, invoice: {
    number: string;
    issue_date: string;
    due_date: string;
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      tax_rate: number;
      discount_rate: number;
    }>;
  }) {
    try {
      // Create supplier invoice using RPC
      const { data, error } = await supabase.rpc('receive_supplier_invoice', {
        p_order_id: orderId,
        p_invoice_number: invoice.number,
        p_issue_date: invoice.issue_date,
        p_due_date: invoice.due_date,
        p_items: invoice.items
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error receiving invoice:', error);
      return { success: false, error };
    }
  }
}

export const purchasesAPI = new PurchasesAPI();