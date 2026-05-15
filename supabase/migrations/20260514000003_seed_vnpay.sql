-- Migration 003: Seed VNPay credentials + enable gateways
-- VNPay sandbox credentials từ VNPay cung cấp

UPDATE gateway_configs
SET
  active = true,
  sandbox = true,
  sandbox_keys = jsonb_build_object(
    'tmnCode', '9PCXHWJ9',
    'secretKey', 'PJH49SJJZ050RY5KKOOPO03B9TF0IB5O',
    'returnUrl', 'https://web-eta-ochre-99.vercel.app/api/payments/vnpay/return',
    'ipnUrl', 'https://web-eta-ochre-99.vercel.app/api/payments/vnpay/ipn',
    'sandbox', true
  ),
  supported_methods = '{bank_transfer,qr,card}'
WHERE key = 'vnpay';

-- Enable Stripe (không có keys - admin sẽ config sau)
UPDATE gateway_configs
SET
  active = true,
  sandbox = true
WHERE key = 'stripe';

-- Vô hiệu hoá MoMo và ZaloPay (chưa dùng)
UPDATE gateway_configs
SET
  active = false
WHERE key IN ('momo', 'zalopay');