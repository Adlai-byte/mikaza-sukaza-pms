-- Insert bank accounts for all users (1-2 per user)
WITH user_data AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY created_at) as rn 
  FROM users
)
INSERT INTO bank_accounts (user_id, ein, account_holder, bank_name, routing_number, account_number, observations) SELECT 
  user_id,
  CASE WHEN (rn % 3) = 0 then '12-3456789' ELSE NULL END as ein,
  (SELECT first_name || ' ' || last_name FROM users u WHERE u.user_id = user_data.user_id) as account_holder,
  CASE (rn % 8)
    WHEN 0 THEN 'Chase Bank'
    WHEN 1 THEN 'Bank of America' 
    WHEN 2 THEN 'Wells Fargo'
    WHEN 3 THEN 'Citibank'
    WHEN 4 THEN 'US Bank'
    WHEN 5 THEN 'PNC Bank'
    WHEN 6 THEN 'Capital One'
    ELSE 'TD Bank'
  END as bank_name,
  CASE (rn % 8)
    WHEN 0 THEN '021000021'  -- Chase
    WHEN 1 THEN '026009593'  -- BoA
    WHEN 2 THEN '121000248'  -- Wells Fargo  
    WHEN 3 THEN '021000089'  -- Citibank
    WHEN 4 THEN '091000022'  -- US Bank
    WHEN 5 THEN '043000096'  -- PNC
    WHEN 6 THEN '051405515'  -- Capital One
    ELSE '031101279'         -- TD Bank
  END as routing_number,
  LPAD((1000000000 + (rn * 1234))::text, 10, '0') as account_number,
  'Primary business account' as observations
FROM user_data

UNION ALL

-- Second bank account for some users (every 3rd user)
SELECT 
  user_id,
  NULL as ein,
  (SELECT first_name || ' ' || last_name FROM users u WHERE u.user_id = user_data.user_id) as account_holder,
  'Savings Account - ' || CASE ((rn + 4) % 6)
    WHEN 0 THEN 'Chase'
    WHEN 1 THEN 'Bank of America'
    WHEN 2 THEN 'Wells Fargo'  
    WHEN 3 THEN 'Citibank'
    WHEN 4 THEN 'US Bank'
    ELSE 'Capital One'
  END as bank_name,
  CASE ((rn + 4) % 6)
    WHEN 0 THEN '021000021'
    WHEN 1 THEN '026009593'
    WHEN 2 THEN '121000248'
    WHEN 3 THEN '021000089'
    WHEN 4 THEN '091000022'
    ELSE '051405515'
  END as routing_number,
  LPAD((2000000000 + (rn * 5678))::text, 10, '0') as account_number,
  'Secondary savings account' as observations
FROM user_data
WHERE (rn % 3) = 0;

-- Insert credit cards for all users (1-2 per user)
WITH user_data AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY created_at) as rn 
  FROM users
)
INSERT INTO credit_cards (user_id, card_type, cardholder_name, card_number, due_date, security_code) SELECT 
  user_id,
  CASE (rn % 4)
    WHEN 0 THEN 'visa'
    WHEN 1 THEN 'mastercard'
    WHEN 2 THEN 'amex'
    ELSE 'discover'
  END as card_type,
  (SELECT first_name || ' ' || last_name FROM users u WHERE u.user_id = user_data.user_id) as cardholder_name,
  CASE (rn % 4)
    WHEN 0 THEN '4' || LPAD((111111111111111 + rn)::text, 15, '0')  -- Visa starts with 4
    WHEN 1 THEN '5' || LPAD((111111111111111 + rn)::text, 15, '0')  -- Mastercard starts with 5
    WHEN 2 THEN '37' || LPAD((11111111111111 + rn)::text, 13, '0')  -- Amex starts with 37
    ELSE '6' || LPAD((111111111111111 + rn)::text, 15, '0')         -- Discover starts with 6
  END as card_number,
  TO_CHAR(CURRENT_DATE + INTERVAL '2 years' + (rn % 36) * INTERVAL '1 month', 'MM/YY') as due_date,
  LPAD(((100 + rn % 899))::text, 3, '0') as security_code
FROM user_data

UNION ALL

-- Second credit card for every other user  
SELECT 
  user_id,
  CASE ((rn + 2) % 4)
    WHEN 0 THEN 'visa'
    WHEN 1 THEN 'mastercard'
    WHEN 2 THEN 'amex'
    ELSE 'discover'
  END as card_type,
  (SELECT first_name || ' ' || last_name FROM users u WHERE u.user_id = user_data.user_id) as cardholder_name,
  CASE ((rn + 2) % 4)
    WHEN 0 THEN '4' || LPAD((222222222222222 + rn)::text, 15, '0')
    WHEN 1 THEN '5' || LPAD((222222222222222 + rn)::text, 15, '0')
    WHEN 2 THEN '34' || LPAD((22222222222222 + rn)::text, 13, '0')  -- Another Amex prefix
    ELSE '6' || LPAD((222222222222222 + rn)::text, 15, '0')
  END as card_number,
  TO_CHAR(CURRENT_DATE + INTERVAL '3 years' + (rn % 24) * INTERVAL '1 month', 'MM/YY') as due_date,
  LPAD(((400 + rn % 599))::text, 3, '0') as security_code
FROM user_data
WHERE (rn % 2) = 0;