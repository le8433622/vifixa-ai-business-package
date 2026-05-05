// AI Provider abstraction layer for OpenAI/Anthropic
// Per 11_AI_OPERATING_MODEL.md and 15_CODEX_BUSINESS_CONTEXT.md

export interface AIProvider {
  diagnose(input: DiagnosisInput): Promise<DiagnosisOutput>;
  estimatePrice(input: PriceInput): Promise<PriceOutput>;
  matchWorker(input: MatchingInput): Promise<MatchingOutput>;
  checkQuality(input: QualityInput): Promise<QualityOutput>;
  summarizeDispute(input: DisputeInput): Promise<DisputeOutput>;
  coachWorker(input: CoachInput): Promise<CoachOutput>;
  detectFraud(input: FraudInput): Promise<FraudOutput>;
}

export interface DiagnosisInput {
  category: string;
  description: string;
  media_urls?: string[];
  location?: { lat: number; lng: number };
}

export interface DiagnosisOutput {
  diagnosis: string;
  severity: 'low' | 'medium' | 'high' | 'emergency';
  recommended_skills: string[];
  estimated_price_range?: { min: number; max: number };
  confidence: number;
}

export interface PriceInput {
  category: string;
  diagnosis: string;
  location: { lat: number; lng: number };
  urgency: 'low' | 'medium' | 'high' | 'emergency';
}

export interface PriceOutput {
  estimated_price: number;
  price_breakdown: { item: string; cost: number }[];
  confidence: number;
}

export interface MatchingInput {
  order_id: string;
  skills_required: string[];
  location: { lat: number; lng: number };
  urgency: string;
}

export interface MatchingOutput {
  matched_worker_id: string;
  worker_name: string;
  eta_minutes: number;
  confidence: number;
}

// Deno/Edge Function compatible AI provider
export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async diagnose(input: DiagnosisInput): Promise<DiagnosisOutput> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an AI diagnosis agent for Vifixa AI repair service. Analyze the issue and provide structured output.'
          },
          {
            role: 'user',
            content: `Category: ${input.category}\nDescription: ${input.description}\nProvide diagnosis, severity, recommended skills, and estimated price range.`
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }

  async estimatePrice(input: PriceInput): Promise<PriceOutput> {
    // Implementation for price estimation
    throw new Error('Method not implemented.');
  }

  async matchWorker(input: MatchingInput): Promise<MatchingOutput> {
    // Implementation for worker matching
    throw new Error('Method not implemented.');
  }

  async checkQuality(input: QualityInput): Promise<QualityOutput> {
    throw new Error('Method not implemented.');
  }

  async summarizeDispute(input: DisputeInput): Promise<DisputeOutput> {
    throw new Error('Method not implemented.');
  }

  async coachWorker(input: CoachInput): Promise<CoachOutput> {
    throw new Error('Method not implemented.');
  }

  async detectFraud(input: FraudInput): Promise<FraudOutput> {
    throw new Error('Method not implemented.');
  }
}

export function createAIProvider(): AIProvider {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const provider = Deno.env.get('AI_PROVIDER') || 'openai';

  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  if (provider === 'openai') {
    return new OpenAIProvider(apiKey);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}
