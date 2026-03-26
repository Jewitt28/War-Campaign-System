CREATE TABLE notification (
    id UUID PRIMARY KEY,
    campaign_id UUID,
    recipient_user_id UUID NOT NULL,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    payload_json TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_campaign FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_notification_recipient_user FOREIGN KEY (recipient_user_id) REFERENCES app_user (id)
);

CREATE INDEX idx_notification_recipient_created_at
    ON notification (recipient_user_id, created_at DESC);

CREATE INDEX idx_notification_campaign
    ON notification (campaign_id);
