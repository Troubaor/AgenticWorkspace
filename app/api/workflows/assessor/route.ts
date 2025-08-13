// QStash Workflow: Task Assessor Agent
// Triggers on TASK_COMPLETED, scores performance and awards XP
import { serve } from "@upstash/workflow/nextjs";
import { TaskManager, sql, redis } from "@/lib/database";

export const { POST } = serve(async (context) => {
  const { taskId, userId, completedAt } = context.requestPayload as { 
    taskId: string; 
    userId: string; 
    completedAt: string;
  };
  
  // Step 1: Gather task data and context
  const taskData = await context.run("gather-task-data", async () => {
    const task = await sql`SELECT * FROM tasks WHERE id = ${taskId}`.then(r => r[0]);
    
    // Get user's recent performance for context
    const recentTasks = await sql`
      SELECT t.*, ts.* FROM tasks t
      LEFT JOIN task_scores ts ON t.id = ts.task_id
      WHERE t.user_id = ${userId} 
        AND t.status = 'done' 
        AND t.completed_at > NOW() - INTERVAL '30 days'
      ORDER BY t.completed_at DESC
      LIMIT 10
    `;

    // Get subtasks if any
    const subtasks = await sql`
      SELECT * FROM tasks 
      WHERE parent_id = ${taskId}
      ORDER BY created_at
    `;

    return { task, recentTasks, subtasks };
  });

  const { task, recentTasks, subtasks } = taskData;
  if (!task) return { error: "Task not found" };

  // Step 2: Calculate time-based metrics
  const timeMetrics = await context.run("calculate-time-metrics", async () => {
    const estimatedMs = (task.estimated_hours || 1) * 60 * 60 * 1000;
    const actualMs = task.completed_at 
      ? new Date(task.completed_at).getTime() - new Date(task.started_at || task.created_at).getTime()
      : estimatedMs;
    
    const actualHours = actualMs / (60 * 60 * 1000);
    const speedRatio = task.estimated_hours ? (task.estimated_hours / actualHours) : 1;
    
    // Update actual time in database
    await TaskManager.updateTask(taskId, { actual_hours: actualHours });
    
    return {
      estimatedHours: task.estimated_hours || 1,
      actualHours,
      speedRatio,
      wasOnTime: speedRatio >= 0.8 // Within 125% of estimate = good
    };
  });

  // Step 3: AI-powered assessment
  const assessment = await context.run("ai-assessment", async () => {
    const avgScores = recentTasks.length > 0 ? {
      difficulty: recentTasks.reduce((s, t) => s + (t.difficulty || 3), 0) / recentTasks.length,
      innovation: recentTasks.reduce((s, t) => s + (t.innovation || 3), 0) / recentTasks.length,
      quality: recentTasks.reduce((s, t) => s + (t.quality || 3), 0) / recentTasks.length,
      speed: recentTasks.reduce((s, t) => s + (t.speed || 3), 0) / recentTasks.length,
    } : { difficulty: 3, innovation: 3, quality: 3, speed: 3 };

    const prompt = `
You are the ASSESSOR agent. Score this completed task on 4 dimensions (1-5 scale).

TASK: ${task.title}
DESCRIPTION: ${task.description || 'No description'}
SUBTASKS: ${subtasks.length} subtasks
ESTIMATED: ${timeMetrics.estimatedHours}h
ACTUAL: ${timeMetrics.actualHours.toFixed(1)}h  
SPEED RATIO: ${timeMetrics.speedRatio.toFixed(2)} (${timeMetrics.wasOnTime ? 'ON TIME' : 'OVER TIME'})

USER'S RECENT AVERAGES:
- Difficulty: ${avgScores.difficulty.toFixed(1)}
- Innovation: ${avgScores.innovation.toFixed(1)}  
- Quality: ${avgScores.quality.toFixed(1)}
- Speed: ${avgScores.speed.toFixed(1)}

SCORING GUIDELINES:
DIFFICULTY (1=trivial, 5=extremely challenging):
- Consider technical complexity, unknowns, learning required
- Factor in context and user's skill level

INNOVATION (1=routine, 5=breakthrough):
- Novel approaches, creative solutions, new techniques
- Building something unique vs following patterns

QUALITY (1=rough, 5=excellent):
- Thoroughness, attention to detail, robustness
- Would this work well in production?

SPEED (1=very slow, 5=very fast):
- Compare actual vs estimated time
- Consider complexity - speed isn't just about time

Return JSON only:
{
  "difficulty": 1-5,
  "innovation": 1-5,
  "quality": 1-5,
  "speed": 1-5,
  "reasoning": {
    "difficulty": "why this score",
    "innovation": "why this score", 
    "quality": "why this score",
    "speed": "why this score"
  },
  "highlights": ["notable achievements"],
  "improvements": ["suggestions for next time"]
}`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.4,
          maxOutputTokens: 1024 
        }
      })
    });

    const result = await response.json();
    const content = result.candidates[0].content.parts[0].text;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return null;
    }
  });

  if (!assessment) {
    return { error: "Failed to generate assessment" };
  }

  // Step 4: Calculate final scores and XP
  const finalScores = await context.run("calculate-final-scores", async () => {
    const weights = { difficulty: 3, innovation: 3, quality: 4, speed: 2 };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    
    const overall = Math.round(
      (assessment.difficulty * weights.difficulty +
       assessment.innovation * weights.innovation +
       assessment.quality * weights.quality +
       assessment.speed * weights.speed) / totalWeight * 20
    );

    // XP formula: base (overall/10) + bonuses
    let xp = Math.round(overall / 10);
    
    // Bonuses
    if (assessment.innovation >= 5) xp += 3; // Innovation bonus
    if (assessment.quality >= 5) xp += 2;   // Quality bonus
    if (timeMetrics.wasOnTime) xp += 1;     // On-time bonus
    if (subtasks.length > 0) xp += 1;       // Planning bonus
    
    return { overall, xp };
  });

  // Step 5: Store scores in database
  await context.run("store-scores", async () => {
    await TaskManager.scoreTask(taskId, {
      difficulty: assessment.difficulty,
      innovation: assessment.innovation,
      quality: assessment.quality,
      speed: assessment.speed,
      overall_score: finalScores.overall,
      xp_earned: finalScores.xp,
      user_notes: `${assessment.highlights?.join('; ')}. Improvements: ${assessment.improvements?.join('; ')}`
    });
  });

  // Step 6: Check for achievements
  const achievements = await context.run("check-achievements", async () => {
    const earned = [];
    
    // Get user stats
    const userStats = await redis.hgetall(`user:${userId}:stats`);
    const totalXp = parseInt(userStats.total_xp || '0') + finalScores.xp;
    const tasksCompleted = parseInt(userStats.tasks_completed || '0') + 1;
    
    // Update stats
    await redis.hset(`user:${userId}:stats`, {
      total_xp: totalXp,
      tasks_completed: tasksCompleted,
      last_completed: completedAt
    });

    // Check achievement thresholds
    const achievements = await sql`SELECT * FROM achievements`;
    
    for (const achievement of achievements) {
      const hasEarned = await redis.sismember(`user:${userId}:achievements`, achievement.slug);
      if (hasEarned) continue;

      let shouldEarn = false;
      
      switch (achievement.slug) {
        case 'first_blood':
          shouldEarn = tasksCompleted === 1;
          break;
        case 'innovator_50':
          shouldEarn = assessment.innovation >= 4 && totalXp >= 50;
          break;
        case 'speed_demon':
          shouldEarn = assessment.speed >= 4 && timeMetrics.wasOnTime;
          break;
        case 'perfectionist':
          shouldEarn = assessment.quality >= 5;
          break;
        // Add more achievement logic here
      }

      if (shouldEarn) {
        await redis.sadd(`user:${userId}:achievements`, achievement.slug);
        earned.push(achievement);
        
        // Emit achievement event
        await redis.xadd('events:task', {
          type: 'ACHIEVEMENT_UNLOCKED',
          userId,
          achievement: achievement.slug,
          achievementName: achievement.name,
          ts: Date.now().toString()
        });
      }
    }
    
    return earned;
  });

  // Step 7: Trigger reinforcement learning update
  await context.run("trigger-ml-update", async () => {
    // This will trigger the ML pipeline to update patterns
    await redis.xadd('events:ml', {
      type: 'TASK_SCORED',
      taskId,
      userId,
      scores: JSON.stringify(assessment),
      timeMetrics: JSON.stringify(timeMetrics),
      ts: Date.now().toString()
    });
  });

  return {
    success: true,
    scores: {
      ...assessment,
      overall: finalScores.overall,
      xp: finalScores.xp
    },
    achievements: achievements.map(a => a.slug),
    timeMetrics
  };
});