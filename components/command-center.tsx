'use client';

import React, { useState, useEffect } from 'react';
import { AnalyticsCalendar } from './analytics-calendar';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  progress: number;
  priority: number;
  estimated_hours?: number;
  due_at?: string;
  tags: string[];
  created_at: string;
  xp_earned?: number;
  overall_score?: number;
}

interface Pattern {
  type: string;
  data: any;
  confidence: number;
  insights: string[];
}

interface FocusSession {
  taskId: string;
  startTime: Date;
  targetDuration: number; // minutes
  actualDuration?: number;
  completed: boolean;
}

type ViewMode = 'tasks' | 'analytics' | 'patterns' | 'focus';

export function CommandCenter({ userId = 'u_king' }: { userId?: string }) {
  const [activeView, setActiveView] = useState<ViewMode>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeView, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeView) {
        case 'tasks':
          await loadTasks();
          break;
        case 'patterns':
          await loadPatterns();
          break;
        case 'focus':
          await loadFocusData();
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    const response = await fetch(`/api/tasks?userId=${userId}&status=active`);
    const data = await response.json();
    setTasks(data.tasks || []);
  };

  const loadPatterns = async () => {
    const response = await fetch(`/api/patterns?userId=${userId}`);
    const data = await response.json();
    setPatterns(data.patterns || []);
    setInsights(data.insights || []);
  };

  const loadFocusData = async () => {
    const response = await fetch(`/api/focus/session?userId=${userId}`);
    const data = await response.json();
    if (data.activeSession) {
      setFocusSession(data.activeSession);
    }
  };

  const ViewIcon = ({ view, active }: { view: ViewMode; active: boolean }) => {
    const icons = {
      tasks: active ? '📋' : '📄',
      analytics: active ? '📊' : '📈', 
      patterns: active ? '🧠' : '💡',
      focus: active ? '🎯' : '⏱️'
    };
    return <span className="text-lg">{icons[view]}</span>;
  };

  const renderTasksView = () => (
    <div className="space-y-4">
      {/* Quick Add */}
      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
        <QuickTaskAdd userId={userId} onTaskAdded={loadTasks} />
      </div>

      {/* Task Groups */}
      <div className="space-y-3">
        {['in_progress', 'todo', 'blocked'].map(status => {
          const statusTasks = tasks.filter(t => t.status === status);
          if (statusTasks.length === 0) return null;

          return (
            <div key={status} className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                {status.replace('_', ' ')} ({statusTasks.length})
              </h3>
              {statusTasks.map(task => (
                <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Recent Completions */}
      <div className="border-t border-zinc-800 pt-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-2">Recently Completed</h3>
        {tasks.filter(t => t.status === 'done').slice(0, 3).map(task => (
          <div key={task.id} className="flex items-center justify-between p-2 rounded bg-emerald-900/20 border border-emerald-800/50 mb-1">
            <span className="text-sm text-emerald-200">{task.title}</span>
            {task.xp_earned && (
              <span className="text-xs text-emerald-400">+{task.xp_earned}XP</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalyticsView = () => (
    <div className="space-y-4">
      <AnalyticsCalendar userId={userId} />
    </div>
  );

  const renderPatternsView = () => (
    <div className="space-y-4">
      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/50">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            🧠 AI Insights
          </h3>
          <div className="space-y-2">
            {insights.slice(0, 3).map((insight, i) => (
              <div key={i} className="p-3 rounded bg-zinc-900/50 border border-zinc-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-purple-300">{insight.title}</span>
                  <span className="text-xs text-zinc-400">{Math.round(insight.confidence * 100)}%</span>
                </div>
                <p className="text-sm text-zinc-300">{insight.description}</p>
                {insight.actionable && (
                  <div className="mt-2 p-2 rounded bg-blue-900/30 border border-blue-800/50">
                    <p className="text-xs text-blue-200">💡 {insight.actionable}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Analysis */}
      {patterns.map((pattern, i) => (
        <div key={i} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium capitalize">{pattern.type.replace('_', ' ')}</h3>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-zinc-400">{Math.round(pattern.confidence * 100)}%</span>
            </div>
          </div>
          
          {pattern.type === 'optimal_scheduling' && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-400">Best hours: </span>
                <span>{pattern.data.optimalHours?.map((h: any) => `${h.hour}:00`).join(', ')}</span>
              </div>
              <div>
                <span className="text-zinc-400">Next optimal: </span>
                <span className="text-emerald-400">
                  {pattern.data.predictions?.recommendation?.day} at {pattern.data.predictions?.recommendation?.hour}:00
                </span>
              </div>
            </div>
          )}

          {pattern.type === 'complexity_handling' && (
            <div className="space-y-1 text-sm">
              {Object.entries(pattern.data.difficultyGroups || {}).map(([diff, stats]: [string, any]) => (
                <div key={diff} className="flex justify-between">
                  <span className="text-zinc-400">Difficulty {diff}:</span>
                  <span>{Math.round(stats.avgTimeAccuracy * 100)}% accuracy</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Recommendations */}
      <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-800/50">
        <h3 className="font-medium mb-2 text-amber-200">🎯 Smart Recommendations</h3>
        <div className="space-y-2 text-sm">
          <div className="p-2 rounded bg-zinc-900/50">
            <p className="text-zinc-300">Schedule your most important task for tomorrow at 9:00 AM (peak performance time)</p>
          </div>
          <div className="p-2 rounded bg-zinc-900/50">
            <p className="text-zinc-300">Break down tasks over 3 hours - you complete 85% more when planned as subtasks</p>
          </div>
          <div className="p-2 rounded bg-zinc-900/50">
            <p className="text-zinc-300">Your quality scores are 23% higher on Tuesday/Wednesday - schedule complex work then</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFocusView = () => (
    <div className="space-y-4">
      {focusSession ? (
        <ActiveFocusSession 
          session={focusSession}
          onComplete={() => {
            setFocusSession(null);
            loadFocusData();
          }}
        />
      ) : (
        <FocusLauncher 
          tasks={tasks.filter(t => t.status !== 'done')}
          onStartSession={(session) => setFocusSession(session)}
        />
      )}

      {/* Focus Analytics */}
      <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
        <h3 className="font-medium mb-3">🎯 Focus Analytics</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">4.2h</div>
            <div className="text-zinc-400">Today's Focus</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">89%</div>
            <div className="text-zinc-400">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">25m</div>
            <div className="text-zinc-400">Avg Session</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">12</div>
            <div className="text-zinc-400">This Week</div>
          </div>
        </div>
      </div>

      {/* Pomodoro History */}
      <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
        <h3 className="font-medium mb-3">Recent Sessions</h3>
        <div className="space-y-2">
          {[
            { task: 'Fix auth bug', duration: '25m', completed: true, score: 95 },
            { task: 'Design API schema', duration: '45m', completed: true, score: 88 },
            { task: 'Write documentation', duration: '30m', completed: false, score: 0 },
          ].map((session, i) => (
            <div key={i} className={`
              p-2 rounded border flex items-center justify-between
              ${session.completed ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-rose-900/20 border-rose-800/50'}
            `}>
              <div>
                <div className="text-sm font-medium">{session.task}</div>
                <div className="text-xs text-zinc-400">{session.duration}</div>
              </div>
              {session.completed && (
                <div className="text-xs text-emerald-400">+{session.score}pts</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const views = [
    { key: 'tasks' as ViewMode, label: 'Tasks', badge: tasks.filter(t => t.status !== 'done').length },
    { key: 'analytics' as ViewMode, label: 'Analytics', badge: null },
    { key: 'patterns' as ViewMode, label: 'Patterns', badge: insights.length },
    { key: 'focus' as ViewMode, label: 'Focus', badge: focusSession ? '🔴' : null },
  ];

  return (
    <div className="w-80 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-emerald-400">Command Center</h1>
        <p className="text-xs text-zinc-500">AI-Powered Task Intelligence</p>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-zinc-800">
        {views.map(view => (
          <button
            key={view.key}
            onClick={() => setActiveView(view.key)}
            className={`
              flex-1 p-3 text-sm font-medium transition-colors relative
              ${activeView === view.key 
                ? 'text-emerald-400 bg-emerald-900/20 border-b-2 border-emerald-400' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <ViewIcon view={view.key} active={activeView === view.key} />
              <span className="text-xs">{view.label}</span>
            </div>
            {view.badge && (
              <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {view.badge}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          </div>
        ) : (
          <>
            {activeView === 'tasks' && renderTasksView()}
            {activeView === 'analytics' && renderAnalyticsView()}
            {activeView === 'patterns' && renderPatternsView()}
            {activeView === 'focus' && renderFocusView()}
          </>
        )}
      </div>
    </div>
  );
}

// Quick Task Add Component
function QuickTaskAdd({ userId, onTaskAdded }: { userId: string; onTaskAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsAdding(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), userId })
      });
      setTitle('');
      onTaskAdded();
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task..."
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
        disabled={isAdding}
      />
      <button
        type="submit"
        disabled={!title.trim() || isAdding}
        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded text-sm font-medium transition-colors"
      >
        {isAdding ? 'Adding...' : 'Add Task'}
      </button>
    </form>
  );
}

// Task Card Component
function TaskCard({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusColors = {
    todo: 'border-zinc-600 bg-zinc-900/50',
    in_progress: 'border-amber-600 bg-amber-900/20',
    blocked: 'border-rose-600 bg-rose-900/20',
    done: 'border-emerald-600 bg-emerald-900/20'
  };

  return (
    <div className={`p-3 rounded-lg border-2 ${statusColors[task.status]}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium flex-1">{task.title}</h4>
        <div className="flex items-center gap-1 ml-2">
          {task.priority >= 4 && <span className="text-rose-400 text-xs">🔥</span>}
          {task.estimated_hours && (
            <span className="text-xs text-zinc-400">{task.estimated_hours}h</span>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-zinc-400 mb-2">{task.description}</p>
      )}

      {task.progress > 0 && (
        <div className="mb-2">
          <div className="w-full bg-zinc-700 rounded-full h-1">
            <div 
              className="bg-emerald-500 h-1 rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">{task.progress}%</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {task.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-zinc-700 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex gap-1">
          {task.status !== 'done' && (
            <button
              onClick={() => updateStatus('done')}
              disabled={isUpdating}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-xs rounded transition-colors"
            >
              ✓
            </button>
          )}
          {task.status === 'todo' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={isUpdating}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-xs rounded transition-colors"
            >
              ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Focus Session Components (simplified)
function FocusLauncher({ tasks, onStartSession }: { tasks: Task[]; onStartSession: (session: FocusSession) => void }) {
  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50">
      <h3 className="font-medium mb-3">🎯 Start Focus Session</h3>
      <p className="text-sm text-zinc-300 mb-4">Select a task and duration to begin focused work</p>
      <div className="space-y-2">
        {tasks.slice(0, 3).map(task => (
          <button
            key={task.id}
            onClick={() => onStartSession({
              taskId: task.id,
              startTime: new Date(),
              targetDuration: 25,
              completed: false
            })}
            className="w-full p-2 text-left rounded bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-700 transition-colors"
          >
            <div className="text-sm font-medium">{task.title}</div>
            <div className="text-xs text-zinc-400">25 min focus session</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveFocusSession({ session, onComplete }: { session: FocusSession; onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState(session.targetDuration * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-800/50">
      <h3 className="font-medium mb-3">🎯 Focus Session Active</h3>
      <div className="text-center">
        <div className="text-3xl font-bold text-emerald-400 mb-2">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>
        <p className="text-sm text-zinc-300 mb-4">Working on current task</p>
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
        >
          Complete Session
        </button>
      </div>
    </div>
  );
}