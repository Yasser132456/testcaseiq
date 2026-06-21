package com.testcaseiq.api.audit;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.user.UserAccount;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditEventRepository auditEventRepository, ObjectMapper objectMapper) {
        this.auditEventRepository = auditEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AuditAction action, String resourceType, String resourceId, AuditOutcome outcome, String summary) {
        doLog(action, resourceType, resourceId, outcome, summary, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AuditAction action, String resourceType, String resourceId, AuditOutcome outcome, String summary,
                    Map<String, String> metadata) {
        doLog(action, resourceType, resourceId, outcome, summary, metadata);
    }

    private void doLog(AuditAction action, String resourceType, String resourceId, AuditOutcome outcome,
                       String summary, Map<String, String> metadata) {
        try {
            AuditEvent event = new AuditEvent(action.name(), resourceType, resourceId, outcome.name(), summary);
            if (metadata != null && !metadata.isEmpty()) {
                event.setMetadata(objectMapper.writeValueAsString(metadata));
            }
            populateActor(event);
            auditEventRepository.save(event);
        } catch (Exception e) {
            log.warn("Audit logging failed for action {} (best-effort): {}", action, e.getMessage());
        }
    }

    private void populateActor(AuditEvent event) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserAccount user) {
                event.setActorUserId(user.getId());
                event.setActorEmail(user.getEmail());
                event.setActorRole(user.getRole() != null ? user.getRole().name() : null);
            }
        } catch (Exception e) {
            log.debug("Could not populate audit actor: {}", e.getMessage());
        }
    }
}
