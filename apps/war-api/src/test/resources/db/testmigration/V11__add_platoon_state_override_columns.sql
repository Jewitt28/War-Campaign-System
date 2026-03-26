ALTER TABLE platoon_state
    ADD COLUMN name VARCHAR(120);

ALTER TABLE platoon_state
    ADD COLUMN hidden_from_players BOOLEAN;
