'use client';

import React, { useState, useEffect } from 'react';
import { TaskManager } from '@/lib/database';

interface CalendarDay {
  date: string;
  tasks: any[];
  metrics: {
    planned: number;
    completed: number;
    completionRate: number;
    totalXP: number;
    avgScore: number;
    optimalHour?: number;
    energyLevel: number;
  };
}

interface CalendarAnalytics {
  velocity: {
    daily: number;
    weekly: number;
    trend: 'up' | 'down' | 'stable';
  };
  patterns: {
    bestDays: number[];
    bestHours: number[];
    avgDifficulty: number;
  };
  predictions: {
    nextOptimalSlot: { day: string; hour: number; confidence: number };
    weeklyTarget: number;
  };
}

export function AnalyticsCalendar({ userId = 'u_king' }: { userId?: string }) {
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [analytics, setAnalytics] = useState<CalendarAnalytics | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);

  // Generate calendar dates
  const generateCalendarDates = (mode: 'week' | 'month') => {
    const now = new Date();
    const dates = [];
    
    if (mode === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
    } else {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Add days from previous month to fill first week
      const firstDay = startOfMonth.getDay();
      for (let i = firstDay - 1; i >= 0; i--) {
        const date = new Date(startOfMonth);
        date.setDate(date.getDate() - i - 1);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      // Add all days of current month
      for (let day = 1; day <= endOfMonth.getDate(); day++) {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      // Add days from next month to fill last week
      const remaining = 42 - dates.length; // 6 weeks * 7 days
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(endOfMonth);
        date.setDate(endOfMonth.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  useEffect(() => {
    loadCalendarData();
  }, [viewMode, userId]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const dates = generateCalendarDates(viewMode);
      const startDate = new Date(dates[0]);
      const endDate = new Date(dates[dates.length - 1]);
      
      // Fetch calendar data from API
      const response = await fetch(`/api/calendar/analytics?userId=${userId}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      const data = await response.json();
      
      // Process calendar data
      const processedDays: CalendarDay[] = dates.map(date => {
        const dayTasks = data.tasksByDate[date] || [];
        const completed = dayTasks.filter((t: any) => t.status === 'done');
        const totalXP = completed.reduce((sum: number, t: any) => sum + (t.xp_earned || 0), 0);
        const avgScore = completed.length > 0 
          ? completed.reduce((sum: number, t: any) => sum + (t.overall_score || 0), 0) / completed.length 
          : 0;

        return {
          date,
          tasks: dayTasks,
          metrics: {
            planned: dayTasks.length,
            completed: completed.length,
            completionRate: dayTasks.length > 0 ? (completed.length / dayTasks.length) * 100 : 0,
            totalXP,
            avgScore,
            energyLevel: data.energyLevels?.[date] || 3
          }
        };
      });

      setCalendarData(processedDays);
      
      // Calculate analytics
      const analytics = calculateAnalytics(processedDays, data.patterns);
      setAnalytics(analytics);
      
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (days: CalendarDay[], patterns: any): CalendarAnalytics => {
    const recentDays = days.slice(-14); // Last 2 weeks
    const completedTasks = recentDays.flatMap(d => d.tasks.filter(t => t.status === 'done'));
    
    // Velocity calculation
    const dailyVelocity = completedTasks.length / recentDays.length;
    const weeklyVelocity = dailyVelocity * 7;
    
    // Trend analysis (compare first week vs second week)
    const firstWeek = recentDays.slice(0, 7);
    const secondWeek = recentDays.slice(7, 14);
    const firstWeekAvg = firstWeek.reduce((sum, d) => sum + d.metrics.completed, 0) / 7;
    const secondWeekAvg = secondWeek.reduce((sum, d) => sum + d.metrics.completed, 0) / 7;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (secondWeekAvg > firstWeekAvg * 1.1) trend = 'up';
    else if (secondWeekAvg < firstWeekAvg * 0.9) trend = 'down';

    // Best performing days and hours
    const dayPerformance = Array(7).fill(0).map((_, i) => {
      const dayTasks = recentDays.filter(d => new Date(d.date).getDay() === i);
      return dayTasks.reduce((sum, d) => sum + d.metrics.completionRate, 0) / Math.max(dayTasks.length, 1);
    });
    
    const bestDays = dayPerformance
      .map((perf, i) => ({ day: i, performance: perf }))
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3)
      .map(d => d.day);

    return {
      velocity: {
        daily: dailyVelocity,
        weekly: weeklyVelocity,
        trend
      },
      patterns: {
        bestDays,
        bestHours: patterns?.optimalHours?.map((h: any) => h.hour) || [],
        avgDifficulty: patterns?.avgDifficulty || 3
      },
      predictions: {
        nextOptimalSlot: patterns?.nextOptimalSlot || { day: 'today', hour: 9, confidence: 0.5 },
        weeklyTarget: Math.ceil(weeklyVelocity * 1.1)
      }
    };
  };

  const getDayColor = (day: CalendarDay) => {
    const { completionRate, totalXP } = day.metrics;
    
    if (completionRate >= 80 && totalXP >= 5) return 'bg-emerald-500/20 border-emerald-500';
    if (completionRate >= 60 || totalXP >= 3) return 'bg-amber-500/20 border-amber-500';
    if (day.metrics.planned > 0) return 'bg-rose-500/20 border-rose-500';
    return 'bg-zinc-800 border-zinc-700';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="mt-2 text-zinc-400">Analyzing patterns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with mode toggle and analytics summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Analytics Calendar</h2>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm ${viewMode === 'week' ? 'bg-emerald-600' : 'bg-zinc-800'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm ${viewMode === 'month' ? 'bg-emerald-600' : 'bg-zinc-800'}`}
            >
              Month
            </button>
          </div>
        </div>

        {analytics && (
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400">{analytics.velocity.daily.toFixed(1)}</div>
              <div className="text-zinc-400">Tasks/day</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">{analytics.velocity.weekly.toFixed(0)}</div>
              <div className="text-zinc-400">Tasks/week</div>
            </div>
            <div className="text-center">
              <div className="text-lg">{getTrendIcon(analytics.velocity.trend)}</div>
              <div className="text-zinc-400">Trend</div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-zinc-400">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarData.map((day, index) => (
          <div
            key={day.date}
            onClick={() => setSelectedDate(day.date)}
            className={`
              relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105
              ${getDayColor(day)}
              ${selectedDate === day.date ? 'ring-2 ring-emerald-400' : ''}
              min-h-[100px]
            `}
          >
            {/* Date number */}
            <div className="text-sm font-medium mb-1">
              {new Date(day.date).getDate()}
            </div>

            {/* Metrics */}
            <div className="space-y-1 text-xs">
              {day.metrics.planned > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Tasks:</span>
                  <span>{day.metrics.completed}/{day.metrics.planned}</span>
                </div>
              )}
              
              {day.metrics.totalXP > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">XP:</span>
                  <span className="text-emerald-400 font-medium">{day.metrics.totalXP}</span>
                </div>
              )}

              {day.metrics.completionRate > 0 && (
                <div className="w-full bg-zinc-700 rounded-full h-1">
                  <div 
                    className="bg-emerald-500 h-1 rounded-full"
                    style={{ width: `${day.metrics.completionRate}%` }}
                  />
                </div>
              )}
            </div>

            {/* Energy level indicator */}
            <div className="absolute top-1 right-1 flex">
              {Array.from({ length: day.metrics.energyLevel }, (_, i) => (
                <div key={i} className="w-1 h-1 bg-amber-400 rounded-full ml-0.5" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Insights Panel */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Performance Insights */}
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              🎯 Performance
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-400">Best days: </span>
                <span>
                  {analytics.patterns.bestDays.map(d => 
                    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]
                  ).join(', ')}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Optimal hours: </span>
                <span>
                  {analytics.patterns.bestHours.map(h => `${h}:00`).join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Predictions */}
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              🔮 Predictions
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-400">Next optimal: </span>
                <span className="text-emerald-400">
                  {analytics.predictions.nextOptimalSlot.day} at {analytics.predictions.nextOptimalSlot.hour}:00
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Weekly target: </span>
                <span className="text-amber-400">{analytics.predictions.weeklyTarget} tasks</span>
              </div>
            </div>
          </div>

          {/* Velocity Trends */}
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              ⚡ Velocity
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Daily avg:</span>
                <span>{analytics.velocity.daily.toFixed(1)} tasks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Trend:</span>
                <span className={`
                  ${analytics.velocity.trend === 'up' ? 'text-emerald-400' : 
                    analytics.velocity.trend === 'down' ? 'text-rose-400' : 'text-zinc-400'}
                `}>
                  {analytics.velocity.trend.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Details */}
      {selectedDate && (
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <h3 className="font-medium mb-3">
            Details for {new Date(selectedDate).toLocaleDateString()}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task list */}
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Tasks</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {calendarData.find(d => d.date === selectedDate)?.tasks.map((task, i) => (
                  <div key={i} className={`
                    p-2 rounded text-xs flex items-center justify-between
                    ${task.status === 'done' ? 'bg-emerald-900/30 text-emerald-200' : 'bg-zinc-800 text-zinc-300'}
                  `}>
                    <span>{task.title}</span>
                    {task.xp_earned && (
                      <span className="text-emerald-400">+{task.xp_earned}XP</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Day metrics */}
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Metrics</h4>
              <div className="space-y-2 text-sm">
                {Object.entries(calendarData.find(d => d.date === selectedDate)?.metrics || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span>
                      {typeof value === 'number' && key.includes('Rate') ? `${value.toFixed(0)}%` : 
                       typeof value === 'number' ? value.toFixed(1) : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}