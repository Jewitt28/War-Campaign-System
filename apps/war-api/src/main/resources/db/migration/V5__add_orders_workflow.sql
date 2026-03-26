CREATE TABLE order_submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    turn_number INTEGER NOT NULL,
    submitted_by_member_id UUID NOT NULL,
    faction_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    submitted_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    reveal_at TIMESTAMPTZ,
    checksum VARCHAR(128),
    CONSTRAINT fk_order_submission_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_order_submission_member FOREIGN KEY (submitted_by_member_id) REFERENCES campaign_member (id),
    CONSTRAINT fk_order_submission_faction FOREIGN KEY (faction_id) REFERENCES faction (id),
    CONSTRAINT uq_order_submission_campaign_turn_member UNIQUE (campaign_id, turn_number, submitted_by_member_id),
    CONSTRAINT ck_order_submission_status CHECK (status IN ('DRAFT', 'VALIDATED', 'LOCKED', 'REVEALED', 'RESOLVED', 'VOID'))
);

CREATE TABLE platoon_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_submission_id UUID NOT NULL,
    platoon_id UUID NOT NULL,
    order_type VARCHAR(30) NOT NULL,
    source_territory_id UUID,
    target_territory_id UUID,
    payload_json TEXT,
    validation_status VARCHAR(20) NOT NULL,
    validation_errors_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_platoon_order_submission FOREIGN KEY (order_submission_id) REFERENCES order_submission (id),
    CONSTRAINT fk_platoon_order_platoon FOREIGN KEY (platoon_id) REFERENCES platoon (id),
    CONSTRAINT fk_platoon_order_source_territory FOREIGN KEY (source_territory_id) REFERENCES territory (id),
    CONSTRAINT fk_platoon_order_target_territory FOREIGN KEY (target_territory_id) REFERENCES territory (id),
    CONSTRAINT uq_platoon_order_submission_platoon UNIQUE (order_submission_id, platoon_id),
    CONSTRAINT ck_platoon_order_type CHECK (order_type IN ('MOVE', 'ATTACK', 'WITHDRAW', 'HOLD', 'RECON', 'BOMBARD', 'REFIT', 'REDEPLOY', 'SUPPORT', 'DIPLOMACY_ATTACH')),
    CONSTRAINT ck_platoon_order_validation_status CHECK (validation_status IN ('VALID', 'INVALID'))
);
