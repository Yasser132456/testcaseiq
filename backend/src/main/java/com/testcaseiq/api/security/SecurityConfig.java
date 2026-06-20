package com.testcaseiq.api.security;

import java.time.Instant;
import java.util.Map;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.common.error.ApiErrorResponse;
import com.testcaseiq.api.user.UserAccountRepository;

@Configuration
@EnableConfigurationProperties(SecurityProperties.class)
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityProperties securityProperties,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            ObjectMapper objectMapper
    ) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable);
        http.httpBasic(AbstractHttpConfigurer::disable);
        http.formLogin(AbstractHttpConfigurer::disable);
        http.logout(AbstractHttpConfigurer::disable);
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    ApiErrorResponse body = new ApiErrorResponse(
                            Instant.now(),
                            HttpStatus.UNAUTHORIZED.value(),
                            HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                            "Authentication required",
                            request.getRequestURI(),
                            Map.of()
                    );
                    objectMapper.writeValue(response.getOutputStream(), body);
                })
                .accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    ApiErrorResponse body = new ApiErrorResponse(
                            Instant.now(),
                            HttpStatus.FORBIDDEN.value(),
                            HttpStatus.FORBIDDEN.getReasonPhrase(),
                            "Access denied",
                            request.getRequestURI(),
                            Map.of()
                    );
                    objectMapper.writeValue(response.getOutputStream(), body);
                })
        );
        http.authorizeHttpRequests(authorize -> {
            authorize.requestMatchers("/api/auth/register", "/api/auth/login", "/api/health").permitAll();
            authorize.requestMatchers("/api/auth/me").authenticated();
            if (securityProperties.enforceAuth()) {
                authorize.requestMatchers("/api/projects/**", "/api/stories/**", "/api/test-suites/**").authenticated();
                authorize.anyRequest().authenticated();
            } else {
                authorize.anyRequest().permitAll();
            }
        });
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    JwtService jwtService(SecurityProperties securityProperties) {
        return new JwtService(securityProperties);
    }

    @Bean
    JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService, UserAccountRepository userAccountRepository) {
        return new JwtAuthenticationFilter(jwtService, userAccountRepository);
    }

    @Bean
    SecurityEnforcement securityEnforcement(SecurityProperties securityProperties) {
        return new SecurityEnforcement(securityProperties);
    }

    @Bean
    UserDetailsService userDetailsService() {
        return username -> {
            throw new UsernameNotFoundException("User details are loaded by the JWT filter");
        };
    }
}
