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
  private baseUrl = 'https://integrate.api.nvidia.com/v1';

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
        model: 'abacusai/dracarys-llama-3.1-70b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an AI diagnosis agent. Output ONLY valid JSON, no other text, no markdown.'
          },
          {
            role: 'user',
            content: `Category: ${input.category}\nDescription: ${input.description}\n\nOutput JSON: {"diagnosis": "string", "severity": "low|medium|high|emergency", "recommended_skills": ["skill1"], "estimated_price_range": {"min": 100, "max": 500}, "confidence": 0.85}`
          }
        ]
      }),
    });

    const responseText = await response.text();
    console.log('NVIDIA API response:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', responseText);
      throw new Error(`Invalid API response: ${responseText.substring(0, 100)}`);
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(`Unexpected API response format: ${JSON.stringify(data).substring(0, 200)}`);
    }
    
    // Get content and try to parse as JSON
    const content = data.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse content as JSON:', content);
      // Try to extract JSON from text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error(`Invalid JSON in response: ${content.substring(0, 100)}`);
    }
  }

  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const r = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'abacusai/dracarys-llama-3.1-70b-instruct',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
      }),
    });
    const data = await r.json();
    const content = data.choices[0].message.content;
    try { return JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : content; }
  }

  async estimatePrice(input: PriceInput): Promise<PriceOutput> {
    const result = await this.callAI('You are a pricing agent. Output ONLY JSON.',
      `Category: ${input.category}\nDiagnosis: ${input.diagnosis}\n\nOutput JSON: {"estimated_price": number, "price_breakdown": [{"item": "string", "cost": number}], "confidence": number}`);
    return result;
  }

  async matchWorker(input: MatchingInput): Promise<MatchingOutput> {
    const result = await this.callAI('You are a worker matching agent. Output ONLY JSON.',
      `Skills: ${input.skills_required.join(',')}\nLocation: ${JSON.stringify(input.location)}\n\nOutput JSON: {"matched_worker_id": "string", "worker_name": "string", "eta_minutes": number, "confidence": number}`);
    return result;
  }

  async checkQuality(input: QualityInput): Promise<QualityOutput> {
    const result = await this.callAI('You are a quality check agent. Output ONLY JSON.',
      `Output JSON: {"score": number, "issues": ["string"], "recommendations": ["string"]}`);
    return result;
  }

  async summarizeDispute(input: DisputeInput): Promise<DisputeOutput> {
    const result = await this.callAI('You are a dispute resolution agent. Output ONLY JSON.',
      `Output JSON: {"summary": "string", "resolution": "string", "fairness_score": number}`);
    return result;
  }

  async coachWorker(input: CoachInput): Promise<CoachOutput> {
    const result = await this.callAI('You are an AI coach for workers. Output ONLY JSON.',
      `Context: ${JSON.stringify(input)}\n\nOutput JSON: {"advice": "string", "tips": ["string"], "skill_focus": "string"}`);
    return result;
  }

  async detectFraud(input: FraudInput): Promise<FraudOutput> {
    const result = await this.callAI('You are a fraud detection agent. Output ONLY JSON.',
      `Output JSON: {"risk_score": number, "alerts": ["string"], "recommendation": "string"}`);
    return result;
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
