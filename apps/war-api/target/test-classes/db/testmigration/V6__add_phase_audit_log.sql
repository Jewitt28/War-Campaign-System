CREATE TABLE campaign_audit_log (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    actor_type VARCHAR(20) NOT NULL,
    actor_user_id UUID,
    actor_member_id UUID,
    action_type VARCHAR(60) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id UUID NOT NULL,
    before_json TEXT,
    after_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_campaign_audit_log_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_campaign_audit_log_actor_user FOREIGN KEY (actor_user_id) REFERENCES app_user (id),
    CONSTRAINT fk_campaign_audit_log_actor_member FOREIGN KEY (actor_member_id) REFERENCES campaign_member (id),
    CONSTRAINT ck_campaign_audit_log_actor_type CHECK (actor_type IN ('SYSTEM', 'USER'))
);
