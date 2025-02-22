-- Add foreign key constraints for qalinkforce schema
ALTER TABLE qalinkforce.customer_transactions
  ADD CONSTRAINT customer_transactions_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES qalinkforce.customers(id);

ALTER TABLE qalinkforce.invoices
  ADD CONSTRAINT invoices_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES qalinkforce.customers(id);

ALTER TABLE qalinkforce.invoice_items
  ADD CONSTRAINT invoice_items_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES qalinkforce.invoices(id),
  ADD CONSTRAINT invoice_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES qalinkforce.inventory_items(id);

ALTER TABLE qalinkforce.payments
  ADD CONSTRAINT payments_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES qalinkforce.invoices(id),
  ADD CONSTRAINT payments_payment_method_id_fkey 
  FOREIGN KEY (payment_method_id) REFERENCES qalinkforce.payment_methods(id);

ALTER TABLE qalinkforce.account_movements
  ADD CONSTRAINT account_movements_account_id_fkey 
  FOREIGN KEY (account_id) REFERENCES qalinkforce.accounts(id);

ALTER TABLE qalinkforce.price_list_items
  ADD CONSTRAINT price_list_items_price_list_id_fkey 
  FOREIGN KEY (price_list_id) REFERENCES qalinkforce.price_lists(id),
  ADD CONSTRAINT price_list_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES qalinkforce.inventory_items(id);

ALTER TABLE qalinkforce.discounts
  ADD CONSTRAINT discounts_customer_category_id_fkey 
  FOREIGN KEY (customer_category_id) REFERENCES qalinkforce.customer_categories(id),
  ADD CONSTRAINT discounts_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES qalinkforce.inventory_items(id);

ALTER TABLE qalinkforce.payment_reminders
  ADD CONSTRAINT payment_reminders_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES qalinkforce.invoices(id);

ALTER TABLE qalinkforce.supplier_categories_suppliers
  ADD CONSTRAINT supplier_categories_suppliers_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES qalinkforce.suppliers(id),
  ADD CONSTRAINT supplier_categories_suppliers_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES qalinkforce.supplier_categories(id);

ALTER TABLE qalinkforce.purchase_orders
  ADD CONSTRAINT purchase_orders_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES qalinkforce.suppliers(id);

ALTER TABLE qalinkforce.purchase_order_items
  ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey 
  FOREIGN KEY (purchase_order_id) REFERENCES qalinkforce.purchase_orders(id),
  ADD CONSTRAINT purchase_order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES qalinkforce.purchase_products(id);

ALTER TABLE qalinkforce.supplier_invoices
  ADD CONSTRAINT supplier_invoices_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES qalinkforce.suppliers(id),
  ADD CONSTRAINT supplier_invoices_purchase_order_id_fkey 
  FOREIGN KEY (purchase_order_id) REFERENCES qalinkforce.purchase_orders(id);

ALTER TABLE qalinkforce.supplier_invoice_items
  ADD CONSTRAINT supplier_invoice_items_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES qalinkforce.supplier_invoices(id),
  ADD CONSTRAINT supplier_invoice_items_purchase_order_item_id_fkey 
  FOREIGN KEY (purchase_order_item_id) REFERENCES qalinkforce.purchase_order_items(id),
  ADD CONSTRAINT supplier_invoice_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES qalinkforce.purchase_products(id);

ALTER TABLE qalinkforce.supplier_payments
  ADD CONSTRAINT supplier_payments_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES qalinkforce.supplier_invoices(id),
  ADD CONSTRAINT supplier_payments_payment_method_id_fkey 
  FOREIGN KEY (payment_method_id) REFERENCES qalinkforce.payment_methods(id);

ALTER TABLE qalinkforce.expenses
  ADD CONSTRAINT expenses_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES qalinkforce.expense_categories(id),
  ADD CONSTRAINT expenses_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES qalinkforce.suppliers(id),
  ADD CONSTRAINT expenses_payment_method_id_fkey 
  FOREIGN KEY (payment_method_id) REFERENCES qalinkforce.payment_methods(id);

ALTER TABLE qalinkforce.expense_attachments
  ADD CONSTRAINT expense_attachments_expense_id_fkey 
  FOREIGN KEY (expense_id) REFERENCES qalinkforce.expenses(id);

ALTER TABLE qalinkforce.purchase_products
  ADD CONSTRAINT purchase_products_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES qalinkforce.supplier_categories(id),
  ADD CONSTRAINT purchase_products_default_supplier_id_fkey 
  FOREIGN KEY (default_supplier_id) REFERENCES qalinkforce.suppliers(id);

ALTER TABLE qalinkforce.supplier_product_prices
  ADD CONSTRAINT supplier_product_prices_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES qalinkforce.suppliers(id),
  ADD CONSTRAINT supplier_product_prices_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES qalinkforce.purchase_products(id);

ALTER TABLE qalinkforce.raw_materials
  ADD CONSTRAINT raw_materials_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES qalinkforce.suppliers(id),
  ADD CONSTRAINT raw_materials_purchase_product_id_fkey 
  FOREIGN KEY (purchase_product_id) REFERENCES qalinkforce.purchase_products(id);

ALTER TABLE qalinkforce.raw_material_lots
  ADD CONSTRAINT raw_material_lots_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES qalinkforce.raw_materials(id);

ALTER TABLE qalinkforce.raw_material_movements
  ADD CONSTRAINT raw_material_movements_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES qalinkforce.raw_materials(id),
  ADD CONSTRAINT raw_material_movements_lot_id_fkey 
  FOREIGN KEY (lot_id) REFERENCES qalinkforce.raw_material_lots(id);

ALTER TABLE qalinkforce.raw_material_quality_controls
  ADD CONSTRAINT raw_material_quality_controls_lot_id_fkey 
  FOREIGN KEY (lot_id) REFERENCES qalinkforce.raw_material_lots(id);

ALTER TABLE qalinkforce.raw_material_documents
  ADD CONSTRAINT raw_material_documents_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES qalinkforce.raw_materials(id);

ALTER TABLE qalinkforce.inventory_items
  ADD CONSTRAINT inventory_items_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES qalinkforce.inventory_categories(id);

ALTER TABLE qalinkforce.inventory_movements
  ADD CONSTRAINT inventory_movements_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES qalinkforce.inventory_items(id);

-- Add foreign key constraints for quimicinter schema
ALTER TABLE quimicinter.customer_transactions
  ADD CONSTRAINT customer_transactions_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES quimicinter.customers(id);

ALTER TABLE quimicinter.invoices
  ADD CONSTRAINT invoices_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES quimicinter.customers(id);

ALTER TABLE quimicinter.invoice_items
  ADD CONSTRAINT invoice_items_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES quimicinter.invoices(id),
  ADD CONSTRAINT invoice_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES quimicinter.inventory_items(id);

ALTER TABLE quimicinter.payments
  ADD CONSTRAINT payments_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES quimicinter.invoices(id),
  ADD CONSTRAINT payments_payment_method_id_fkey 
  FOREIGN KEY (payment_method_id) REFERENCES quimicinter.payment_methods(id);

ALTER TABLE quimicinter.account_movements
  ADD CONSTRAINT account_movements_account_id_fkey 
  FOREIGN KEY (account_id) REFERENCES quimicinter.accounts(id);

ALTER TABLE quimicinter.price_list_items
  ADD CONSTRAINT price_list_items_price_list_id_fkey 
  FOREIGN KEY (price_list_id) REFERENCES quimicinter.price_lists(id),
  ADD CONSTRAINT price_list_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES quimicinter.inventory_items(id);

ALTER TABLE quimicinter.discounts
  ADD CONSTRAINT discounts_customer_category_id_fkey 
  FOREIGN KEY (customer_category_id) REFERENCES quimicinter.customer_categories(id),
  ADD CONSTRAINT discounts_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES quimicinter.inventory_items(id);

ALTER TABLE quimicinter.payment_reminders
  ADD CONSTRAINT payment_reminders_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES quimicinter.invoices(id);

ALTER TABLE quimicinter.supplier_categories_suppliers
  ADD CONSTRAINT supplier_categories_suppliers_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES quimicinter.suppliers(id),
  ADD CONSTRAINT supplier_categories_suppliers_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES quimicinter.supplier_categories(id);

ALTER TABLE quimicinter.purchase_orders
  ADD CONSTRAINT purchase_orders_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES quimicinter.suppliers(id);

ALTER TABLE quimicinter.purchase_order_items
  ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey 
  FOREIGN KEY (purchase_order_id) REFERENCES quimicinter.purchase_orders(id),
  ADD CONSTRAINT purchase_order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES quimicinter.purchase_products(id);

ALTER TABLE quimicinter.supplier_invoices
  ADD CONSTRAINT supplier_invoices_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES quimicinter.suppliers(id),
  ADD CONSTRAINT supplier_invoices_purchase_order_id_fkey 
  FOREIGN KEY (purchase_order_id) REFERENCES quimicinter.purchase_orders(id);

ALTER TABLE quimicinter.supplier_invoice_items
  ADD CONSTRAINT supplier_invoice_items_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES quimicinter.supplier_invoices(id),
  ADD CONSTRAINT supplier_invoice_items_purchase_order_item_id_fkey 
  FOREIGN KEY (purchase_order_item_id) REFERENCES quimicinter.purchase_order_items(id),
  ADD CONSTRAINT supplier_invoice_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES quimicinter.purchase_products(id);

ALTER TABLE quimicinter.supplier_payments
  ADD CONSTRAINT supplier_payments_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES quimicinter.supplier_invoices(id),
  ADD CONSTRAINT supplier_payments_payment_method_id_fkey 
  FOREIGN KEY (payment_method_id) REFERENCES quimicinter.payment_methods(id);

ALTER TABLE quimicinter.expenses
  ADD CONSTRAINT expenses_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES quimicinter.expense_categories(id),
  ADD CONSTRAINT expenses_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES quimicinter.suppliers(id),
  ADD CONSTRAINT expenses_payment_method_id_fkey 
  FOREIGN KEY (payment_method_id) REFERENCES quimicinter.payment_methods(id);

ALTER TABLE quimicinter.expense_attachments
  ADD CONSTRAINT expense_attachments_expense_id_fkey 
  FOREIGN KEY (expense_id) REFERENCES quimicinter.expenses(id);

ALTER TABLE quimicinter.purchase_products
  ADD CONSTRAINT purchase_products_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES quimicinter.supplier_categories(id),
  ADD CONSTRAINT purchase_products_default_supplier_id_fkey 
  FOREIGN KEY (default_supplier_id) REFERENCES quimicinter.suppliers(id);

ALTER TABLE quimicinter.supplier_product_prices
  ADD CONSTRAINT supplier_product_prices_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES quimicinter.suppliers(id),
  ADD CONSTRAINT supplier_product_prices_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES quimicinter.purchase_products(id);

ALTER TABLE quimicinter.raw_materials
  ADD CONSTRAINT raw_materials_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES quimicinter.suppliers(id),
  ADD CONSTRAINT raw_materials_purchase_product_id_fkey 
  FOREIGN KEY (purchase_product_id) REFERENCES quimicinter.purchase_products(id);

ALTER TABLE quimicinter.raw_material_lots
  ADD CONSTRAINT raw_material_lots_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES quimicinter.raw_materials(id);

ALTER TABLE quimicinter.raw_material_movements
  ADD CONSTRAINT raw_material_movements_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES quimicinter.raw_materials(id),
  ADD CONSTRAINT raw_material_movements_lot_id_fkey 
  FOREIGN KEY (lot_id) REFERENCES quimicinter.raw_material_lots(id);

ALTER TABLE quimicinter.raw_material_quality_controls
  ADD CONSTRAINT raw_material_quality_controls_lot_id_fkey 
  FOREIGN KEY (lot_id) REFERENCES quimicinter.raw_material_lots(id);

ALTER TABLE quimicinter.raw_material_documents
  ADD CONSTRAINT raw_material_documents_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES quimicinter.raw_materials(id);

ALTER TABLE quimicinter.inventory_items
  ADD CONSTRAINT inventory_items_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES quimicinter.inventory_categories(id);

ALTER TABLE quimicinter.inventory_movements
  ADD CONSTRAINT inventory_movements_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES quimicinter.inventory_items(id);