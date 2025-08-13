// Database connection and utilities for NeonDB + Redis + Vector
import { neon } from '@neondatabase/serverless';
import { Redis } from '@upstash/redis';
import { Index } from '@upstash/vector';

// Database connections
export const sql = neon(process.env.DATABASE_URL!);
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
export const vector = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

// Core data types
export interface Task {
  id: string;
  user_id: string;
  parent_id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  priority: number;
  progress: number;
  estimated_hours?: number;
  actual_hours?: number;
  due_at?: Date;
  scheduled_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  tags: string[];
  context: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface TaskScore {
  task_id: string;
  difficulty: number;
  innovation: number;
  quality: number;
  speed: number;
  overall_score: number;
  xp_earned: number;
  user_satisfaction?: number;
  user_notes?: string;
  scored_at: Date;
}

export interface TaskPattern {
  id: string;
  user_id: string;
  pattern_type: string;
  pattern_data: Record<string, any>;
  confidence_score: number;
  sample_size: number;
  tags: string[];
  conditions: Record<string, any>;
}

// Database operations
export class TaskManager {
  
  // Create a new task
  static async createTask(userId: string, taskData: Partial<Task>): Promise<Task> {
    const task = await sql`
      INSERT INTO tasks (user_id, title, description, priority, estimated_hours, due_at, tags, context)
      VALUES (${userId}, ${taskData.title}, ${taskData.description || ''}, 
              ${taskData.priority || 3}, ${taskData.estimated_hours || null}, 
              ${taskData.due_at || null}, ${taskData.tags || []}, ${JSON.stringify(taskData.context || {})})
      RETURNING *
    `.then(rows => rows[0] as Task);

    // Cache in Redis for real-time access
    await redis.hset(`task:${task.id}`, {
      ...task,
      context: JSON.stringify(task.context),
      tags: JSON.stringify(task.tags),
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
      due_at: task.due_at?.toISOString() || '',
    });

    // Add to user's task index
    await redis.zadd(`user:${userId}:tasks`, { 
      score: task.created_at.getTime(), 
      member: task.id 
    });

    // Emit event for agents
    await redis.xadd('events:task', {
      type: 'TASK_CREATED',
      taskId: task.id,
      userId,
      parentId: task.parent_id || '',
      ts: Date.now().toString()
    });

    return task;
  }

  // Update task progress and status
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const setClause = Object.entries(updates)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k} = ${typeof v === 'object' ? `'${JSON.stringify(v)}'` : `'${v}'`}`)
      .join(', ');

    const task = await sql`
      UPDATE tasks 
      SET ${sql.unsafe(setClause)}, updated_at = NOW()
      WHERE id = ${taskId}
      RETURNING *
    `.then(rows => rows[0] as Task);

    // Update Redis cache
    const redisData: Record<string, string> = {};
    Object.entries(updates).forEach(([k, v]) => {
      if (v !== undefined) {
        redisData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    });
    redisData.updated_at = new Date().toISOString();
    
    await redis.hset(`task:${taskId}`, redisData);

    // Emit update event
    await redis.xadd('events:task', {
      type: 'TASK_UPDATED',
      taskId,
      userId: task.user_id,
      delta: JSON.stringify(updates),
      ts: Date.now().toString()
    });

    // Check if completed
    if (updates.status === 'done' && task.completed_at) {
      await redis.xadd('events:task', {
        type: 'TASK_COMPLETED',
        taskId,
        userId: task.user_id,
        completedAt: task.completed_at.toISOString(),
        ts: Date.now().toString()
      });
    }

    return task;
  }

  // Get tasks for a user with filters
  static async getUserTasks(userId: string, filters: {
    status?: string;
    parent_id?: string;
    due_before?: Date;
    tags?: string[];
  } = {}): Promise<Task[]> {
    let query = sql`SELECT * FROM tasks WHERE user_id = ${userId}`;
    
    if (filters.status) {
      query = sql`${query} AND status = ${filters.status}`;
    }
    if (filters.parent_id !== undefined) {
      if (filters.parent_id) {
        query = sql`${query} AND parent_id = ${filters.parent_id}`;
      } else {
        query = sql`${query} AND parent_id IS NULL`;
      }
    }
    if (filters.due_before) {
      query = sql`${query} AND due_at <= ${filters.due_before}`;
    }
    if (filters.tags?.length) {
      query = sql`${query} AND tags && ${filters.tags}`;
    }

    query = sql`${query} ORDER BY created_at DESC`;
    
    return query.then(rows => rows as Task[]);
  }

  // Score a completed task
  static async scoreTask(taskId: string, scores: Omit<TaskScore, 'task_id' | 'scored_at'>): Promise<void> {
    await sql`
      INSERT INTO task_scores (task_id, difficulty, innovation, quality, speed, overall_score, xp_earned, user_satisfaction, user_notes)
      VALUES (${taskId}, ${scores.difficulty}, ${scores.innovation}, ${scores.quality}, 
              ${scores.speed}, ${scores.overall_score}, ${scores.xp_earned}, 
              ${scores.user_satisfaction || null}, ${scores.user_notes || null})
      ON CONFLICT (task_id) DO UPDATE SET
        difficulty = EXCLUDED.difficulty,
        innovation = EXCLUDED.innovation,
        quality = EXCLUDED.quality,
        speed = EXCLUDED.speed,
        overall_score = EXCLUDED.overall_score,
        xp_earned = EXCLUDED.xp_earned,
        user_satisfaction = EXCLUDED.user_satisfaction,
        user_notes = EXCLUDED.user_notes,
        scored_at = NOW()
    `;

    // Update user XP
    const task = await sql`SELECT user_id FROM tasks WHERE id = ${taskId}`.then(r => r[0]);
    if (task) {
      await redis.hincrby(`user:${task.user_id}:stats`, 'total_xp', scores.xp_earned);
      
      // Emit scoring event for achievements
      await redis.xadd('events:task', {
        type: 'TASK_SCORED',
        taskId,
        userId: task.user_id,
        xpEarned: scores.xp_earned.toString(),
        overallScore: scores.overall_score.toString(),
        ts: Date.now().toString()
      });
    }
  }

  // Get calendar data for a date range
  static async getCalendarData(userId: string, startDate: Date, endDate: Date) {
    const tasks = await sql`
      SELECT t.*, ts.overall_score, ts.xp_earned
      FROM tasks t
      LEFT JOIN task_scores ts ON t.id = ts.task_id
      WHERE t.user_id = ${userId}
        AND (t.due_at BETWEEN ${startDate} AND ${endDate}
             OR t.completed_at BETWEEN ${startDate} AND ${endDate})
      ORDER BY COALESCE(t.due_at, t.completed_at)
    `;

    // Group by date
    const byDate: Record<string, any[]> = {};
    tasks.forEach(task => {
      const date = (task.due_at || task.completed_at)?.toISOString().split('T')[0];
      if (date) {
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(task);
      }
    });

    return byDate;
  }

  // Store and retrieve task patterns for ML
  static async storePattern(userId: string, patternType: string, patternData: any, confidence: number) {
    await sql`
      INSERT INTO task_patterns (user_id, pattern_type, pattern_data, confidence_score, sample_size)
      VALUES (${userId}, ${patternType}, ${JSON.stringify(patternData)}, ${confidence}, ${patternData.sample_size || 1})
      ON CONFLICT (user_id, pattern_type) DO UPDATE SET
        pattern_data = EXCLUDED.pattern_data,
        confidence_score = EXCLUDED.confidence_score,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW()
    `;
  }

  static async getPatterns(userId: string, patternType?: string): Promise<TaskPattern[]> {
    let query = sql`SELECT * FROM task_patterns WHERE user_id = ${userId}`;
    if (patternType) {
      query = sql`${query} AND pattern_type = ${patternType}`;
    }
    query = sql`${query} ORDER BY confidence_score DESC, updated_at DESC`;
    
    return query.then(rows => rows as TaskPattern[]);
  }
}

// Embedding utilities for semantic search
export class TaskEmbeddings {
  
  static async storeEmbedding(taskId: string, text: string, model = 'text-embedding-3-small') {
    // This would call your embedding API (OpenAI, Gemini, etc.)
    // For now, mock embedding
    const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
    
    await sql`
      INSERT INTO task_embeddings (task_id, embedding, model_used)
      VALUES (${taskId}, ${JSON.stringify(embedding)}, ${model})
      ON CONFLICT (task_id) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        model_used = EXCLUDED.model_used,
        created_at = NOW()
    `;

    // Also store in vector database for fast similarity search
    await vector.upsert({
      id: taskId,
      vector: embedding,
      metadata: { text, model }
    });
  }

  static async findSimilarTasks(text: string, userId: string, limit = 5) {
    // Generate embedding for query text
    const queryEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
    
    const results = await vector.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true
    });

    // Filter by user and get full task data
    const taskIds = results.matches?.map(m => m.id) || [];
    if (!taskIds.length) return [];

    return sql`
      SELECT t.*, te.embedding
      FROM tasks t
      JOIN task_embeddings te ON t.id = te.task_id
      WHERE t.id = ANY(${taskIds}) AND t.user_id = ${userId}
      ORDER BY t.updated_at DESC
    `;
  }
}