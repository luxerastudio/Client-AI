-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prompt_history table
CREATE TABLE IF NOT EXISTS prompt_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT,
    metadata JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    interaction_type VARCHAR(50) DEFAULT 'prompt',
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    tokens_used INTEGER DEFAULT 0
);

-- Create behavior_patterns table
CREATE TABLE IF NOT EXISTS behavior_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    frequency INTEGER DEFAULT 1,
    last_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_preferences table
CREATE TABLE IF NOT EXISTS content_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    feedback_history JSONB DEFAULT '[]',
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_feedback INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, content_type)
);

-- Create interaction_history table
CREATE TABLE IF NOT EXISTS interaction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    response TEXT,
    metadata JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    context JSONB DEFAULT '{}'
);

-- Create adaptation_data table
CREATE TABLE IF NOT EXISTS adaptation_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    adaptation_type VARCHAR(100) NOT NULL,
    original_content TEXT NOT NULL,
    adapted_content TEXT NOT NULL,
    adaptation_reason TEXT,
    effectiveness_score DECIMAL(3,2) DEFAULT 0,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Create memory_summaries table
CREATE TABLE IF NOT EXISTS memory_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    summary_type VARCHAR(50) NOT NULL,
    summary_text TEXT NOT NULL,
    time_period VARCHAR(50),
    key_insights JSONB DEFAULT '[]',
    interaction_count INTEGER DEFAULT 0,
    satisfaction_average DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id ON prompt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_timestamp ON prompt_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_history_session_id ON prompt_history(session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_user_id ON behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_type ON behavior_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_content_preferences_user_id ON content_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_content_preferences_type ON content_preferences(content_type);
CREATE INDEX IF NOT EXISTS idx_interaction_history_user_id ON interaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_history_timestamp ON interaction_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_history_type ON interaction_history(interaction_type);
CREATE INDEX IF NOT EXISTS idx_adaptation_data_user_id ON adaptation_data(user_id);
CREATE INDEX IF NOT EXISTS idx_adaptation_data_type ON adaptation_data(adaptation_type);
CREATE INDEX IF NOT EXISTS idx_memory_summaries_user_id ON memory_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_summaries_type ON memory_summaries(summary_type);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_timestamp ON prompt_history(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_history_user_timestamp ON interaction_history(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_user_type ON behavior_patterns(user_id, pattern_type);

-- Add constraints for data integrity
ALTER TABLE user_preferences ADD CONSTRAINT chk_user_preferences_not_empty CHECK (jsonb_typeof(preferences) = 'object');
ALTER TABLE behavior_patterns ADD CONSTRAINT chk_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 1);
ALTER TABLE behavior_patterns ADD CONSTRAINT chk_frequency_positive CHECK (frequency >= 0);
ALTER TABLE content_preferences ADD CONSTRAINT chk_rating_range CHECK (average_rating >= 0 AND average_rating <= 5);
ALTER TABLE adaptation_data ADD CONSTRAINT chk_effectiveness_range CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1);
ALTER TABLE memory_summaries ADD CONSTRAINT chk_satisfaction_range CHECK (satisfaction_average >= 0 AND satisfaction_average <= 5);

-- Create updated_at trigger function if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    END IF;
END
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavior_patterns_updated_at BEFORE UPDATE ON behavior_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_preferences_updated_at BEFORE UPDATE ON content_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
