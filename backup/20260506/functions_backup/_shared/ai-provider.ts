// AI Provider abstraction layer for NVIDIA API
// Per 11_AI_OPERATING_MODEL.md and 15_CODEX_BUSINESS_CONTEXT.md
// Model: nvidia/nemotron-3-nano (stable, tested by user)

export interface AIProvider {
  diagnose(input: DiagnosisInput): Promise<DiagnosisOutput>;
  estimatePrice(input: PriceInput): Promise<PriceOutput>;
  matchWorker(input: MatchingInput): Promise<MatchingOutput>;
  checkQuality(input: QualityInput): Promise<QualityOutput>;
  summarizeDispute(input: DisputeInput): Promise<DisputeOutput>;
  coachWorker(input: CoachInput): Promise<CoachOutput>;
  detectFraud(input: FraudInput): Promise<FraudOutput>;
  chat(input: ChatInput): Promise<ChatOutput>;
  predictMaintenance(input: MaintenancePredictionInput): Promise<MaintenancePredictionOutput>;
}

// Chat interfaces for AI Chat Support
export interface ChatInput {
  session_id: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  context?: {
    category?: string;
    location?: string;
    device_info?: any;
    user_id?: string;
  };
}

export interface ChatOutput {
  reply: string;
  actions?: {
    type: 'diagnosis' | 'price_estimate' | 'match_worker' | 'create_order';
    data?: any;
  }[];
  next_step?: string;
  session_complete?: boolean;
}

// Maintenance prediction interfaces
export interface MaintenancePredictionInput {
  device_type: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  last_maintenance?: string;
  usage_frequency?: 'low' | 'medium' | 'high';
  issues_reported?: string[];
}

export interface MaintenancePredictionOutput {
  next_maintenance_date: string;
  maintenance_type: string;
  urgency: 'low' | 'medium' | 'high';
  estimated_cost?: number;
  recommendations: string[];
  device_lifespan_years?: number;
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

export interface QualityInput {
  order_id: string;
  worker_id: string;
  completion_photos?: string[];
  customer_feedback?: string;
}

export interface QualityOutput {
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface DisputeInput {
  order_id: string;
  complaint: string;
  customer_id: string;
  worker_id: string;
}

export interface DisputeOutput {
  summary: string;
  resolution: string;
  fairness_score: number;
}

export interface CoachInput {
  worker_id: string;
  performance_data?: any;
  task_type?: string;
}

export interface CoachOutput {
  advice: string;
  tips: string[];
  skill_focus: string;
}

export interface FraudInput {
  transaction_id: string;
  amount: number;
  user_id: string;
  metadata?: any;
}

export interface FraudOutput {
  risk_score: number;
  alerts: string[];
  recommendation: string;
}

// Deno/Edge Function compatible AI provider
export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl = 'https://integrate.api.nvidia.com/v1';
  private model = 'abacusai/dracarys-llama-3.1-70b-instruct'; // Verified working model

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callAI(systemPrompt: string, userPrompt: string, expectJSON: boolean = true): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      const responseText = await response.text();
      console.log('NVIDIA API response (first 200 chars):', responseText.substring(0, 200));

      if (!response.ok) {
        throw new Error(`NVIDIA API error ${response.status}: ${responseText.substring(0, 100)}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error(`Invalid API response format: ${responseText.substring(0, 100)}`);
      }

      if (data.error) {
        console.error('NVIDIA API returned error:', data.error);
        throw new Error(`AI API error: ${JSON.stringify(data.error)}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.error('No content in AI response:', JSON.stringify(data).substring(0, 200));
        throw new Error('AI response missing content');
      }

      if (!expectJSON) {
        return content;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(content);
      } catch (e) {
        // Try to extract JSON from text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        // If expecting JSON but got text, return wrapped
        return { text: content };
      }
    } catch (error) {
      console.error('callAI error:', error);
      throw error;
    }
  }

  async diagnose(input: DiagnosisInput): Promise<DiagnosisOutput> {
    const systemPrompt = `Bạn là chuyên gia chẩn đoán sự cố sửa chữa nhà cửa tại Việt Nam.
Trả về JSON hợp lệ với các trường: diagnosis, severity (low|medium|high|emergency), recommended_skills (array), estimated_price_range (object với min, max), confidence (0-1).
Chỉ trả về JSON, không giải thích thêm.`;

    const userPrompt = `Loại dịch vụ: ${input.category}
Mô tả sự cố: ${input.description}
${input.media_urls ? `Hình ảnh: ${input.media_urls.join(', ')}` : ''}

Trả về JSON chẩn đoán:`;

    return await this.callAI(systemPrompt, userPrompt);
  }

  async estimatePrice(input: PriceInput): Promise<PriceOutput> {
    const systemPrompt = `Bạn là chuyên gia định giá dịch vụ sửa chữa tại Việt Nam.
Trả về JSON với: estimated_price (number), price_breakdown (array của {item, cost}), confidence (0-1).
Chỉ trả về JSON.`;

    const userPrompt = `Dịch vụ: ${input.category}
Chẩn đoán: ${input.diagnosis}
Khu vực: ${JSON.stringify(input.location)}
Mức độ khẩn cấp: ${input.urgency}

Trả về JSON định giá:`;

    return await this.callAI(systemPrompt, userPrompt);
  }

  async matchWorker(input: MatchingInput): Promise<MatchingOutput> {
    const systemPrompt = `Bạn là hệ thống match thợ sửa chữa.
Trả về JSON với: matched_worker_id, worker_name, eta_minutes, confidence (0-1).
Chỉ trả về JSON.`;

    const userPrompt = `Kỹ năng yêu cầu: ${input.skills_required.join(', ')}
Vị trí: ${JSON.stringify(input.location)}
Mức độ: ${input.urgency}

Trả về JSON match thợ:`;

    return await this.callAI(systemPrompt, userPrompt);
  }

  async checkQuality(input: QualityInput): Promise<QualityOutput> {
    const systemPrompt = `Bạn là chuyên gia kiểm tra chất lượng sửa chữa.
Trả về JSON với: score (0-100), issues (array), recommendations (array).`;

    const userPrompt = `Order: ${input.order_id}
Worker: ${input.worker_id}
${input.completion_photos ? `Photos: ${input.completion_photos.join(', ')}` : ''}
${input.customer_feedback ? `Feedback: ${input.customer_feedback}` : ''}

Trả về JSON kiểm tra:`;

    return await this.callAI(systemPrompt, userPrompt);
  }

  async summarizeDispute(input: DisputeInput): Promise<DisputeOutput> {
    const systemPrompt = `Bạn là chuyên gia xử lý tranh chấp.
Trả về JSON với: summary, resolution, fairness_score (0-1).`;

    const userPrompt = `Order: ${input.order_id}
Khiếu nại: ${input.complaint}
Customer: ${input.customer_id}
Worker: ${input.worker_id}

Trả về JSON xử lý:`;

    return await this.callAI(systemPrompt, userPrompt);
  }

  async coachWorker(input: CoachInput): Promise<CoachOutput> {
    const systemPrompt = `Bạn là huấn luyện viên cho thợ sửa chữa.
Trả về JSON với: advice, tips (array), skill_focus.`;

    const userPrompt = `Worker: ${input.worker_id}
${input.task_type ? `Công việc: ${input.task_type}` : ''}
${input.performance_data ? `Dữ liệu: ${JSON.stringify(input.performance_data)}` : ''}

Trả về JSON huấn luyện:`;

    return await this.callAI(systemPrompt, userPrompt);
  }

  async detectFraud(input: FraudInput): Promise<FraudOutput> {
    const systemPrompt = `Bạn là hệ thống chống gian lận.
Trả về JSON với: risk_score (0-1), alerts (array), recommendation.`;

    const userPrompt = `Transaction: ${input.transaction_id}
Amount: ${input.amount}
User: ${input.user_id}
${input.metadata ? `Metadata: ${JSON.stringify(input.metadata)}` : ''}

Trả về JSON phát hiện:`;

    return await this.callAI(systemPrompt, userPrompt);
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    const systemPrompt = `Bạn là trợ lý AI hỗ trợ khách hàng cho dịch vụ sửa chữa nhà cửa Vifixa tại Việt Nam.
Nhiệm vụ:
1. Hỏi khách hàng về sự cố một cách tự nhiên, thân thiện (tiếng Việt)
2. Chẩn đoán sự cố dựa trên mô tả
3. Đưa ra giá dự kiến minh bạch
4. Hỗ trợ khách hàng chốt đơn dịch vụ

Quy tắc:
- Luôn trả lời bằng tiếng Việt tự nhiên, thân thiện
- Hỏi từng bước một để hiểu rõ sự cố
- Khi đủ thông tin, đưa ra chẩn đoán và giá
- Gợi ý khách hàng xác nhận chốt đơn
- Nếu khách nói "chốt", "đồng ý", "ok" thì trigger action create_order

Context hiện tại: ${JSON.stringify(input.context || {})}`;

    const messages = input.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await this.callAI(systemPrompt, JSON.stringify(messages), false);

    // Parse response to detect actions
    const actions: ChatOutput['actions'] = [];
    let session_complete = false;

    // Check if AI wants to trigger actions based on keywords
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('chẩn đoán') || lowerResponse.includes('diagnosis')) {
      actions.push({ type: 'diagnosis' });
    }
    if (lowerResponse.includes('giá') || lowerResponse.includes('price')) {
      actions.push({ type: 'price_estimate' });
    }
    if (lowerResponse.includes('chốt đơn') || lowerResponse.includes('create_order')) {
      actions.push({ type: 'create_order' });
      session_complete = true;
    }

    return {
      reply: response,
      actions,
      next_step: session_complete ? 'booking_confirmed' : 'continue_chat',
      session_complete
    };
  }

  async predictMaintenance(input: MaintenancePredictionInput): Promise<MaintenancePredictionOutput> {
    const systemPrompt = `Bạn là chuyên gia dự đoán bảo trì thiết bị gia đình.
Trả về JSON với: next_maintenance_date (YYYY-MM-DD), maintenance_type, urgency (low|medium|high), estimated_cost, recommendations (array), device_lifespan_years.
Chỉ trả về JSON.`;

    const userPrompt = `Thiết bị: ${input.device_type}
${input.brand ? `Hãng: ${input.brand}` : ''}
${input.model ? `Model: ${input.model}` : ''}
${input.purchase_date ? `Ngày mua: ${input.purchase_date}` : ''}
${input.last_maintenance ? `Bảo trì cuối: ${input.last_maintenance}` : ''}
${input.usage_frequency ? `Tần suất sử dụng: ${input.usage_frequency}` : ''}
${input.issues_reported ? `Sự cố đã báo: ${input.issues_reported.join(', ')}` : ''}

Trả về JSON dự đoán bảo trì:`;

    return await this.callAI(systemPrompt, userPrompt);
  }
}

export function createAIProvider(): AIProvider {
  const apiKey = Deno.env.get('OPENAI_API_KEY'); // Actually NVIDIA key, named for compatibility
  const provider = Deno.env.get('AI_PROVIDER') || 'openai';

  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  if (provider === 'openai') {
    return new OpenAIProvider(apiKey);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}
