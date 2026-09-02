'use client';

import { useState } from 'react';
import { getStructuredAgentGuidance } from '@/domain/webmcp/agent-guidance';
import { useProjectStore } from '@/state/project-store';
import { Badge } from '../atoms/Badge';
import { SolarIcon } from '../atoms/SolarIcon';

export function WebMCPActivityDrawer() {
  const { isWebMCPDrawerOpen, toggleWebMCPDrawer, webMCPLogs } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'logs' | 'playbook'>('logs');

  if (!isWebMCPDrawerOpen) return null;

  const guidance = getStructuredAgentGuidance();

  return (
    <div
      className="webmcp-activity-drawer has-background-white"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: 480,
        height: 420,
        zIndex: 50,
        borderTop: '2px solid var(--color-primary)',
        borderLeft: '1px solid var(--color-line)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        className="p-3 is-flex is-align-items-center is-justify-content-between has-background-light"
        style={{ borderBottom: '1px solid var(--color-line)' }}
      >
        <div className="is-flex is-align-items-center" style={{ gap: 8 }}>
          <SolarIcon name="solar:user-speak-linear" size={18} className="has-text-primary" />
          <h4 className="is-size-6 has-text-weight-bold mb-0">WebMCP Activity & Playbook</h4>
          <Badge variant="primary" size="sm">
            Live Protocol
          </Badge>
        </div>
        <button type="button" className="delete" aria-label="close" onClick={toggleWebMCPDrawer} />
      </div>

      {/* Tabs */}
      <div className="tabs is-small is-boxed mb-0 px-3 pt-2 has-background-light">
        <ul>
          <li className={activeTab === 'logs' ? 'is-active' : ''}>
            <button
              type="button"
              className="button is-ghost is-small p-2"
              onClick={() => setActiveTab('logs')}
            >
              <span>Tool Invocations ({webMCPLogs.length})</span>
            </button>
          </li>
          <li className={activeTab === 'playbook' ? 'is-active' : ''}>
            <button
              type="button"
              className="button is-ghost is-small p-2"
              onClick={() => setActiveTab('playbook')}
            >
              <span>Agent Playbook & Rules</span>
            </button>
          </li>
        </ul>
      </div>

      {/* Content Area */}
      <div className="p-3 is-flex-grow-1" style={{ overflowY: 'auto' }}>
        {activeTab === 'logs' ? (
          webMCPLogs.length === 0 ? (
            <div className="has-text-centered py-6 has-text-grey">
              <SolarIcon
                name="solar:widget-3-linear"
                size={32}
                className="mb-2 has-text-grey-light"
              />
              <p className="is-size-7 mb-1">No WebMCP agent tool calls recorded yet.</p>
              <p className="is-size-7 has-text-grey-light">
                When an agent executes tools via ChatGPT or Chrome, real-time invocation payloads
                appear here.
              </p>
            </div>
          ) : (
            webMCPLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 mb-2 is-size-7 has-background-light"
                style={{
                  borderRadius: 6,
                  borderLeft: `3px solid ${
                    log.isError ? 'var(--color-danger)' : 'var(--color-primary)'
                  }`,
                }}
              >
                <div className="is-flex is-align-items-center is-justify-content-between mb-1">
                  <code className="has-text-weight-bold has-text-primary">{log.toolName}()</code>
                  <span className="has-text-grey-light">{log.timestamp}</span>
                </div>
                <pre
                  className="p-1 mb-1 is-size-7"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 4,
                    maxHeight: 70,
                    overflowY: 'auto',
                    fontSize: 11,
                  }}
                >
                  {JSON.stringify(log.args, null, 2)}
                </pre>
                <p className="has-text-dark mb-0 font-mono" style={{ fontSize: 11 }}>
                  → {log.resultSummary}
                </p>
              </div>
            ))
          )
        ) : (
          <div className="is-size-7">
            <h5 className="has-text-weight-bold has-text-primary mb-2">
              Recommended Agent Workflow Sequence:
            </h5>
            <ol className="pl-4 mb-4">
              {guidance.recommendedWorkflowSequence.map((step) => (
                <li key={step.step} className="mb-2">
                  <strong>
                    Step {step.step}: <code>{step.primaryTool}</code>
                  </strong>
                  <div className="has-text-grey">{step.description}</div>
                </li>
              ))}
            </ol>

            <h5 className="has-text-weight-bold has-text-primary mb-2">
              Key NKBA Architectural Formulas:
            </h5>
            <ul className="pl-4 mb-3">
              {guidance.nkbaArchitecturalRules.map((rule) => (
                <li key={rule.ruleId} className="mb-2">
                  <strong>{rule.title}:</strong> <code>{rule.formula}</code>
                  <div className="has-text-grey">{rule.resolutionStrategy}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
