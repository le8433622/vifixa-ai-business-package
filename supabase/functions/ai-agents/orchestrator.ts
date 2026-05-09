// Multi-Agent Orchestrator for Vifixa AI
// Coordinates 4 specialized agents: Diagnostic, Pricing, Matching, Quality

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AIProvider } from '../_shared/ai-provider.ts';
import { MemoryService } from '../_shared/memory-service.ts';

export type AgentType = 'diagnostic' | 'pricing' | 'matching' | 'quality' | 'orchestrator';

export interface AgentState {
  id?: string;
  session_id: string;
  agent_type: AgentType;
  state: Record<string, any>;
  confidence_score?: number;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
}

export interface AgentRequest {
  session_id: string;
  request_type: string;
  input_data: Record<string, any>;
  context?: Record<string, any>;
}

export interface AgentResponse {
  success: boolean;
  agent_type: AgentType;
  output_data: Record<string, any>;
  confidence_score: number;
  next_agent?: AgentType;
  requires_human?: boolean;
  error_message?: string;
}

export interface OrchestrationResult {
  session_id: string;
  completed_agents: AgentType[];
  final_result: Record<string, any>;
  total_latency_ms: number;
  requires_human_intervention: boolean;
}

export class AgentOrchestrator {
  private supabase: any;
  private aiProvider: AIProvider;
  private memoryService: MemoryService;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.aiProvider = new AIProvider();
    this.memoryService = new MemoryService({ supabaseUrl, supabaseKey });
  }

  /**
   * Main orchestration entry point
   */
  async orchestrate(request: AgentRequest): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const { session_id, request_type, input_data, context = {} } = request;
    
    console.log(`[Orchestrator] Starting session=${session_id} type=${request_type}`);

    // Initialize agent workflow based on request type
    const workflow = this.getWorkflowForRequest(request_type);
    const completedAgents: AgentType[] = [];
    let currentData = { ...input_data };
    let requiresHuman = false;
    let finalResult: Record<string, any> = {};

    // Execute agents in sequence
    for (const agentType of workflow) {
      try {
        console.log(`[Orchestrator] Executing agent=${agentType}`);
        
        // Save agent start state
        await this.saveAgentState({
          session_id,
          agent_type: agentType,
          state: { status: 'running' },
          input_data: currentData,
        });

        // Execute agent
        const response = await this.executeAgent(agentType, session_id, currentData, context);
        
        // Save agent completion state
        await this.saveAgentState({
          session_id,
          agent_type: agentType,
          state: { status: 'completed' },
          output_data: response.output_data,
          confidence_score: response.confidence_score,
        });

        // Log inter-agent communication if not first agent
        if (completedAgents.length > 0) {
          await this.logAgentCommunication({
            session_id,
            from_agent: completedAgents[completedAgents.length - 1],
            to_agent: agentType,
            payload: currentData,
            response: response.output_data,
          });
        }

        // Update data for next agent
        currentData = { ...currentData, ...response.output_data };
        completedAgents.push(agentType);

        // Check if human intervention required
        if (response.requires_human) {
          console.log(`[Orchestrator] Human intervention required by ${agentType}`);
          requiresHuman = true;
          break;
        }

        // Check if agent suggests stopping
        if (response.next_agent === null) {
          console.log(`[Orchestrator] Agent ${agentType} suggests stopping workflow`);
          break;
        }

      } catch (error: any) {
        console.error(`[Orchestrator] Agent ${agentType} failed:`, error);
        
        // Save error state
        await this.saveAgentState({
          session_id,
          agent_type: agentType,
          state: { status: 'failed' },
          error_message: error.message,
        });

        // Try fallback or require human
        if (agentType === 'quality') {
          requiresHuman = true;
          break;
        }
      }
    }

    finalResult = currentData;
    const totalLatency = Date.now() - startTime;

    console.log(`[Orchestrator] Completed session=${session_id} agents=${completedAgents.length} latency=${totalLatency}ms`);

    return {
      session_id,
      completed_agents: completedAgents,
      final_result: finalResult,
      total_latency_ms: totalLatency,
      requires_human_intervention: requiresHuman,
    };
  }

  /**
   * Get workflow for request type
   */
  private getWorkflowForRequest(requestType: string): AgentType[] {
    switch (requestType) {
      case 'new_order':
        return ['diagnostic', 'pricing', 'matching', 'quality'];
      case 'price_inquiry':
        return ['diagnostic', 'pricing'];
      case 'worker_search':
        return ['matching'];
      case 'quality_check':
        return ['quality'];
      default:
        return ['diagnostic', 'pricing', 'matching'];
    }
  }

  /**
   * Execute specific agent
   */
  private async executeAgent(
    agentType: AgentType,
    sessionId: string,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<AgentResponse> {
    switch (agentType) {
      case 'diagnostic':
        return await this.executeDiagnosticAgent(sessionId, inputData, context);
      case 'pricing':
        return await this.executePricingAgent(sessionId, inputData, context);
      case 'matching':
        return await this.executeMatchingAgent(sessionId, inputData, context);
      case 'quality':
        return await this.executeQualityAgent(sessionId, inputData, context);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Diagnostic Agent - Analyze issue and identify root cause
   */
  private async executeDiagnosticAgent(
    sessionId: string,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<AgentResponse> {
    console.log('[DiagnosticAgent] Starting analysis');

    // Retrieve relevant knowledge from memory
    const query = `${inputData.device_type || ''} ${inputData.issue_description || ''}`.trim();
    let ragContext = '';
    
    if (query) {
      try {
        const ragResults = await this.memoryService.retrieveContextForQuery(query, 3);
        ragContext = ragResults.context.join('\n');
      } catch (error) {
        console.warn('[DiagnosticAgent] RAG retrieval failed:', error);
      }
    }

    // Use AI to diagnose
    const diagnosisInput = {
      device_type: inputData.device_type,
      brand: inputData.brand,
      model: inputData.model,
      symptoms: inputData.symptoms || inputData.issue_description,
      user_description: inputData.user_description,
      knowledge_context: ragContext,
    };

    const diagnosis = await this.aiProvider.diagnose(diagnosisInput);

    const confidence = diagnosis.confidence_score || 0.8;
    const requiresHuman = confidence < 0.6;

    return {
      success: true,
      agent_type: 'diagnostic',
      output_data: {
        diagnosed_issue: diagnosis.diagnosis,
        root_cause: diagnosis.root_cause,
        recommended_solution: diagnosis.recommendations?.[0],
        confidence_score: confidence,
        requires_parts: diagnosis.requires_parts || false,
        estimated_duration: diagnosis.estimated_duration,
      },
      confidence_score: confidence,
      next_agent: requiresHuman ? undefined : 'pricing',
      requires_human: requiresHuman,
    };
  }

  /**
   * Pricing Agent - Calculate accurate price
   */
  private async executePricingAgent(
    sessionId: string,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<AgentResponse> {
    console.log('[PricingAgent] Calculating price');

    const priceInput = {
      device_type: inputData.device_type,
      issue: inputData.diagnosed_issue,
      solution: inputData.recommended_solution,
      location: inputData.location || context.location,
      parts_needed: inputData.requires_parts,
      estimated_duration: inputData.estimated_duration,
    };

    const priceEstimate = await this.aiProvider.estimatePrice(priceInput);

    const confidence = priceEstimate.confidence_score || 0.85;
    const requiresHuman = confidence < 0.7 || priceEstimate.price_range.max > 5000000;

    return {
      success: true,
      agent_type: 'pricing',
      output_data: {
        price_range: priceEstimate.price_range,
        breakdown: priceEstimate.breakdown,
        currency: 'VND',
        confidence_score: confidence,
        valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      confidence_score: confidence,
      next_agent: requiresHuman ? undefined : 'matching',
      requires_human: requiresHuman,
    };
  }

  /**
   * Matching Agent - Find optimal worker
   */
  private async executeMatchingAgent(
    sessionId: string,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<AgentResponse> {
    console.log('[MatchingAgent] Finding workers');

    const matchingInput = {
      device_type: inputData.device_type,
      issue: inputData.diagnosed_issue,
      location: inputData.location || context.location,
      preferred_time: inputData.preferred_time,
      price_range: inputData.price_range,
      required_skills: inputData.required_skills,
    };

    const matchResult = await this.aiProvider.matchWorker(matchingInput);

    const confidence = matchResult.confidence_score || 0.8;
    const requiresHuman = !matchResult.workers || matchResult.workers.length === 0;

    return {
      success: true,
      agent_type: 'matching',
      output_data: {
        matched_workers: matchResult.workers || [],
        top_worker: matchResult.workers?.[0],
        match_reasons: matchResult.reasons,
        confidence_score: confidence,
      },
      confidence_score: confidence,
      next_agent: 'quality',
      requires_human: requiresHuman,
    };
  }

  /**
   * Quality Agent - Validate solution quality
   */
  private async executeQualityAgent(
    sessionId: string,
    inputData: Record<string, any>,
    context: Record<string, any>
  ): Promise<AgentResponse> {
    console.log('[QualityAgent] Validating quality');

    const qualityInput = {
      diagnosis: inputData.diagnosed_issue,
      proposed_solution: inputData.recommended_solution,
      price: inputData.price_range,
      worker: inputData.top_worker,
      customer_history: context.customer_history,
    };

    const qualityCheck = await this.aiProvider.checkQuality(qualityInput);

    const confidence = qualityCheck.confidence_score || 0.9;
    const requiresHuman = !qualityCheck.approved || qualityCheck.risk_level === 'high';

    return {
      success: true,
      agent_type: 'quality',
      output_data: {
        approved: qualityCheck.approved,
        risk_level: qualityCheck.risk_level,
        quality_score: qualityCheck.quality_score,
        flags: qualityCheck.flags,
        recommendations: qualityCheck.recommendations,
        confidence_score: confidence,
      },
      confidence_score: confidence,
      next_agent: null,
      requires_human: requiresHuman,
    };
  }

  /**
   * Save agent state to database
   */
  private async saveAgentState(state: AgentState): Promise<void> {
    const { data, error } = await this.supabase
      .from('agent_states')
      .insert(state)
      .select('id')
      .single();

    if (error) {
      console.error('[Orchestrator] Failed to save agent state:', error);
    } else {
      state.id = data?.id;
    }
  }

  /**
   * Log inter-agent communication
   */
  private async logAgentCommunication(comm: {
    session_id: string;
    from_agent: string;
    to_agent: string;
    payload: any;
    response?: any;
  }): Promise<void> {
    const startTime = Date.now();
    
    const { error } = await this.supabase
      .from('agent_communications')
      .insert({
        session_id: comm.session_id,
        from_agent: comm.from_agent,
        to_agent: comm.to_agent,
        message_type: 'data_transfer',
        payload: comm.payload,
        response: comm.response,
        latency_ms: Date.now() - startTime,
      });

    if (error) {
      console.error('[Orchestrator] Failed to log communication:', error);
    }
  }

  /**
   * Get agent states for session
   */
  async getSessionStates(sessionId: string): Promise<AgentState[]> {
    const { data, error } = await this.supabase.rpc('get_agent_state_by_session', {
      p_session_id: sessionId,
    });

    if (error) {
      throw new Error(`Failed to get session states: ${error.message}`);
    }

    return data || [];
  }
}

// Export factory function
export function createAgentOrchestrator(): AgentOrchestrator {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  return new AgentOrchestrator(supabaseUrl, supabaseKey);
}
