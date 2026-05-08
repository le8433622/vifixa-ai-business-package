-- Prevent duplicate order creation from repeated chat confirmation requests.
CREATE UNIQUE INDEX IF NOT EXISTS unique_orders_chat_session_id
  ON public.orders (chat_session_id)
  WHERE chat_session_id IS NOT NULL;
