// Expo Push Notification Module
// Batch sends via Expo Push API, handles invalid tokens

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

export interface ExpoPushMessage {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
}

interface ExpoPushReceipt {
  id: string;
  status: string;
  message?: string;
}

export interface SendResult {
  success: number;
  failed: number;
  invalidTokens: string[];
}

async function sendBatch(messages: ExpoPushMessage[]): Promise<{
  data: ExpoPushReceipt[];
  errors?: { code: string; message: string }[];
}> {
  const response = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo Push API returned ${response.status}: ${text.substring(0, 200)}`);
  }

  return response.json();
}

export async function sendPushNotifications(
  pushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<SendResult> {
  const BATCH_SIZE = 100;
  let success = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (let i = 0; i < pushTokens.length; i += BATCH_SIZE) {
    const batch = pushTokens.slice(i, i + BATCH_SIZE);
    const messages: ExpoPushMessage[] = batch.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    }));

    try {
      const result = await sendBatch(messages);

      if (result.data) {
        for (let j = 0; j < result.data.length; j++) {
          const receipt = result.data[j];
          if (receipt.status === 'ok') {
            success++;
          } else {
            failed++;
            if (
              receipt.message?.includes('DeviceNotRegistered') ||
              receipt.message?.includes('InvalidCredentials')
            ) {
              invalidTokens.push(batch[j]);
            }
          }
        }
      }

      if (result.errors) {
        for (const error of result.errors) {
          console.error('Expo Push API error:', error);
        }
      }
    } catch (err) {
      console.error('Batch send failed:', err);
      failed += batch.length;
    }
  }

  return { success, failed, invalidTokens };
}
