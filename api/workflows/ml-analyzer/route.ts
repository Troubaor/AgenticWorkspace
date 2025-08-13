// QStash Workflow: ML Pattern Analyzer
// Analyzes user patterns and updates reinforcement learning models
import { serve } from "@upstash/workflow/nextjs";
import { TaskManager, sql, redis } from "@/lib/database";

export const { POST } = serve(async (context) => {
  const { userId, type, taskId } = context.requestPayload as { 
    userId: string; 
    type: string;
    taskId?: string;
  };

  // Step 1: Gather historical data for analysis
  const historicalData = await context.run("gather-historical-data", async () => {
    // Get recent completed tasks with scores
    const recentTasks = await sql`
      SELECT t.*, ts.*, 
        EXTRACT(HOUR FROM t.completed_at) as completion_hour,
        EXTRACT(DOW FROM t.completed_at) as completion_day,
        (t.completed_at - t.created_at) as total_duration
      FROM tasks t
      LEFT JOIN task_scores ts ON t.id = ts.task_id
      WHERE t.user_id = ${userId} 
        AND t.status = 'done'
        AND t.completed_at > NOW() - INTERVAL '90 days'
      ORDER BY t.completed_at DESC
      LIMIT 50
    `;

    // Get user's calendar/session data
    const sessions = await sql`
      SELECT * FROM user_sessions
      WHERE user_id = ${userId}
        AND started_at > NOW() - INTERVAL '30 days'
      ORDER BY started_at DESC
    `;

    return { recentTasks, sessions };
  });

  // Step 2: Analyze completion patterns
  const completionPatterns = await context.run("analyze-completion-patterns", async () => {
    const { recentTasks } = historicalData;
    if (recentTasks.length < 5) return null;

    // Time-of-day analysis
    const hourlyStats = {};
    recentTasks.forEach(task => {
      const hour = task.completion_hour;
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { count: 0, avgQuality: 0, avgSpeed: 0 };
      }
      hourlyStats[hour].count++;
      hourlyStats[hour].avgQuality += task.quality || 3;
      hourlyStats[hour].avgSpeed += task.speed || 3;
    });

    // Calculate averages
    Object.values(hourlyStats).forEach((stats: any) => {
      stats.avgQuality /= stats.count;
      stats.avgSpeed /= stats.count;
    });

    // Find optimal hours (high quality + speed, sufficient sample size)
    const optimalHours = Object.entries(hourlyStats)
      .filter(([_, stats]: [string, any]) => stats.count >= 2)
      .sort((a, b) => {
        const scoreA = (a[1].avgQuality + a[1].avgSpeed) / 2;
        const scoreB = (b[1].avgQuality + b[1].avgSpeed) / 2;
        return scoreB - scoreA;
      })
      .slice(0, 3)
      .map(([hour, stats]) => ({ hour: parseInt(hour), ...stats }));

    // Day-of-week analysis
    const dayStats = {};
    recentTasks.forEach(task => {
      const day = task.completion_day;
      if (!dayStats[day]) {
        dayStats[day] = { count: 0, avgProductivity: 0 };
      }
      dayStats[day].count++;
      dayStats[day].avgProductivity += (task.overall_score || 50);
    });

    Object.values(dayStats).forEach((stats: any) => {
      stats.avgProductivity /= stats.count;
    });

    return {
      optimalHours,
      dayStats,
      hourlyStats,
      sampleSize: recentTasks.length
    };
  });

  // Step 3: Analyze task complexity patterns
  const complexityPatterns = await context.run("analyze-complexity-patterns", async () => {
    const { recentTasks } = historicalData;
    
    // Group by difficulty level
    const difficultyGroups = {};
    recentTasks.forEach(task => {
      const diff = task.difficulty || 3;
      if (!difficultyGroups[diff]) {
        difficultyGroups[diff] = { 
          count: 0, 
          avgCompletionRate: 0, 
          avgTimeAccuracy: 0,
          avgSatisfaction: 0
        };
      }
      difficultyGroups[diff].count++;
      
      if (task.estimated_hours && task.actual_hours) {
        const accuracy = Math.min(task.estimated_hours / task.actual_hours, 2); // Cap at 2x
        difficultyGroups[diff].avgTimeAccuracy += accuracy;
      }
      
      difficultyGroups[diff].avgSatisfaction += task.user_satisfaction || 3;
    });

    // Calculate averages and confidence
    Object.values(difficultyGroups).forEach((group: any) => {
      group.avgTimeAccuracy /= group.count;
      group.avgSatisfaction /= group.count;
      group.confidence = Math.min(group.count / 5, 1); // Max confidence at 5+ samples
    });

    return { difficultyGroups };
  });

  // Step 4: Generate predictions for future tasks
  const predictions = await context.run("generate-predictions", async () => {
    if (!completionPatterns) return null;

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Predict optimal scheduling based on patterns
    const nextOptimalSlots = completionPatterns.optimalHours
      .map(slot => {
        const hoursFromNow = (slot.hour - currentHour + 24) % 24;
        return {
          ...slot,
          hoursFromNow,
          recommendationScore: (slot.avgQuality + slot.avgSpeed) / 2
        };
      })
      .sort((a, b) => a.hoursFromNow - b.hoursFromNow);

    return {
      nextOptimalSlots,
      currentProductivity: completionPatterns.dayStats[currentDay]?.avgProductivity || 50,
      recommendation: nextOptimalSlots[0]
    };
  });

  // Step 5: Update stored patterns
  await context.run("update-patterns", async () => {
    if (completionPatterns) {
      await TaskManager.storePattern(
        userId,
        'optimal_scheduling',
        {
          optimalHours: completionPatterns.optimalHours,
          dayStats: completionPatterns.dayStats,
          lastUpdated: new Date().toISOString(),
          predictions: predictions
        },
        Math.min(completionPatterns.sampleSize / 20, 1) // Confidence based on sample size
      );
    }

    if (complexityPatterns) {
      await TaskManager.storePattern(
        userId,
        'complexity_handling',
        {
          difficultyGroups: complexityPatterns.difficultyGroups,
          lastUpdated: new Date().toISOString()
        },
        0.8 // High confidence for difficulty patterns
      );
    }
  });

  // Step 6: Generate AI-powered insights
  const insights = await context.run("generate-ai-insights", async () => {
    if (!completionPatterns || !complexityPatterns) return [];

    const prompt = `
You are an AI productivity analyst. Based on this user's task completion data, generate 3-5 actionable insights.

COMPLETION PATTERNS:
- Sample size: ${completionPatterns.sampleSize} tasks
- Optimal hours: ${completionPatterns.optimalHours.map(h => `${h.hour}:00 (quality: ${h.avgQuality.toFixed(1)}, speed: ${h.avgSpeed.toFixed(1)})`).join(', ')}
- Current recommendations: ${predictions?.recommendation ? `Best next slot is ${predictions.recommendation.hour}:00` : 'Need more data'}

COMPLEXITY HANDLING:
${Object.entries(complexityPatterns.difficultyGroups).map(([diff, stats]: [string, any]) => 
  `- Difficulty ${diff}: ${stats.count} tasks, time accuracy: ${(stats.avgTimeAccuracy * 100).toFixed(0)}%, satisfaction: ${stats.avgSatisfaction.toFixed(1)}/5`
).join('\n')}

Generate practical insights in this format:
{
  "insights": [
    {
      "type": "scheduling|estimation|difficulty|energy",
      "title": "Brief insight title",
      "description": "Actionable advice based on data",
      "confidence": 0.1-1.0,
      "actionable": "Specific next step"
    }
  ]
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
          temperature: 0.3,
          maxOutputTokens: 1024 
        }
      })
    });

    const result = await response.json();
    const content = result.candidates[0].content.parts[0].text;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]).insights : [];
    } catch {
      return [];
    }
  });

  // Step 7: Store insights and emit events
  await context.run("store-insights", async () => {
    if (insights.length > 0) {
      await TaskManager.storePattern(
        userId,
        'ai_insights',
        {
          insights,
          generatedAt: new Date().toISOString(),
          basedOnTasks: completionPatterns?.sampleSize || 0
        },
        0.7
      );

      // Emit insights ready event
      await redis.xadd('events:ml', {
        type: 'INSIGHTS_GENERATED',
        userId,
        insightCount: insights.length.toString(),
        ts: Date.now().toString()
      });
    }
  });

  // Step 8: Update user recommendations cache
  await context.run("cache-recommendations", async () => {
    const recommendations = {
      scheduling: predictions?.nextOptimalSlots || [],
      insights: insights,
      patterns: {
        completion: completionPatterns,
        complexity: complexityPatterns
      },
      lastUpdated: new Date().toISOString()
    };

    await redis.setex(`user:${userId}:recommendations`, 3600, JSON.stringify(recommendations));
  });

  return {
    success: true,
    patternsAnalyzed: [
      completionPatterns ? 'completion_timing' : null,
      complexityPatterns ? 'complexity_handling' : null
    ].filter(Boolean),
    insightsGenerated: insights.length,
    predictions: predictions ? {
      nextOptimalHour: predictions.recommendation?.hour,
      currentProductivity: predictions.currentProductivity
    } : null
  };
});