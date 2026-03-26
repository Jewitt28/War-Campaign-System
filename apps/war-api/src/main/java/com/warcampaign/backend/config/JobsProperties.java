package com.warcampaign.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.jobs")
public class JobsProperties {

    private boolean enabled;
    private Duration phaseExpiryDelay = Duration.ofMinutes(1);
    private Duration reminderDelay = Duration.ofMinutes(15);
    private Duration visibilityDelay = Duration.ofHours(1);
    private Duration snapshotDelay = Duration.ofHours(6);
    private Duration phaseReminderWindow = Duration.ofMinutes(30);
    private Duration inviteReminderWindow = Duration.ofHours(24);
    private String snapshotDirectory = "target/campaign-snapshots";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Duration getPhaseExpiryDelay() {
        return phaseExpiryDelay;
    }

    public void setPhaseExpiryDelay(Duration phaseExpiryDelay) {
        this.phaseExpiryDelay = phaseExpiryDelay;
    }

    public Duration getReminderDelay() {
        return reminderDelay;
    }

    public void setReminderDelay(Duration reminderDelay) {
        this.reminderDelay = reminderDelay;
    }

    public Duration getVisibilityDelay() {
        return visibilityDelay;
    }

    public void setVisibilityDelay(Duration visibilityDelay) {
        this.visibilityDelay = visibilityDelay;
    }

    public Duration getSnapshotDelay() {
        return snapshotDelay;
    }

    public void setSnapshotDelay(Duration snapshotDelay) {
        this.snapshotDelay = snapshotDelay;
    }

    public Duration getPhaseReminderWindow() {
        return phaseReminderWindow;
    }

    public void setPhaseReminderWindow(Duration phaseReminderWindow) {
        this.phaseReminderWindow = phaseReminderWindow;
    }

    public Duration getInviteReminderWindow() {
        return inviteReminderWindow;
    }

    public void setInviteReminderWindow(Duration inviteReminderWindow) {
        this.inviteReminderWindow = inviteReminderWindow;
    }

    public String getSnapshotDirectory() {
        return snapshotDirectory;
    }

    public void setSnapshotDirectory(String snapshotDirectory) {
        this.snapshotDirectory = snapshotDirectory;
    }
}
