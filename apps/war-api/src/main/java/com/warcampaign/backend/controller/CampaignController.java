package com.warcampaign.backend.controller;

import com.warcampaign.backend.dto.CampaignDetailResponse;
import com.warcampaign.backend.dto.CampaignMemberResponse;
import com.warcampaign.backend.dto.CampaignSummaryResponse;
import com.warcampaign.backend.dto.UpdateCampaignMemberRequest;
import com.warcampaign.backend.service.AuthenticationService;
import com.warcampaign.backend.service.CampaignLobbyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns")
public class CampaignController {

    private final CampaignLobbyService campaignLobbyService;
    private final AuthenticationService authenticationService;

    public CampaignController(CampaignLobbyService campaignLobbyService,
                              AuthenticationService authenticationService) {
        this.campaignLobbyService = campaignLobbyService;
        this.authenticationService = authenticationService;
    }

    @GetMapping
    public List<CampaignSummaryResponse> listCampaigns() {
        return campaignLobbyService.listCampaigns(authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}")
    public CampaignDetailResponse getCampaign(@PathVariable UUID campaignId) {
        return campaignLobbyService.getCampaign(campaignId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/members")
    public List<CampaignMemberResponse> listMembers(@PathVariable UUID campaignId) {
        return campaignLobbyService.listMembers(campaignId, authenticationService.currentUser());
    }

    @PatchMapping("/{campaignId}/members/{memberId}")
    public CampaignMemberResponse updateMember(@PathVariable UUID campaignId,
                                               @PathVariable UUID memberId,
                                               @RequestBody UpdateCampaignMemberRequest request) {
        return campaignLobbyService.updateMember(campaignId, memberId, request, authenticationService.currentUser());
    }
}
