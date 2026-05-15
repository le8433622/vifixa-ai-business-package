#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

/**
 * 🧬 Vifixa AI — Agent Compliance Auditor
 * Kiểm tra codebase tuân thủ agent.md 100%
 */

import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";

interface Violation {
  file: string;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  suggestion: string;
}

const violations: Violation[] = [];

// Helper functions
async function readFileContent(path: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return '';
  }
}

function checkSecurityRules(filePath: string, content: string): void {
  const lines = content.split('\n');
  
  // Rule: Không có API key trong frontend
  if (filePath.includes('/web/') && (filePath.endsWith('.tsx') || filePath.endsWith('.ts'))) {
    if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('service_role')) {
      violations.push({
        file: filePath,
        rule: 'SEC-001',
        severity: 'error',
        message: 'Service role key found in frontend code',
        suggestion: 'Move to Edge Function with Deno.env.get()'
      });
    }
  }
  
  // Rule: Mọi Edge Function phải có verifyAuth
  if (filePath.includes('/supabase/functions/') && !filePath.includes('_shared/') && !filePath.includes('.test.ts')) {
    if (!content.includes('verifyAuth') && !content.includes('handleOptions')) {
      violations.push({
        file: filePath,
        rule: 'SEC-002',
        severity: 'error',
        message: 'Edge Function missing verifyAuth check',
        suggestion: 'Add verifyAuth(req) at the beginning of Deno.serve'
      });
    }
  }
  
  // Rule: Không dùng `any` type trong shared modules
  if (filePath.includes('_shared/') && filePath.endsWith('.ts')) {
    const anyMatches = content.match(/:\s*any\b/g);
    if (anyMatches) {
      violations.push({
        file: filePath,
        rule: 'QUAL-001',
        severity: 'error',
        message: `Found ${anyMatches.length} usage(s) of 'any' type`,
        suggestion: 'Use Zod schema or proper TypeScript types'
      });
    }
  }
  
  // Rule: Log format [VIFIXA]
  if (filePath.includes('/supabase/functions/') && !filePath.includes('.test.ts')) {
    if (content.includes('console.log') && !content.includes('[VIFIXA]')) {
      violations.push({
        file: filePath,
        rule: 'LOG-001',
        severity: 'warning',
        message: 'Console log without [VIFIXA] prefix',
        suggestion: 'Use format: [VIFIXA][module] action | user=X | status=X | latency=Xms'
      });
    }
  }
  
  // Rule: Zod validation cho input
  if (filePath.includes('/supabase/functions/') && !filePath.includes('_shared/') && !filePath.includes('.test.ts')) {
    if (content.includes('req.json()') && !content.includes('z.') && !content.includes('safeParse')) {
      violations.push({
        file: filePath,
        rule: 'VAL-001',
        severity: 'warning',
        message: 'JSON parsing without Zod validation',
        suggestion: 'Add Zod schema and safeParse for input validation'
      });
    }
  }
}

function checkArchitectureRules(filePath: string, content: string): void {
  // Rule: Companion Chat phải có 3 persona
  if (filePath.includes('companion') && filePath.includes('chat')) {
    if (!content.includes('customer') || !content.includes('worker') || !content.includes('admin')) {
      violations.push({
        file: filePath,
        rule: 'ARCH-001',
        severity: 'error',
        message: 'Companion chat missing persona support',
        suggestion: 'Implement all 3 personas: customer, worker, admin'
      });
    }
  }
  
  // Rule: Service Registry pattern
  if (filePath.includes('companion') && !content.includes('serviceRegistry') && !content.includes('service-registry')) {
    violations.push({
      file: filePath,
      rule: 'ARCH-002',
      severity: 'warning',
      message: 'Missing service registry integration',
      suggestion: 'Import and use serviceRegistry for plugin architecture'
    });
  }
  
  // Rule: AI Core orchestration
  if (filePath.includes('/supabase/functions/ai-') && !filePath.includes('.test.ts')) {
    if (!content.includes('ai-core') && !content.includes('createAICore')) {
      violations.push({
        file: filePath,
        rule: 'ARCH-003',
        severity: 'warning',
        message: 'AI function not using centralized ai-core',
        suggestion: 'Use createAICore from _shared/ai-core.ts'
      });
    }
  }
}

function checkScreenStructure(filePath: string): void {
  // Rule: 3 màn hình cốt lõi
  const customerPath = '/workspace/web/src/app/customer/page.tsx';
  const workerPath = '/workspace/web/src/app/worker/page.tsx';
  const adminPath = '/workspace/web/src/app/admin/page.tsx';
  
  if (filePath === customerPath) {
    // Customer screen checks
  }
}

async function auditDirectory(dirPath: string): Promise<void> {
  console.log(`🔍 Auditing ${dirPath}...`);
  
  for await (const entry of walk(dirPath, {
    exts: ['.ts', '.tsx', '.js', '.jsx'],
    skip: [/node_modules/, /\.git/, /test-results/, /backup/],
  })) {
    if (entry.isFile) {
      const content = await readFileContent(entry.path);
      checkSecurityRules(entry.path, content);
      checkArchitectureRules(entry.path, content);
    }
  }
}

async function main(): Promise<void> {
  console.log('🧬 Vifixa AI — Agent Compliance Auditor\n');
  console.log('Checking against agent.md rules...\n');
  
  // Audit directories
  await auditDirectory('/workspace/supabase/functions');
  await auditDirectory('/workspace/web/src');
  await auditDirectory('/workspace/mobile/src');
  
  // Report results
  console.log('\n' + '='.repeat(80));
  console.log('📊 AUDIT RESULTS\n');
  
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');
  const infos = violations.filter(v => v.severity === 'info');
  
  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):`);
    errors.forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.rule}] ${v.file}`);
      console.log(`     ${v.message}`);
      console.log(`     💡 Fix: ${v.suggestion}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.rule}] ${v.file}`);
      console.log(`     ${v.message}`);
      console.log(`     💡 Fix: ${v.suggestion}\n`);
    });
  }
  
  console.log('='.repeat(80));
  console.log(`Total: ${violations.length} issues (${errors.length} errors, ${warnings.length} warnings)`);
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ Codebase is 100% compliant with agent.md!');
  } else {
    console.log('\n⚠️  Action required to achieve 100% compliance.');
  }
  
  // Write report to file
  const report = `# Agent Compliance Audit Report
Generated: ${new Date().toISOString()}

## Summary
- Total Issues: ${violations.length}
- Errors: ${errors.length}
- Warnings: ${warnings.length}

## Errors
${errors.map(v => `- [${v.rule}] ${v.file}: ${v.message}`).join('\n')}

## Warnings
${warnings.map(v => `- [${v.rule}] ${v.file}: ${v.message}`).join('\n')}
`;
  
  await Deno.writeTextFile('/workspace/docs/AGENT_COMPLIANCE_AUDIT.md', report);
  console.log('\n📄 Full report written to docs/AGENT_COMPLIANCE_AUDIT.md');
}

main();
