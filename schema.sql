-- =========================================================
-- DB PROXY PROFESSIONAL - PRODUCTION-FEELING DATABASE V2
-- PostgreSQL 14+
-- Purpose: complete schema + deeper operational history for a long-running SaaS system
-- Notes:
--   - No raw passwords or raw tokens are stored.
--   - Query text is redacted and hashed.
--   - Seed data uses generated activity over ~24 months with uneven usage, lifecycle history, billing, auth, deploys and jobs.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- RESET
-- =========================================================

DROP VIEW IF EXISTS v_org_operational_summary CASCADE;
DROP VIEW IF EXISTS v_proxy_sources_health CASCADE;
DROP VIEW IF EXISTS v_recent_query_audit CASCADE;
DROP VIEW IF EXISTS v_open_security_events CASCADE;
DROP VIEW IF EXISTS v_sensitive_catalog CASCADE;
DROP VIEW IF EXISTS v_daily_usage_trend CASCADE;
DROP VIEW IF EXISTS v_policy_coverage CASCADE;

DROP TABLE IF EXISTS dashboard_widgets CASCADE;
DROP TABLE IF EXISTS saved_dashboards CASCADE;
DROP TABLE IF EXISTS query_explain_plans CASCADE;
DROP TABLE IF EXISTS support_ticket_comments CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS billing_payments CASCADE;
DROP TABLE IF EXISTS billing_invoices CASCADE;
DROP TABLE IF EXISTS policy_versions CASCADE;
DROP TABLE IF EXISTS organization_changelog CASCADE;
DROP TABLE IF EXISTS webhook_retry_attempts CASCADE;
DROP TABLE IF EXISTS worker_heartbeats CASCADE;
DROP TABLE IF EXISTS proxy_nodes CASCADE;
DROP TABLE IF EXISTS background_job_runs CASCADE;
DROP TABLE IF EXISTS background_jobs CASCADE;
DROP TABLE IF EXISTS service_accounts CASCADE;
DROP TABLE IF EXISTS api_clients CASCADE;
DROP TABLE IF EXISTS scim_sync_runs CASCADE;
DROP TABLE IF EXISTS sso_providers CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS auth_events CASCADE;
DROP TABLE IF EXISTS deployment_versions CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS incident_comments CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS connection_pool_events CASCADE;
DROP TABLE IF EXISTS data_source_health CASCADE;
DROP TABLE IF EXISTS query_approvals CASCADE;
DROP TABLE IF EXISTS query_audit_logs CASCADE;
DROP TABLE IF EXISTS saved_queries CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS api_tokens CASCADE;
DROP TABLE IF EXISTS usage_daily_rollups CASCADE;
DROP TABLE IF EXISTS billing_subscriptions CASCADE;
DROP TABLE IF EXISTS audit_log_retention_policies CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS masking_policies CASCADE;
DROP TABLE IF EXISTS data_lineage_edges CASCADE;
DROP TABLE IF EXISTS catalog_scan_runs CASCADE;
DROP TABLE IF EXISTS data_catalog CASCADE;
DROP TABLE IF EXISTS query_rules CASCADE;
DROP TABLE IF EXISTS access_policies CASCADE;
DROP TABLE IF EXISTS data_source_credentials CASCADE;
DROP TABLE IF EXISTS data_sources CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organization_settings CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS plans CASCADE;

-- =========================================================
-- CORE TENANCY / BILLING
-- =========================================================

CREATE TABLE plans (
    code VARCHAR(40) PRIMARY KEY,
    display_name VARCHAR(120) NOT NULL,
    monthly_price_usd NUMERIC(10,2) NOT NULL CHECK (monthly_price_usd >= 0),
    max_users INTEGER NOT NULL CHECK (max_users > 0),
    max_data_sources INTEGER NOT NULL CHECK (max_data_sources > 0),
    audit_retention_days INTEGER NOT NULL CHECK (audit_retention_days > 0),
    features JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    plan VARCHAR(40) NOT NULL REFERENCES plans(code),
    status VARCHAR(40) NOT NULL CHECK (status IN ('active', 'suspended', 'trial', 'closed')),
    region VARCHAR(40) NOT NULL DEFAULT 'eu-west-1',
    billing_email VARCHAR(180),
    external_customer_id VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    default_query_timeout_ms INTEGER NOT NULL DEFAULT 10000 CHECK (default_query_timeout_ms > 0),
    require_mfa BOOLEAN NOT NULL DEFAULT TRUE,
    allow_personal_tokens BOOLEAN NOT NULL DEFAULT TRUE,
    ip_allowlist CIDR[] NOT NULL DEFAULT ARRAY[]::CIDR[],
    data_residency_region VARCHAR(40) NOT NULL DEFAULT 'eu-west-1',
    alert_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(40) NOT NULL CHECK (provider IN ('stripe', 'manual', 'reseller')),
    provider_subscription_id VARCHAR(160),
    status VARCHAR(40) NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    seats INTEGER NOT NULL CHECK (seats > 0),
    amount_usd NUMERIC(12,2) NOT NULL CHECK (amount_usd >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- IDENTITY / ACCESS
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(180) NOT NULL,
    name VARCHAR(160) NOT NULL,
    title VARCHAR(160),
    department VARCHAR(120),
    status VARCHAR(40) NOT NULL CHECK (status IN ('active', 'invited', 'disabled', 'deleted')),
    mfa_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_org_email UNIQUE (organization_id, email)
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_teams_org_name UNIQUE (organization_id, name)
);

CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(180) NOT NULL,
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role_name VARCHAR(80) NOT NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

-- =========================================================
-- DATA SOURCES / SECRETS
-- =========================================================

CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    type VARCHAR(40) NOT NULL CHECK (type IN ('postgres', 'mysql', 'mongodb', 'mssql', 'bigquery', 'snowflake', 'redshift')),
    environment VARCHAR(40) NOT NULL CHECK (environment IN ('production', 'staging', 'development', 'sandbox')),
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL CHECK (port > 0 AND port <= 65535),
    database_name VARCHAR(160) NOT NULL,
    ssl_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    mode VARCHAR(40) NOT NULL DEFAULT 'read_only' CHECK (mode IN ('read_only', 'read_write', 'admin')),
    status VARCHAR(40) NOT NULL CHECK (status IN ('active', 'disabled', 'degraded', 'pending', 'archived')),
    owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_data_sources_org_name UNIQUE (organization_id, name)
);

CREATE TABLE data_source_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    secret_ref TEXT NOT NULL,
    username_ref TEXT,
    rotation_status VARCHAR(40) NOT NULL CHECK (rotation_status IN ('valid', 'rotation_due', 'rotating', 'failed', 'revoked')),
    last_rotated_at TIMESTAMPTZ,
    next_rotation_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_credentials_data_source UNIQUE (data_source_id)
);

-- =========================================================
-- POLICIES / GUARDRAILS
-- =========================================================

CREATE TABLE access_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    allowed_actions TEXT[] NOT NULL,
    allowed_schemas TEXT[] DEFAULT '{}',
    allowed_tables TEXT[] DEFAULT '{}',
    denied_tables TEXT[] DEFAULT '{}',
    allowed_columns JSONB DEFAULT '{}'::JSONB,
    row_filter_policy TEXT,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(40) NOT NULL CHECK (status IN ('active', 'disabled', 'draft')),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_allowed_actions CHECK (allowed_actions <@ ARRAY['read', 'write', 'admin', 'metadata', 'explain']::TEXT[])
);

CREATE TABLE query_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    rule_type VARCHAR(40) NOT NULL CHECK (rule_type IN ('block', 'mask', 'limit', 'require_approval', 'rewrite', 'warn')),
    name VARCHAR(160) NOT NULL,
    pattern TEXT,
    max_rows INTEGER CHECK (max_rows IS NULL OR max_rows > 0),
    max_runtime_ms INTEGER CHECK (max_runtime_ms IS NULL OR max_runtime_ms > 0),
    applies_to_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    severity VARCHAR(40) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(40) NOT NULL CHECK (status IN ('active', 'disabled', 'draft')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE masking_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    classification VARCHAR(40) NOT NULL CHECK (classification IN ('public', 'internal', 'confidential', 'pii', 'financial', 'secret')),
    mask_type VARCHAR(40) NOT NULL CHECK (mask_type IN ('none', 'full', 'partial', 'hash', 'tokenize', 'redact')),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_masking_policy UNIQUE (organization_id, classification, role_id)
);

CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    max_queries_per_minute INTEGER NOT NULL CHECK (max_queries_per_minute > 0),
    max_rows_per_day INTEGER NOT NULL CHECK (max_rows_per_day > 0),
    max_runtime_ms_per_day INTEGER NOT NULL CHECK (max_runtime_ms_per_day > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rate_limit_target CHECK (user_id IS NOT NULL OR role_id IS NOT NULL)
);

CREATE TABLE audit_log_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    retention_days INTEGER NOT NULL CHECK (retention_days >= 30),
    legal_hold_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    export_to_cold_storage BOOLEAN NOT NULL DEFAULT TRUE,
    cold_storage_uri TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- CATALOG / LINEAGE
-- =========================================================

CREATE TABLE catalog_scan_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    status VARCHAR(40) NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed', 'partial')),
    tables_scanned INTEGER NOT NULL DEFAULT 0 CHECK (tables_scanned >= 0),
    columns_scanned INTEGER NOT NULL DEFAULT 0 CHECK (columns_scanned >= 0),
    pii_columns_detected INTEGER NOT NULL DEFAULT 0 CHECK (pii_columns_detected >= 0),
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE data_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    schema_name VARCHAR(160) NOT NULL,
    table_name VARCHAR(160) NOT NULL,
    column_name VARCHAR(160) NOT NULL,
    data_type VARCHAR(120) NOT NULL,
    classification VARCHAR(40) NOT NULL CHECK (classification IN ('public', 'internal', 'confidential', 'pii', 'financial', 'secret')),
    nullable BOOLEAN NOT NULL DEFAULT TRUE,
    sample_value_redacted TEXT,
    description TEXT,
    last_scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_data_catalog_column UNIQUE (data_source_id, schema_name, table_name, column_name)
);

CREATE TABLE data_lineage_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_catalog_id UUID NOT NULL REFERENCES data_catalog(id) ON DELETE CASCADE,
    target_catalog_id UUID NOT NULL REFERENCES data_catalog(id) ON DELETE CASCADE,
    transform_name VARCHAR(180),
    confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_lineage_not_self CHECK (source_catalog_id <> target_catalog_id)
);

-- =========================================================
-- RUNTIME / AUDIT / APPROVALS
-- =========================================================

CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(140) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL,
    last_ip INET,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_token_scopes CHECK (scopes <@ ARRAY['query:read','query:write','query:admin','catalog:read','audit:read','policy:write','webhook:write']::TEXT[])
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_hash CHAR(64) NOT NULL UNIQUE,
    ip INET,
    user_agent TEXT,
    status VARCHAR(40) NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE saved_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    query_template TEXT NOT NULL,
    parameters_schema JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visibility VARCHAR(40) NOT NULL DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'organization')),
    status VARCHAR(40) NOT NULL CHECK (status IN ('active', 'disabled', 'draft', 'archived')),
    last_run_at TIMESTAMPTZ,
    run_count INTEGER NOT NULL DEFAULT 0 CHECK (run_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE query_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    request_id UUID NOT NULL,
    query_hash CHAR(64) NOT NULL,
    query_redacted TEXT,
    action VARCHAR(40) NOT NULL CHECK (action IN ('read', 'write', 'admin', 'metadata', 'explain')),
    status VARCHAR(40) NOT NULL CHECK (status IN ('success', 'denied', 'failed', 'requires_approval', 'timeout', 'cancelled')),
    policy_decision VARCHAR(40) NOT NULL CHECK (policy_decision IN ('allow', 'deny', 'mask', 'limit', 'approval_required')),
    rows_returned INTEGER CHECK (rows_returned IS NULL OR rows_returned >= 0),
    runtime_ms INTEGER CHECK (runtime_ms IS NULL OR runtime_ms >= 0),
    bytes_scanned BIGINT CHECK (bytes_scanned IS NULL OR bytes_scanned >= 0),
    error_message TEXT,
    client_ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE query_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    query_hash CHAR(64) NOT NULL,
    query_redacted TEXT,
    reason TEXT NOT NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);

-- =========================================================
-- OBSERVABILITY / SECURITY
-- =========================================================

CREATE TABLE data_source_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    status VARCHAR(40) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
    latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
    pool_active_connections INTEGER CHECK (pool_active_connections IS NULL OR pool_active_connections >= 0),
    pool_idle_connections INTEGER CHECK (pool_idle_connections IS NULL OR pool_idle_connections >= 0),
    error_rate NUMERIC(6,4) NOT NULL DEFAULT 0 CHECK (error_rate >= 0),
    last_success_at TIMESTAMPTZ,
    last_error TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE connection_pool_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    event_type VARCHAR(60) NOT NULL CHECK (event_type IN ('pool_scaled', 'pool_saturated', 'connection_recycled', 'connection_failed', 'circuit_opened', 'circuit_closed')),
    active_connections INTEGER,
    idle_connections INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    event_type VARCHAR(80) NOT NULL CHECK (event_type IN (
        'denied_query','suspicious_volume','pii_access','error_spike','approval_required',
        'token_revoked','policy_violation','source_unhealthy','mfa_challenge_failed',
        'impossible_travel','credential_rotation_failed','webhook_delivery_failed'
    )),
    severity VARCHAR(40) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(40) NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE incident_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_event_id UUID NOT NULL REFERENCES security_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(40) NOT NULL CHECK (channel IN ('email', 'slack', 'webhook', 'in_app')),
    type VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    status VARCHAR(40) NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'read', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(120) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rules JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_feature_flags_scope UNIQUE (organization_id, key)
);

CREATE TABLE usage_daily_rollups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    query_count INTEGER NOT NULL DEFAULT 0 CHECK (query_count >= 0),
    denied_count INTEGER NOT NULL DEFAULT 0 CHECK (denied_count >= 0),
    failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
    approval_count INTEGER NOT NULL DEFAULT 0 CHECK (approval_count >= 0),
    rows_returned BIGINT NOT NULL DEFAULT 0 CHECK (rows_returned >= 0),
    runtime_ms BIGINT NOT NULL DEFAULT 0 CHECK (runtime_ms >= 0),
    bytes_scanned BIGINT NOT NULL DEFAULT 0 CHECK (bytes_scanned >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usage_rollup UNIQUE (organization_id, data_source_id, usage_date)
);

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    url TEXT NOT NULL,
    event_types TEXT[] NOT NULL,
    secret_hash CHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('active', 'disabled', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
    response_code INTEGER,
    response_ms INTEGER,
    attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
    payload_redacted JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- V2 REALISM LAYER: CHANGE HISTORY / AUTH / OPS / BILLING
-- =========================================================

CREATE TABLE schema_migrations (
    version VARCHAR(80) PRIMARY KEY,
    description TEXT NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    applied_by VARCHAR(160) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    execution_ms INTEGER NOT NULL CHECK (execution_ms >= 0),
    success BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE deployment_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(80) NOT NULL UNIQUE,
    git_sha VARCHAR(40) NOT NULL,
    environment VARCHAR(40) NOT NULL CHECK (environment IN ('production','staging','development','sandbox')),
    status VARCHAR(40) NOT NULL CHECK (status IN ('deploying','healthy','rolled_back','failed','superseded')),
    deployed_by VARCHAR(160) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    release_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(60) NOT NULL CHECK (event_type IN ('login_success','login_failed','mfa_challenge','mfa_success','mfa_failed','logout','token_created','token_revoked','sso_login','password_reset_requested','password_reset_completed','session_revoked')),
    ip INET,
    user_agent TEXT,
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (risk_score >= 0),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('requested','completed','expired','revoked')),
    requested_ip INET,
    requested_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_type VARCHAR(40) NOT NULL CHECK (provider_type IN ('saml','oidc','google','azure_ad','okta')),
    issuer_url TEXT NOT NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('active','disabled','misconfigured','pending')),
    enforce_sso BOOLEAN NOT NULL DEFAULT FALSE,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, provider_type)
);

CREATE TABLE scim_sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('success','partial','failed','running')),
    users_created INTEGER NOT NULL DEFAULT 0 CHECK (users_created >= 0),
    users_updated INTEGER NOT NULL DEFAULT 0 CHECK (users_updated >= 0),
    users_disabled INTEGER NOT NULL DEFAULT 0 CHECK (users_disabled >= 0),
    groups_synced INTEGER NOT NULL DEFAULT 0 CHECK (groups_synced >= 0),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ
);

CREATE TABLE api_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    client_id VARCHAR(120) NOT NULL UNIQUE,
    client_secret_hash TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(40) NOT NULL CHECK (status IN ('active','disabled','rotating','revoked')),
    last_used_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(180) NOT NULL,
    owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('active','disabled','rotation_due','deleted')),
    purpose TEXT,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, email)
);

CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_type VARCHAR(80) NOT NULL,
    schedule_cron VARCHAR(80),
    status VARCHAR(40) NOT NULL CHECK (status IN ('enabled','disabled','paused')),
    owner VARCHAR(120) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE background_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES background_jobs(id) ON DELETE CASCADE,
    status VARCHAR(40) NOT NULL CHECK (status IN ('success','failed','timeout','skipped','running')),
    attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
    records_processed INTEGER NOT NULL DEFAULT 0 CHECK (records_processed >= 0),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE proxy_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region VARCHAR(40) NOT NULL,
    node_name VARCHAR(120) NOT NULL UNIQUE,
    version VARCHAR(80) NOT NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('healthy','degraded','draining','offline')),
    capacity_connections INTEGER NOT NULL CHECK (capacity_connections > 0),
    started_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE worker_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_node_id UUID NOT NULL REFERENCES proxy_nodes(id) ON DELETE CASCADE,
    active_connections INTEGER NOT NULL CHECK (active_connections >= 0),
    cpu_pct NUMERIC(5,2) NOT NULL CHECK (cpu_pct >= 0),
    memory_pct NUMERIC(5,2) NOT NULL CHECK (memory_pct >= 0),
    queue_depth INTEGER NOT NULL CHECK (queue_depth >= 0),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_retry_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    status VARCHAR(40) NOT NULL CHECK (status IN ('scheduled','success','failed','abandoned')),
    response_code INTEGER,
    response_ms INTEGER,
    error_message TEXT,
    attempted_at TIMESTAMPTZ NOT NULL,
    next_retry_at TIMESTAMPTZ
);

CREATE TABLE organization_changelog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    change_type VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    previous_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES access_policies(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    change_summary TEXT NOT NULL,
    policy_snapshot JSONB NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (policy_id, version_number)
);

CREATE TABLE billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
    invoice_number VARCHAR(80) NOT NULL UNIQUE,
    status VARCHAR(40) NOT NULL CHECK (status IN ('draft','open','paid','void','uncollectible')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    subtotal_usd NUMERIC(12,2) NOT NULL CHECK (subtotal_usd >= 0),
    credits_usd NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credits_usd >= 0),
    tax_usd NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_usd >= 0),
    total_usd NUMERIC(12,2) NOT NULL CHECK (total_usd >= 0),
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    pdf_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    provider VARCHAR(40) NOT NULL CHECK (provider IN ('stripe','wire','manual','reseller')),
    status VARCHAR(40) NOT NULL CHECK (status IN ('succeeded','failed','refunded','pending')),
    amount_usd NUMERIC(12,2) NOT NULL CHECK (amount_usd >= 0),
    failure_code VARCHAR(80),
    provider_payment_id VARCHAR(160),
    attempted_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    category VARCHAR(60) NOT NULL CHECK (category IN ('billing','access','incident','integration','performance','question')),
    priority VARCHAR(40) NOT NULL CHECK (priority IN ('low','normal','high','urgent')),
    status VARCHAR(40) NOT NULL CHECK (status IN ('open','waiting_on_customer','waiting_on_engineering','resolved','closed')),
    external_ticket_ref VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE support_ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_type VARCHAR(40) NOT NULL CHECK (author_type IN ('customer','support','engineering','system')),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE query_explain_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_audit_log_id UUID NOT NULL REFERENCES query_audit_logs(id) ON DELETE CASCADE,
    estimated_cost NUMERIC(14,2) NOT NULL CHECK (estimated_cost >= 0),
    estimated_rows BIGINT NOT NULL CHECK (estimated_rows >= 0),
    planning_ms INTEGER NOT NULL CHECK (planning_ms >= 0),
    plan_redacted JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (query_audit_log_id)
);

CREATE TABLE saved_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    visibility VARCHAR(40) NOT NULL CHECK (visibility IN ('private','team','organization')),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(40) NOT NULL CHECK (status IN ('active','archived')),
    last_viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES saved_dashboards(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    widget_type VARCHAR(40) NOT NULL CHECK (widget_type IN ('line','bar','table','number','heatmap')),
    query_template TEXT NOT NULL,
    position JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_organizations_status ON organizations (status, created_at DESC);
CREATE INDEX idx_users_organization_id ON users (organization_id, status);
CREATE INDEX idx_users_last_login ON users (organization_id, last_login_at DESC);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);
CREATE INDEX idx_teams_org ON teams (organization_id);
CREATE INDEX idx_data_sources_organization_id ON data_sources (organization_id, status, environment);
CREATE INDEX idx_data_sources_owner_team ON data_sources (owner_team_id);
CREATE INDEX idx_access_policies_lookup ON access_policies (organization_id, data_source_id, role_id, status);
CREATE INDEX idx_query_rules_data_source ON query_rules (data_source_id, status);
CREATE INDEX idx_data_catalog_lookup ON data_catalog (data_source_id, schema_name, table_name);
CREATE INDEX idx_data_catalog_classification ON data_catalog (classification);
CREATE INDEX idx_catalog_scan_runs_source_started ON catalog_scan_runs (data_source_id, started_at DESC);
CREATE INDEX idx_api_tokens_user ON api_tokens (user_id, revoked_at);
CREATE INDEX idx_user_sessions_user_seen ON user_sessions (user_id, last_seen_at DESC);
CREATE INDEX idx_saved_queries_org ON saved_queries (organization_id, status, last_run_at DESC);
CREATE INDEX idx_query_audit_logs_org_created ON query_audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_query_audit_logs_user_created ON query_audit_logs (user_id, created_at DESC);
CREATE INDEX idx_query_audit_logs_source_created ON query_audit_logs (data_source_id, created_at DESC);
CREATE INDEX idx_query_audit_logs_request_id ON query_audit_logs (request_id);
CREATE INDEX idx_query_audit_logs_query_hash ON query_audit_logs (query_hash);
CREATE INDEX idx_query_approvals_status ON query_approvals (organization_id, status, expires_at);
CREATE INDEX idx_data_source_health_latest ON data_source_health (data_source_id, checked_at DESC);
CREATE INDEX idx_pool_events_source_created ON connection_pool_events (data_source_id, created_at DESC);
CREATE INDEX idx_security_events_org_created ON security_events (organization_id, created_at DESC);
CREATE INDEX idx_security_events_status ON security_events (status, severity);
CREATE INDEX idx_notifications_user_status ON notifications (user_id, status, created_at DESC);
CREATE INDEX idx_usage_daily_rollups_org_date ON usage_daily_rollups (organization_id, usage_date DESC);
CREATE INDEX idx_webhook_deliveries_webhook_created ON webhook_deliveries (webhook_id, created_at DESC);

CREATE INDEX idx_schema_migrations_applied_at ON schema_migrations (applied_at DESC);
CREATE INDEX idx_deployment_versions_started ON deployment_versions (environment, started_at DESC);
CREATE INDEX idx_auth_events_org_created ON auth_events (organization_id, created_at DESC);
CREATE INDEX idx_auth_events_user_created ON auth_events (user_id, created_at DESC);
CREATE INDEX idx_password_reset_user_requested ON password_reset_requests (user_id, requested_at DESC);
CREATE INDEX idx_sso_providers_org ON sso_providers (organization_id, status);
CREATE INDEX idx_scim_sync_runs_org_started ON scim_sync_runs (organization_id, started_at DESC);
CREATE INDEX idx_api_clients_org ON api_clients (organization_id, status);
CREATE INDEX idx_service_accounts_org ON service_accounts (organization_id, status);
CREATE INDEX idx_background_jobs_org_type ON background_jobs (organization_id, job_type, status);
CREATE INDEX idx_background_job_runs_job_started ON background_job_runs (job_id, started_at DESC);
CREATE INDEX idx_proxy_nodes_status ON proxy_nodes (region, status);
CREATE INDEX idx_worker_heartbeats_node_checked ON worker_heartbeats (proxy_node_id, checked_at DESC);
CREATE INDEX idx_webhook_retry_attempts_delivery ON webhook_retry_attempts (webhook_delivery_id, attempt_number);
CREATE INDEX idx_org_changelog_org_created ON organization_changelog (organization_id, created_at DESC);
CREATE INDEX idx_policy_versions_policy ON policy_versions (policy_id, version_number DESC);
CREATE INDEX idx_billing_invoices_org_period ON billing_invoices (organization_id, period_start DESC);
CREATE INDEX idx_billing_payments_invoice ON billing_payments (invoice_id, attempted_at DESC);
CREATE INDEX idx_support_tickets_org_status ON support_tickets (organization_id, status, priority);
CREATE INDEX idx_query_explain_plans_created ON query_explain_plans (created_at DESC);
CREATE INDEX idx_saved_dashboards_org ON saved_dashboards (organization_id, status, last_viewed_at DESC);


-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_organization_settings_updated_at BEFORE UPDATE ON organization_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_data_sources_updated_at BEFORE UPDATE ON data_sources FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_access_policies_updated_at BEFORE UPDATE ON access_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- SEED: PLANS / ORGS
-- =========================================================

INSERT INTO plans (code, display_name, monthly_price_usd, max_users, max_data_sources, audit_retention_days, features) VALUES
('free', 'Free', 0, 3, 1, 30, '{"approval_workflows":false,"webhooks":false,"sso":false}'),
('starter', 'Starter', 49, 10, 3, 90, '{"approval_workflows":true,"webhooks":false,"sso":false}'),
('pro', 'Pro', 199, 50, 12, 365, '{"approval_workflows":true,"webhooks":true,"sso":false}'),
('enterprise', 'Enterprise', 950, 500, 100, 2555, '{"approval_workflows":true,"webhooks":true,"sso":true,"legal_hold":true}');

INSERT INTO organizations (id, name, slug, plan, status, region, billing_email, external_customer_id, created_at) VALUES
('11111111-1111-4111-8111-111111111111', 'Massive Operations Ltd', 'massive-operations', 'enterprise', 'active', 'eu-west-1', 'billing@massiveops.example', 'cus_massive_001', NOW() - INTERVAL '548 days'),
('11111111-1111-4111-8111-111111111112', 'Northwind Health Analytics', 'northwind-health', 'pro', 'active', 'us-east-1', 'finance@northwindhealth.example', 'cus_northwind_114', NOW() - INTERVAL '312 days'),
('11111111-1111-4111-8111-111111111113', 'Atlas Retail Group', 'atlas-retail', 'starter', 'trial', 'eu-central-1', 'ops@atlasretail.example', 'cus_atlas_288', NOW() - INTERVAL '43 days');


INSERT INTO organizations (id, name, slug, plan, status, region, billing_email, external_customer_id, created_at) VALUES
('11111111-1111-4111-8111-111111111114', 'KlineOps Research', 'klineops-research', 'enterprise', 'active', 'us-east-1', 'billing@klineops.example', 'cus_klineops_402', NOW() - INTERVAL '731 days'),
('11111111-1111-4111-8111-111111111115', 'Arava Health Systems', 'arava-health', 'enterprise', 'active', 'eu-west-1', 'finance@aravahealth.example', 'cus_arava_771', NOW() - INTERVAL '689 days'),
('11111111-1111-4111-8111-111111111116', 'Blue Quarry Logistics', 'blue-quarry', 'pro', 'active', 'eu-central-1', 'ap@bluequarry.example', 'cus_blue_136', NOW() - INTERVAL '602 days'),
('11111111-1111-4111-8111-111111111117', 'LedgerPeak Finance', 'ledgerpeak', 'enterprise', 'active', 'us-east-1', 'billing@ledgerpeak.example', 'cus_ledger_884', NOW() - INTERVAL '575 days'),
('11111111-1111-4111-8111-111111111118', 'OpsBridge Mobility', 'opsbridge-mobility', 'pro', 'active', 'eu-west-1', 'finance@opsbridge.example', 'cus_opsbridge_209', NOW() - INTERVAL '489 days'),
('11111111-1111-4111-8111-111111111119', 'Cedar Retail Labs', 'cedar-retail', 'pro', 'active', 'us-west-2', 'billing@cedarretail.example', 'cus_cedar_515', NOW() - INTERVAL '454 days'),
('11111111-1111-4111-8111-111111111120', 'NimbleGrid Energy', 'nimblegrid', 'starter', 'active', 'eu-central-1', 'ops@nimblegrid.example', 'cus_nimble_027', NOW() - INTERVAL '398 days'),
('11111111-1111-4111-8111-111111111121', 'Northstar Compliance', 'northstar-compliance', 'enterprise', 'active', 'eu-west-1', 'billing@northstar.example', 'cus_northstar_622', NOW() - INTERVAL '365 days'),
('11111111-1111-4111-8111-111111111122', 'Quartz Media Intelligence', 'quartz-media', 'pro', 'active', 'us-east-1', 'finance@quartzmedia.example', 'cus_quartz_314', NOW() - INTERVAL '284 days'),
('11111111-1111-4111-8111-111111111123', 'HarborPoint SaaS', 'harborpoint', 'starter', 'trial', 'eu-west-1', 'billing@harborpoint.example', 'cus_harbor_808', NOW() - INTERVAL '77 days'),
('11111111-1111-4111-8111-111111111124', 'Seabird Data Cooperative', 'seabird-data', 'pro', 'suspended', 'us-west-2', 'admin@seabirddata.example', 'cus_seabird_411', NOW() - INTERVAL '512 days'),
('11111111-1111-4111-8111-111111111125', 'Oakline Bioinformatics', 'oakline-bio', 'enterprise', 'active', 'eu-central-1', 'finance@oaklinebio.example', 'cus_oakline_733', NOW() - INTERVAL '642 days'),
('11111111-1111-4111-8111-111111111126', 'Riverbend Market Systems', 'riverbend-market', 'starter', 'closed', 'us-east-1', 'billing@riverbend.example', 'cus_riverbend_018', NOW() - INTERVAL '704 days'),
('11111111-1111-4111-8111-111111111127', 'LumaWorks AI', 'lumaworks', 'pro', 'active', 'eu-west-1', 'billing@lumaworks.example', 'cus_luma_942', NOW() - INTERVAL '211 days'),
('11111111-1111-4111-8111-111111111128', 'GreyRock Public Sector', 'greyrock-public', 'enterprise', 'active', 'us-east-1', 'procurement@greyrock.example', 'cus_greyrock_395', NOW() - INTERVAL '808 days');

INSERT INTO organization_settings (organization_id, default_query_timeout_ms, require_mfa, allow_personal_tokens, ip_allowlist, data_residency_region, alert_emails) VALUES
('11111111-1111-4111-8111-111111111111', 12000, TRUE, TRUE, ARRAY['192.168.10.0/24','10.24.0.0/16']::CIDR[], 'eu-west-1', ARRAY['secops@massiveops.example','platform@massiveops.example']),
('11111111-1111-4111-8111-111111111112', 9000, TRUE, FALSE, ARRAY['172.16.0.0/12']::CIDR[], 'us-east-1', ARRAY['security@northwindhealth.example']),
('11111111-1111-4111-8111-111111111113', 6000, FALSE, TRUE, ARRAY[]::CIDR[], 'eu-central-1', ARRAY['founders@atlasretail.example']);

INSERT INTO organization_settings (organization_id, default_query_timeout_ms, require_mfa, allow_personal_tokens, ip_allowlist, data_residency_region, alert_emails)
SELECT o.id,
       CASE o.plan WHEN 'enterprise' THEN 14000 WHEN 'pro' THEN 10000 ELSE 7000 END,
       o.plan <> 'starter',
       o.plan <> 'enterprise',
       CASE
           WHEN o.region LIKE 'eu%' THEN ARRAY['10.30.0.0/16','192.168.44.0/24']::CIDR[]
           ELSE ARRAY['172.20.0.0/16','10.80.0.0/15']::CIDR[]
       END,
       o.region,
       ARRAY['security@' || o.slug || '.example', 'platform@' || o.slug || '.example']::TEXT[]
FROM organizations o
WHERE o.id NOT IN (
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111113'
);


INSERT INTO billing_subscriptions (organization_id, provider, provider_subscription_id, status, current_period_start, current_period_end, seats, amount_usd, created_at)
SELECT id, 'stripe', 'sub_' || substr(md5(slug), 1, 14), CASE WHEN status = 'trial' THEN 'trialing' ELSE 'active' END,
       date_trunc('month', NOW()), date_trunc('month', NOW()) + INTERVAL '1 month',
       CASE plan WHEN 'enterprise' THEN 120 WHEN 'pro' THEN 35 ELSE 8 END,
       CASE plan WHEN 'enterprise' THEN 9500 WHEN 'pro' THEN 199 ELSE 49 END,
       created_at + INTERVAL '1 day'
FROM organizations;

-- =========================================================
-- SEED: ROLES / USERS / TEAMS
-- =========================================================

INSERT INTO roles (id, name, description, is_system) VALUES
('22222222-2222-4222-8222-222222222221', 'admin', 'Full proxy administration', TRUE),
('22222222-2222-4222-8222-222222222222', 'analyst', 'Read-only analytical access', TRUE),
('22222222-2222-4222-8222-222222222223', 'developer', 'Development and debugging access', TRUE),
('22222222-2222-4222-8222-222222222224', 'auditor', 'Audit log and catalog visibility', TRUE),
('22222222-2222-4222-8222-222222222225', 'security_reviewer', 'Security event review and approval workflows', TRUE),
('22222222-2222-4222-8222-222222222226', 'data_steward', 'Catalog ownership and classification updates', TRUE);

INSERT INTO users (id, organization_id, email, name, title, department, status, mfa_enabled, last_login_at, created_at)
SELECT gen_random_uuid(), o.id,
       lower(replace(n.first_name || '.' || n.last_name || '@' || o.slug || '.example', ' ', '')),
       n.first_name || ' ' || n.last_name,
       n.title,
       n.department,
       CASE WHEN n.seq % 29 = 0 THEN 'disabled' ELSE 'active' END,
       CASE WHEN n.seq % 13 = 0 THEN FALSE ELSE TRUE END,
       NOW() - ((n.seq % 27) || ' days')::INTERVAL - ((n.seq * 17 % 600) || ' minutes')::INTERVAL,
       o.created_at + ((n.seq * 5 + 2) || ' days')::INTERVAL
FROM organizations o
JOIN LATERAL (
    SELECT gs AS seq,
           (ARRAY['Dana','Noam','Maya','Ariel','Tamar','Eitan','Roni','Lior','Shira','Ido','Yael','Omer','Neta','Alon','Gal','Michal','Aviv','Rotem','Yonatan','Hila','Itamar','Adi','Nadav','Daniel','Sivan','Bar','Tal','Ori','Moran','Eyal','Leah','Assaf'])[1 + ((gs - 1) % 32)] AS first_name,
           (ARRAY['Cohen','Levi','Mizrahi','Kaplan','Rosen','Harel','Barak','Shapira','Gold','Azulay','Peretz','Klein','Dayan','Mor','Friedman','Segal','Avraham','Ben-David','Navon','Stern','Rubin','Hadad','Weiss','Erez','Shalev','Golan','Biton','Sharabi','Atiya','Amit','Gross','Bachar'])[1 + ((gs - 1) % 32)] AS last_name,
           (ARRAY['Data Analyst','Backend Engineer','Security Engineer','Data Steward','Platform Lead','BI Developer','Compliance Manager','SRE','Product Analyst','Engineering Manager'])[1 + ((gs - 1) % 10)] AS title,
           (ARRAY['Data','Engineering','Security','Compliance','Platform','Operations'])[1 + ((gs - 1) % 6)] AS department
    FROM generate_series(1, CASE WHEN o.plan = 'enterprise' THEN 180 WHEN o.plan = 'pro' THEN 75 WHEN o.plan = 'starter' THEN 28 ELSE 8 END) gs
) n ON TRUE;

INSERT INTO teams (organization_id, name, description, created_at)
SELECT o.id, t.name, t.description, o.created_at + INTERVAL '3 days'
FROM organizations o
CROSS JOIN (VALUES
    ('Data Platform', 'Owns warehouse, data contracts and catalog quality'),
    ('Security Operations', 'Reviews security events, policies and approvals'),
    ('Business Intelligence', 'Runs dashboards and recurring analytical queries'),
    ('Product Engineering', 'Application teams using proxy-protected development access')
) AS t(name, description);

INSERT INTO team_members (team_id, user_id, joined_at)
SELECT t.id, u.id, u.created_at + INTERVAL '1 day'
FROM teams t
JOIN users u ON u.organization_id = t.organization_id
WHERE ((abs(('x' || substr(md5(u.email || t.name), 1, 8))::bit(32)::int) % 4) = 0)
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by_user_id, assigned_at)
SELECT u.id,
       CASE
           WHEN u.email LIKE 'dana.%' OR u.title ILIKE '%lead%' OR u.title ILIKE '%manager%' THEN '22222222-2222-4222-8222-222222222221'::UUID
           WHEN u.department = 'Engineering' THEN '22222222-2222-4222-8222-222222222223'::UUID
           WHEN u.department = 'Security' THEN '22222222-2222-4222-8222-222222222225'::UUID
           WHEN u.department = 'Compliance' THEN '22222222-2222-4222-8222-222222222224'::UUID
           WHEN u.department = 'Data' THEN '22222222-2222-4222-8222-222222222226'::UUID
           ELSE '22222222-2222-4222-8222-222222222222'::UUID
       END,
       NULL,
       u.created_at + INTERVAL '2 hours'
FROM users u;

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, '22222222-2222-4222-8222-222222222222'::UUID, u.created_at + INTERVAL '3 hours'
FROM users u
WHERE u.department IN ('Data','Operations','Product')
ON CONFLICT DO NOTHING;

INSERT INTO invitations (organization_id, email, invited_by_user_id, role_name, status, expires_at, created_at, accepted_at)
SELECT o.id, 'contractor+' || gs || '@' || o.slug || '.example', NULL,
       CASE WHEN gs % 2 = 0 THEN 'analyst' ELSE 'developer' END,
       CASE WHEN gs % 5 = 0 THEN 'expired' WHEN gs % 7 = 0 THEN 'revoked' ELSE 'pending' END,
       NOW() + ((gs % 12) || ' days')::INTERVAL,
       NOW() - ((gs * 3) || ' days')::INTERVAL,
       NULL
FROM organizations o, generate_series(1, 6) gs;

-- =========================================================
-- SEED: DATA SOURCES / CREDENTIALS
-- =========================================================

INSERT INTO data_sources (organization_id, name, type, environment, host, port, database_name, ssl_enabled, mode, status, owner_team_id, tags, created_at)
SELECT o.id, ds.name, ds.type, ds.environment, ds.host_prefix || '.' || o.slug || '.internal', ds.port, ds.database_name,
       TRUE, ds.mode, ds.status, t.id, ds.tags, o.created_at + ((ds.seq * 4) || ' days')::INTERVAL
FROM organizations o
JOIN teams t ON t.organization_id = o.id AND t.name = 'Data Platform'
JOIN LATERAL (VALUES
    (1, 'Production Analytics Replica', 'postgres', 'production', 'prod-analytics-replica', 5432, 'analytics', 'read_only', 'active', ARRAY['analytics','replica','production']::TEXT[]),
    (2, 'Customer Operations DB', 'postgres', 'production', 'customer-ops', 5432, 'customer_ops', 'read_only', 'active', ARRAY['customer','operations','pii']::TEXT[]),
    (3, 'Billing Warehouse', 'snowflake', 'production', 'billing-warehouse', 443, 'billing_wh', 'read_only', 'active', ARRAY['billing','financial']::TEXT[]),
    (4, 'Product Events Lake', 'bigquery', 'production', 'product-events', 443, 'events_lake', 'read_only', 'active', ARRAY['events','analytics']::TEXT[]),
    (5, 'Staging Application DB', 'postgres', 'staging', 'staging-app', 5432, 'app_staging', 'read_write', 'active', ARRAY['staging','engineering']::TEXT[]),
    (6, 'Legacy CRM Mirror', 'mysql', 'production', 'legacy-crm-mirror', 3306, 'crm_mirror', 'read_only', CASE WHEN o.plan = 'starter' THEN 'pending' ELSE 'degraded' END, ARRAY['crm','legacy']::TEXT[])
) AS ds(seq, name, type, environment, host_prefix, port, database_name, mode, status, tags) ON TRUE
WHERE NOT (o.plan = 'starter' AND ds.seq > 3);



INSERT INTO data_sources (organization_id, name, type, environment, host, port, database_name, ssl_enabled, mode, status, owner_team_id, tags, created_at)
SELECT o.id, ds.name, ds.type, ds.environment,
       ds.host_prefix || '.' || o.slug || '.internal', ds.port, ds.database_name,
       ds.ssl_enabled, ds.mode,
       CASE WHEN o.status IN ('closed','suspended') AND ds.seq > 3 THEN 'archived' ELSE ds.status END,
       t.id, ds.tags,
       o.created_at + ((20 + ds.seq * 9 + (abs(('x' || substr(md5(o.slug || ds.name),1,8))::bit(32)::int) % 80)) || ' days')::INTERVAL
FROM organizations o
JOIN teams t ON t.organization_id = o.id AND t.name = 'Data Platform'
JOIN LATERAL (VALUES
    (7, 'warehouse-ro-v2', 'postgres', 'production', 'warehouse-ro-v2', 5432, 'warehouse', TRUE, 'read_only', 'active', ARRAY['warehouse','readonly','v2']::TEXT[]),
    (8, 'pg-reporting-archive', 'postgres', 'production', 'pg-reporting-archive', 5432, 'reporting_archive', TRUE, 'read_only', 'active', ARRAY['archive','reporting','legacy']::TEXT[]),
    (9, 'mysql-crm-shadow', 'mysql', 'production', 'mysql-crm-shadow', 3306, 'crm_shadow', TRUE, 'read_only', 'degraded', ARRAY['crm','legacy','shadow']::TEXT[]),
    (10, 'analytics-failover-eu', 'redshift', 'production', 'analytics-failover-eu', 5439, 'analytics_failover', TRUE, 'read_only', 'active', ARRAY['analytics','failover']::TEXT[]),
    (11, 'old-prod-billing-01', 'postgres', 'production', 'old-prod-billing-01', 5432, 'billing_legacy', TRUE, 'read_only', 'archived', ARRAY['billing','legacy','financial']::TEXT[]),
    (12, 'dev-scratch-mongo', 'mongodb', 'development', 'dev-scratch-mongo', 27017, 'scratch', FALSE, 'read_write', 'disabled', ARRAY['development','scratch']::TEXT[]),
    (13, 'partner-ingest-stage', 'mssql', 'staging', 'partner-ingest-stage', 1433, 'partner_ingest', TRUE, 'read_write', 'active', ARRAY['partner','staging']::TEXT[])
) AS ds(seq, name, type, environment, host_prefix, port, database_name, ssl_enabled, mode, status, tags) ON TRUE
WHERE (o.plan IN ('enterprise','pro') OR ds.seq IN (7,8))
  AND o.status <> 'closed'
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO data_source_credentials (data_source_id, secret_ref, username_ref, rotation_status, last_rotated_at, next_rotation_at)
SELECT ds.id,
       'vault://' || o.slug || '/' || lower(replace(ds.name, ' ', '-')) || '/db-proxy',
       'vault://' || o.slug || '/' || lower(replace(ds.name, ' ', '-')) || '/username',
       CASE WHEN ds.status = 'degraded' THEN 'rotation_due' WHEN ds.status = 'pending' THEN 'rotating' ELSE 'valid' END,
       NOW() - ((20 + abs(('x' || substr(md5(ds.id::TEXT), 1, 8))::bit(32)::int) % 80) || ' days')::INTERVAL,
       NOW() + ((10 + abs(('x' || substr(md5(ds.id::TEXT || 'next'), 1, 8))::bit(32)::int) % 60) || ' days')::INTERVAL
FROM data_sources ds
JOIN organizations o ON o.id = ds.organization_id;

-- =========================================================
-- SEED: POLICIES / RULES / MASKING / LIMITS
-- =========================================================

INSERT INTO access_policies (organization_id, data_source_id, role_id, allowed_actions, allowed_schemas, allowed_tables, denied_tables, allowed_columns, row_filter_policy, requires_approval, status, created_by_user_id, created_at)
SELECT ds.organization_id, ds.id, r.id,
       CASE r.name WHEN 'admin' THEN ARRAY['read','write','admin','metadata','explain']::TEXT[] WHEN 'developer' THEN ARRAY['read','metadata','explain']::TEXT[] ELSE ARRAY['read','metadata']::TEXT[] END,
       CASE WHEN r.name = 'admin' THEN ARRAY['*']::TEXT[] ELSE ARRAY['public','analytics','mart','reporting']::TEXT[] END,
       CASE WHEN r.name = 'admin' THEN ARRAY['*']::TEXT[] ELSE ARRAY['daily_kpis','customer_segments','project_health','billing_summary','events_daily','orders','tickets']::TEXT[] END,
       CASE WHEN r.name = 'admin' THEN ARRAY[]::TEXT[] ELSE ARRAY['users','api_tokens','auth_sessions','raw_payments','customer_tokens','medical_records']::TEXT[] END,
       CASE WHEN r.name = 'analyst' THEN '{"customer_segments":["customer_id_hash","segment","country","mrr_bucket"],"daily_kpis":["date","active_users","revenue","error_rate"]}'::JSONB ELSE '{}'::JSONB END,
       CASE WHEN r.name IN ('analyst','data_steward') THEN 'organization_id = current_proxy_organization_id()' ELSE NULL END,
       CASE WHEN r.name IN ('developer','analyst') AND ds.tags && ARRAY['pii','financial']::TEXT[] THEN TRUE ELSE FALSE END,
       'active',
       (SELECT u.id FROM users u WHERE u.organization_id = ds.organization_id AND u.status = 'active' ORDER BY u.created_at LIMIT 1),
       ds.created_at + INTERVAL '1 day'
FROM data_sources ds
CROSS JOIN roles r
WHERE r.name IN ('admin','analyst','developer','auditor','security_reviewer','data_steward');

INSERT INTO query_rules (data_source_id, rule_type, name, pattern, max_rows, max_runtime_ms, applies_to_role_id, severity, status, created_at)
SELECT ds.id, rule_type, name, pattern, max_rows, max_runtime_ms,
       CASE WHEN role_name IS NULL THEN NULL ELSE (SELECT id FROM roles WHERE name = role_name) END,
       severity, 'active', ds.created_at + INTERVAL '2 days'
FROM data_sources ds
CROSS JOIN (VALUES
    ('block', 'Block destructive statements', '(?i)\b(drop|truncate|alter|delete|update|insert)\b', NULL::INTEGER, NULL::INTEGER, NULL::TEXT, 'critical'),
    ('limit', 'Limit SELECT star for analysts', '(?i)select\s+\*', 500, 3000, 'analyst', 'medium'),
    ('require_approval', 'Approval for sensitive tables', '(?i)\b(users|billing_events|auth_sessions|customer_tokens|raw_payments|medical_records)\b', NULL, NULL, NULL, 'high'),
    ('limit', 'Default max result set', NULL, 10000, 10000, NULL, 'medium'),
    ('warn', 'Warn on unbounded scans', '(?i)from\s+\w+(\.\w+)?\s*;?$', NULL, 8000, NULL, 'low')
) AS rules(rule_type, name, pattern, max_rows, max_runtime_ms, role_name, severity);

INSERT INTO masking_policies (organization_id, classification, mask_type, role_id, enabled)
SELECT o.id, c.classification,
       CASE
           WHEN r.name = 'admin' THEN 'none'
           WHEN c.classification = 'public' THEN 'none'
           WHEN c.classification = 'internal' THEN 'partial'
           WHEN c.classification = 'confidential' THEN 'hash'
           WHEN c.classification = 'pii' THEN 'partial'
           WHEN c.classification = 'financial' THEN 'full'
           ELSE 'redact'
       END,
       r.id, TRUE
FROM organizations o
CROSS JOIN roles r
CROSS JOIN (VALUES ('public'),('internal'),('confidential'),('pii'),('financial'),('secret')) c(classification)
WHERE r.name IN ('admin','analyst','developer','auditor','security_reviewer','data_steward');

INSERT INTO rate_limits (organization_id, user_id, role_id, data_source_id, max_queries_per_minute, max_rows_per_day, max_runtime_ms_per_day)
SELECT ds.organization_id, NULL, r.id, ds.id,
       CASE r.name WHEN 'admin' THEN 120 WHEN 'developer' THEN 60 WHEN 'analyst' THEN 45 ELSE 30 END,
       CASE r.name WHEN 'admin' THEN 2000000 WHEN 'developer' THEN 750000 WHEN 'analyst' THEN 500000 ELSE 250000 END,
       CASE r.name WHEN 'admin' THEN 7200000 WHEN 'developer' THEN 3600000 ELSE 1800000 END
FROM data_sources ds
JOIN roles r ON r.name IN ('admin','analyst','developer','auditor','security_reviewer','data_steward');

INSERT INTO audit_log_retention_policies (organization_id, retention_days, legal_hold_enabled, export_to_cold_storage, cold_storage_uri)
SELECT o.id, p.audit_retention_days, (o.plan = 'enterprise'), TRUE, 's3://db-proxy-audit-archive/' || o.slug || '/'
FROM organizations o JOIN plans p ON p.code = o.plan;

-- =========================================================
-- SEED: CATALOG / SCANS / LINEAGE
-- =========================================================

INSERT INTO catalog_scan_runs (data_source_id, status, tables_scanned, columns_scanned, pii_columns_detected, started_at, finished_at)
SELECT ds.id, CASE WHEN ds.status = 'pending' THEN 'queued' WHEN ds.status = 'degraded' AND gs % 5 = 0 THEN 'partial' ELSE 'success' END,
       20 + (gs % 14), 160 + (gs * 7 % 90), 3 + (gs % 11),
       NOW() - ((gs * 7) || ' days')::INTERVAL,
       CASE WHEN ds.status = 'pending' THEN NULL ELSE NOW() - ((gs * 7) || ' days')::INTERVAL + INTERVAL '8 minutes' END
FROM data_sources ds, generate_series(1, 12) gs;

INSERT INTO data_catalog (data_source_id, schema_name, table_name, column_name, data_type, classification, nullable, sample_value_redacted, description, last_scanned_at)
SELECT ds.id, c.schema_name, c.table_name, c.column_name, c.data_type, c.classification, c.nullable, c.sample_value_redacted, c.description,
       NOW() - ((abs(('x' || substr(md5(ds.id::TEXT || c.table_name),1,8))::bit(32)::int) % 14) || ' days')::INTERVAL
FROM data_sources ds
CROSS JOIN (VALUES
('analytics','daily_kpis','date','date','public',false,'2026-05-16','KPI aggregation date'),
('analytics','daily_kpis','active_users','integer','internal',false,'18420','Daily active users'),
('analytics','daily_kpis','revenue','numeric','financial',false,'[masked_amount]','Daily recognized revenue'),
('analytics','daily_kpis','error_rate','numeric','internal',false,'0.0021','Application error rate'),
('analytics','customer_segments','customer_id','uuid','confidential',false,'[hashed_uuid]','Internal customer identifier'),
('analytics','customer_segments','customer_id_hash','varchar','internal',false,'a81f...','Safe customer hash'),
('analytics','customer_segments','segment','varchar','internal',true,'enterprise','Customer segment'),
('analytics','customer_segments','country','varchar','internal',true,'IL','Customer country'),
('analytics','customer_segments','mrr_bucket','varchar','financial',true,'10k-25k','MRR bucket'),
('public','users','id','uuid','confidential',false,'[uuid]','User primary key'),
('public','users','email','varchar','pii',false,'n***@example.com','Customer user email'),
('public','users','phone','varchar','pii',true,'+972******123','Customer phone number'),
('public','users','created_at','timestamp','internal',false,'2024-12-04','User creation timestamp'),
('public','billing_events','invoice_id','varchar','financial',false,'inv_***','Invoice identifier'),
('public','billing_events','amount','numeric','financial',false,'[masked_amount]','Billing event amount'),
('public','billing_events','card_last4','varchar','financial',true,'4242','Last four payment card digits'),
('public','billing_events','billing_email','varchar','pii',true,'b***@example.com','Billing email'),
('public','api_tokens','token_hash','char(64)','secret',false,'[redacted]','Token hash'),
('public','auth_sessions','session_hash','char(64)','secret',false,'[redacted]','Session hash'),
('mart','orders','order_id','uuid','internal',false,'[uuid]','Order identifier'),
('mart','orders','customer_email','varchar','pii',true,'c***@example.com','Order customer email'),
('mart','orders','gross_amount','numeric','financial',false,'[masked_amount]','Gross order amount'),
('mart','tickets','ticket_id','uuid','internal',false,'[uuid]','Support ticket id'),
('mart','tickets','subject','text','confidential',true,'[redacted_text]','Support ticket subject'),
('mart','tickets','priority','varchar','internal',true,'high','Ticket priority'),
('reporting','project_health','project_id','uuid','internal',false,'[uuid]','Project identifier'),
('reporting','project_health','risk_score','numeric','internal',true,'0.42','Computed project risk'),
('reporting','project_health','owner_email','varchar','pii',true,'o***@example.com','Project owner email'),
('events','events_daily','event_date','date','public',false,'2026-05-16','Event aggregation date'),
('events','events_daily','event_name','varchar','internal',false,'query.executed','Event name'),
('events','events_daily','event_count','integer','internal',false,'52091','Event count')
) AS c(schema_name, table_name, column_name, data_type, classification, nullable, sample_value_redacted, description)
WHERE ds.status <> 'pending';

INSERT INTO data_lineage_edges (organization_id, source_catalog_id, target_catalog_id, transform_name, confidence, discovered_at)
SELECT ds.organization_id, src.id, tgt.id, 'daily_warehouse_build', 0.9400, NOW() - INTERVAL '11 days'
FROM data_sources ds
JOIN data_catalog src ON src.data_source_id = ds.id AND src.table_name = 'billing_events' AND src.column_name = 'amount'
JOIN data_catalog tgt ON tgt.data_source_id = ds.id AND tgt.table_name = 'daily_kpis' AND tgt.column_name = 'revenue'
ON CONFLICT DO NOTHING;

-- =========================================================
-- SEED: TOKENS / SESSIONS / SAVED QUERIES
-- =========================================================

INSERT INTO api_tokens (organization_id, user_id, name, token_hash, scopes, last_ip, expires_at, last_used_at, revoked_at, created_at)
SELECT u.organization_id, u.id,
       CASE WHEN u.department = 'Engineering' THEN 'local-dev-cli' ELSE 'analytics-workbench' END,
       encode(digest(u.id::TEXT || ':token:' || u.email, 'sha256'), 'hex'),
       CASE WHEN u.department = 'Engineering' THEN ARRAY['query:read','catalog:read']::TEXT[] ELSE ARRAY['query:read','catalog:read','audit:read']::TEXT[] END,
       ('10.24.' || (abs(('x' || substr(md5(u.id::TEXT),1,8))::bit(32)::int) % 255) || '.' || (10 + abs(('x' || substr(md5(u.email),1,8))::bit(32)::int) % 200))::INET,
       NOW() + INTERVAL '90 days',
       NOW() - ((abs(('x' || substr(md5(u.email || 'used'),1,8))::bit(32)::int) % 3000) || ' minutes')::INTERVAL,
       CASE WHEN u.status = 'disabled' THEN NOW() - INTERVAL '3 days' ELSE NULL END,
       u.created_at + INTERVAL '1 day'
FROM users u
WHERE u.status IN ('active','disabled') AND (abs(('x' || substr(md5(u.email),1,8))::bit(32)::int) % 3 = 0);

INSERT INTO user_sessions (organization_id, user_id, session_hash, ip, user_agent, status, created_at, last_seen_at, expires_at)
SELECT u.organization_id, u.id,
       encode(digest(u.id::TEXT || ':session:' || gs::TEXT, 'sha256'), 'hex'),
       ('10.24.' || (gs % 255) || '.' || (40 + gs % 180))::INET,
       (ARRAY['Chrome/124 macOS','Chrome/125 Windows','Safari/17 macOS','Firefox/126 Linux','MassiveProxyClient/2.4'])[1 + (gs % 5)],
       CASE WHEN gs % 11 = 0 THEN 'revoked' WHEN gs % 7 = 0 THEN 'expired' ELSE 'active' END,
       NOW() - ((gs * 11) || ' hours')::INTERVAL,
       NOW() - ((gs * 19 % 1440) || ' minutes')::INTERVAL,
       NOW() + ((12 + gs % 48) || ' hours')::INTERVAL
FROM users u
JOIN LATERAL generate_series(1, CASE WHEN u.status = 'active' THEN 3 ELSE 1 END) gs ON TRUE;

INSERT INTO saved_queries (organization_id, data_source_id, name, description, query_template, parameters_schema, created_by_user_id, visibility, status, last_run_at, run_count, created_at)
SELECT ds.organization_id, ds.id, q.name, q.description, q.query_template, q.parameters_schema::JSONB,
       (SELECT u.id FROM users u WHERE u.organization_id = ds.organization_id AND u.status = 'active' ORDER BY random() LIMIT 1),
       q.visibility, 'active', NOW() - ((q.seq * 9) || ' hours')::INTERVAL, 10 + q.seq * 17,
       ds.created_at + ((q.seq + 1) || ' days')::INTERVAL
FROM data_sources ds
CROSS JOIN (VALUES
(1, 'Daily KPI Summary', 'Approved read-only KPI query for management dashboard.', 'SELECT date, active_users, revenue, error_rate FROM analytics.daily_kpis WHERE date BETWEEN :start_date AND :end_date ORDER BY date DESC LIMIT :limit', '{"start_date":{"type":"date","required":true},"end_date":{"type":"date","required":true},"limit":{"type":"integer","default":100,"max":500}}', 'organization'),
(2, 'Customer Segment Breakdown', 'Segment-level customer counts with safe hashed identifiers only.', 'SELECT segment, country, mrr_bucket, count(*) FROM analytics.customer_segments GROUP BY 1,2,3 ORDER BY 4 DESC LIMIT :limit', '{"limit":{"type":"integer","default":50,"max":250}}', 'team'),
(3, 'Slow Queries Review', 'Audit query runtime distribution for operational reviews.', 'SELECT date_trunc(''hour'', created_at) AS hour, count(*), percentile_cont(0.95) within group (order by runtime_ms) FROM query_audit_logs WHERE created_at > now() - interval ''7 days'' GROUP BY 1 ORDER BY 1 DESC', '{}', 'private'),
(4, 'Sensitive Catalog Inventory', 'List sensitive fields detected by the latest catalog scan.', 'SELECT schema_name, table_name, column_name, classification FROM data_catalog WHERE classification IN (''pii'',''financial'',''secret'') ORDER BY classification, table_name', '{}', 'team')
) AS q(seq, name, description, query_template, parameters_schema, visibility)
WHERE ds.status <> 'pending';

-- =========================================================
-- SEED: QUERY ACTIVITY OVER ~18 MONTHS
-- =========================================================

INSERT INTO query_audit_logs (
    organization_id, user_id, data_source_id, request_id, query_hash, query_redacted, action, status,
    policy_decision, rows_returned, runtime_ms, bytes_scanned, error_message, client_ip, user_agent, created_at
)
SELECT u.organization_id, u.id, ds.id, gen_random_uuid(),
       encode(digest(template.query_text || ':' || gs::TEXT || ':' || u.id::TEXT, 'sha256'), 'hex'),
       template.query_redacted,
       template.action,
       CASE
           WHEN template.query_redacted ILIKE '%DROP%' THEN 'denied'
           WHEN gs % 997 BETWEEN 1 AND 8 THEN 'timeout'
           WHEN gs % 211 BETWEEN 1 AND 5 THEN 'requires_approval'
           WHEN gs % 389 BETWEEN 1 AND 9 THEN 'failed'
           WHEN gs % 1447 = 0 THEN 'cancelled'
           ELSE 'success'
       END,
       CASE
           WHEN template.query_redacted ILIKE '%DROP%' THEN 'deny'
           WHEN gs % 211 BETWEEN 1 AND 5 THEN 'approval_required'
           WHEN template.query_redacted ILIKE '%email%' THEN 'mask'
           WHEN template.query_redacted ILIKE '%SELECT *%' THEN 'limit'
           ELSE 'allow'
       END,
       CASE WHEN gs % 389 BETWEEN 1 AND 9 OR template.query_redacted ILIKE '%DROP%' THEN 0 ELSE (5 + (gs * 37 % 9500) + CASE WHEN gs % 997 BETWEEN 1 AND 22 THEN 5000 ELSE 0 END) END,
       CASE WHEN gs % 997 BETWEEN 1 AND 8 THEN 10000 + (gs % 8000) ELSE 20 + (gs * 31 % 2800) + CASE WHEN gs % 997 BETWEEN 1 AND 22 THEN 2500 ELSE 0 END END,
       10000 + (gs::BIGINT * 8192 % 900000000),
       CASE WHEN gs % 389 BETWEEN 1 AND 9 THEN 'Upstream connection reset by peer' WHEN gs % 1447 = 0 THEN 'Client cancelled request' WHEN template.query_redacted ILIKE '%DROP%' THEN 'Blocked by destructive statement rule' ELSE NULL END,
       ('10.24.' || (gs % 255) || '.' || (20 + gs % 220))::INET,
       (ARRAY['MassiveProxyClient/2.4','Chrome/125','db-proxy-cli/1.9','DataStudioConnector/3.2'])[1 + (gs % 4)],
       NOW() - ((gs % 730) || ' days')::INTERVAL - (((gs * 13 + CASE WHEN gs % 997 BETWEEN 1 AND 22 THEN 43200 ELSE 0 END) % 86400) || ' seconds')::INTERVAL
FROM generate_series(1, 250000) gs
JOIN LATERAL (
    SELECT u.* FROM users u WHERE u.status = 'active' ORDER BY md5(u.id::TEXT || gs::TEXT) LIMIT 1
) u ON TRUE
JOIN LATERAL (
    SELECT ds.* FROM data_sources ds WHERE ds.organization_id = u.organization_id AND ds.status IN ('active','degraded') ORDER BY md5(ds.id::TEXT || gs::TEXT) LIMIT 1
) ds ON TRUE
JOIN LATERAL (
    SELECT * FROM (VALUES
        ('SELECT date, active_users, revenue FROM analytics.daily_kpis WHERE date >= ?', 'SELECT date, active_users, revenue FROM analytics.daily_kpis WHERE date >= :start_date', 'read'),
        ('SELECT segment, count(*) FROM analytics.customer_segments GROUP BY 1', 'SELECT segment, count(*) FROM analytics.customer_segments GROUP BY ?', 'read'),
        ('SELECT schema_name, table_name FROM information_schema.tables', 'SELECT schema_name, table_name FROM information_schema.tables', 'metadata'),
        ('EXPLAIN SELECT * FROM mart.orders WHERE created_at > ?', 'EXPLAIN SELECT * FROM mart.orders WHERE created_at > :date', 'explain'),
        ('SELECT customer_email, gross_amount FROM mart.orders LIMIT ?', 'SELECT customer_email, gross_amount FROM mart.orders LIMIT ?', 'read'),
        ('SELECT * FROM public.users', 'SELECT * FROM public.users', 'read'),
        ('DROP TABLE public.users', 'DROP TABLE public.users', 'admin')
    ) AS t(query_text, query_redacted, action)
    ORDER BY md5(gs::TEXT || query_text) LIMIT 1
) template ON TRUE;

INSERT INTO query_approvals (organization_id, requested_by_user_id, approved_by_user_id, data_source_id, query_hash, query_redacted, reason, status, expires_at, created_at, decided_at)
SELECT qal.organization_id, qal.user_id,
       CASE WHEN gs % 4 = 0 THEN NULL ELSE (SELECT u2.id FROM users u2 JOIN user_roles ur ON ur.user_id = u2.id JOIN roles r ON r.id = ur.role_id WHERE u2.organization_id = qal.organization_id AND r.name IN ('admin','security_reviewer') LIMIT 1) END,
       qal.data_source_id, qal.query_hash, qal.query_redacted,
       (ARRAY['Investigating customer migration issue','Validating billing reconciliation discrepancy','One-off export for compliance audit','Debugging production incident with restricted table'])[1 + (gs % 4)],
       CASE WHEN gs % 4 = 0 THEN 'pending' WHEN gs % 5 = 0 THEN 'rejected' ELSE 'approved' END,
       qal.created_at + INTERVAL '2 hours',
       qal.created_at + INTERVAL '1 minute',
       CASE WHEN gs % 4 = 0 THEN NULL ELSE qal.created_at + INTERVAL '17 minutes' END
FROM (
    SELECT *, row_number() OVER (ORDER BY created_at DESC) AS rn
    FROM query_audit_logs
    WHERE status = 'requires_approval'
    LIMIT 220
) qal
JOIN generate_series(1, 220) gs ON gs = qal.rn;

-- =========================================================
-- SEED: HEALTH CHECKS / POOL EVENTS / SECURITY EVENTS
-- =========================================================

INSERT INTO data_source_health (data_source_id, status, latency_ms, pool_active_connections, pool_idle_connections, error_rate, last_success_at, last_error, checked_at)
SELECT ds.id,
       CASE WHEN ds.status = 'degraded' AND gs % 6 IN (0,1) THEN 'degraded' WHEN gs % 113 = 0 THEN 'down' ELSE 'healthy' END,
       CASE WHEN ds.status = 'degraded' THEN 160 + (gs % 220) ELSE 20 + (gs % 85) END,
       2 + (gs * 7 % 25),
       1 + (gs * 11 % 20),
       CASE WHEN ds.status = 'degraded' THEN 0.0350 ELSE (gs % 17)::NUMERIC / 10000 END,
       NOW() - ((gs * 5) || ' minutes')::INTERVAL,
       CASE WHEN ds.status = 'degraded' AND gs % 6 IN (0,1) THEN 'Connection pool near saturation' WHEN gs % 113 = 0 THEN 'TCP connection timeout' ELSE NULL END,
       NOW() - ((gs * 5) || ' minutes')::INTERVAL
FROM data_sources ds, generate_series(1, 288) gs
WHERE ds.status IN ('active','degraded');

INSERT INTO connection_pool_events (data_source_id, event_type, active_connections, idle_connections, metadata, created_at)
SELECT ds.id,
       (ARRAY['pool_scaled','connection_recycled','pool_saturated','connection_failed','circuit_opened','circuit_closed'])[1 + (gs % 6)],
       3 + (gs * 9 % 35),
       1 + (gs * 5 % 16),
       jsonb_build_object('node', 'proxy-worker-' || (1 + gs % 8), 'reason', CASE WHEN gs % 3 = 0 THEN 'load_spike' ELSE 'routine_maintenance' END),
       NOW() - ((gs * 37) || ' minutes')::INTERVAL
FROM data_sources ds, generate_series(1, 25) gs
WHERE ds.status IN ('active','degraded');

INSERT INTO security_events (organization_id, user_id, data_source_id, event_type, severity, metadata, status, created_at, resolved_at)
SELECT qal.organization_id, qal.user_id, qal.data_source_id,
       CASE
           WHEN qal.status = 'denied' THEN 'denied_query'
           WHEN qal.status = 'requires_approval' THEN 'approval_required'
           WHEN qal.status = 'timeout' THEN 'error_spike'
           WHEN qal.query_redacted ILIKE '%email%' THEN 'pii_access'
           ELSE 'policy_violation'
       END,
       CASE
           WHEN qal.status = 'denied' THEN 'high'
           WHEN qal.status = 'timeout' THEN 'medium'
           WHEN qal.query_redacted ILIKE '%email%' THEN 'medium'
           ELSE 'low'
       END,
       jsonb_build_object('request_id', qal.request_id, 'policy_decision', qal.policy_decision, 'query_hash', qal.query_hash),
       CASE WHEN qal.created_at > NOW() - INTERVAL '2 days' AND qal.status IN ('denied','requires_approval') THEN 'open' WHEN qal.created_at > NOW() - INTERVAL '7 days' THEN 'investigating' ELSE 'resolved' END,
       qal.created_at + INTERVAL '10 seconds',
       CASE WHEN qal.created_at > NOW() - INTERVAL '7 days' THEN NULL ELSE qal.created_at + INTERVAL '3 hours' END
FROM query_audit_logs qal
WHERE qal.status IN ('denied','requires_approval','timeout')
ORDER BY qal.created_at DESC
LIMIT 750;

INSERT INTO incident_comments (security_event_id, user_id, body, created_at)
SELECT se.id,
       (SELECT u.id FROM users u WHERE u.organization_id = se.organization_id AND u.status = 'active' ORDER BY md5(u.id::TEXT || se.id::TEXT) LIMIT 1),
       CASE se.status WHEN 'resolved' THEN 'Reviewed audit trail and confirmed expected policy behavior.' WHEN 'investigating' THEN 'Checking correlated requests and user session context.' ELSE 'Initial triage created automatically by policy engine.' END,
       se.created_at + INTERVAL '15 minutes'
FROM security_events se
WHERE se.status IN ('resolved','investigating','open')
LIMIT 500;

INSERT INTO notifications (organization_id, user_id, channel, type, title, body, status, created_at, sent_at, read_at)
SELECT se.organization_id, se.user_id,
       (ARRAY['email','slack','in_app','webhook'])[1 + (gs % 4)],
       se.event_type,
       'Security event: ' || se.event_type,
       'A ' || se.severity || ' severity event was recorded for a protected data source.',
       CASE WHEN gs % 13 = 0 THEN 'failed' WHEN gs % 5 = 0 THEN 'read' ELSE 'sent' END,
       se.created_at + INTERVAL '30 seconds',
       se.created_at + INTERVAL '1 minute',
       CASE WHEN gs % 5 = 0 THEN se.created_at + INTERVAL '24 minutes' ELSE NULL END
FROM security_events se
JOIN generate_series(1, 900) gs ON TRUE
WHERE gs <= 900
LIMIT 900;

-- =========================================================
-- SEED: DAILY ROLLUPS / FLAGS / WEBHOOKS
-- =========================================================

INSERT INTO usage_daily_rollups (organization_id, data_source_id, usage_date, query_count, denied_count, failed_count, approval_count, rows_returned, runtime_ms, bytes_scanned)
SELECT o.id, ds.id, d::DATE,
       80 + (abs(('x' || substr(md5(o.id::TEXT || ds.id::TEXT || d::TEXT),1,8))::bit(32)::int) % 900),
       abs(('x' || substr(md5('denied' || d::TEXT || ds.id::TEXT),1,8))::bit(32)::int) % 18,
       abs(('x' || substr(md5('failed' || d::TEXT || ds.id::TEXT),1,8))::bit(32)::int) % 25,
       abs(('x' || substr(md5('approval' || d::TEXT || ds.id::TEXT),1,8))::bit(32)::int) % 12,
       10000 + abs(('x' || substr(md5('rows' || d::TEXT || ds.id::TEXT),1,8))::bit(32)::int) % 5000000,
       50000 + abs(('x' || substr(md5('runtime' || d::TEXT || ds.id::TEXT),1,8))::bit(32)::int) % 15000000,
       1000000 + abs(('x' || substr(md5('bytes' || d::TEXT || ds.id::TEXT),1,8))::bit(32)::int)::BIGINT % 9000000000
FROM organizations o
JOIN data_sources ds ON ds.organization_id = o.id AND ds.status IN ('active','degraded')
CROSS JOIN generate_series((NOW() - INTERVAL '730 days')::DATE, NOW()::DATE, INTERVAL '1 day') d;

INSERT INTO feature_flags (organization_id, key, enabled, rules)
SELECT o.id, f.key, f.enabled, f.rules::JSONB
FROM organizations o
CROSS JOIN (VALUES
('approval_v2', TRUE, '{"rollout":100}'),
('lineage_graph', TRUE, '{"rollout":80}'),
('query_rewrite_engine', FALSE, '{"rollout":15}'),
('adaptive_rate_limits', TRUE, '{"rollout":60}'),
('warehouse_cost_estimator', TRUE, '{"rollout":100}')
) f(key, enabled, rules);

INSERT INTO webhooks (organization_id, name, url, event_types, secret_hash, status, created_at)
SELECT o.id, 'Security Events Webhook', 'https://hooks.' || o.slug || '.example/db-proxy/security',
       ARRAY['security_event.created','approval.created','data_source.degraded']::TEXT[],
       encode(digest(o.id::TEXT || ':webhook-secret', 'sha256'), 'hex'),
       CASE WHEN o.plan = 'starter' THEN 'disabled' ELSE 'active' END,
       o.created_at + INTERVAL '9 days'
FROM organizations o;

INSERT INTO webhook_deliveries (webhook_id, event_type, status, response_code, response_ms, attempt_count, payload_redacted, created_at)
SELECT w.id,
       (ARRAY['security_event.created','approval.created','data_source.degraded'])[1 + (gs % 3)],
       CASE WHEN gs % 23 = 0 THEN 'failed' WHEN gs % 17 = 0 THEN 'retrying' ELSE 'success' END,
       CASE WHEN gs % 23 = 0 THEN 500 WHEN gs % 17 = 0 THEN 429 ELSE 200 END,
       40 + (gs * 7 % 900),
       CASE WHEN gs % 17 = 0 THEN 2 ELSE 1 END,
       jsonb_build_object('event_id', gen_random_uuid(), 'redacted', true),
       NOW() - ((gs * 97) || ' minutes')::INTERVAL
FROM webhooks w, generate_series(1, 180) gs;


-- =========================================================
-- SEED V2: LONG-RUNNING OPERATIONAL HISTORY
-- =========================================================

INSERT INTO schema_migrations (version, description, checksum, applied_by, applied_at, execution_ms, success)
SELECT '2024_' || lpad(gs::TEXT, 3, '0'),
       (ARRAY['create core tenancy tables','add policy engine','add audit log partition keys','add webhook delivery model','add billing rollups','add catalog lineage','add incident workflow','add query cost tracking'])[1 + (gs % 8)],
       encode(digest('migration:' || gs::TEXT, 'sha256'), 'hex'),
       (ARRAY['platform-ci','release-bot','db-admin','migration-runner'])[1 + (gs % 4)],
       NOW() - ((820 - gs * 6) || ' days')::INTERVAL,
       120 + (gs * 137 % 9000),
       CASE WHEN gs IN (17, 39, 88) THEN FALSE ELSE TRUE END
FROM generate_series(1, 112) gs;

INSERT INTO deployment_versions (version, git_sha, environment, status, deployed_by, started_at, finished_at, release_notes, metadata)
SELECT 'v' || (2 + gs / 20) || '.' || (gs % 20) || '.' || (gs % 7),
       substr(encode(digest('sha:' || gs::TEXT, 'sha1'), 'hex'), 1, 40),
       (ARRAY['production','staging'])[1 + (gs % 2)],
       CASE WHEN gs % 41 = 0 THEN 'rolled_back' WHEN gs % 37 = 0 THEN 'failed' WHEN gs < 118 THEN 'superseded' ELSE 'healthy' END,
       (ARRAY['release-bot','sre-oncall','platform-ci'])[1 + (gs % 3)],
       NOW() - ((730 - gs * 5) || ' days')::INTERVAL,
       NOW() - ((730 - gs * 5) || ' days')::INTERVAL + ((8 + gs % 35) || ' minutes')::INTERVAL,
       (ARRAY['policy engine tuning','catalog scan performance','webhook retry hardening','billing reconciliation patch','proxy pool stability release'])[1 + (gs % 5)],
       jsonb_build_object('canary_pct', CASE WHEN gs % 9 = 0 THEN 10 ELSE 100 END, 'rollback_window_minutes', 30 + gs % 60)
FROM generate_series(1, 140) gs;

INSERT INTO sso_providers (organization_id, provider_type, issuer_url, status, enforce_sso, last_validated_at, created_at)
SELECT o.id,
       CASE WHEN o.slug LIKE '%health%' THEN 'azure_ad' WHEN o.plan = 'enterprise' THEN 'okta' ELSE 'google' END,
       'https://idp.' || o.slug || '.example/' || CASE WHEN o.plan = 'enterprise' THEN 'saml' ELSE 'oidc' END,
       CASE WHEN o.status = 'suspended' THEN 'misconfigured' WHEN o.status = 'trial' THEN 'pending' ELSE 'active' END,
       o.plan = 'enterprise',
       NOW() - ((abs(('x' || substr(md5(o.slug || 'sso'),1,8))::bit(32)::int) % 20) || ' days')::INTERVAL,
       o.created_at + INTERVAL '14 days'
FROM organizations o
WHERE o.plan IN ('enterprise','pro')
ON CONFLICT (organization_id, provider_type) DO NOTHING;

INSERT INTO scim_sync_runs (organization_id, provider_id, status, users_created, users_updated, users_disabled, groups_synced, error_message, started_at, finished_at)
SELECT sp.organization_id, sp.id,
       CASE WHEN gs % 29 = 0 THEN 'failed' WHEN gs % 17 = 0 THEN 'partial' ELSE 'success' END,
       gs % 5, 5 + (gs * 3 % 60), gs % 4, 1 + (gs % 12),
       CASE WHEN gs % 29 = 0 THEN 'Directory API returned rate limit during delta sync' WHEN gs % 17 = 0 THEN 'Some groups skipped because of missing external IDs' ELSE NULL END,
       NOW() - ((gs * 5) || ' days')::INTERVAL,
       NOW() - ((gs * 5) || ' days')::INTERVAL + ((2 + gs % 18) || ' minutes')::INTERVAL
FROM sso_providers sp
JOIN generate_series(1, 120) gs ON TRUE;

INSERT INTO auth_events (organization_id, user_id, event_type, ip, user_agent, risk_score, metadata, created_at)
SELECT u.organization_id, u.id,
       CASE
           WHEN gs % 131 = 0 THEN 'password_reset_requested'
           WHEN gs % 97 = 0 THEN 'mfa_failed'
           WHEN gs % 71 = 0 THEN 'login_failed'
           WHEN gs % 53 = 0 THEN 'sso_login'
           WHEN gs % 19 = 0 THEN 'mfa_challenge'
           ELSE 'login_success'
       END,
       ('10.' || (20 + gs % 70) || '.' || (gs * 7 % 255) || '.' || (15 + gs % 220))::INET,
       (ARRAY['Chrome/126 macOS','Chrome/126 Windows','Safari/17.5 macOS','Firefox/126 Linux','db-proxy-cli/2.3'])[1 + (gs % 5)],
       CASE WHEN gs % 71 = 0 THEN 71.5 WHEN gs % 97 = 0 THEN 82.2 ELSE (gs % 23)::NUMERIC END,
       jsonb_build_object('country', (ARRAY['IL','US','DE','GB','NL','FR'])[1 + (gs % 6)], 'device_id_hash', encode(digest(u.id::TEXT || gs::TEXT, 'sha256'), 'hex')),
       NOW() - ((gs % 730) || ' days')::INTERVAL - ((gs * 37 % 86400) || ' seconds')::INTERVAL
FROM generate_series(1, 90000) gs
JOIN LATERAL (
    SELECT u.* FROM users u WHERE u.status = 'active' ORDER BY md5(u.id::TEXT || 'auth' || gs::TEXT) LIMIT 1
) u ON TRUE;

INSERT INTO password_reset_requests (organization_id, user_id, status, requested_ip, requested_at, completed_at, expires_at)
SELECT ae.organization_id, ae.user_id,
       CASE WHEN rn % 11 = 0 THEN 'expired' WHEN rn % 17 = 0 THEN 'revoked' ELSE 'completed' END,
       ae.ip,
       ae.created_at,
       CASE WHEN rn % 11 = 0 OR rn % 17 = 0 THEN NULL ELSE ae.created_at + INTERVAL '9 minutes' END,
       ae.created_at + INTERVAL '2 hours'
FROM (
    SELECT ae.*, row_number() OVER (ORDER BY ae.created_at DESC) rn
    FROM auth_events ae
    WHERE ae.event_type = 'password_reset_requested'
) ae
WHERE rn <= 900;

INSERT INTO api_clients (organization_id, name, client_id, client_secret_hash, scopes, status, last_used_at, created_by_user_id, created_at)
SELECT o.id,
       c.name,
       'cli_' || substr(encode(digest(o.id::TEXT || c.name, 'sha256'), 'hex'), 1, 24),
       encode(digest(o.id::TEXT || c.name || ':secret', 'sha256'), 'hex'),
       c.scopes,
       CASE WHEN o.status IN ('closed','suspended') THEN 'disabled' WHEN c.name ILIKE '%legacy%' THEN 'rotating' ELSE 'active' END,
       NOW() - ((abs(('x' || substr(md5(o.slug || c.name),1,8))::bit(32)::int) % 50) || ' days')::INTERVAL,
       (SELECT u.id FROM users u WHERE u.organization_id = o.id AND u.status = 'active' ORDER BY u.created_at LIMIT 1),
       o.created_at + ((c.seq * 11) || ' days')::INTERVAL
FROM organizations o
CROSS JOIN (VALUES
    (1, 'Terraform Provisioner', ARRAY['admin:write','source:write']::TEXT[]),
    (2, 'BI Gateway', ARRAY['query:read','catalog:read']::TEXT[]),
    (3, 'Legacy ETL Bridge', ARRAY['query:read','audit:read']::TEXT[]),
    (4, 'Support Diagnostics', ARRAY['audit:read','incident:read']::TEXT[])
) c(seq, name, scopes)
WHERE o.status <> 'closed';

INSERT INTO service_accounts (organization_id, name, email, owner_team_id, status, purpose, last_used_at, created_at)
SELECT o.id, sa.name,
       lower(replace(sa.name, ' ', '-')) || '@svc.' || o.slug || '.example',
       t.id,
       CASE WHEN sa.name ILIKE '%legacy%' THEN 'rotation_due' WHEN o.status = 'suspended' THEN 'disabled' ELSE 'active' END,
       sa.purpose,
       NOW() - ((sa.seq * 13 + length(o.slug)) || ' hours')::INTERVAL,
       o.created_at + ((sa.seq * 19) || ' days')::INTERVAL
FROM organizations o
JOIN teams t ON t.organization_id = o.id AND t.name = 'Product Engineering'
CROSS JOIN (VALUES
    (1, 'warehouse reader', 'Scheduled dashboard and report reads'),
    (2, 'catalog scanner', 'Metadata scan runner'),
    (3, 'legacy crm bridge', 'Legacy customer sync'),
    (4, 'incident bot', 'Notification and triage automation')
) sa(seq, name, purpose)
WHERE o.status <> 'closed'
ON CONFLICT (organization_id, email) DO NOTHING;

INSERT INTO background_jobs (organization_id, job_type, schedule_cron, status, owner, created_at)
SELECT o.id, j.job_type, j.schedule_cron,
       CASE WHEN o.status = 'suspended' AND j.job_type <> 'billing_reconciliation' THEN 'paused' ELSE 'enabled' END,
       j.owner,
       o.created_at + ((j.seq * 3) || ' days')::INTERVAL
FROM organizations o
CROSS JOIN (VALUES
    (1, 'catalog_scan', '13 */6 * * *', 'data-platform'),
    (2, 'audit_cold_storage_export', '20 2 * * *', 'compliance'),
    (3, 'billing_reconciliation', '5 4 1 * *', 'finance'),
    (4, 'webhook_retry_sweeper', '*/10 * * * *', 'platform'),
    (5, 'policy_drift_detector', '40 */3 * * *', 'security'),
    (6, 'usage_rollup_builder', '7 * * * *', 'platform')
) j(seq, job_type, schedule_cron, owner)
WHERE o.status <> 'closed';

INSERT INTO background_job_runs (job_id, status, attempt, records_processed, error_message, started_at, finished_at, metadata)
SELECT bj.id,
       CASE WHEN gs % 211 = 0 THEN 'timeout' WHEN gs % 97 = 0 THEN 'failed' WHEN gs % 43 = 0 THEN 'skipped' ELSE 'success' END,
       CASE WHEN gs % 97 = 0 THEN 2 ELSE 1 END,
       100 + (gs * 17 % 20000),
       CASE WHEN gs % 211 = 0 THEN 'Worker exceeded lock timeout' WHEN gs % 97 = 0 THEN 'Transient upstream dependency failure' ELSE NULL END,
       NOW() - ((gs * 6) || ' hours')::INTERVAL,
       NOW() - ((gs * 6) || ' hours')::INTERVAL + ((1 + gs % 28) || ' minutes')::INTERVAL,
       jsonb_build_object('shard', gs % 16, 'retryable', gs % 97 = 0)
FROM background_jobs bj
JOIN generate_series(1, 360) gs ON TRUE;

INSERT INTO proxy_nodes (region, node_name, version, status, capacity_connections, started_at, last_seen_at)
SELECT region,
       'proxy-' || region || '-' || lpad(gs::TEXT, 2, '0'),
       'v' || (8 + gs % 3) || '.' || (gs % 14) || '.' || (gs % 5),
       CASE WHEN gs % 13 = 0 THEN 'draining' WHEN gs % 11 = 0 THEN 'degraded' ELSE 'healthy' END,
       800 + gs * 75,
       NOW() - ((40 + gs * 7) || ' days')::INTERVAL,
       NOW() - ((gs % 9) || ' minutes')::INTERVAL
FROM (VALUES ('eu-west-1'),('eu-central-1'),('us-east-1'),('us-west-2')) r(region)
CROSS JOIN generate_series(1, 9) gs;

INSERT INTO worker_heartbeats (proxy_node_id, active_connections, cpu_pct, memory_pct, queue_depth, checked_at)
SELECT pn.id,
       20 + (gs * 17 % pn.capacity_connections),
       (15 + (gs * 3 % 80))::NUMERIC,
       (25 + (gs * 5 % 70))::NUMERIC,
       gs * 7 % 300,
       NOW() - ((gs * 5) || ' minutes')::INTERVAL
FROM proxy_nodes pn
JOIN generate_series(1, 288) gs ON TRUE;

INSERT INTO webhook_retry_attempts (webhook_delivery_id, attempt_number, status, response_code, response_ms, error_message, attempted_at, next_retry_at)
SELECT wd.id, attempt_no,
       CASE WHEN attempt_no = 3 AND wd.status = 'failed' THEN 'abandoned' WHEN attempt_no = 2 AND wd.status = 'retrying' THEN 'success' ELSE 'failed' END,
       CASE WHEN attempt_no = 2 AND wd.status = 'retrying' THEN 200 ELSE COALESCE(wd.response_code, 500) END,
       COALESCE(wd.response_ms, 300) + attempt_no * 40,
       CASE WHEN attempt_no = 2 AND wd.status = 'retrying' THEN NULL ELSE 'Remote endpoint returned retryable status' END,
       wd.created_at + ((attempt_no * 15) || ' minutes')::INTERVAL,
       CASE WHEN attempt_no < 3 THEN wd.created_at + (((attempt_no + 1) * 30) || ' minutes')::INTERVAL ELSE NULL END
FROM webhook_deliveries wd
JOIN LATERAL generate_series(1, CASE WHEN wd.status = 'success' THEN 0 ELSE 3 END) attempt_no ON TRUE;

INSERT INTO organization_changelog (organization_id, actor_user_id, change_type, entity_type, entity_id, previous_value, new_value, reason, created_at)
SELECT o.id,
       (SELECT u.id FROM users u WHERE u.organization_id = o.id AND u.status = 'active' ORDER BY md5(u.id::TEXT || gs::TEXT) LIMIT 1),
       (ARRAY['created','updated','disabled','renamed','ownership_changed','threshold_changed'])[1 + (gs % 6)],
       (ARRAY['data_source','access_policy','rate_limit','team','billing_subscription','webhook'])[1 + (gs % 6)],
       gen_random_uuid(),
       jsonb_build_object('status', CASE WHEN gs % 2 = 0 THEN 'active' ELSE 'pending' END),
       jsonb_build_object('status', CASE WHEN gs % 7 = 0 THEN 'disabled' ELSE 'active' END),
       (ARRAY['quarterly security review','customer request','incident follow-up','migration cleanup','billing plan change','SRE maintenance'])[1 + (gs % 6)],
       o.created_at + ((gs * 9 + length(o.slug)) || ' days')::INTERVAL
FROM organizations o
JOIN generate_series(1, 95) gs ON TRUE
WHERE o.created_at + ((gs * 9 + length(o.slug)) || ' days')::INTERVAL < NOW();

INSERT INTO policy_versions (policy_id, version_number, change_summary, policy_snapshot, changed_by_user_id, changed_at)
SELECT ap.id, v.version_number,
       (ARRAY['Initial policy import','Added restricted table deny list','Tightened approval threshold','Expanded metadata access','Adjusted row filter for tenant isolation'])[v.version_number],
       jsonb_build_object('allowed_actions', ap.allowed_actions, 'allowed_schemas', ap.allowed_schemas, 'requires_approval', ap.requires_approval, 'status', ap.status, 'version', v.version_number),
       (SELECT u.id FROM users u WHERE u.organization_id = ap.organization_id AND u.status = 'active' ORDER BY md5(u.id::TEXT || ap.id::TEXT || v.version_number::TEXT) LIMIT 1),
       ap.created_at + ((v.version_number * 37) || ' days')::INTERVAL
FROM access_policies ap
JOIN LATERAL generate_series(1, CASE WHEN ap.requires_approval THEN 5 ELSE 3 END) v(version_number) ON TRUE
WHERE ap.created_at + ((v.version_number * 37) || ' days')::INTERVAL < NOW();

INSERT INTO billing_invoices (organization_id, subscription_id, invoice_number, status, period_start, period_end, subtotal_usd, credits_usd, tax_usd, total_usd, due_at, paid_at, pdf_ref, created_at)
SELECT bs.organization_id, bs.id,
       'INV-' || to_char(d::DATE, 'YYYYMM') || '-' || substr(bs.organization_id::TEXT, 1, 8),
       CASE WHEN o.status = 'closed' AND d > CURRENT_DATE - INTERVAL '90 days' THEN 'void' WHEN gs % 37 = 0 THEN 'uncollectible' WHEN gs % 29 = 0 THEN 'open' ELSE 'paid' END,
       d::DATE,
       (d + INTERVAL '1 month - 1 day')::DATE,
       bs.amount_usd,
       CASE WHEN gs % 13 = 0 THEN 25 ELSE 0 END,
       round((bs.amount_usd * 0.08)::NUMERIC, 2),
       round((bs.amount_usd - CASE WHEN gs % 13 = 0 THEN 25 ELSE 0 END + bs.amount_usd * 0.08)::NUMERIC, 2),
       d + INTERVAL '21 days',
       CASE WHEN gs % 29 = 0 OR gs % 37 = 0 THEN NULL ELSE d + INTERVAL '6 days' END,
       's3://db-proxy-invoices/' || o.slug || '/' || to_char(d::DATE, 'YYYY-MM') || '.pdf',
       d + INTERVAL '1 hour'
FROM billing_subscriptions bs
JOIN organizations o ON o.id = bs.organization_id
JOIN LATERAL generate_series(date_trunc('month', GREATEST(o.created_at, NOW() - INTERVAL '24 months'))::DATE, date_trunc('month', NOW())::DATE, INTERVAL '1 month') WITH ORDINALITY AS m(d, gs) ON TRUE;

INSERT INTO billing_payments (invoice_id, provider, status, amount_usd, failure_code, provider_payment_id, attempted_at)
SELECT bi.id,
       CASE WHEN bi.total_usd > 1000 THEN 'wire' ELSE 'stripe' END,
       CASE WHEN bi.status = 'paid' THEN 'succeeded' WHEN bi.status = 'open' THEN 'pending' ELSE 'failed' END,
       bi.total_usd,
       CASE WHEN bi.status IN ('uncollectible','void') THEN (ARRAY['card_declined','bank_returned','expired_payment_method'])[1 + (abs(('x' || substr(md5(bi.id::TEXT),1,8))::bit(32)::int) % 3)] ELSE NULL END,
       'pay_' || substr(encode(digest(bi.id::TEXT || ':payment', 'sha256'), 'hex'), 1, 18),
       COALESCE(bi.paid_at, bi.due_at, bi.created_at + INTERVAL '1 day')
FROM billing_invoices bi
WHERE bi.status <> 'draft';

INSERT INTO support_tickets (organization_id, requester_user_id, subject, category, priority, status, external_ticket_ref, created_at, resolved_at)
SELECT o.id,
       (SELECT u.id FROM users u WHERE u.organization_id = o.id AND u.status = 'active' ORDER BY md5(u.id::TEXT || gs::TEXT) LIMIT 1),
       (ARRAY['Webhook endpoint keeps retrying','Need help with SSO enforcement','Unexpected approval required on BI query','Billing invoice contact change','Catalog scan missed a schema','Intermittent proxy latency','Service account rotation question'])[1 + (gs % 7)],
       (ARRAY['integration','access','question','billing','integration','performance','access'])[1 + (gs % 7)],
       CASE WHEN gs % 31 = 0 THEN 'urgent' WHEN gs % 13 = 0 THEN 'high' WHEN gs % 5 = 0 THEN 'low' ELSE 'normal' END,
       CASE WHEN gs % 23 = 0 THEN 'waiting_on_engineering' WHEN gs % 19 = 0 THEN 'waiting_on_customer' WHEN gs % 17 = 0 THEN 'open' ELSE 'resolved' END,
       'SUP-' || upper(substr(o.slug,1,4)) || '-' || lpad(gs::TEXT, 5, '0'),
       o.created_at + ((gs * 11) || ' days')::INTERVAL,
       CASE WHEN gs % 17 = 0 OR gs % 19 = 0 OR gs % 23 = 0 THEN NULL ELSE o.created_at + ((gs * 11) || ' days')::INTERVAL + ((3 + gs % 96) || ' hours')::INTERVAL END
FROM organizations o
JOIN generate_series(1, 85) gs ON TRUE
WHERE o.created_at + ((gs * 11) || ' days')::INTERVAL < NOW();

INSERT INTO support_ticket_comments (ticket_id, author_user_id, author_type, body, created_at)
SELECT st.id,
       CASE WHEN c.seq % 2 = 0 THEN NULL ELSE st.requester_user_id END,
       (ARRAY['customer','support','engineering','system'])[1 + (c.seq % 4)],
       (ARRAY['Initial report with redacted request identifiers.','Asked for affected data source and approximate time window.','Linked related audit events and worker heartbeat anomalies.','Applied workaround and monitoring for recurrence.','Customer confirmed behavior is resolved.'])[1 + (c.seq % 5)],
       st.created_at + ((c.seq * 37) || ' minutes')::INTERVAL
FROM support_tickets st
JOIN LATERAL generate_series(1, CASE WHEN st.status = 'resolved' THEN 5 ELSE 3 END) c(seq) ON TRUE;

INSERT INTO query_explain_plans (query_audit_log_id, estimated_cost, estimated_rows, planning_ms, plan_redacted, created_at)
SELECT qal.id,
       10 + (abs(('x' || substr(md5(qal.id::TEXT),1,8))::bit(32)::int) % 200000)::NUMERIC / 10,
       100 + (abs(('x' || substr(md5(qal.query_hash),1,8))::bit(32)::int) % 5000000),
       1 + (abs(('x' || substr(md5(qal.request_id::TEXT),1,8))::bit(32)::int) % 250),
       jsonb_build_object('Plan', jsonb_build_object('Node Type', CASE WHEN qal.query_redacted ILIKE '%information_schema%' THEN 'Seq Scan' ELSE 'Index Scan' END, 'Relation Name', 'redacted', 'Cost Redacted', true)),
       qal.created_at + INTERVAL '1 second'
FROM query_audit_logs qal
WHERE qal.action IN ('read','explain')
ORDER BY qal.created_at DESC
LIMIT 12000;

INSERT INTO saved_dashboards (organization_id, name, description, visibility, owner_user_id, status, last_viewed_at, created_at)
SELECT o.id, d.name, d.description, d.visibility,
       (SELECT u.id FROM users u WHERE u.organization_id = o.id AND u.status = 'active' ORDER BY md5(u.id::TEXT || d.name) LIMIT 1),
       CASE WHEN d.name ILIKE '%legacy%' THEN 'archived' ELSE 'active' END,
       NOW() - ((d.seq * 7 + length(o.slug)) || ' hours')::INTERVAL,
       o.created_at + ((d.seq * 23) || ' days')::INTERVAL
FROM organizations o
CROSS JOIN (VALUES
    (1, 'Proxy Operations', 'Latency, failures and pool health across data sources', 'organization'),
    (2, 'Security Review Queue', 'Open policy events and approval backlog', 'team'),
    (3, 'Billing Usage Review', 'Usage by source, invoice cycle and overage signals', 'organization'),
    (4, 'Legacy Data Source Cleanup', 'Aging sources, degraded credentials and ownership gaps', 'team')
) d(seq, name, description, visibility)
WHERE o.status <> 'closed';

INSERT INTO dashboard_widgets (dashboard_id, title, widget_type, query_template, position)
SELECT sd.id, w.title, w.widget_type, w.query_template,
       jsonb_build_object('x', (w.seq - 1) % 2 * 6, 'y', ((w.seq - 1) / 2) * 4, 'w', 6, 'h', 4)
FROM saved_dashboards sd
CROSS JOIN (VALUES
    (1, 'Queries last 30 days', 'line', 'SELECT usage_date, sum(query_count) FROM usage_daily_rollups WHERE usage_date >= current_date - 30 GROUP BY 1 ORDER BY 1'),
    (2, 'Open security events', 'table', 'SELECT * FROM v_open_security_events LIMIT 50'),
    (3, 'Source health', 'heatmap', 'SELECT data_source_name, health_status, latency_ms FROM v_proxy_sources_health'),
    (4, 'Failed webhook retries', 'number', 'SELECT count(*) FROM webhook_retry_attempts WHERE status IN (''failed'',''abandoned'')')
) w(seq, title, widget_type, query_template);

-- =========================================================
-- VIEWS
-- =========================================================

CREATE OR REPLACE VIEW v_proxy_sources_health AS
SELECT
    ds.id AS data_source_id,
    org.name AS organization_name,
    ds.name AS data_source_name,
    ds.type,
    ds.environment,
    ds.mode,
    ds.status AS data_source_status,
    h.status AS health_status,
    h.latency_ms,
    h.error_rate,
    h.pool_active_connections,
    h.pool_idle_connections,
    h.last_success_at,
    h.last_error,
    h.checked_at
FROM data_sources ds
JOIN organizations org ON org.id = ds.organization_id
LEFT JOIN LATERAL (
    SELECT * FROM data_source_health h
    WHERE h.data_source_id = ds.id
    ORDER BY h.checked_at DESC LIMIT 1
) h ON TRUE;

CREATE OR REPLACE VIEW v_recent_query_audit AS
SELECT
    qal.id, org.name AS organization_name, u.email AS user_email,
    ds.name AS data_source_name, qal.action, qal.status, qal.policy_decision,
    qal.rows_returned, qal.runtime_ms, qal.bytes_scanned, qal.query_redacted,
    qal.error_message, qal.client_ip, qal.created_at
FROM query_audit_logs qal
JOIN organizations org ON org.id = qal.organization_id
LEFT JOIN users u ON u.id = qal.user_id
LEFT JOIN data_sources ds ON ds.id = qal.data_source_id
ORDER BY qal.created_at DESC;

CREATE OR REPLACE VIEW v_open_security_events AS
SELECT
    se.id, org.name AS organization_name, u.email AS user_email,
    ds.name AS data_source_name, se.event_type, se.severity,
    se.metadata, se.status, se.created_at
FROM security_events se
JOIN organizations org ON org.id = se.organization_id
LEFT JOIN users u ON u.id = se.user_id
LEFT JOIN data_sources ds ON ds.id = se.data_source_id
WHERE se.status IN ('open', 'investigating')
ORDER BY
    CASE se.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
    se.created_at DESC;

CREATE OR REPLACE VIEW v_sensitive_catalog AS
SELECT
    org.name AS organization_name,
    ds.name AS data_source_name,
    dc.schema_name, dc.table_name, dc.column_name, dc.data_type,
    dc.classification, dc.nullable, dc.description, dc.last_scanned_at
FROM data_catalog dc
JOIN data_sources ds ON ds.id = dc.data_source_id
JOIN organizations org ON org.id = ds.organization_id
WHERE dc.classification IN ('pii', 'financial', 'confidential', 'secret')
ORDER BY dc.classification, dc.schema_name, dc.table_name, dc.column_name;

CREATE OR REPLACE VIEW v_daily_usage_trend AS
SELECT
    org.name AS organization_name,
    ds.name AS data_source_name,
    udr.usage_date,
    udr.query_count,
    udr.denied_count,
    udr.failed_count,
    udr.approval_count,
    udr.rows_returned,
    udr.runtime_ms,
    udr.bytes_scanned
FROM usage_daily_rollups udr
JOIN organizations org ON org.id = udr.organization_id
LEFT JOIN data_sources ds ON ds.id = udr.data_source_id
ORDER BY udr.usage_date DESC, org.name, ds.name;

CREATE OR REPLACE VIEW v_policy_coverage AS
SELECT
    org.name AS organization_name,
    ds.name AS data_source_name,
    COUNT(DISTINCT ap.id) AS access_policy_count,
    COUNT(DISTINCT qr.id) AS query_rule_count,
    COUNT(DISTINCT dc.id) FILTER (WHERE dc.classification IN ('pii','financial','secret')) AS sensitive_columns,
    MAX(ap.updated_at) AS last_policy_update
FROM data_sources ds
JOIN organizations org ON org.id = ds.organization_id
LEFT JOIN access_policies ap ON ap.data_source_id = ds.id AND ap.status = 'active'
LEFT JOIN query_rules qr ON qr.data_source_id = ds.id AND qr.status = 'active'
LEFT JOIN data_catalog dc ON dc.data_source_id = ds.id
GROUP BY org.name, ds.name;

CREATE OR REPLACE VIEW v_org_operational_summary AS
SELECT
    org.id AS organization_id,
    org.name AS organization_name,
    org.plan,
    org.status,
    COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'active') AS active_users,
    COUNT(DISTINCT ds.id) FILTER (WHERE ds.status IN ('active','degraded')) AS connected_sources,
    COUNT(DISTINCT se.id) FILTER (WHERE se.status IN ('open','investigating')) AS open_security_events,
    COALESCE(SUM(udr.query_count) FILTER (WHERE udr.usage_date >= CURRENT_DATE - 30), 0) AS queries_last_30_days,
    COALESCE(SUM(udr.denied_count) FILTER (WHERE udr.usage_date >= CURRENT_DATE - 30), 0) AS denied_last_30_days
FROM organizations org
LEFT JOIN users u ON u.organization_id = org.id
LEFT JOIN data_sources ds ON ds.organization_id = org.id
LEFT JOIN security_events se ON se.organization_id = org.id
LEFT JOIN usage_daily_rollups udr ON udr.organization_id = org.id
GROUP BY org.id, org.name, org.plan, org.status;


CREATE OR REPLACE VIEW v_auth_risk_summary AS
SELECT
    org.name AS organization_name,
    date_trunc('day', ae.created_at)::DATE AS event_date,
    COUNT(*) AS auth_events,
    COUNT(*) FILTER (WHERE ae.event_type IN ('login_failed','mfa_failed')) AS failed_auth_events,
    ROUND(AVG(ae.risk_score), 2) AS avg_risk_score
FROM auth_events ae
JOIN organizations org ON org.id = ae.organization_id
GROUP BY org.name, date_trunc('day', ae.created_at)::DATE
ORDER BY event_date DESC, organization_name;

CREATE OR REPLACE VIEW v_billing_history_summary AS
SELECT
    org.name AS organization_name,
    COUNT(*) AS invoice_count,
    COUNT(*) FILTER (WHERE bi.status = 'paid') AS paid_invoices,
    COUNT(*) FILTER (WHERE bi.status IN ('open','uncollectible')) AS problem_invoices,
    SUM(bi.total_usd) AS lifetime_invoiced_usd,
    MAX(bi.period_end) AS latest_invoice_period_end
FROM billing_invoices bi
JOIN organizations org ON org.id = bi.organization_id
GROUP BY org.name;

CREATE OR REPLACE VIEW v_job_reliability_30d AS
SELECT
    org.name AS organization_name,
    bj.job_type,
    COUNT(*) AS runs_30d,
    COUNT(*) FILTER (WHERE bjr.status = 'success') AS successful_runs,
    COUNT(*) FILTER (WHERE bjr.status IN ('failed','timeout')) AS failed_runs,
    ROUND(100.0 * COUNT(*) FILTER (WHERE bjr.status = 'success') / NULLIF(COUNT(*), 0), 2) AS success_rate_pct
FROM background_job_runs bjr
JOIN background_jobs bj ON bj.id = bjr.job_id
LEFT JOIN organizations org ON org.id = bj.organization_id
WHERE bjr.started_at >= NOW() - INTERVAL '30 days'
GROUP BY org.name, bj.job_type
ORDER BY failed_runs DESC, runs_30d DESC;

CREATE OR REPLACE VIEW v_recent_deploy_health AS
SELECT
    environment,
    version,
    status,
    deployed_by,
    started_at,
    finished_at,
    release_notes,
    metadata
FROM deployment_versions
ORDER BY started_at DESC;

-- =========================================================
-- USEFUL SANITY QUERIES
-- =========================================================
-- SELECT * FROM v_org_operational_summary;
-- SELECT * FROM v_proxy_sources_health LIMIT 20;
-- SELECT * FROM v_open_security_events LIMIT 20;
-- SELECT * FROM v_daily_usage_trend LIMIT 20;
-- SELECT COUNT(*) FROM query_audit_logs;
-- SELECT COUNT(*) FROM auth_events;
-- SELECT COUNT(*) FROM billing_invoices;
-- SELECT * FROM v_auth_risk_summary LIMIT 20;
-- SELECT * FROM v_billing_history_summary;
-- SELECT * FROM v_job_reliability_30d LIMIT 20;
-- SELECT * FROM v_recent_deploy_health LIMIT 20;
-- SELECT COUNT(*) FROM usage_daily_rollups;

