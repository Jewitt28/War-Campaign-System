ALTER TABLE campaign_member
    ADD COLUMN faction_id UUID,
    ADD COLUMN nation_id UUID,
    ADD CONSTRAINT fk_campaign_member_faction FOREIGN KEY (faction_id) REFERENCES faction (id),
    ADD CONSTRAINT fk_campaign_member_nation FOREIGN KEY (nation_id) REFERENCES nation (id);

ALTER TABLE platoon
    ADD COLUMN nation_id UUID,
    ADD COLUMN assigned_member_id UUID,
    ADD COLUMN unit_type VARCHAR(60) NOT NULL DEFAULT 'LINE',
    ADD COLUMN hidden_from_players BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT fk_platoon_nation FOREIGN KEY (nation_id) REFERENCES nation (id),
    ADD CONSTRAINT fk_platoon_assigned_member FOREIGN KEY (assigned_member_id) REFERENCES campaign_member (id);

ALTER TABLE platoon_state
    ADD COLUMN notes TEXT;
