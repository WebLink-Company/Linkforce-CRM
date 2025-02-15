-- Create function to calculate account balance
CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_id uuid,
  p_as_of_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance numeric;
  v_account accounts%ROWTYPE;
BEGIN
  -- Get account details
  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Account not found'
    );
  END IF;

  -- Calculate balance
  SELECT COALESCE(
    SUM(
      CASE
        WHEN type = 'debit' THEN amount
        WHEN type = 'credit' THEN -amount
      END
    ), 0
  ) INTO v_balance
  FROM account_movements
  WHERE account_id = p_account_id
    AND date <= p_as_of_date;

  -- Adjust balance based on account type
  -- For liability and equity accounts, we invert the balance
  IF v_account.type IN ('liability', 'equity', 'revenue') THEN
    v_balance := -v_balance;
  END IF;

  RETURN json_build_object(
    'success', true,
    'balance', v_balance,
    'as_of_date', p_as_of_date,
    'account_type', v_account.type
  );
END;
$$;