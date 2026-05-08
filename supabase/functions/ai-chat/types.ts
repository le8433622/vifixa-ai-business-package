export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface ChatSlots {
  category?: string;
  description?: string;
  location?: GeoLocation;
  location_text?: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  preferred_time?: string;
  customer_confirmation?: boolean;
  media_urls?: string[];
}

export type ChatState =
  | 'problem_capture'
  | 'slot_filling'
  | 'diagnosis'
  | 'quote'
  | 'confirmation'
  | 'order_creation'
  | 'handoff'
  | 'approval_required'
  | 'escalated';

export type ChatIntent =
  | 'book'
  | 'quote'
  | 'confirm'
  | 'complaint'
  | 'warranty'
  | 'status'
  | 'general_support';

export interface ChatContext extends ChatSlots {
  state?: ChatState;
  intent?: ChatIntent;
  lead_score?: number;
  conversion_stage?: string;
  confidence?: number;
  risk_flags?: string[];
  quote?: unknown;
  diagnosis?: unknown;
  handoff_summary?: string;
  idempotency_key?: string;
}

export interface ChatRequest {
  session_id?: string | null;
  message: string;
  context?: Partial<ChatContext>;
  idempotency_key?: string;
}


export type ChatEventType =
  | 'chat_started'
  | 'slot_updated'
  | 'quote_shown'
  | 'confirmation_shown'
  | 'confirmation_clicked'
  | 'order_created'
  | 'approval_requested'
  | 'escalated'
  | 'abandoned';

export type AutonomyMode = 'autonomous' | 'supervised' | 'manual';
export type AutonomyDecision = 'execute' | 'requires_approval' | 'blocked';

export interface AutonomyPolicy {
  mode: AutonomyMode;
  min_confidence: number;
  max_auto_order_value: number;
  allow_safety_risk: boolean;
}

export interface AutonomyEvaluation {
  decision: AutonomyDecision;
  reason: string;
  policy: AutonomyPolicy;
}

export interface ChatAction {
  type: 'quick_reply' | 'share_location' | 'upload_media' | 'quote_card' | 'confirmation_card' | 'view_order' | 'talk_to_human' | 'approval_pending';
  label: string;
  value?: string;
  data?: unknown;
}

export interface ChatOutputPayload {
  session_id: string;
  reply: string;
  state: ChatState;
  intent?: ChatIntent;
  slots: ChatContext;
  missing_slots: string[];
  actions: ChatAction[];
  next_step: ChatState;
  confidence?: number;
  session_complete: boolean;
  order_id?: string;
}
