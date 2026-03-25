package com.warcampaign.backend.controller;

import com.warcampaign.backend.dto.ApiRootResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

    @GetMapping("/")
    public ApiRootResponse root() {
        return new ApiRootResponse("WAR Online Campaign API", "ok", "Use /api/** endpoints");
    }
}
