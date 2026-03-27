CREATE TABLE campaign_member_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    activation_status VARCHAR(30) NOT NULL,
    activation_turn_number INTEGER,
    selected_faction_id UUID,
    selected_nation_id UUID,
    selected_homeland_territory_id UUID,
    tutorial_completed_at TIMESTAMPTZ,
    tutorial_version VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_member_onboarding_membership UNIQUE (membership_id),
    CONSTRAINT fk_campaign_member_onboarding_membership FOREIGN KEY (membership_id) REFERENCES campaign_member (id),
    CONSTRAINT fk_campaign_member_onboarding_faction FOREIGN KEY (selected_faction_id) REFERENCES faction (id),
    CONSTRAINT fk_campaign_member_onboarding_nation FOREIGN KEY (selected_nation_id) REFERENCES nation (id),
    CONSTRAINT fk_campaign_member_onboarding_homeland FOREIGN KEY (selected_homeland_territory_id) REFERENCES territory (id),
    CONSTRAINT ck_campaign_member_onboarding_status CHECK (status IN ('NOT_REQUIRED', 'REQUIRED', 'IN_PROGRESS', 'COMPLETE')),
    CONSTRAINT ck_campaign_member_onboarding_activation_status CHECK (activation_status IN ('ACTIVE', 'PENDING_NEXT_TURN'))
);

CREATE INDEX idx_campaign_member_onboarding_membership_campaign
    ON campaign_member_onboarding (activation_status, activation_turn_number);

CREATE OR REPLACE FUNCTION set_campaign_member_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaign_member_onboarding_updated_at
BEFORE UPDATE ON campaign_member_onboarding
FOR EACH ROW
EXECUTE FUNCTION set_campaign_member_onboarding_updated_at();
