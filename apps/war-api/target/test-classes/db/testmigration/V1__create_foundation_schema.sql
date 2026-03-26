CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE campaign (
    id UUID PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    current_phase VARCHAR(30) NOT NULL,
    created_by_user_id UUID NOT NULL,
    CONSTRAINT fk_campaign_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES app_user (id),
    CONSTRAINT ck_campaign_current_phase
        CHECK (current_phase IN ('LOBBY', 'STRATEGIC', 'OPERATIONS', 'RESOLUTION', 'INTERTURN'))
);

CREATE TABLE campaign_member (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    CONSTRAINT fk_campaign_member_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_campaign_member_user FOREIGN KEY (user_id) REFERENCES app_user (id),
    CONSTRAINT uq_campaign_member_campaign_user UNIQUE (campaign_id, user_id),
    CONSTRAINT ck_campaign_member_role CHECK (role IN ('GM', 'PLAYER', 'OBSERVER'))
);

CREATE TABLE campaign_invite (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    invited_by_user_id UUID NOT NULL,
    invitee_email VARCHAR(320) NOT NULL,
    invite_token VARCHAR(100) NOT NULL UNIQUE,
    intended_role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_campaign_invite_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_campaign_invite_invited_by_user FOREIGN KEY (invited_by_user_id) REFERENCES app_user (id),
    CONSTRAINT ck_campaign_invite_intended_role CHECK (intended_role IN ('GM', 'PLAYER', 'OBSERVER')),
    CONSTRAINT ck_campaign_invite_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'))
);

CREATE TABLE faction (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    faction_key VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    CONSTRAINT fk_faction_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT uq_faction_campaign_key UNIQUE (campaign_id, faction_key)
);

CREATE TABLE territory (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    territory_key VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    theatre_key VARCHAR(50) NOT NULL,
    CONSTRAINT fk_territory_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT uq_territory_campaign_key UNIQUE (campaign_id, territory_key)
);

CREATE TABLE turn (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    turn_number INTEGER NOT NULL,
    phase VARCHAR(30) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_turn_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT uq_turn_campaign_number UNIQUE (campaign_id, turn_number),
    CONSTRAINT ck_turn_phase CHECK (phase IN ('LOBBY', 'STRATEGIC', 'OPERATIONS', 'RESOLUTION', 'INTERTURN'))
);

CREATE TABLE territory_state (
    id UUID PRIMARY KEY,
    turn_id UUID NOT NULL,
    territory_id UUID NOT NULL,
    controlling_faction_id UUID,
    control_status VARCHAR(20) NOT NULL,
    CONSTRAINT fk_territory_state_turn FOREIGN KEY (turn_id) REFERENCES turn (id),
    CONSTRAINT fk_territory_state_territory FOREIGN KEY (territory_id) REFERENCES territory (id),
    CONSTRAINT fk_territory_state_controlling_faction FOREIGN KEY (controlling_faction_id) REFERENCES faction (id),
    CONSTRAINT uq_territory_state_turn_territory UNIQUE (turn_id, territory_id),
    CONSTRAINT ck_territory_state_control_status CHECK (control_status IN ('CONTROLLED', 'CONTESTED', 'NEUTRAL'))
);

CREATE TABLE platoon (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    faction_id UUID NOT NULL,
    home_territory_id UUID,
    platoon_key VARCHAR(60) NOT NULL,
    name VARCHAR(120) NOT NULL,
    CONSTRAINT fk_platoon_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_platoon_faction FOREIGN KEY (faction_id) REFERENCES faction (id),
    CONSTRAINT fk_platoon_home_territory FOREIGN KEY (home_territory_id) REFERENCES territory (id),
    CONSTRAINT uq_platoon_campaign_key UNIQUE (campaign_id, platoon_key)
);

CREATE TABLE platoon_state (
    id UUID PRIMARY KEY,
    turn_id UUID NOT NULL,
    platoon_id UUID NOT NULL,
    territory_id UUID,
    readiness_status VARCHAR(20) NOT NULL,
    strength INTEGER NOT NULL,
    CONSTRAINT fk_platoon_state_turn FOREIGN KEY (turn_id) REFERENCES turn (id),
    CONSTRAINT fk_platoon_state_platoon FOREIGN KEY (platoon_id) REFERENCES platoon (id),
    CONSTRAINT fk_platoon_state_territory FOREIGN KEY (territory_id) REFERENCES territory (id),
    CONSTRAINT uq_platoon_state_turn_platoon UNIQUE (turn_id, platoon_id),
    CONSTRAINT ck_platoon_state_readiness_status CHECK (readiness_status IN ('ACTIVE', 'DAMAGED', 'RESERVES', 'DESTROYED'))
);
