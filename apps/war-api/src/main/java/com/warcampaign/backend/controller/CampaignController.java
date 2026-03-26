package com.warcampaign.backend.controller;

import com.warcampaign.backend.dto.CampaignDetailResponse;
import com.warcampaign.backend.dto.CampaignMapResponse;
import com.warcampaign.backend.dto.CampaignMemberResponse;
import com.warcampaign.backend.dto.CampaignSummaryResponse;
import com.warcampaign.backend.dto.GmTerritoryResponse;
import com.warcampaign.backend.dto.PlayerTerritoryResponse;
import com.warcampaign.backend.dto.PlayerPlatoonSummaryResponse;
import com.warcampaign.backend.dto.UpdateCampaignMemberRequest;
import com.warcampaign.backend.service.AuthenticationService;
import com.warcampaign.backend.service.CampaignLobbyService;
import com.warcampaign.backend.service.CampaignMapService;
import com.warcampaign.backend.service.CampaignPlatoonService;
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
    private final CampaignMapService campaignMapService;
    private final CampaignPlatoonService campaignPlatoonService;
    private final AuthenticationService authenticationService;

    public CampaignController(CampaignLobbyService campaignLobbyService,
                              CampaignMapService campaignMapService,
                              CampaignPlatoonService campaignPlatoonService,
                              AuthenticationService authenticationService) {
        this.campaignLobbyService = campaignLobbyService;
        this.campaignMapService = campaignMapService;
        this.campaignPlatoonService = campaignPlatoonService;
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

    @GetMapping("/{campaignId}/map")
    public CampaignMapResponse getMap(@PathVariable UUID campaignId) {
        return campaignMapService.getMap(campaignId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/territories/{territoryId}")
    public PlayerTerritoryResponse getTerritory(@PathVariable UUID campaignId, @PathVariable UUID territoryId) {
        return campaignMapService.getPlayerTerritory(campaignId, territoryId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/territories/{territoryId}/gm")
    public GmTerritoryResponse getGmTerritory(@PathVariable UUID campaignId, @PathVariable UUID territoryId) {
        return campaignMapService.getGmTerritory(campaignId, territoryId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/platoons")
    public List<PlayerPlatoonSummaryResponse> listPlatoons(@PathVariable UUID campaignId) {
        return campaignPlatoonService.listPlatoons(campaignId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/platoons/{platoonId}")
    public Object getPlatoon(@PathVariable UUID campaignId, @PathVariable UUID platoonId) {
        return campaignPlatoonService.getPlatoon(campaignId, platoonId, authenticationService.currentUser());
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
