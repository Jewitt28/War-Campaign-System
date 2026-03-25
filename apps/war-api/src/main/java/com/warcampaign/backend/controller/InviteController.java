package com.warcampaign.backend.controller;

import com.warcampaign.backend.dto.AcceptInviteResponse;
import com.warcampaign.backend.dto.InviteDetailsResponse;
import com.warcampaign.backend.service.AuthenticationService;
import com.warcampaign.backend.service.InviteAcceptanceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invites")
public class InviteController {

    private final InviteAcceptanceService inviteAcceptanceService;
    private final AuthenticationService authenticationService;

    public InviteController(InviteAcceptanceService inviteAcceptanceService,
                            AuthenticationService authenticationService) {
        this.inviteAcceptanceService = inviteAcceptanceService;
        this.authenticationService = authenticationService;
    }

    @GetMapping("/{token}")
    public InviteDetailsResponse getInvite(@PathVariable String token) {
        return inviteAcceptanceService.getInvite(token);
    }

    @PostMapping("/{token}/accept")
    public AcceptInviteResponse acceptInvite(@PathVariable String token) {
        return inviteAcceptanceService.acceptInvite(token, authenticationService.currentUser());
    }
}
