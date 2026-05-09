// Vifixa Memory Service - RAG-based Knowledge Management
// Handles vector embeddings storage and retrieval

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface EmbeddingRecord {
  id?: string;
  entity_type: 'device' | 'issue' | 'solution' | 'worker' | 'customer' | 'order';
  entity_id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface SearchResults {
  id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

export interface MemoryServiceConfig {
  supabaseUrl: string;
  supabaseKey: string;
  embeddingModel?: string;
  nvidiaApiKey?: string;
}

export class MemoryService {
  private supabase: any;
  private nvidiaApiKey: string;
  private embeddingModel: string;
  private baseUrl: string = 'https://integrate.api.nvidia.com/v1';

  constructor(config: MemoryServiceConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.nvidiaApiKey = config.nvidiaApiKey || Deno.env.get('NVIDIA_API_KEY') || '';
    this.embeddingModel = config.embeddingModel || 'nvidia/nv-embedqa-e5-v5';
    
    if (!this.nvidiaApiKey) {
      console.warn('[MemoryService] Missing NVIDIA_API_KEY - embeddings will fail');
    }
  }

  /**
   * Generate embedding using NVIDIA API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.nvidiaApiKey) {
      throw new Error('NVIDIA_API_KEY not configured');
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.nvidiaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [text],
        model: this.embeddingModel,
        input_type: 'passage',
        truncate: 'END',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NVIDIA API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Store embedding in database
   */
  async storeEmbedding(record: EmbeddingRecord): Promise<string> {
    const { entity_type, entity_id, content, metadata = {} } = record;
    
    // Generate embedding if not provided
    let embedding = record.embedding;
    if (!embedding) {
      embedding = await this.generateEmbedding(content);
    }

    const { data, error } = await this.supabase
      .from('knowledge_embeddings')
      .insert({
        entity_type,
        entity_id,
        content,
        embedding,
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to store embedding: ${error.message}`);
    }

    console.log(`[MemoryService] Stored embedding id=${data.id} entity=${entity_type}:${entity_id}`);
    return data.id;
  }

  /**
   * Batch store embeddings
   */
  async batchStoreEmbeddings(records: EmbeddingRecord[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const record of records) {
      try {
        const id = await this.storeEmbedding(record);
        results.push(id);
      } catch (error) {
        console.error(`[MemoryService] Failed to store embedding for ${record.entity_id}:`, error);
      }
    }

    return results;
  }

  /**
   * Search for similar embeddings
   */
  async searchSimilar(
    query: string,
    options: {
      entityType?: string;
      threshold?: number;
      limit?: number;
    } = {}
  ): Promise<SearchResults[]> {
    const { entityType, threshold = 0.7, limit = 10 } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Call database function
    const { data, error } = await this.supabase.rpc('search_similar_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_entity_type: entityType || null,
    });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Search by entity ID
   */
  async getByEntity(entityType: string, entityId: string): Promise<EmbeddingRecord | null> {
    const { data, error } = await this.supabase
      .from('knowledge_embeddings')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Lookup failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Update embedding content
   */
  async updateEmbedding(id: string, updates: Partial<EmbeddingRecord>): Promise<void> {
    const updateData: any = {};
    
    if (updates.content) {
      // Regenerate embedding for new content
      updateData.embedding = await this.generateEmbedding(updates.content);
      updateData.content = updates.content;
    }
    
    if (updates.metadata) {
      updateData.metadata = updates.metadata;
    }

    const { error } = await this.supabase
      .from('knowledge_embeddings')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  /**
   * Delete embedding
   */
  async deleteEmbedding(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('knowledge_embeddings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getStats(): Promise<any> {
    const { data, error } = await this.supabase
      .from('knowledge_base_stats')
      .select('*');

    if (error) {
      throw new Error(`Stats lookup failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Build knowledge graph relationships
   */
  async buildRelationships(entityId: string, entityType: string): Promise<any[]> {
    // Find related entities based on co-occurrence in chat sessions
    const { data: sessions } = await this.supabase
      .from('chat_messages')
      .select('session_id')
      .ilike('content', `%${entityId}%`);

    if (!sessions || sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map(s => s.session_id);
    
    // Find other entities mentioned in same sessions
    const { data: relatedMessages } = await this.supabase
      .from('chat_messages')
      .select('content, session_id')
      .in('session_id', sessionIds)
      .not('content', 'ilike', `%${entityId}%`);

    if (!relatedMessages) {
      return [];
    }

    // Extract entity references from messages (simplified)
    const relationships: Map<string, number> = new Map();
    for (const msg of relatedMessages) {
      // Simple regex to extract UUIDs
      const uuids = msg.content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
      if (uuids) {
        for (const uuid of uuids) {
          relationships.set(uuid, (relationships.get(uuid) || 0) + 1);
        }
      }
    }

    // Convert to array and sort by strength
    return Array.from(relationships.entries())
      .map(([entityId, strength]) => ({ entityId, strength }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10);
  }

  /**
   * RAG-enhanced answer generation
   */
  async retrieveContextForQuery(
    query: string,
    contextLimit: number = 5
  ): Promise<{ query: string; context: string[]; sources: SearchResults[] }> {
    // Search for relevant knowledge
    const results = await this.searchSimilar(query, { limit: contextLimit });
    
    const context = results.map(r => r.content);
    const sources = results;

    return {
      query,
      context,
      sources,
    };
  }
}

// Export singleton instance helper
export function createMemoryService(config?: Partial<MemoryServiceConfig>): MemoryService {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  return new MemoryService({
    supabaseUrl,
    supabaseKey,
    ...config,
  });
}
