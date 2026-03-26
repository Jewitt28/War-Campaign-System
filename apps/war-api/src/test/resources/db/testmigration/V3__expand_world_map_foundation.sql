ALTER TABLE campaign ADD COLUMN current_turn_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE campaign ADD COLUMN ruleset_version VARCHAR(40) NOT NULL DEFAULT 'alpha-1';
ALTER TABLE campaign ADD COLUMN campaign_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT';
ALTER TABLE campaign ADD COLUMN phase_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaign ADD COLUMN phase_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaign ADD COLUMN gm_controls_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE campaign ADD COLUMN fog_of_war_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE campaign ADD COLUMN timers_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE campaign ADD CONSTRAINT ck_campaign_status CHECK (campaign_status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'));

CREATE TABLE theatre (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    theatre_key VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_theatre_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT uq_theatre_campaign_key UNIQUE (campaign_id, theatre_key)
);

INSERT INTO theatre (id, campaign_id, theatre_key, name, display_order, active)
SELECT RANDOM_UUID(),
       territory.campaign_id,
       territory.theatre_key,
       territory.theatre_key,
       0,
       TRUE
FROM territory
GROUP BY territory.campaign_id, territory.theatre_key;

ALTER TABLE territory ADD COLUMN theatre_id UUID;
ALTER TABLE territory ADD COLUMN terrain_type VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE territory ADD COLUMN strategic_tags_json TEXT;
ALTER TABLE territory ADD COLUMN base_industry INTEGER NOT NULL DEFAULT 0;
ALTER TABLE territory ADD COLUMN base_manpower INTEGER NOT NULL DEFAULT 0;
ALTER TABLE territory ADD COLUMN has_port BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE territory ADD COLUMN has_airfield BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE territory ADD COLUMN max_fort_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE territory ADD COLUMN metadata_json TEXT;

UPDATE territory
SET theatre_id = (
    SELECT theatre.id
    FROM theatre
    WHERE theatre.campaign_id = territory.campaign_id
      AND theatre.theatre_key = territory.theatre_key
);

ALTER TABLE territory
    ALTER COLUMN theatre_id SET NOT NULL;

ALTER TABLE territory
    ADD CONSTRAINT fk_territory_theatre FOREIGN KEY (theatre_id) REFERENCES theatre (id);

ALTER TABLE faction ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'MAJOR';
ALTER TABLE faction ADD COLUMN color VARCHAR(20);
ALTER TABLE faction ADD COLUMN is_player_controlled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE faction ADD CONSTRAINT ck_faction_type CHECK (type IN ('MAJOR', 'MINOR', 'NPC', 'NEUTRAL', 'NON_STATE'));

CREATE TABLE nation (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    faction_id UUID,
    nation_key VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    doctrine_profile_key VARCHAR(80),
    is_npc BOOLEAN NOT NULL DEFAULT FALSE,
    metadata_json TEXT,
    CONSTRAINT fk_nation_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_nation_faction FOREIGN KEY (faction_id) REFERENCES faction (id),
    CONSTRAINT uq_nation_campaign_key UNIQUE (campaign_id, nation_key)
);

ALTER TABLE territory_state ADD COLUMN controller_nation_id UUID;
ALTER TABLE territory_state ADD COLUMN strategic_status VARCHAR(20) NOT NULL DEFAULT 'NEUTRAL';
ALTER TABLE territory_state ADD COLUMN fort_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE territory_state ADD COLUMN partisan_risk INTEGER NOT NULL DEFAULT 0;
ALTER TABLE territory_state ADD COLUMN supply_status VARCHAR(30) NOT NULL DEFAULT 'SUPPLIED';
ALTER TABLE territory_state ADD COLUMN damage_json TEXT;
ALTER TABLE territory_state ADD COLUMN notes TEXT;
ALTER TABLE territory_state ADD CONSTRAINT fk_territory_state_controller_nation FOREIGN KEY (controller_nation_id) REFERENCES nation (id);
ALTER TABLE territory_state ADD CONSTRAINT ck_territory_state_strategic_status CHECK (strategic_status IN ('CONTROLLED', 'CONTESTED', 'NEUTRAL', 'OCCUPIED', 'DEVASTATED'));

UPDATE territory_state
SET strategic_status = CASE control_status
    WHEN 'CONTROLLED' THEN 'CONTROLLED'
    WHEN 'CONTESTED' THEN 'CONTESTED'
    ELSE 'NEUTRAL'
END;
