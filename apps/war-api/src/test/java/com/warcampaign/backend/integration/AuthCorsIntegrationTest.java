package com.warcampaign.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthCorsIntegrationTest {

    private static final String DEV_ORIGIN = "http://localhost:5173";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void preflightRequestReturnsCorsHeadersForAllowedOrigin() throws Exception {
        mockMvc.perform(options("/api/auth/me")
                        .header("Origin", DEV_ORIGIN)
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "X-Dev-User"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", DEV_ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("GET")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsString("X-Dev-User")));
    }

    @Test
    void authMeSucceedsForAllowedOriginWithDevAuthHeader() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Origin", DEV_ORIGIN)
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", DEV_ORIGIN))
                .andExpect(jsonPath("$.email").value("gm@war.local"));
    }

    @Test
    void disallowedOriginDoesNotReceiveAllowOriginHeader() throws Exception {
        mockMvc.perform(options("/api/auth/me")
                        .header("Origin", "http://malicious.local")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "X-Dev-User"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
