package com.warcampaign.backend.jobs;

import com.warcampaign.backend.config.JobsProperties;
import com.warcampaign.backend.service.CampaignAutomationService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.jobs.enabled", havingValue = "true")
public class CampaignAutomationJobs {

    private final CampaignAutomationService campaignAutomationService;
    private final JobsProperties jobsProperties;

    public CampaignAutomationJobs(CampaignAutomationService campaignAutomationService,
                                  JobsProperties jobsProperties) {
        this.campaignAutomationService = campaignAutomationService;
        this.jobsProperties = jobsProperties;
    }

    @Scheduled(fixedDelayString = "${app.jobs.phase-expiry-delay:PT1M}")
    public void advanceExpiredCampaignPhases() {
        campaignAutomationService.advanceExpiredCampaigns();
    }

    @Scheduled(fixedDelayString = "${app.jobs.reminder-delay:PT15M}")
    public void dispatchReminders() {
        campaignAutomationService.sendPhaseEndingSoonReminders();
        campaignAutomationService.sendInviteExpiryReminders();
        campaignAutomationService.expirePendingInvites();
    }

    @Scheduled(fixedDelayString = "${app.jobs.visibility-delay:PT1H}")
    public void rebuildVisibilitySnapshots() {
        campaignAutomationService.rebuildVisibilityForActiveCampaigns();
    }

    @Scheduled(fixedDelayString = "${app.jobs.snapshot-delay:PT6H}")
    public void exportSnapshots() {
        campaignAutomationService.exportActiveCampaignSnapshots();
    }
}
