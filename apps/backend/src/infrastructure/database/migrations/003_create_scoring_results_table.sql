-- Create scoring_results table
CREATE TABLE IF NOT EXISTS scoring_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    score DECIMAL(5,4) NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    factors JSONB NOT NULL,
    breakdown JSONB NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    explanation TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scoring_results_entity ON scoring_results(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scoring_results_score ON scoring_results(score);
CREATE INDEX IF NOT EXISTS idx_scoring_results_algorithm ON scoring_results(algorithm);
CREATE INDEX IF NOT EXISTS idx_scoring_results_created_at ON scoring_results(created_at);
CREATE INDEX IF NOT EXISTS idx_scoring_results_entity_type ON scoring_results(entity_type);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scoring_results_entity_score ON scoring_results(entity_type, entity_id, score);
CREATE INDEX IF NOT EXISTS idx_scoring_results_score_created ON scoring_results(score DESC, created_at DESC);

-- Add constraints for data integrity
ALTER TABLE scoring_results ADD CONSTRAINT chk_score_range CHECK (score >= 0 AND score <= 1);
ALTER TABLE scoring_results ADD CONSTRAINT chk_confidence_range CHECK (confidence >= 0 AND confidence <= 1);
ALTER TABLE scoring_results ADD CONSTRAINT chk_algorithm_not_empty CHECK (algorithm <> '');

-- Create a function to update updated_at if needed in the future
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
