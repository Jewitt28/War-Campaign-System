package com.warcampaign.backend.controller;

import com.warcampaign.backend.dto.CampaignDetailResponse;
import com.warcampaign.backend.dto.CampaignAuditLogResponse;
import com.warcampaign.backend.dto.CampaignInviteAdminResponse;
import com.warcampaign.backend.dto.CampaignLifecycleResponse;
import com.warcampaign.backend.dto.CampaignChatMessageResponse;
import com.warcampaign.backend.dto.CampaignMapBridgeResponse;
import com.warcampaign.backend.dto.CampaignMapResponse;
import com.warcampaign.backend.dto.CampaignMemberResponse;
import com.warcampaign.backend.dto.CampaignPhaseResponse;
import com.warcampaign.backend.dto.CampaignResolutionResponse;
import com.warcampaign.backend.dto.CampaignSnapshotExportResponse;
import com.warcampaign.backend.dto.CampaignSummaryResponse;
import com.warcampaign.backend.dto.BattleDetailResponse;
import com.warcampaign.backend.dto.CreateCampaignPlatoonRequest;
import com.warcampaign.backend.dto.CreateCampaignInviteRequest;
import com.warcampaign.backend.dto.CreateCampaignRequest;
import com.warcampaign.backend.dto.GmTerritoryResponse;
import com.warcampaign.backend.dto.MyOrderSubmissionResponse;
import com.warcampaign.backend.dto.PostCampaignWorldChatMessageRequest;
import com.warcampaign.backend.dto.PlayerTerritoryResponse;
import com.warcampaign.backend.dto.PlatoonDetailResponse;
import com.warcampaign.backend.dto.PlayerPlatoonSummaryResponse;
import com.warcampaign.backend.dto.RecordBattleResultRequest;
import com.warcampaign.backend.dto.SaveOrderSubmissionRequest;
import com.warcampaign.backend.dto.SaveCampaignMapSetupRequest;
import com.warcampaign.backend.dto.SaveCampaignNationStatesRequest;
import com.warcampaign.backend.dto.UpdateCampaignPlatoonRequest;
import com.warcampaign.backend.dto.UpdateCampaignMemberRequest;
import com.warcampaign.backend.dto.VisibilityRebuildResponse;
import com.warcampaign.backend.service.AuthenticationService;
import com.warcampaign.backend.service.CampaignAdminService;
import com.warcampaign.backend.service.CampaignBattleService;
import com.warcampaign.backend.service.CampaignChatService;
import com.warcampaign.backend.service.CampaignLobbyService;
import com.warcampaign.backend.service.CampaignMapBridgeService;
import com.warcampaign.backend.service.CampaignMapService;
import com.warcampaign.backend.service.CampaignOrderService;
import com.warcampaign.backend.service.CampaignPhaseService;
import com.warcampaign.backend.service.CampaignPlatoonService;
import com.warcampaign.backend.service.CampaignResolutionService;
import com.warcampaign.backend.service.CampaignVisibilityService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    private final CampaignMapBridgeService campaignMapBridgeService;
    private final CampaignPlatoonService campaignPlatoonService;
    private final CampaignOrderService campaignOrderService;
    private final CampaignPhaseService campaignPhaseService;
    private final CampaignResolutionService campaignResolutionService;
    private final CampaignBattleService campaignBattleService;
    private final CampaignVisibilityService campaignVisibilityService;
    private final CampaignAdminService campaignAdminService;
    private final CampaignChatService campaignChatService;
    private final AuthenticationService authenticationService;

    public CampaignController(CampaignLobbyService campaignLobbyService,
                              CampaignMapService campaignMapService,
                              CampaignMapBridgeService campaignMapBridgeService,
                              CampaignPlatoonService campaignPlatoonService,
                              CampaignOrderService campaignOrderService,
                              CampaignPhaseService campaignPhaseService,
                              CampaignResolutionService campaignResolutionService,
                              CampaignBattleService campaignBattleService,
                              CampaignVisibilityService campaignVisibilityService,
                              CampaignAdminService campaignAdminService,
                              CampaignChatService campaignChatService,
                              AuthenticationService authenticationService) {
        this.campaignLobbyService = campaignLobbyService;
        this.campaignMapService = campaignMapService;
        this.campaignMapBridgeService = campaignMapBridgeService;
        this.campaignPlatoonService = campaignPlatoonService;
        this.campaignOrderService = campaignOrderService;
        this.campaignPhaseService = campaignPhaseService;
        this.campaignResolutionService = campaignResolutionService;
        this.campaignBattleService = campaignBattleService;
        this.campaignVisibilityService = campaignVisibilityService;
        this.campaignAdminService = campaignAdminService;
        this.campaignChatService = campaignChatService;
        this.authenticationService = authenticationService;
    }

    @GetMapping
    public List<CampaignSummaryResponse> listCampaigns() {
        return campaignLobbyService.listCampaigns(authenticationService.currentUser());
    }

    @PostMapping
    public CampaignLifecycleResponse createCampaign(@RequestBody CreateCampaignRequest request) {
        return campaignAdminService.createCampaign(request, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}")
    public CampaignDetailResponse getCampaign(@PathVariable UUID campaignId) {
        return campaignLobbyService.getCampaign(campaignId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/map")
    public CampaignMapResponse getMap(@PathVariable UUID campaignId) {
        return campaignMapService.getMap(campaignId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/map/bridge")
    public CampaignMapBridgeResponse getMapBridge(@PathVariable UUID campaignId) {
        return campaignMapBridgeService.getBridge(campaignId, authenticationService.currentUser());
    }

    @PutMapping("/{campaignId}/map/bridge/setup")
    public CampaignMapBridgeResponse saveMapSetup(@PathVariable UUID campaignId,
                                                  @RequestBody SaveCampaignMapSetupRequest request) {
        return campaignMapBridgeService.saveSetup(campaignId, request, authenticationService.currentUser());
    }

    @PutMapping("/{campaignId}/map/bridge/nation-states")
    public CampaignMapBridgeResponse saveNationStates(@PathVariable UUID campaignId,
                                                      @RequestBody SaveCampaignNationStatesRequest request) {
        return campaignMapBridgeService.saveNationStates(campaignId, request, authenticationService.currentUser());
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
    public PlatoonDetailResponse getPlatoon(@PathVariable UUID campaignId, @PathVariable UUID platoonId) {
        return campaignPlatoonService.getPlatoon(campaignId, platoonId, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/platoons")
    public PlatoonDetailResponse createPlatoon(@PathVariable UUID campaignId,
                                               @RequestBody CreateCampaignPlatoonRequest request) {
        return campaignPlatoonService.createPlatoon(campaignId, request, authenticationService.currentUser());
    }

    @PutMapping("/{campaignId}/platoons/{platoonId}")
    public PlatoonDetailResponse updatePlatoon(@PathVariable UUID campaignId,
                                               @PathVariable UUID platoonId,
                                               @RequestBody UpdateCampaignPlatoonRequest request) {
        return campaignPlatoonService.updatePlatoon(campaignId, platoonId, request, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/turns/{turnNumber}/orders/me")
    public MyOrderSubmissionResponse getMyOrders(@PathVariable UUID campaignId, @PathVariable int turnNumber) {
        return campaignOrderService.getMyOrders(campaignId, turnNumber, authenticationService.currentUser());
    }

    @PutMapping("/{campaignId}/turns/{turnNumber}/orders/me")
    public MyOrderSubmissionResponse saveMyOrders(@PathVariable UUID campaignId,
                                                  @PathVariable int turnNumber,
                                                  @RequestBody SaveOrderSubmissionRequest request) {
        return campaignOrderService.saveMyOrders(campaignId, turnNumber, request, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/turns/{turnNumber}/orders/me/lock")
    public MyOrderSubmissionResponse lockMyOrders(@PathVariable UUID campaignId, @PathVariable int turnNumber) {
        return campaignOrderService.lockMyOrders(campaignId, turnNumber, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/phase/advance")
    public CampaignPhaseResponse advancePhase(@PathVariable UUID campaignId) {
        return campaignPhaseService.advancePhase(campaignId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/phase")
    public CampaignPhaseResponse getPhase(@PathVariable UUID campaignId) {
        return campaignPhaseService.getPhase(campaignId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/turns/{turnNumber}/resolution")
    public CampaignResolutionResponse getResolution(@PathVariable UUID campaignId, @PathVariable int turnNumber) {
        return campaignResolutionService.getResolutionSummary(campaignId, turnNumber, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/turns/{turnNumber}/resolve")
    public CampaignResolutionResponse resolveTurn(@PathVariable UUID campaignId, @PathVariable int turnNumber) {
        return campaignResolutionService.resolveTurn(campaignId, turnNumber, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/battles/{battleId}")
    public BattleDetailResponse getBattle(@PathVariable UUID campaignId, @PathVariable UUID battleId) {
        return campaignBattleService.getBattle(campaignId, battleId, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/battles/{battleId}/result")
    public BattleDetailResponse recordBattleResult(@PathVariable UUID campaignId,
                                                   @PathVariable UUID battleId,
                                                   @RequestBody RecordBattleResultRequest request) {
        return campaignBattleService.recordBattleResult(campaignId, battleId, request, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/audit")
    public List<CampaignAuditLogResponse> getAuditLog(@PathVariable UUID campaignId) {
        return campaignAdminService.getAuditLog(campaignId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/invites")
    public List<CampaignInviteAdminResponse> listInvites(@PathVariable UUID campaignId) {
        return campaignAdminService.listInvites(campaignId, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/invites")
    public CampaignInviteAdminResponse createInvite(@PathVariable UUID campaignId,
                                                    @RequestBody CreateCampaignInviteRequest request) {
        return campaignAdminService.createInvite(campaignId, request, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/invites/{inviteId}/revoke")
    public CampaignInviteAdminResponse revokeInvite(@PathVariable UUID campaignId,
                                                    @PathVariable UUID inviteId) {
        return campaignAdminService.revokeInvite(campaignId, inviteId, authenticationService.currentUser());
    }

    @GetMapping("/{campaignId}/world-chat")
    public List<CampaignChatMessageResponse> getWorldChat(@PathVariable UUID campaignId) {
        return campaignChatService.listWorldMessages(campaignId, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/world-chat")
    public CampaignChatMessageResponse postWorldChat(@PathVariable UUID campaignId,
                                                     @RequestBody PostCampaignWorldChatMessageRequest request) {
        return campaignChatService.postWorldMessage(campaignId, request, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/visibility/rebuild")
    public VisibilityRebuildResponse rebuildVisibility(@PathVariable UUID campaignId) {
        return campaignVisibilityService.rebuildVisibility(campaignId, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/complete")
    public CampaignLifecycleResponse completeCampaign(@PathVariable UUID campaignId) {
        return campaignAdminService.completeCampaign(campaignId, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/archive")
    public CampaignLifecycleResponse archiveCampaign(@PathVariable UUID campaignId) {
        return campaignAdminService.archiveCampaign(campaignId, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/reset-demo")
    public CampaignLifecycleResponse resetDemoCampaign(@PathVariable UUID campaignId) {
        return campaignAdminService.resetDemoCampaign(campaignId, authenticationService.currentUser());
    }

    @PostMapping("/{campaignId}/snapshots/export")
    public CampaignSnapshotExportResponse exportSnapshot(@PathVariable UUID campaignId) {
        return campaignAdminService.exportSnapshot(campaignId, authenticationService.currentUser());
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
