package com.warcampaign.backend.service;

import com.warcampaign.backend.dto.AuthMeResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

    public AuthMeResponse me() {
        AuthenticatedUser current = currentUser();
        return new AuthMeResponse(current.id(), current.email(), current.displayName());
    }

    public AuthenticatedUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new ApiException("UNAUTHENTICATED", HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return user;
    }
}
