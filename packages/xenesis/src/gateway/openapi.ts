export const gatewayOpenApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Xenesis Gateway API",
    version: "0.1.0",
    description: "Local HTTP and SSE API for Xenesis prompt runs, dashboard data, checks, reports, profiles, tasks, and context."
  },
  servers: [
    { url: "/" }
  ],
  security: [],
  tags: [
    { name: "Gateway" },
    { name: "Runs" },
    { name: "Reports" },
    { name: "Profiles" },
    { name: "Sessions" },
    { name: "Context" },
    { name: "Tasks" },
    { name: "Schedules" },
    { name: "Observability" },
    { name: "Checks" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Required for all non-public gateway routes. Use XENESIS_GATEWAY_TOKEN, --auth-token-env, or the generated GatewayHandle.authToken."
      }
    },
    schemas: {
      GatewayError: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" }
        },
        additionalProperties: false
      },
      GatewayRunRequest: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: { type: "string", minLength: 1 },
          workflow: { type: "string" },
          configPath: { type: "string" },
          ideContext: {
            type: "object",
            additionalProperties: true
          }
        },
        additionalProperties: false
      },
      GatewayWorkflow: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          metadata: {
            type: "object",
            additionalProperties: true
          }
        },
        additionalProperties: false
      },
      GatewayWorkflowStepRun: {
        type: "object",
        required: ["workflow", "step", "index", "total", "status", "startedAt"],
        properties: {
          workflow: { $ref: "#/components/schemas/GatewayWorkflow" },
          step: { $ref: "#/components/schemas/GatewayWorkflow" },
          index: { type: "integer" },
          total: { type: "integer" },
          status: { type: "string", enum: ["running", "completed", "failed"] },
          startedAt: { type: "string", format: "date-time" },
          endedAt: { type: "string", format: "date-time" },
          durationMs: { type: "number" },
          sessionId: { type: "string" },
          exitCode: { type: "integer" },
          error: { type: "string" }
        },
        additionalProperties: false
      },
      GatewayRunResponse: {
        type: "object",
        required: ["id", "traceId", "workflow", "exitCode", "events", "output", "errors"],
        properties: {
          id: { type: "string" },
          traceId: { type: "string" },
          workflow: { $ref: "#/components/schemas/GatewayWorkflow" },
          sessionId: { type: "string" },
          exitCode: { type: "integer" },
          events: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayRunEvent" }
          },
          workflowSteps: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayWorkflowStepRun" }
          },
          output: { type: "string" },
          errors: { type: "string" }
        },
        additionalProperties: false
      },
      GatewayRunEvent: {
        type: "object",
        description: "A JSON event emitted by the Xenesis agent runtime.",
        additionalProperties: true
      },
      GatewayActiveRun: {
        type: "object",
        required: ["id", "traceId", "workflow", "status", "prompt", "startedAt"],
        properties: {
          id: { type: "string" },
          traceId: { type: "string" },
          workflow: { $ref: "#/components/schemas/GatewayWorkflow" },
          sessionId: { type: "string" },
          status: { type: "string", enum: ["running"] },
          prompt: { type: "string" },
          startedAt: { type: "string", format: "date-time" },
          workflowSteps: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayWorkflowStepRun" }
          }
        },
        additionalProperties: false
      },
      GatewayFailurePatterns: {
        type: "object",
        required: ["topFailedTools", "repairStopReasons", "handoffBottlenecks"],
        properties: {
          topFailedTools: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "failures", "calls", "runCount", "latestSessionId"],
              properties: {
                name: { type: "string" },
                failures: { type: "integer" },
                calls: { type: "integer" },
                runCount: { type: "integer" },
                latestSessionId: { type: "string" },
                latestTraceId: { type: "string" }
              },
              additionalProperties: false
            }
          },
          repairStopReasons: {
            type: "array",
            items: {
              type: "object",
              required: ["reason", "count", "failedCommands", "latestSessionId"],
              properties: {
                reason: { type: "string" },
                count: { type: "integer" },
                failedCommands: {
                  type: "array",
                  items: { type: "string" }
                },
                latestSessionId: { type: "string" },
                latestTraceId: { type: "string" }
              },
              additionalProperties: false
            }
          },
          handoffBottlenecks: {
            type: "array",
            items: {
              type: "object",
              required: ["handoffId", "title", "total", "queued", "running", "blocked", "active", "labels"],
              properties: {
                handoffId: { type: "string" },
                title: { type: "string" },
                total: { type: "integer" },
                queued: { type: "integer" },
                running: { type: "integer" },
                blocked: { type: "integer" },
                failed: { type: "integer" },
                completed: { type: "integer" },
                cancelled: { type: "integer" },
                active: { type: "integer" },
                labels: {
                  type: "array",
                  items: { type: "string" }
                },
                blockedReasons: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              additionalProperties: false
            }
          }
        },
        additionalProperties: false
      },
      GatewayAdaptivePolicy: {
        type: "object",
        required: [
          "active",
          "rules",
          "priorityTools",
          "cautionTools",
          "repairCommands",
          "handoffIds",
          "requiredBefore",
          "recoveryActions",
          "longRunningStrategy",
          "toolStrategy",
          "contextStrategy",
          "subagentStrategy",
          "providerStrategy",
          "externalStrategy",
          "detail"
        ],
        properties: {
          active: { type: "boolean" },
          rules: {
            type: "array",
            items: { type: "string" }
          },
          priorityTools: {
            type: "array",
            items: { type: "string" }
          },
          cautionTools: {
            type: "array",
            items: { type: "string" }
          },
          repairCommands: {
            type: "array",
            items: { type: "string" }
          },
          handoffIds: {
            type: "array",
            items: { type: "string" }
          },
          requiredBefore: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: { type: "string" }
            }
          },
          recoveryActions: {
            type: "array",
            items: { type: "string" }
          },
          longRunningStrategy: {
            type: "object",
            required: ["mode", "priorityTools", "stopConditions"],
            properties: {
              mode: { type: "string", enum: ["handoff-first", "recover-existing-handoff"] },
              priorityTools: {
                type: "array",
                items: { type: "string" }
              },
              stopConditions: {
                type: "array",
                items: { type: "string" }
              }
            },
            additionalProperties: false
          },
          toolStrategy: {
            type: "object",
            required: ["preferredTools", "cautionTools", "avoidDuplicateTools"],
            properties: {
              preferredTools: {
                type: "array",
                items: { type: "string" }
              },
              cautionTools: {
                type: "array",
                items: { type: "string" }
              },
              avoidDuplicateTools: {
                type: "array",
                items: { type: "string" }
              }
            },
            additionalProperties: false
          },
          contextStrategy: {
            type: "object",
            required: ["injectionOrder", "memoryUse", "staleContextPolicy"],
            properties: {
              injectionOrder: {
                type: "array",
                items: { type: "string" }
              },
              memoryUse: { type: "string" },
              staleContextPolicy: { type: "string" }
            },
            additionalProperties: false
          },
          subagentStrategy: {
            type: "object",
            required: ["recommendedAgents", "routeWhen"],
            properties: {
              recommendedAgents: {
                type: "array",
                items: { type: "string" }
              },
              routeWhen: {
                type: "array",
                items: { type: "string" }
              }
            },
            additionalProperties: false
          },
          providerStrategy: {
            type: "object",
            required: ["retry", "fallback", "escalationSignals"],
            properties: {
              retry: { type: "string" },
              fallback: { type: "string" },
              escalationSignals: {
                type: "array",
                items: { type: "string" }
              }
            },
            additionalProperties: false
          },
          externalStrategy: {
            type: "object",
            required: ["statusFields", "channelGuidance"],
            properties: {
              statusFields: {
                type: "array",
                items: { type: "string" }
              },
              channelGuidance: { type: "string" }
            },
            additionalProperties: false
          },
          detail: { type: "string" }
        },
        additionalProperties: false
      },
      GatewayStatus: {
        type: "object",
        description: "Operational gateway status. Additional properties are intentionally preserved for dashboard compatibility.",
        properties: {
          diagnostics: {
            type: "object",
            properties: {
              failurePatterns: { $ref: "#/components/schemas/GatewayFailurePatterns" },
              adaptivePolicy: { $ref: "#/components/schemas/GatewayAdaptivePolicy" }
            },
            additionalProperties: true
          }
        },
        additionalProperties: true
      },
      GatewaySessionStatus: {
        type: "object",
        required: ["id", "status", "phase", "summary", "updatedAt"],
        properties: {
          id: { type: "string" },
          traceId: { type: "string" },
          status: { type: "string" },
          phase: { type: "string" },
          summary: { type: "string" },
          updatedAt: { type: "string", format: "date-time" }
        },
        additionalProperties: false
      },
      GatewayTraceRunReport: {
        type: "object",
        required: ["id", "sessionId", "traceId", "createdAt", "status", "turns", "eventCount", "messageCount", "toolCallCount", "toolResultCount"],
        properties: {
          id: { type: "string" },
          sessionId: { type: "string" },
          traceId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          status: { type: "string" },
          phase: { type: "string" },
          turns: { type: "integer" },
          eventCount: { type: "integer" },
          messageCount: { type: "integer" },
          toolCallCount: { type: "integer" },
          toolResultCount: { type: "integer" },
          metrics: {
            type: "object",
            additionalProperties: true
          },
          toolPolicy: {
            type: "object",
            required: [
              "policyName",
              "priorityTools",
              "requiredBefore",
              "requiredBeforeAny",
              "allowCount",
              "denyCount",
              "nextActions"
            ],
            properties: {
              policyName: { type: "string" },
              priorityTools: {
                type: "array",
                items: { type: "string" }
              },
              requiredBefore: {
                type: "object",
                additionalProperties: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              requiredBeforeAny: {
                type: "object",
                additionalProperties: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              allowCount: { type: "integer" },
              denyCount: { type: "integer" },
              nextActions: {
                type: "array",
                items: { type: "string" }
              }
            },
            additionalProperties: false
          },
          handoffs: {
            type: "array",
            items: {
              type: "object",
              required: [
                "toolCallId",
                "taskCount",
                "dependencyCount",
                "dependencyLabelCount",
                "labels",
                "queued"
              ],
              properties: {
                toolCallId: { type: "string" },
                handoffId: { type: "string" },
                title: { type: "string" },
                taskCount: { type: "integer" },
                dependencyCount: { type: "integer" },
                dependencyLabelCount: { type: "integer" },
                labels: {
                  type: "array",
                  items: { type: "string" }
                },
                queued: { type: "boolean" }
              },
              additionalProperties: false
            }
          },
          workflowSteps: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayWorkflowStepRun" }
          },
          verification: { $ref: "#/components/schemas/GatewayTraceVerificationSummary" }
        },
        additionalProperties: false
      },
      GatewayTraceVerificationSummary: {
        type: "object",
        required: ["status", "commandCount", "passed", "failed", "failedCommands"],
        properties: {
          status: { type: "string" },
          commandCount: { type: "integer" },
          passed: { type: "integer" },
          failed: { type: "integer" },
          failedCommands: {
            type: "array",
            items: { type: "string" }
          }
        },
        additionalProperties: false
      },
      GatewayTraceTaskExecution: {
        type: "object",
        required: [
          "taskCount",
          "handoffTaskCount",
          "queuedCount",
          "runningCount",
          "completedCount",
          "failedCount",
          "cancelledCount",
          "blockedCount",
          "retriedCount",
          "handoffIds"
        ],
        properties: {
          taskCount: { type: "integer" },
          handoffTaskCount: { type: "integer" },
          queuedCount: { type: "integer" },
          runningCount: { type: "integer" },
          completedCount: { type: "integer" },
          failedCount: { type: "integer" },
          cancelledCount: { type: "integer" },
          blockedCount: { type: "integer" },
          retriedCount: { type: "integer" },
          handoffIds: {
            type: "array",
            items: { type: "string" }
          }
        },
        additionalProperties: false
      },
      GatewayTraceDiagnostics: {
        type: "object",
        required: [
          "status",
          "retryCount",
          "fallbackCount",
          "failedToolCallCount",
          "permissionIssueCount",
          "toolPolicyIssueCount",
          "failedVerificationCount",
          "errorCount",
          "handoffCount",
          "handoffTaskCount",
          "handoffDependencyCount",
          "taskExecution",
          "providerRetries",
          "providerFallbacks",
          "failedToolCalls",
          "permissionIssues",
          "toolPolicyIssues",
          "errors"
        ],
        properties: {
          status: { type: "string", enum: ["ok", "warning", "failed"] },
          retryCount: { type: "integer" },
          fallbackCount: { type: "integer" },
          failedToolCallCount: { type: "integer" },
          permissionIssueCount: { type: "integer" },
          toolPolicyIssueCount: { type: "integer" },
          failedVerificationCount: { type: "integer" },
          errorCount: { type: "integer" },
          handoffCount: { type: "integer" },
          handoffTaskCount: { type: "integer" },
          handoffDependencyCount: { type: "integer" },
          taskExecution: { $ref: "#/components/schemas/GatewayTraceTaskExecution" },
          providerRetries: {
            type: "array",
            items: {
              type: "object",
              required: ["provider", "attempt", "maxRetries", "message"],
              properties: {
                provider: { type: "string" },
                attempt: { type: "integer" },
                maxRetries: { type: "integer" },
                message: { type: "string" }
              },
              additionalProperties: false
            }
          },
          providerFallbacks: {
            type: "array",
            items: {
              type: "object",
              required: ["from", "to", "message"],
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                message: { type: "string" }
              },
              additionalProperties: false
            }
          },
          failedToolCalls: {
            type: "array",
            items: {
              type: "object",
              required: ["toolCallId", "name", "content"],
              properties: {
                toolCallId: { type: "string" },
                name: { type: "string" },
                content: { type: "string" }
              },
              additionalProperties: false
            }
          },
          permissionIssues: {
            type: "array",
            items: {
              type: "object",
              required: ["toolCallId", "name", "status", "reason", "riskLevel", "summary", "hardDeny"],
              properties: {
                toolCallId: { type: "string" },
                name: { type: "string" },
                status: { type: "string" },
                reason: { type: "string" },
                riskLevel: { type: "string" },
                summary: { type: "string" },
                hardDeny: { type: "boolean" }
              },
              additionalProperties: false
            }
          },
          toolPolicyIssues: {
            type: "array",
            items: {
              type: "object",
              required: [
                "toolCallId",
                "name",
                "policyName",
                "reason",
                "requiredBefore",
                "missingBefore",
                "requiredBeforeAny",
                "missingBeforeAny",
                "priorityTools"
              ],
              properties: {
                toolCallId: { type: "string" },
                name: { type: "string" },
                policyName: { type: "string" },
                reason: { type: "string" },
                requiredBefore: {
                  type: "array",
                  items: { type: "string" }
                },
                missingBefore: {
                  type: "array",
                  items: { type: "string" }
                },
                requiredBeforeAny: {
                  type: "array",
                  items: { type: "string" }
                },
                missingBeforeAny: {
                  type: "array",
                  items: { type: "string" }
                },
                priorityTools: {
                  type: "array",
                  items: { type: "string" }
                },
                nextAction: { type: "string" }
              },
              additionalProperties: false
            }
          },
          errors: {
            type: "array",
            items: { type: "string" }
          },
          verification: { $ref: "#/components/schemas/GatewayTraceVerificationSummary" }
        },
        additionalProperties: false
      },
      GatewayTraceDetail: {
        type: "object",
        required: ["traceId", "activeRuns", "sessions", "runReports", "diagnostics", "tasks", "observability"],
        properties: {
          traceId: { type: "string" },
          activeRuns: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayActiveRun" }
          },
          sessions: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewaySessionStatus" }
          },
          runReports: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayTraceRunReport" }
          },
          workflowSteps: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayWorkflowStepRun" }
          },
          diagnostics: { $ref: "#/components/schemas/GatewayTraceDiagnostics" },
          tasks: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayTask" }
          },
          observability: {
            type: "object",
            required: ["summary", "events"],
            properties: {
              summary: { $ref: "#/components/schemas/GatewayObservabilitySummary" },
              events: {
                type: "array",
                items: { $ref: "#/components/schemas/GatewayObservabilityEvent" }
              }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      },
      GatewayTraceSummary: {
        type: "object",
        required: [
          "traceId",
          "status",
          "updatedAt",
          "activeRunCount",
          "sessionCount",
          "runReportCount",
          "observabilityEventCount",
          "diagnostics"
        ],
        properties: {
          traceId: { type: "string" },
          status: { type: "string", enum: ["ok", "warning", "failed"] },
          updatedAt: { type: "string" },
          activeRunCount: { type: "integer" },
          sessionCount: { type: "integer" },
          runReportCount: { type: "integer" },
          observabilityEventCount: { type: "integer" },
          diagnostics: { $ref: "#/components/schemas/GatewayTraceDiagnostics" }
        },
        additionalProperties: false
      },
      GatewayTraceList: {
        type: "object",
        required: ["traces", "summary"],
        properties: {
          traces: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayTraceSummary" }
          },
          summary: {
            type: "object",
            required: ["total", "failed", "warning", "ok"],
            properties: {
              total: { type: "integer" },
              failed: { type: "integer" },
              warning: { type: "integer" },
              ok: { type: "integer" }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      },
      GatewayTraceCompact: {
        type: "object",
        required: ["traceId", "sessions"],
        properties: {
          traceId: { type: "string" },
          sessions: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "status", "phase", "updatedAt", "compact"],
              properties: {
                id: { type: "string" },
                status: { type: "string" },
                phase: { type: "string" },
                updatedAt: { type: "string" },
                compact: { type: "string" }
              },
              additionalProperties: false
            }
          }
        },
        additionalProperties: false
      },
      GatewayTraceBundle: {
        type: "object",
        required: ["traceId", "exportedAt", "detail", "compact"],
        properties: {
          traceId: { type: "string" },
          exportedAt: { type: "string", format: "date-time" },
          detail: { $ref: "#/components/schemas/GatewayTraceDetail" },
          compact: { $ref: "#/components/schemas/GatewayTraceCompact" }
        },
        additionalProperties: false
      },
      GatewayReportSummary: {
        type: "object",
        required: ["kind", "id", "createdAt", "exitCode", "passed", "failed", "total"],
        properties: {
          kind: { type: "string", enum: ["smoke", "scenario", "connect", "provider-live"] },
          id: { type: "string" },
          createdAt: { type: "string" },
          exitCode: { type: "integer" },
          passed: { type: "integer" },
          failed: { type: "integer" },
          total: { type: "integer" }
        },
        additionalProperties: false
      },
      GatewayReportDetail: {
        type: "object",
        required: ["kind", "id", "path", "report"],
        properties: {
          kind: { type: "string", enum: ["smoke", "scenario", "connect", "provider-live"] },
          id: { type: "string" },
          path: { type: "string" },
          report: {
            type: "object",
            additionalProperties: true
          }
        },
        additionalProperties: false
      },
      GatewayActionResult: {
        type: "object",
        required: ["exitCode", "output", "errors"],
        properties: {
          exitCode: { type: "integer" },
          output: { type: "string" },
          errors: { type: "string" }
        },
        additionalProperties: false
      },
      GatewayObservabilityEvent: {
        type: "object",
        required: ["id", "timestamp", "kind"],
        properties: {
          id: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
          kind: { type: "string", enum: ["request", "response", "retry", "error", "task"] },
          method: { type: "string" },
          path: { type: "string" },
          url: { type: "string" },
          attempt: { type: "number" },
          status: { type: "number" },
          ok: { type: "boolean" },
          durationMs: { type: "number" },
          nextAttempt: { type: "number" },
          delayMs: { type: "number" },
          traceId: { type: "string" },
          runId: { type: "string" },
          taskId: { type: "string" },
          phase: { type: "string" },
          taskStatus: { type: "string" },
          maxAttempts: { type: "number" },
          label: { type: "string" },
          handoffId: { type: "string" },
          handoffTitle: { type: "string" },
          source: { type: "string" },
          subagent: { type: "string" },
          parentSessionId: { type: "string" },
          blockedBy: {
            type: "array",
            items: { type: "string" }
          },
          blockedReason: { type: "string" },
          error: {}
        },
        additionalProperties: false
      },
      GatewayObservabilityEventInput: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: { type: "string", enum: ["request", "response", "retry", "error", "task"] },
          method: { type: "string" },
          path: { type: "string" },
          url: { type: "string" },
          attempt: { type: "number" },
          status: { type: "number" },
          ok: { type: "boolean" },
          durationMs: { type: "number" },
          nextAttempt: { type: "number" },
          delayMs: { type: "number" },
          traceId: { type: "string" },
          runId: { type: "string" },
          taskId: { type: "string" },
          phase: { type: "string" },
          taskStatus: { type: "string" },
          maxAttempts: { type: "number" },
          label: { type: "string" },
          handoffId: { type: "string" },
          handoffTitle: { type: "string" },
          source: { type: "string" },
          subagent: { type: "string" },
          parentSessionId: { type: "string" },
          blockedBy: {
            type: "array",
            items: { type: "string" }
          },
          blockedReason: { type: "string" },
          error: {}
        },
        additionalProperties: false
      },
      GatewayObservabilitySummary: {
        type: "object",
        required: ["total", "request", "response", "retry", "error", "task"],
        properties: {
          total: { type: "integer" },
          request: { type: "integer" },
          response: { type: "integer" },
          retry: { type: "integer" },
          error: { type: "integer" },
          task: { type: "integer" }
        },
        additionalProperties: false
      },
      GatewayObservabilityRetention: {
        type: "object",
        required: ["maxEvents"],
        properties: {
          maxEvents: { type: "integer", minimum: 1 },
          maxAgeDays: { type: "integer", minimum: 1 }
        },
        additionalProperties: false
      },
      GatewayObservabilityExport: {
        type: "object",
        required: ["version", "exportedAt", "retention", "events"],
        properties: {
          version: { type: "integer", enum: [1] },
          exportedAt: { type: "string", format: "date-time" },
          retention: { $ref: "#/components/schemas/GatewayObservabilityRetention" },
          events: {
            type: "array",
            items: { $ref: "#/components/schemas/GatewayObservabilityEvent" }
          }
        },
        additionalProperties: false
      },
      GatewayObservabilityClearResult: {
        type: "object",
        required: ["cleared", "summary"],
        properties: {
          cleared: { type: "integer" },
          summary: { $ref: "#/components/schemas/GatewayObservabilitySummary" }
        },
        additionalProperties: false
      },
      GatewayProfile: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          provider: { type: "string" },
          model: { type: "string" },
          approvalMode: { type: "string" }
        },
        additionalProperties: false
      },
      GatewayTask: {
        type: "object",
        required: ["id", "status", "prompt", "updatedAt"],
        properties: {
          id: { type: "string" },
          status: { type: "string" },
          prompt: { type: "string" },
          sessionId: { type: "string" },
          parentSessionId: { type: "string" },
          source: { type: "string" },
          subagent: { type: "string" },
          label: { type: "string" },
          handoffId: { type: "string" },
          handoffTitle: { type: "string" },
          handoffOrder: { type: "integer" },
          handoffTotal: { type: "integer" },
          priority: { type: "integer" },
          dependsOn: {
            type: "array",
            items: { type: "string" }
          },
          blockedBy: {
            type: "array",
            items: { type: "string" }
          },
          blockedReason: { type: "string" },
          scheduleId: { type: "string" },
          approvalMode: { type: "string", enum: ["safe", "auto", "readonly"] },
          maxTurns: { type: "integer" },
          maxTokens: { type: "integer" },
          usage: {
            type: "object",
            properties: {
              inputTokens: { type: "integer" },
              outputTokens: { type: "integer" },
              totalTokens: { type: "integer" }
            },
            additionalProperties: false
          },
          artifactId: { type: "string" },
          attempts: { type: "integer" },
          attemptHistory: {
            type: "array",
            items: {
              type: "object",
              required: ["attempt", "status", "startedAt"],
              properties: {
                attempt: { type: "integer" },
                status: { type: "string" },
                startedAt: { type: "string", format: "date-time" },
                finishedAt: { type: "string", format: "date-time" },
                sessionId: { type: "string" },
                outputChars: { type: "integer" },
                error: { type: "string" }
              },
              additionalProperties: false
            }
          },
          output: { type: "string" },
          error: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          startedAt: { type: "string", format: "date-time" },
          finishedAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        additionalProperties: false
      },
      GatewaySchedule: {
        type: "object",
        required: ["id", "prompt", "enabled", "trigger", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          prompt: { type: "string" },
          enabled: { type: "boolean" },
          trigger: {
            oneOf: [
              {
                type: "object",
                required: ["type", "every"],
                properties: {
                  type: { const: "interval" },
                  every: { type: "string" }
                },
                additionalProperties: false
              },
              {
                type: "object",
                required: ["type", "at"],
                properties: {
                  type: { const: "daily" },
                  at: { type: "string" }
                },
                additionalProperties: false
              }
            ]
          },
          defaults: {
            type: "object",
            properties: {
              approvalMode: { type: "string", enum: ["safe", "auto", "readonly"] },
              maxTurns: { type: "integer" },
              maxTokens: { type: "integer" }
            },
            additionalProperties: false
          },
          lastFiredAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        additionalProperties: false
      }
    },
    responses: {
      GatewayError: {
        description: "Gateway request failed.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GatewayError" }
          }
        }
      },
      GatewayNotFound: {
        description: "Requested gateway resource was not found.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GatewayError" }
          }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Gateway"],
        summary: "Return gateway health metadata.",
        responses: {
          "200": {
            description: "Gateway is reachable."
          }
        }
      }
    },
    "/status": {
      get: {
        tags: ["Gateway"],
        summary: "Return operational dashboard status.",
        responses: {
          "200": {
            description: "Gateway status summary.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayStatus" }
              }
            }
          }
        }
      }
    },
    "/dashboard": {
      get: {
        tags: ["Gateway"],
        summary: "Return the Xenesis dashboard HTML.",
        responses: {
          "200": {
            description: "Dashboard HTML.",
            content: {
              "text/html": {
                schema: { type: "string" }
              }
            }
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        tags: ["Gateway"],
        summary: "Return this OpenAPI contract.",
        responses: {
          "200": {
            description: "OpenAPI document.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: true
                }
              }
            }
          }
        }
      }
    },
    "/channels/slack/events": {
      post: {
        tags: ["Channels"],
        summary: "Receive signed Slack Events API callbacks.",
        description: "This route is authenticated by Slack request signing headers and does not require gateway bearer auth.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Slack event acknowledged.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: true
                }
              },
              "text/plain": {
                schema: { type: "string" }
              }
            }
          },
          "400": { $ref: "#/components/responses/GatewayError" },
          "404": { $ref: "#/components/responses/GatewayNotFound" },
          "405": { $ref: "#/components/responses/GatewayError" }
        }
      }
    },
    "/channels/slack/interactions": {
      post: {
        tags: ["Channels"],
        summary: "Receive signed Slack interactive component callbacks.",
        description: "This route is authenticated by Slack request signing headers and does not require gateway bearer auth.",
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  payload: {
                    type: "string",
                    description: "URL-encoded Slack interaction payload JSON."
                  }
                },
                required: ["payload"],
                additionalProperties: true
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Slack interaction acknowledged.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: true
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/GatewayError" },
          "404": { $ref: "#/components/responses/GatewayNotFound" },
          "405": { $ref: "#/components/responses/GatewayError" }
        }
      }
    },
    "/runs": {
      get: {
        tags: ["Runs"],
        summary: "List active gateway prompt runs.",
        responses: {
          "200": {
            description: "Active runs.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["runs"],
                  properties: {
                    runs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewayActiveRun" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/workflows": {
      get: {
        tags: ["Runs"],
        summary: "List registered gateway prompt workflows.",
        responses: {
          "200": {
            description: "Registered gateway workflows.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["workflows"],
                  properties: {
                    workflows: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewayWorkflow" }
                    }
                  },
                  additionalProperties: false
                }
              }
            }
          }
        }
      }
    },
    "/observability/events/export": {
      get: {
        tags: ["Observability"],
        summary: "Export retained SDK observability events.",
        responses: {
          "200": {
            description: "Retained observability event export.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayObservabilityExport" }
              }
            }
          }
        }
      }
    },
    "/observability/events/clear": {
      post: {
        tags: ["Observability"],
        summary: "Clear retained SDK observability events.",
        responses: {
          "200": {
            description: "Clear result and empty summary.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayObservabilityClearResult" }
              }
            }
          }
        }
      }
    },
    "/reports": {
      get: {
        tags: ["Reports"],
        summary: "List saved smoke, scenario, connect, and provider-live reports.",
        parameters: [
          {
            name: "kind",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["smoke", "scenario", "connect", "provider-live"] }
          },
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["passed", "failed"] }
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 500 }
          }
        ],
        responses: {
          "200": {
            description: "Saved report summaries.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["reports"],
                  properties: {
                    reports: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewayReportSummary" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/reports/{kind}/{id}": {
      get: {
        tags: ["Reports"],
        summary: "Return one saved report detail.",
        parameters: [
          {
            name: "kind",
            in: "path",
            required: true,
            schema: { type: "string", enum: ["smoke", "scenario", "connect", "provider-live"] }
          },
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Saved report detail.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayReportDetail" }
              }
            }
          },
          "404": { $ref: "#/components/responses/GatewayNotFound" }
        }
      }
    },
    "/run": {
      post: {
        tags: ["Runs"],
        summary: "Run a prompt and return captured events.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GatewayRunRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Completed run with captured output.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayRunResponse" }
              }
            }
          },
          "400": { $ref: "#/components/responses/GatewayError" },
          "413": { $ref: "#/components/responses/GatewayError" },
          "429": { $ref: "#/components/responses/GatewayError" }
        }
      }
    },
    "/run/stream": {
      post: {
        tags: ["Runs"],
        summary: "Run a prompt and stream events as Server-Sent Events.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GatewayRunRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "SSE stream of gateway_run, agent events, and gateway_done.",
            content: {
              "text/event-stream": {
                schema: { type: "string" }
              }
            }
          },
          "400": { $ref: "#/components/responses/GatewayError" },
          "413": { $ref: "#/components/responses/GatewayError" },
          "429": { $ref: "#/components/responses/GatewayError" }
        }
      }
    },
    "/runs/{id}/cancel": {
      post: {
        tags: ["Runs"],
        summary: "Cancel an active gateway prompt run.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": { description: "Run cancellation was requested." },
          "404": { $ref: "#/components/responses/GatewayNotFound" }
        }
      }
    },
    "/checks/smoke": {
      post: {
        tags: ["Checks"],
        summary: "Run the CLI smoke check.",
        responses: {
          "200": {
            description: "CLI action result.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayActionResult" }
              }
            }
          }
        }
      }
    },
    "/checks/scenario": {
      post: {
        tags: ["Checks"],
        summary: "Run the CLI scenario check.",
        responses: {
          "200": {
            description: "CLI action result.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayActionResult" }
              }
            }
          }
        }
      }
    },
    "/checks/connect": {
      post: {
        tags: ["Checks"],
        summary: "Run the CLI connectivity check.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  probe: { type: "boolean" }
                },
                additionalProperties: false
              }
            }
          }
        },
        responses: {
          "200": {
            description: "CLI action result.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayActionResult" }
              }
            }
          }
        }
      }
    },
    "/profiles": {
      get: {
        tags: ["Profiles"],
        summary: "List saved profiles and the active profile.",
        responses: {
          "200": {
            description: "Profile state.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["active", "profiles"],
                  properties: {
                    active: { type: ["string", "null"] },
                    profiles: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewayProfile" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/profiles/use": {
      post: {
        tags: ["Profiles"],
        summary: "Set the active runtime profile.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 1 }
                },
                additionalProperties: false
              }
            }
          }
        },
        responses: {
          "200": { description: "Updated profile state." },
          "400": { $ref: "#/components/responses/GatewayError" }
        }
      }
    },
    "/profiles/clear": {
      post: {
        tags: ["Profiles"],
        summary: "Clear the active runtime profile.",
        responses: {
          "200": { description: "Updated profile state." }
        }
      }
    },
    "/sessions": {
      get: {
        tags: ["Sessions"],
        summary: "List session ids.",
        responses: {
          "200": { description: "Session id list." }
        }
      }
    },
    "/sessions/status": {
      get: {
        tags: ["Sessions"],
        summary: "List session lifecycle statuses.",
        responses: {
          "200": {
            description: "Session status list.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["sessions"],
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewaySessionStatus" }
                    }
                  },
                  additionalProperties: false
                }
              }
            }
          }
        }
      }
    },
    "/traces": {
      get: {
        tags: ["Observability"],
        summary: "List trace summaries with diagnostics for dashboard filtering.",
        responses: {
          "200": {
            description: "Trace summary list.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayTraceList" }
              }
            }
          }
        }
      }
    },
    "/traces/{traceId}": {
      get: {
        tags: ["Observability"],
        summary: "Return a trace drill-down across active runs, sessions, run reports, diagnostics, and observability events.",
        parameters: [
          {
            name: "traceId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Trace detail.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayTraceDetail" }
              }
            }
          }
        }
      }
    },
    "/traces/{traceId}/compact": {
      get: {
        tags: ["Observability"],
        summary: "Return compact session context for a trace.",
        parameters: [
          {
            name: "traceId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Trace compact context.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayTraceCompact" }
              }
            }
          }
        }
      }
    },
    "/traces/{traceId}/bundle": {
      get: {
        tags: ["Observability"],
        summary: "Export a diagnostic bundle for a trace.",
        parameters: [
          {
            name: "traceId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Trace diagnostic bundle.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayTraceBundle" }
              }
            }
          }
        }
      }
    },
    "/context": {
      get: {
        tags: ["Context"],
        summary: "Return the latest workspace context index.",
        responses: {
          "200": { description: "Workspace context index." }
        }
      }
    },
    "/artifacts": {
      get: {
        tags: ["Context"],
        summary: "List saved artifacts.",
        responses: {
          "200": { description: "Artifact summaries." }
        }
      }
    },
    "/artifacts/{id}": {
      get: {
        tags: ["Context"],
        summary: "Return one saved artifact.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": { description: "Artifact metadata and content." },
          "404": { $ref: "#/components/responses/GatewayNotFound" }
        }
      }
    },
    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List durable agent tasks.",
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["queued", "running", "completed", "failed", "cancelled", "blocked"] }
          },
          {
            name: "taskId",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "label",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "handoffId",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "handoffTitle",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 500 }
          }
        ],
        responses: {
          "200": {
            description: "Durable task list.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["tasks"],
                  properties: {
                    tasks: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewayTask" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a queued durable agent task.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt"],
                properties: {
                  prompt: { type: "string", minLength: 1 },
                  approvalMode: { type: "string", enum: ["safe", "auto", "readonly"] },
                  maxTurns: { type: "integer" },
                  maxTokens: { type: "integer" },
                  scheduleId: { type: "string" }
                },
                additionalProperties: false
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Queued task.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/GatewayTask" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/tasks/{id}/run": {
      post: {
        tags: ["Tasks"],
        summary: "Run one durable agent task through the CLI.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "CLI action result.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayActionResult" }
              }
            }
          }
        }
      }
    },
    "/tasks/{id}/cancel": {
      post: {
        tags: ["Tasks"],
        summary: "Cancel one durable agent task through the CLI.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "CLI action result.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GatewayActionResult" }
              }
            }
          }
        }
      }
    },
    "/schedules": {
      get: {
        tags: ["Schedules"],
        summary: "List task schedules.",
        responses: {
          "200": {
            description: "Schedule list.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schedules"],
                  properties: {
                    schedules: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewaySchedule" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Schedules"],
        summary: "Create a task schedule.",
        responses: {
          "201": {
            description: "Created schedule.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schedule"],
                  properties: {
                    schedule: { $ref: "#/components/schemas/GatewaySchedule" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/schedules/{id}": {
      patch: {
        tags: ["Schedules"],
        summary: "Update a task schedule.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Updated schedule.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schedule"],
                  properties: {
                    schedule: { $ref: "#/components/schemas/GatewaySchedule" }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ["Schedules"],
        summary: "Remove a task schedule.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Removed schedule."
          }
        }
      }
    },
    "/observability/events": {
      get: {
        tags: ["Observability"],
        summary: "List recent SDK observability events for dashboard consumers.",
        parameters: [
          {
            name: "kind",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["request", "response", "retry", "error", "task"] }
          },
          {
            name: "traceId",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "taskId",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "phase",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "taskStatus",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "label",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "handoffId",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "handoffTitle",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 500 }
          }
        ],
        responses: {
          "200": {
            description: "Recent observability events and summary metrics.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["summary", "events"],
                  properties: {
                    summary: { $ref: "#/components/schemas/GatewayObservabilitySummary" },
                    events: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewayObservabilityEvent" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Observability"],
        summary: "Record SDK observability events.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["events"],
                properties: {
                  events: {
                    type: "array",
                    items: { $ref: "#/components/schemas/GatewayObservabilityEventInput" }
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Accepted event count and updated summary.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["accepted", "summary", "events"],
                  properties: {
                    accepted: { type: "integer" },
                    summary: { $ref: "#/components/schemas/GatewayObservabilitySummary" },
                    events: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GatewayObservabilityEvent" }
                    }
                  }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/GatewayError" }
        }
      }
    }
  },
  webhooks: {},
  externalDocs: {
    description: "Xenesis usage guide",
    url: "docs/usage.md"
  }
} as const;
