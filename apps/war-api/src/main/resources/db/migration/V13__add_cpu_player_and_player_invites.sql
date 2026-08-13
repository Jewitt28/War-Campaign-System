-- Sprint 2: Single Player Mode
-- CPU-controlled members and player-generated invite links with faction invites

-- CPU player support on campaign_member
ALTER TABLE campaign_member ADD COLUMN cpu_controlled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE campaign_member ADD COLUMN cpu_strategy VARCHAR(20) NOT NULL DEFAULT 'BALANCED';

ALTER TABLE campaign_member
    ADD CONSTRAINT ck_campaign_member_cpu_strategy
        CHECK (cpu_strategy IN ('AGGRESSIVE', 'DEFENSIVE', 'BALANCED'));

-- Player-generated invite links on campaign_invite
-- Make invitee_email nullable to support open (shareable link) invites
ALTER TABLE campaign_invite ALTER COLUMN invitee_email DROP NOT NULL;

ALTER TABLE campaign_invite ADD COLUMN open_invite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE campaign_invite ADD COLUMN created_by_member_id UUID REFERENCES campaign_member (id);
ALTER TABLE campaign_invite ADD COLUMN faction_invite_id UUID REFERENCES faction (id);

-- Open invites must not have an invitee email; email invites must have one
ALTER TABLE campaign_invite
    ADD CONSTRAINT ck_campaign_invite_email_or_open
        CHECK (
            (open_invite = TRUE AND invitee_email IS NULL) OR
            (open_invite = FALSE AND invitee_email IS NOT NULL)
        );
