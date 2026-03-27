package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.enums.InviteStatus;
import com.warcampaign.backend.domain.model.CampaignInvite;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.CampaignMemberOnboarding;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.dto.AcceptInviteResponse;
import com.warcampaign.backend.dto.InviteDetailsResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.UserRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;

@Service
public class InviteAcceptanceService {

    private final CampaignInviteRepository campaignInviteRepository;
    private final CampaignMemberRepository campaignMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CampaignOnboardingService campaignOnboardingService;

    public InviteAcceptanceService(CampaignInviteRepository campaignInviteRepository,
                                   CampaignMemberRepository campaignMemberRepository,
                                   UserRepository userRepository,
                                   NotificationService notificationService,
                                   CampaignOnboardingService campaignOnboardingService) {
        this.campaignInviteRepository = campaignInviteRepository;
        this.campaignMemberRepository = campaignMemberRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.campaignOnboardingService = campaignOnboardingService;
    }

    @Transactional(readOnly = true)
    public InviteDetailsResponse getInvite(String token) {
        CampaignInvite invite = findInvite(token);
        return new InviteDetailsResponse(
                invite.getCampaign().getId(),
                invite.getCampaign().getName(),
                invite.getIntendedRole(),
                invite.getStatus(),
                invite.getExpiresAt(),
                isExpired(invite),
                null,
                null
        );
    }

    @Transactional
    public AcceptInviteResponse acceptInvite(String token, AuthenticatedUser authenticatedUser) {
        CampaignInvite invite = findInvite(token);
        validateAcceptable(invite, authenticatedUser.email());

        User user = userRepository.findById(authenticatedUser.id())
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
        if (!user.isActive()) {
            user.setActive(true);
            user = userRepository.save(user);
        }
        User activeUser = user;

        CampaignMember member = campaignMemberRepository.findByCampaignAndUser(invite.getCampaign(), activeUser)
                .map(existing -> {
                    existing.setRole(invite.getIntendedRole());
                    return existing;
                })
                .orElseGet(() -> {
                    CampaignMember created = new CampaignMember();
                    created.setCampaign(invite.getCampaign());
                    created.setUser(activeUser);
                    created.setRole(invite.getIntendedRole());
                    return created;
                });

        CampaignMember persisted = campaignMemberRepository.save(member);
        invite.setStatus(InviteStatus.ACCEPTED);
        campaignInviteRepository.save(invite);
        notificationService.notifyUser(
                invite.getCampaign(),
                activeUser,
                "INVITE_ACCEPTED",
                "Campaign invite accepted",
                "You joined " + invite.getCampaign().getName() + ".",
                "{\"campaignId\":\"" + invite.getCampaign().getId() + "\",\"memberId\":\"" + persisted.getId() + "\"}"
        );
        CampaignMemberOnboarding onboarding = campaignOnboardingService.ensureInviteAcceptanceState(persisted);

        return new AcceptInviteResponse(
                invite.getCampaign().getId(),
                persisted.getId(),
                persisted.getRole(),
                persisted.getFaction() != null ? persisted.getFaction().getFactionKey() : null,
                persisted.getNation() != null ? persisted.getNation().getNationKey() : null,
                invite.getStatus().name(),
                persisted.getRole() == com.warcampaign.backend.domain.enums.CampaignRole.PLAYER
                        && onboarding.getStatus() != com.warcampaign.backend.domain.enums.CampaignMemberOnboardingStatus.COMPLETE,
                onboarding.getActivationStatus(),
                buildRedirectPath(invite.getCampaign().getId(), onboarding)
        );
    }

    private String buildRedirectPath(java.util.UUID campaignId, CampaignMemberOnboarding onboarding) {
        if (onboarding.getStatus() == com.warcampaign.backend.domain.enums.CampaignMemberOnboardingStatus.NOT_REQUIRED) {
            return "/app/campaigns/" + campaignId;
        }
        if (onboarding.getStatus() != com.warcampaign.backend.domain.enums.CampaignMemberOnboardingStatus.COMPLETE) {
            return "/app/campaigns/" + campaignId + "/onboarding";
        }
        if (onboarding.getActivationStatus() == com.warcampaign.backend.domain.enums.CampaignMemberActivationStatus.PENDING_NEXT_TURN) {
            return "/app/campaigns/" + campaignId + "/waiting";
        }
        return "/app/campaigns/" + campaignId;
    }

    private CampaignInvite findInvite(String token) {
        return campaignInviteRepository.findByInviteToken(token)
                .orElseThrow(() -> new ApiException("INVITE_NOT_FOUND", HttpStatus.NOT_FOUND, "Invite token not found"));
    }

    private void validateAcceptable(CampaignInvite invite, String principalEmail) {
        if (!invite.getInviteeEmail().toLowerCase(Locale.ROOT).equals(principalEmail.toLowerCase(Locale.ROOT))) {
            throw new ApiException("INVITE_EMAIL_MISMATCH", HttpStatus.FORBIDDEN, "Invite token is not assigned to this account");
        }
        if (invite.getStatus() == InviteStatus.REVOKED) {
            throw new ApiException("INVITE_REVOKED", HttpStatus.CONFLICT, "Invite token has been revoked");
        }
        if (invite.getStatus() == InviteStatus.ACCEPTED) {
            throw new ApiException("INVITE_ALREADY_ACCEPTED", HttpStatus.CONFLICT, "Invite token has already been used");
        }
        if (invite.getStatus() == InviteStatus.EXPIRED) {
            throw new ApiException("INVITE_EXPIRED", HttpStatus.CONFLICT, "Invite token has expired");
        }
        if (isExpired(invite)) {
            if (invite.getStatus() == InviteStatus.PENDING) {
                invite.setStatus(InviteStatus.EXPIRED);
                campaignInviteRepository.save(invite);
            }
            throw new ApiException("INVITE_EXPIRED", HttpStatus.CONFLICT, "Invite token has expired");
        }
    }

    private boolean isExpired(CampaignInvite invite) {
        return invite.getExpiresAt().isBefore(Instant.now());
    }
}
