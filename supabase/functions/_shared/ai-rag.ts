// AI RAG v2.0 — Retrieval-Augmented Generation pipeline
// Fetches relevant knowledge from past diagnoses, price standards, and knowledge base

export interface RAGContext {
  knowledgeBase: unknown[]
  relevantLogs: unknown[]
  priceBands: unknown[]
  totalTokens: number
}

export class AIRAG {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  async getDiagnosisContext(category: string, description: string, userId?: string): Promise<RAGContext> {
    const [knowledgeBase, relevantLogs, priceBands] = await Promise.all([
      this.fetchKnowledgeBase(category),
      this.fetchRelevantLogs('diagnosis', category, userId),
      this.fetchPriceBands(category),
    ])
    return {
      knowledgeBase,
      relevantLogs: relevantLogs.slice(0, 3),
      priceBands: priceBands.slice(0, 5),
      totalTokens: this.estimateContextTokens(knowledgeBase, relevantLogs, priceBands),
    }
  }

  async getPricingContext(category: string, location?: { lat: number; lng: number }): Promise<RAGContext> {
    const [priceBands, knowledgeBase] = await Promise.all([
      this.fetchPriceBands(category),
      this.fetchKnowledgeBase(category),
    ])
    return {
      knowledgeBase,
      relevantLogs: [],
      priceBands,
      totalTokens: this.estimateContextTokens(knowledgeBase, [], priceBands),
    }
  }

  async getMatchingContext(skillsRequired: string[], location: { lat: number; lng: number }): Promise<{ workers: any[] }> {
    const { data: workers } = await this.supabase
      .from('workers')
      .select('id, profiles!inner(full_name, phone), skills, rating, completed_jobs, location_lat, location_lng, is_verified, trust_score')
      .eq('is_verified', true)
      .limit(20)
    return { workers: workers || [] }
  }

  async getDisputeContext(orderId: string): Promise<{ order: any; pastDisputes: any[] }> {
    const [order, pastDisputes] = await Promise.all([
      this.supabase.from('orders').select('*').eq('id', orderId).single(),
      this.supabase.from('ai_logs').select('output').eq('agent_type', 'dispute').order('created_at', { ascending: false }).limit(5),
    ])
    return { order: order.data, pastDisputes: pastDisputes.data || [] }
  }

  async getFraudContext(userId: string): Promise<{
    recentOrders: any[]
    pastFlags: any[]
    disputeRate: number
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString()
    const [recentOrders, pastFlags] = await Promise.all([
      this.supabase.from('orders').select('id, status, estimated_price, final_price, created_at').eq('customer_id', userId).gte('created_at', thirtyDaysAgo).limit(50),
      this.supabase.from('ai_logs').select('output').eq('agent_type', 'fraud').contains('input', { user_id: userId }).order('created_at', { ascending: false }).limit(10),
    ])
    const orders = recentOrders.data || []
    const disputed = orders.filter((o: any) => o.status === 'disputed').length
    return {
      recentOrders: orders,
      pastFlags: pastFlags.data || [],
      disputeRate: orders.length > 0 ? disputed / orders.length : 0,
    }
  }

  async getPredictContext(deviceType: string, brand?: string): Promise<{ maintenanceHistory: any[] }> {
    const { data } = await this.supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('maintenance_type', deviceType)
      .order('created_at', { ascending: false })
      .limit(20)
    return { maintenanceHistory: data || [] }
  }

  async getUpsellContext(userId: string): Promise<{
    completedOrders: number
    totalSpent: number
    activeMembership: any
    categoryHistory: string[]
  }> {
    const [ordersResult, membershipResult] = await Promise.all([
      this.supabase.from('orders').select('category, final_price, status').eq('customer_id', userId),
      this.supabase.from('customer_subscriptions').select('*, membership_plans(*)').eq('user_id', userId).eq('status', 'active').maybeSingle(),
    ])
    const orders = ordersResult.data || []
    const completed = orders.filter((o: any) => o.status === 'completed')
    return {
      completedOrders: completed.length,
      totalSpent: completed.reduce((s: number, o: any) => s + (o.final_price || 0), 0),
      activeMembership: membershipResult.data,
      categoryHistory: [...new Set(orders.map((o: any) => o.category).filter(Boolean))] as string[],
    }
  }

  // ------- PRIVATE HELPERS -------
  private async fetchKnowledgeBase(category: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('knowledge_base')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .limit(10)
    return data || []
  }

  private async fetchPriceBands(category: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('price_standards')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .limit(5)
    return data || []
  }

  private async fetchRelevantLogs(agentType: string, category: string, userId?: string): Promise<any[]> {
    const query: any = {
      agent_type: agentType,
    }
    if (userId) query.user_id = userId
    const { data } = await this.supabase
      .from('ai_logs')
      .select('input, output, created_at')
      .contains('input', { category })
      .order('created_at', { ascending: false })
      .limit(10)
    return data || []
  }

  private estimateContextTokens(...contexts: any[][]): number {
    return contexts.reduce((sum, ctx) => sum + ctx.reduce((s: number, item: any) => s + JSON.stringify(item).length, 0), 0) / 4
  }
}

export function createAIRAG(supabase: any): AIRAG {
  return new AIRAG(supabase)
}