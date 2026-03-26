CREATE TABLE visibility_state (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    territory_id UUID NOT NULL,
    viewer_faction_id UUID NOT NULL,
    turn_number INTEGER NOT NULL,
    visibility_level VARCHAR(20) NOT NULL,
    visible_owner_faction_id UUID,
    visible_fort_level INTEGER,
    visible_forces_summary TEXT,
    source_type VARCHAR(40) NOT NULL,
    confidence_score INTEGER,
    decay_turn INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_visibility_state_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_visibility_state_territory FOREIGN KEY (territory_id) REFERENCES territory (id),
    CONSTRAINT fk_visibility_state_viewer_faction FOREIGN KEY (viewer_faction_id) REFERENCES faction (id),
    CONSTRAINT fk_visibility_state_visible_owner_faction FOREIGN KEY (visible_owner_faction_id) REFERENCES faction (id),
    CONSTRAINT uq_visibility_state_territory_viewer_turn UNIQUE (territory_id, viewer_faction_id, turn_number),
    CONSTRAINT ck_visibility_state_level CHECK (visibility_level IN ('UNKNOWN', 'RUMOURED', 'SCOUTED', 'OBSERVED', 'OWNED', 'FULL'))
);

CREATE INDEX idx_visibility_state_campaign_viewer_turn
    ON visibility_state (campaign_id, viewer_faction_id, turn_number);
