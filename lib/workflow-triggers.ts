// Workflow Trigger System
// Listens to Redis events and triggers QStash workflows
import { Client } from "@upstash/workflow";
import { redis } from "./database";

const workflowClient = new Client({
  baseUrl: process.env.QSTASH_URL!,
  token: process.env.QSTASH_TOKEN!,
});

interface EventHandler {
  eventType: string;
  handler: (eventData: any) => Promise<void>;
}

export class WorkflowOrchestrator {
  private handlers: EventHandler[] = [];
  private isRunning = false;

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Task creation triggers planning
    this.handlers.push({
      eventType: 'TASK_CREATED',
      handler: this.triggerPlanner.bind(this)
    });

    // Task completion triggers assessment
    this.handlers.push({
      eventType: 'TASK_COMPLETED', 
      handler: this.triggerAssessor.bind(this)
    });

    // Scoring triggers ML analysis
    this.handlers.push({
      eventType: 'TASK_SCORED',
      handler: this.triggerMLAnalysis.bind(this)
    });

    // Periodic pattern analysis
    this.handlers.push({
      eventType: 'DAILY_ANALYSIS',
      handler: this.triggerDailyAnalysis.bind(this)
    });
  }

  async triggerPlanner(eventData: any) {
    const { taskId, userId } = eventData;
    
    try {
      await workflowClient.trigger({
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/workflows/planner`,
        body: JSON.stringify({ taskId, userId }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`Triggered planner workflow for task ${taskId}`);
    } catch (error) {
      console.error('Failed to trigger planner:', error);
    }
  }

  async triggerAssessor(eventData: any) {
    const { taskId, userId, completedAt } = eventData;
    
    try {
      await workflowClient.trigger({
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/workflows/assessor`,
        body: JSON.stringify({ taskId, userId, completedAt }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`Triggered assessor workflow for task ${taskId}`);
    } catch (error) {
      console.error('Failed to trigger assessor:', error);
    }
  }

  async triggerMLAnalysis(eventData: any) {
    const { userId, taskId } = eventData;
    
    try {
      await workflowClient.trigger({
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/workflows/ml-analyzer`,
        body: JSON.stringify({ userId, type: 'task_completion', taskId }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`Triggered ML analysis for user ${userId}`);
    } catch (error) {
      console.error('Failed to trigger ML analysis:', error);
    }
  }

  async triggerDailyAnalysis(eventData: any) {
    const { userId } = eventData;
    
    try {
      await workflowClient.trigger({
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/workflows/ml-analyzer`,
        body: JSON.stringify({ userId, type: 'daily_analysis' }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`Triggered daily analysis for user ${userId}`);
    } catch (error) {
      console.error('Failed to trigger daily analysis:', error);
    }
  }

  // Main event loop
  async startEventLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    let lastEventId = '$'; // Start from latest

    while (this.isRunning) {
      try {
        // Listen for task events
        const taskEvents = await redis.xread(
          'BLOCK', 5000, // 5 second timeout
          'STREAMS', 'events:task', lastEventId
        );

        if (taskEvents && taskEvents.length > 0) {
          const [_streamName, events] = taskEvents[0];
          
          for (const [eventId, fields] of events) {
            lastEventId = eventId;
            
            // Parse event data
            const eventData: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              eventData[fields[i]] = fields[i + 1];
            }

            // Find and execute handler
            const handler = this.handlers.find(h => h.eventType === eventData.type);
            if (handler) {
              await handler.handler(eventData);
            }
          }
        }

        // Also check for ML events
        const mlEvents = await redis.xread(
          'BLOCK', 1000,
          'STREAMS', 'events:ml', '$'
        );

        if (mlEvents && mlEvents.length > 0) {
          const [_streamName, events] = mlEvents[0];
          
          for (const [eventId, fields] of events) {
            const eventData: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              eventData[fields[i]] = fields[i + 1];
            }

            if (eventData.type === 'TASK_SCORED') {
              await this.triggerMLAnalysis(eventData);
            }
          }
        }

      } catch (error) {
        console.error('Event loop error:', error);
        // Short delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  stopEventLoop() {
    this.isRunning = false;
  }

  // Manual trigger methods for testing/debugging
  async manualTriggerPlanner(taskId: string, userId: string) {
    await this.triggerPlanner({ taskId, userId });
  }

  async manualTriggerAssessor(taskId: string, userId: string, completedAt?: string) {
    await this.triggerAssessor({ 
      taskId, 
      userId, 
      completedAt: completedAt || new Date().toISOString() 
    });
  }

  async manualTriggerMLAnalysis(userId: string) {
    await this.triggerMLAnalysis({ userId, type: 'manual' });
  }
}

// Singleton instance for the application
export const workflowOrchestrator = new WorkflowOrchestrator();

// Auto-start in production (you'd typically do this in a background service)
if (process.env.NODE_ENV === 'production') {
  workflowOrchestrator.startEventLoop().catch(console.error);
}

// Cron job trigger for daily analysis
export async function scheduleDailyAnalysis() {
  // This would typically be called by a cron job or scheduled task
  // For now, we'll trigger it manually or via API
  
  // Get all active users (simplified - you'd want to batch this)
  const activeUsers = await redis.smembers('active_users');
  
  for (const userId of activeUsers) {
    await workflowOrchestrator.triggerDailyAnalysis({ userId });
  }
}