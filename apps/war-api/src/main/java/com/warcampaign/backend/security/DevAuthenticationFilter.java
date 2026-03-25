package com.warcampaign.backend.security;

import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Locale;

@Component
public class DevAuthenticationFilter extends OncePerRequestFilter {

    private static final String DEV_USER_HEADER = "X-Dev-User";

    private final UserRepository userRepository;

    public DevAuthenticationFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String email = request.getHeader(DEV_USER_HEADER);
            if (email != null && !email.isBlank()) {
                User user = userRepository.findByEmailIgnoreCase(email.trim())
                        .orElseGet(() -> provisionUser(email.trim()));
                if (user.isActive()) {
                    AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), user.getDisplayName());
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private User provisionUser(String email) {
        String localPart = email.split("@")[0];
        String displayName = "dev-" + localPart.toLowerCase(Locale.ROOT);
        User created = new User();
        created.setEmail(email.toLowerCase(Locale.ROOT));
        created.setDisplayName(displayName);
        created.setActive(true);
        return userRepository.save(created);
    }
}
