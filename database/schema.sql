-- NeonDB Schema for AI Task Manager with Reinforcement Learning
-- Comprehensive schema supporting tasks, analytics, and ML features

-- Users and profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled')) DEFAULT 'todo',
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    
    -- Progress and timing
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    
    -- Scheduling
    due_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Context and metadata
    tags TEXT[] DEFAULT '{}',
    context JSONB DEFAULT '{}', -- project info, dependencies, etc.
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task scoring and assessment
CREATE TABLE task_scores (
    task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- AI-generated scores (1-5 scale)
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    innovation INTEGER CHECK (innovation BETWEEN 1 AND 5),
    quality INTEGER CHECK (quality BETWEEN 1 AND 5),
    speed INTEGER CHECK (speed BETWEEN 1 AND 5),
    
    -- Derived metrics
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    xp_earned INTEGER DEFAULT 0,
    
    -- User feedback
    user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
    user_notes TEXT,
    
    scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements and gamification
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    xp_threshold INTEGER,
    conditions JSONB, -- flexible criteria
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- Calendar and scheduling analytics
CREATE TABLE calendar_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    time_blocked INTERVAL, -- how much time was blocked
    actual_time INTERVAL,  -- how much time was actually spent
    
    -- Context
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    focus_score INTEGER CHECK (focus_score BETWEEN 1 AND 5),
    interruptions INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reinforcement learning data
CREATE TABLE task_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Pattern identification
    pattern_type TEXT NOT NULL, -- 'completion_rate', 'time_accuracy', 'optimal_schedule', etc.
    pattern_data JSONB NOT NULL,
    
    -- Learning metrics
    confidence_score DECIMAL(5,4) CHECK (confidence_score BETWEEN 0 AND 1),
    sample_size INTEGER,
    last_validated TIMESTAMPTZ,
    
    -- Pattern context
    tags TEXT[] DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML training data and predictions
CREATE TABLE ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    prediction_type TEXT NOT NULL, -- 'completion_probability', 'duration_estimate', 'optimal_time', etc.
    predicted_value JSONB NOT NULL,
    actual_value JSONB,
    
    -- Model info
    model_version TEXT,
    confidence DECIMAL(5,4),
    features_used JSONB,
    
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ
);

-- User behavior analytics
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Activity metrics
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    focus_time INTERVAL,
    break_time INTERVAL,
    
    -- Context
    day_of_week INTEGER, -- 0-6
    hour_of_day INTEGER, -- 0-23
    session_type TEXT,   -- 'work', 'personal', 'planning', etc.
    
    metadata JSONB DEFAULT '{}'
);

-- Vector embeddings for semantic similarity
CREATE TABLE task_embeddings (
    task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
    embedding VECTOR(1536), -- OpenAI/Gemini embedding dimensions
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_due_at ON tasks(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX idx_tasks_parent ON tasks(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_calendar_entries_user_date ON calendar_entries(user_id, date);
CREATE INDEX idx_task_patterns_user_type ON task_patterns(user_id, pattern_type);
CREATE INDEX idx_ml_predictions_task ON ml_predictions(task_id, prediction_type);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_patterns_updated_at BEFORE UPDATE ON task_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial achievements
INSERT INTO achievements (slug, name, description, icon, xp_threshold) VALUES
('first_blood', 'First Blood', 'Complete your first task', '🎯', 0),
('marathon_5', 'Marathon', 'Complete 5 tasks in one day', '🏃‍♂️', 50),
('innovator_50', 'Innovator', 'Maintain high innovation scores', '💡', 100),
('speed_demon', 'Speed Demon', 'Consistently beat time estimates', '⚡', 150),
('perfectionist', 'Perfectionist', 'Maintain high quality scores', '✨', 200),
('night_owl', 'Night Owl', 'Complete tasks after 10 PM', '🦉', 25),
('early_bird', 'Early Bird', 'Complete tasks before 7 AM', '🐦', 25),
('week_warrior', 'Week Warrior', 'Complete all scheduled tasks for a week', '⚔️', 300);