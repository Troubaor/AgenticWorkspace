// QStash Workflow: Task Planner Agent
// Triggers on TASK_CREATED, explodes tasks into smart subtasks
import { serve } from "@upstash/workflow/nextjs";
import { TaskManager, sql } from "@/lib/database";

export const { POST } = serve(async (context) => {
  const { taskId, userId } = context.requestPayload as { taskId: string; userId: string };
  
  // Step 1: Fetch task details
  const task = await context.run("fetch-task", async () => {
    const result = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
    return result[0];
  });

  if (!task || task.parent_id) {
    // Skip planning for subtasks or missing tasks
    return { skipped: true, reason: "Not a root task" };
  }

  // Step 2: Analyze task complexity and context
  const analysis = await context.run("analyze-task", async () => {
    const prompt = `
You are the PLANNER agent. Analyze this task and determine if it needs subtasks.

TASK: ${task.title}
DESCRIPTION: ${task.description || 'No description'}
CONTEXT: ${JSON.stringify(task.context)}
ESTIMATED HOURS: ${task.estimated_hours || 'Not specified'}

Rules:
1. Only create subtasks if the task is genuinely complex (>2 hours or multiple distinct phases)
2. Maximum 7 subtasks
3. Each subtask should be 15-90 minutes of focused work
4. Include clear "done when" criteria
5. Consider dependencies between subtasks

Return JSON:
{
  "needsSubtasks": boolean,
  "reasoning": "why or why not",
  "estimatedComplexity": 1-5,
  "suggestedDuration": hours,
  "subtasks": [
    {
      "title": "Specific actionable title",
      "description": "Clear done-when criteria",
      "estimatedHours": number,
      "tags": ["relevant", "tags"],
      "dependencies": [index_of_prerequisite_subtasks]
    }
  ]
}`;

    // Call your Gemini API here
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.3,
          maxOutputTokens: 2048 
        }
      })
    });

    const result = await response.json();
    const content = result.candidates[0].content.parts[0].text;
    
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { needsSubtasks: false };
    } catch {
      return { needsSubtasks: false, reasoning: "Failed to parse AI response" };
    }
  });

  // Step 3: Create subtasks if recommended
  if (analysis.needsSubtasks && analysis.subtasks?.length) {
    const subtasks = await context.run("create-subtasks", async () => {
      const created = [];
      
      for (const [index, subtask] of analysis.subtasks.entries()) {
        const newTask = await TaskManager.createTask(userId, {
          title: subtask.title,
          description: subtask.description,
          parent_id: taskId,
          estimated_hours: subtask.estimatedHours,
          tags: subtask.tags || [],
          context: {
            dependencies: subtask.dependencies || [],
            plannedOrder: index,
            parentComplexity: analysis.estimatedComplexity
          }
        });
        created.push(newTask);
      }
      
      return created;
    });

    // Step 4: Update parent task with planning results
    await context.run("update-parent", async () => {
      await TaskManager.updateTask(taskId, {
        estimated_hours: analysis.suggestedDuration,
        context: {
          ...task.context,
          planningCompleted: true,
          complexityScore: analysis.estimatedComplexity,
          subtaskCount: subtasks.length,
          planningReasoning: analysis.reasoning
        }
      });
    });

    // Step 5: Emit planning completion event
    await context.run("emit-planning-event", async () => {
      const { redis } = await import("@/lib/database");
      await redis.xadd('events:task', {
        type: 'META_PLAN_READY',
        taskId,
        userId,
        subtaskCount: subtasks.length.toString(),
        complexity: analysis.estimatedComplexity.toString(),
        ts: Date.now().toString()
      });
    });

    return {
      success: true,
      subtasksCreated: subtasks.length,
      complexity: analysis.estimatedComplexity,
      reasoning: analysis.reasoning
    };
  }

  return {
    success: true,
    subtasksCreated: 0,
    reasoning: analysis.reasoning || "Task doesn't need subtasks"
  };
});