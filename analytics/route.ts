// Calendar Analytics API
// Provides calendar data with ML insights and patterns
import { NextRequest, NextResponse } from 'next/server';
import { sql, redis, TaskManager } from '@/lib/database';
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'u_king';
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start and end dates required' }, { status: 400 });
  }

  try {
    // Fetch tasks for the date range
    const tasks = await sql`
      SELECT t.*, ts.difficulty, ts.innovation, ts.quality, ts.speed, 
             ts.overall_score, ts.xp_earned, ts.user_satisfaction,
             EXTRACT(HOUR FROM t.completed_at) as completion_hour,
             EXTRACT(DOW FROM t.completed_at) as completion_day,
             CASE 
               WHEN t.due_at IS NOT NULL THEN DATE(t.due_at)
               WHEN t.completed_at IS NOT NULL THEN DATE(t.completed_at)
               ELSE DATE(t.created_at)
             END as calendar_date
      FROM tasks t
      LEFT JOIN task_scores ts ON t.id = ts.task_id
      WHERE t.user_id = ${userId}
        AND (
          (t.due_at IS NOT NULL AND DATE(t.due_at) BETWEEN ${startDate} AND ${endDate})
          OR (t.completed_at IS NOT NULL AND DATE(t.completed_at) BETWEEN ${startDate} AND ${endDate})
          OR (t.due_at IS NULL AND t.completed_at IS NULL AND DATE(t.created_at) BETWEEN ${startDate} AND ${endDate})
        )
      ORDER BY calendar_date, t.created_at
    `;

    // Group tasks by date
    const tasksByDate: Record<string, any[]> = {};
    tasks.forEach(task => {
      const date = task.calendar_date;
      if (!tasksByDate[date]) tasksByDate[date] = [];
      tasksByDate[date].push(task);
    });

    // Get user patterns from ML analysis
    const patterns = await redis.get(`user:${userId}:recommendations`);
    const parsedPatterns = patterns ? JSON.parse(patterns as string) : null;

    // Get calendar entries for energy levels
    const calendarEntries = await sql`
      SELECT date, AVG(energy_level) as avg_energy, 
             SUM(EXTRACT(EPOCH FROM actual_time)/3600) as total_hours
      FROM calendar_entries
      WHERE user_id = ${userId}
        AND date BETWEEN ${startDate} AND ${endDate}
      GROUP BY date
    `;

    const energyLevels: Record<string, number> = {};
    calendarEntries.forEach(entry => {
      energyLevels[entry.date] = Math.round(entry.avg_energy || 3);
    });

    // Calculate weekly/monthly aggregates
    const completedTasks = tasks.filter(t => t.status === 'done');
    const totalXP = completedTasks.reduce((sum, t) => sum + (t.xp_earned || 0), 0);
    const avgScore = completedTasks.length > 0 
      ? completedTasks.reduce((sum, t) => sum + (t.overall_score || 0), 0) / completedTasks.length 
      : 0;

    // Hour-based performance analysis
    const hourlyPerformance: Record<number, { count: number; avgScore: number; avgXP: number }> = {};
    completedTasks.forEach(task => {
      const hour = task.completion_hour || 9;
      if (!hourlyPerformance[hour]) {
        hourlyPerformance[hour] = { count: 0, avgScore: 0, avgXP: 0 };
      }
      hourlyPerformance[hour].count++;
      hourlyPerformance[hour].avgScore += task.overall_score || 0;
      hourlyPerformance[hour].avgXP += task.xp_earned || 0;
    });

    // Calculate averages
    Object.values(hourlyPerformance).forEach(perf => {
      perf.avgScore /= perf.count;
      perf.avgXP /= perf.count;
    });

    // Find optimal hours (high performance + sufficient sample size)
    const optimalHours = Object.entries(hourlyPerformance)
      .filter(([_, perf]) => perf.count >= 2)
      .sort((a, b) => {
        const scoreA = (a[1].avgScore + a[1].avgXP * 10) / 2;
        const scoreB = (b[1].avgScore + b[1].avgXP * 10) / 2;
        return scoreB - scoreA;
      })
      .slice(0, 3)
      .map(([hour, perf]) => ({
        hour: parseInt(hour),
        performance: (perf.avgScore + perf.avgXP * 10) / 2,
        sampleSize: perf.count
      }));

    // Velocity trends (last 4 weeks vs previous 4 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const trendTasks = await sql`
      SELECT DATE(completed_at) as date, COUNT(*) as daily_count
      FROM tasks
      WHERE user_id = ${userId}
        AND status = 'done'
        AND completed_at >= ${eightWeeksAgo.toISOString()}
      GROUP BY DATE(completed_at)
      ORDER BY date
    `;

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const recentTasks = trendTasks.filter(t => new Date(t.date) >= fourWeeksAgo);
    const olderTasks = trendTasks.filter(t => new Date(t.date) < fourWeeksAgo);
    
    const recentAvg = recentTasks.length > 0 
      ? recentTasks.reduce((sum, t) => sum + t.daily_count, 0) / recentTasks.length 
      : 0;
    const olderAvg = olderTasks.length > 0 
      ? olderTasks.reduce((sum, t) => sum + t.daily_count, 0) / olderTasks.length 
      : 0;

    let velocityTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg > olderAvg * 1.15) velocityTrend = 'up';
    else if (recentAvg < olderAvg * 0.85) velocityTrend = 'down';

    // Predict next optimal slot
    const now = new Date();
    const currentHour = now.getHours();
    const nextOptimalSlot = optimalHours.length > 0 
      ? optimalHours.find(slot => slot.hour > currentHour) || optimalHours[0]
      : { hour: 9, performance: 50, sampleSize: 1 };

    // Build response
    const analyticsData = {
      tasksByDate,
      energyLevels,
      summary: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
        totalXP,
        avgScore
      },
      patterns: {
        optimalHours,
        hourlyPerformance,
        avgDifficulty: completedTasks.length > 0 
          ? completedTasks.reduce((sum, t) => sum + (t.difficulty || 3), 0) / completedTasks.length 
          : 3,
        nextOptimalSlot: {
          day: nextOptimalSlot.hour > currentHour ? 'today' : 'tomorrow',
          hour: nextOptimalSlot.hour,
          confidence: Math.min(nextOptimalSlot.sampleSize / 5, 1)
        },
        velocityTrend
      },
      ml: parsedPatterns
    };

    // Cache the response for 5 minutes
    const cacheKey = `calendar:${userId}:${startDate}:${endDate}`;
    await redis.setex(cacheKey, 300, JSON.stringify(analyticsData));

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Calendar analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar analytics' }, 
      { status: 500 }
    );
  }
}