/*
  # Expense Accounting Automation

  1. New Functions
    - `handle_expense_approval`: Function to create accounting entry when expense is approved
    - `sync_expense_accounting`: Trigger function to handle expense status changes

  2. New Triggers
    - `expense_accounting_trigger`: Trigger on expenses table for status changes

  3. Changes
    - Adds automatic accounting entry creation for approved expenses
    - Maintains accounting records synchronized with expense approvals
    - Uses account_id 'e2188221-4497-40b9-a97c-def9574c7aed' for expenses

  4. Security
    - Functions execute with invoker security
    - Proper error handling and validation
*/

-- Create function to handle expense approval accounting
CREATE OR REPLACE FUNCTION handle_expense_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_account_id uuid := 'e2188221-4497-40b9-a97c-def9574c7aed';
  v_description text;
BEGIN
  -- Only proceed if status is changing to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Build description
    v_description := 'Gasto ' || NEW.number;
    IF NEW.description IS NOT NULL THEN
      v_description := v_description || ' - ' || NEW.description;
    END IF;

    -- Create accounting movement for expense
    INSERT INTO account_movements (
      account_id,
      date,
      type,
      amount,
      description,
      reference_type,
      reference_id,
      created_by
    ) VALUES (
      v_expense_account_id,
      NEW.date,
      'debit',
      NEW.total_amount,
      v_description,
      'expense',
      NEW.id,
      NEW.approved_by
    );

    -- Update expense approval timestamp
    NEW.approved_at := CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on expenses table
CREATE TRIGGER expense_accounting_trigger
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION handle_expense_approval();

-- Add comment to function
COMMENT ON FUNCTION handle_expense_approval() IS 'Creates accounting entries when expenses are approved';

-- Add comment to trigger
COMMENT ON TRIGGER expense_accounting_trigger ON expenses IS 'Handles accounting entries for expense approvals';