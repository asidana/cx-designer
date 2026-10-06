-- Agentic CX Designer — Database Schema (PostgreSQL)

-- Flows table
CREATE TABLE flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    description TEXT,
    flow_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    is_public INTEGER DEFAULT 0,
    tags TEXT[],
    metadata JSONB
);

CREATE INDEX idx_flows_name ON flows(name);
CREATE INDEX idx_flows_created_by ON flows(created_by);
CREATE INDEX idx_flows_tags ON flows USING GIN(tags);

-- Builds table
CREATE TABLE builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'building', -- building, testing, ready, failed
    flow_json JSONB NOT NULL,
    test_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX idx_builds_flow_id ON builds(flow_id);
CREATE INDEX idx_builds_status ON builds(status);

-- Deployments table
CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    build_id UUID REFERENCES builds(id),
    environment VARCHAR(20) NOT NULL, -- staging, production
    region VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'deploying', -- deploying, active, rolled_back, failed
    traffic_percentage INTEGER DEFAULT 0,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    deployed_by VARCHAR(255)
);

CREATE INDEX idx_deployments_flow_id ON deployments(flow_id);
CREATE INDEX idx_deployments_environment ON deployments(environment);
CREATE INDEX idx_deployments_status ON deployments(status);

-- Eval suites table
CREATE TABLE eval_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    test_cases JSONB NOT NULL,
    evaluators JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX idx_eval_suites_flow_id ON eval_suites(flow_id);

-- Eval runs table
CREATE TABLE eval_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID REFERENCES eval_suites(id) ON DELETE CASCADE,
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    build_id UUID REFERENCES builds(id),
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
    results JSONB,
    pass_rate DECIMAL(5,2),
    avg_latency_ms INTEGER,
    avg_cost DECIMAL(10,4),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_eval_runs_suite_id ON eval_runs(suite_id);
CREATE INDEX idx_eval_runs_flow_id ON eval_runs(flow_id);

-- Guardrail apps table
CREATE TABLE guardrail_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL, -- http, sidecar
    url VARCHAR(500),
    image VARCHAR(500),
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Audit log table (immutable)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    node_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL, -- start, complete, error, guardrail, tool_call
    data JSONB,
    latency_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(255)
);

CREATE INDEX idx_audit_log_flow_id ON audit_log(flow_id);
CREATE INDEX idx_audit_log_session_id ON audit_log(session_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user', -- admin, user, viewer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flow permissions table
CREATE TABLE flow_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL, -- read, write, admin
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_flow_permissions_flow_id ON flow_permissions(flow_id);
CREATE INDEX idx_flow_permissions_user_id ON flow_permissions(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_flows_updated_at
    BEFORE UPDATE ON flows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
