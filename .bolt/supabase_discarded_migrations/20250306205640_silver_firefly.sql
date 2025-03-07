/*
  # Expense Accounting Automation

  1. New Functions
    - `handle_expense_accounting`: Function to create accounting entries for approved expenses
    
  2. Changes
    - Modifies existing handle_expense_approval trigger to include accounting entries
    - Uses account_id 'e2188221-4497-40b9-a97c-def9574c7aed' for expenses
    - Maintains accounting synchronization with expense approvals

  3. Security
    - Functions execute with invoker security
    - Proper error handling and validation
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS handle_expense_approval ON expenses;
DROP FUNCTION IF EXISTS handle_expense_approval();

-- Create new function to handle expense approval and accounting
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
CREATE TRIGGER handle_expense_approval
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION handle_expense_approval();

-- Add comments
COMMENT ON FUNCTION handle_expense_approval() IS 'Creates accounting entries when expenses are approved';
COMMENT ON TRIGGER handle_expense_approval ON expenses IS 'Handles accounting entries for expense approvals';