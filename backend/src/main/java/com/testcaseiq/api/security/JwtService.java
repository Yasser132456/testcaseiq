package com.testcaseiq.api.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.common.error.UnauthorizedException;
import com.testcaseiq.api.user.UserAccount;

public class JwtService {

    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    private final SecurityProperties securityProperties;
    private final ObjectMapper objectMapper;

    public JwtService(SecurityProperties securityProperties) {
        this(securityProperties, new ObjectMapper());
    }

    JwtService(SecurityProperties securityProperties, ObjectMapper objectMapper) {
        this.securityProperties = securityProperties;
        this.objectMapper = objectMapper;
    }

    public String generateToken(UserAccount user) {
        Instant expiresAt = Instant.now().plusSeconds(securityProperties.accessTokenExpirationSeconds());
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> payload = Map.of(
                "sub", user.getEmail(),
                "userId", user.getId().toString(),
                "role", user.getRole().name(),
                "exp", expiresAt.getEpochSecond()
        );
        String unsignedToken = "%s.%s".formatted(encodeJson(header), encodeJson(payload));
        return unsignedToken + "." + sign(unsignedToken);
    }

    public JwtClaims validateToken(String token) {
        String[] parts = token == null ? new String[0] : token.split("\\.");
        if (parts.length != 3) {
            throw new UnauthorizedException("Invalid token");
        }
        String unsignedToken = parts[0] + "." + parts[1];
        if (!constantTimeEquals(sign(unsignedToken), parts[2])) {
            throw new UnauthorizedException("Invalid token");
        }
        Map<String, Object> payload = decodeJson(parts[1]);
        long expiration = ((Number) payload.get("exp")).longValue();
        Instant expiresAt = Instant.ofEpochSecond(expiration);
        if (expiresAt.isBefore(Instant.now())) {
            throw new UnauthorizedException("Token has expired");
        }
        return new JwtClaims(
                payload.get("sub").toString(),
                UUID.fromString(payload.get("userId").toString()),
                payload.get("role").toString(),
                expiresAt
        );
    }

    public long accessTokenExpirationSeconds() {
        return securityProperties.accessTokenExpirationSeconds();
    }

    private String encodeJson(Map<String, Object> value) {
        try {
            return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to create token", exception);
        }
    }

    private Map<String, Object> decodeJson(String value) {
        try {
            return objectMapper.readValue(BASE64_URL_DECODER.decode(value), new TypeReference<>() {
            });
        } catch (Exception exception) {
            throw new UnauthorizedException("Invalid token");
        }
    }

    private String sign(String unsignedToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(securityProperties.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign token", exception);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        return MessageDigestSupport.isEqual(left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
    }
}
