-- Create credit accounts table
CREATE TABLE IF NOT EXISTS credit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_earned DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    monthly_limit DECIMAL(15,2),
    daily_limit DECIMAL(15,2),
    last_reset_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for credit accounts
CREATE INDEX IF NOT EXISTS idx_credit_accounts_user_id ON credit_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_is_active ON credit_accounts(is_active);

-- Create credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'spend', 'refund', 'bonus', 'penalty')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    reference_id VARCHAR(255),
    reference_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for credit transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id ON credit_transactions(reference_id);

-- Create credit usage table
CREATE TABLE IF NOT EXISTS credit_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    api_endpoint VARCHAR(255) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    credits_spent DECIMAL(10,2) NOT NULL,
    tokens_used INTEGER,
    processing_time INTEGER, -- in milliseconds
    model VARCHAR(50),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'refunded')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for credit usage
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON credit_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_usage_api_endpoint ON credit_usage(api_endpoint);
CREATE INDEX IF NOT EXISTS idx_credit_usage_status ON credit_usage(status);
CREATE INDEX IF NOT EXISTS idx_credit_usage_request_id ON credit_usage(request_id);

-- Create credit packages table
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    features JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for credit packages
CREATE INDEX IF NOT EXISTS idx_credit_packages_is_active ON credit_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_packages_price ON credit_packages(price);

-- Add foreign key constraints
ALTER TABLE credit_accounts 
    ADD CONSTRAINT fk_credit_accounts_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE credit_transactions 
    ADD CONSTRAINT fk_credit_transactions_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE credit_usage 
    ADD CONSTRAINT fk_credit_usage_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_credit_accounts_updated_at 
    BEFORE UPDATE ON credit_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at 
    BEFORE UPDATE ON credit_packages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default credit packages
INSERT INTO credit_packages (name, description, credits, price, currency, features) VALUES
    ('Starter', 'Perfect for trying out our AI features', 1000, 9.99, 'USD', '["Basic AI generation", "Standard models"]'),
    ('Professional', 'Great for regular use and small projects', 5000, 39.99, 'USD', '["Advanced AI generation", "Premium models", "Priority support"]'),
    ('Business', 'Ideal for teams and growing businesses', 20000, 149.99, 'USD', ["Unlimited AI generation", "All models", "Priority support", "API access", "Custom models"]),
    ('Enterprise', 'Custom solutions for large organizations', 100000, 699.99, 'USD', ["Unlimited everything", "Dedicated support", "Custom integrations", "SLA guarantee"])
ON CONFLICT DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW credit_account_summary AS
SELECT 
    ca.id,
    ca.user_id,
    ca.balance,
    ca.total_earned,
    ca.total_spent,
    ca.is_active,
    ca.monthly_limit,
    ca.daily_limit,
    ca.created_at,
    ca.updated_at,
    COUNT(ct.id) as transaction_count,
    COUNT(cu.id) as usage_count,
    COALESCE(SUM(cu.credits_spent), 0) as total_usage_credits,
    COALESCE(AVG(cu.tokens_used), 0) as avg_tokens_per_request,
    COALESCE(AVG(cu.processing_time), 0) as avg_processing_time
FROM credit_accounts ca
LEFT JOIN credit_transactions ct ON ca.user_id = ct.user_id
LEFT JOIN credit_usage cu ON ca.user_id = cu.user_id
GROUP BY ca.id, ca.user_id, ca.balance, ca.total_earned, ca.total_spent, ca.is_active, ca.monthly_limit, ca.daily_limit, ca.created_at, ca.updated_at;

CREATE OR REPLACE VIEW credit_usage_summary AS
SELECT 
    user_id,
    DATE_TRUNC('day', created_at) as usage_date,
    SUM(credits_spent) as daily_credits,
    COUNT(*) as daily_requests,
    AVG(tokens_used) as avg_tokens,
    AVG(processing_time) as avg_processing_time,
    COUNT(DISTINCT api_endpoint) as unique_endpoints
FROM credit_usage
WHERE status = 'completed'
GROUP BY user_id, DATE_TRUNC('day', created_at)
ORDER BY usage_date DESC;

CREATE OR REPLACE VIEW credit_transaction_summary AS
SELECT 
    user_id,
    type,
    DATE_TRUNC('day', created_at) as transaction_date,
    SUM(amount) as daily_amount,
    COUNT(*) as transaction_count
FROM credit_transactions
GROUP BY user_id, type, DATE_TRUNC('day', created_at)
ORDER BY transaction_date DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON credit_accounts, credit_transactions, credit_usage, credit_packages TO your_app_user;
-- GRANT SELECT, UPDATE ON credit_account_summary, credit_usage_summary, credit_transaction_summary TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
