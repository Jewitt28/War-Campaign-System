package com.warcampaign.backend.config;

import com.warcampaign.backend.api.ApiAuthenticationEntryPoint;
import com.warcampaign.backend.security.DevAuthenticationFilter;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   ObjectProvider<DevAuthenticationFilter> devAuthenticationFilterProvider,
                                                   ApiAuthenticationEntryPoint apiAuthenticationEntryPoint) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(apiAuthenticationEntryPoint))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/invites/*").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll());

        DevAuthenticationFilter devAuthenticationFilter = devAuthenticationFilterProvider.getIfAvailable();
        if (devAuthenticationFilter != null) {
            http.addFilterBefore(devAuthenticationFilter, AnonymousAuthenticationFilter.class);
        }

        return http.build();
    }
}
