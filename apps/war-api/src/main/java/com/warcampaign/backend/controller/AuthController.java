package com.warcampaign.backend.controller;

import com.warcampaign.backend.dto.AuthMeResponse;
import com.warcampaign.backend.service.AuthenticationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationService authenticationService;

    public AuthController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @GetMapping("/me")
    public AuthMeResponse me() {
        return authenticationService.me();
    }
}
