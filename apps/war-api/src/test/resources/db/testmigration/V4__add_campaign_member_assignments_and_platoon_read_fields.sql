ALTER TABLE campaign_member ADD COLUMN faction_id UUID;
ALTER TABLE campaign_member ADD COLUMN nation_id UUID;
ALTER TABLE campaign_member ADD CONSTRAINT fk_campaign_member_faction FOREIGN KEY (faction_id) REFERENCES faction (id);
ALTER TABLE campaign_member ADD CONSTRAINT fk_campaign_member_nation FOREIGN KEY (nation_id) REFERENCES nation (id);

ALTER TABLE platoon ADD COLUMN nation_id UUID;
ALTER TABLE platoon ADD COLUMN assigned_member_id UUID;
ALTER TABLE platoon ADD COLUMN unit_type VARCHAR(60) NOT NULL DEFAULT 'LINE';
ALTER TABLE platoon ADD COLUMN hidden_from_players BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE platoon ADD CONSTRAINT fk_platoon_nation FOREIGN KEY (nation_id) REFERENCES nation (id);
ALTER TABLE platoon ADD CONSTRAINT fk_platoon_assigned_member FOREIGN KEY (assigned_member_id) REFERENCES campaign_member (id);

ALTER TABLE platoon_state ADD COLUMN notes TEXT;
