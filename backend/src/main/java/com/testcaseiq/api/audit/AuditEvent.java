package com.testcaseiq.api.audit;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit_events")
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "actor_email", length = 180)
    private String actorEmail;

    @Column(name = "actor_role", length = 64)
    private String actorRole;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "resource_type", length = 100)
    private String resourceType;

    @Column(name = "resource_id", length = 255)
    private String resourceId;

    @Column(nullable = false, length = 32)
    private String outcome;

    @Column(columnDefinition = "text")
    private String summary;

    @Column(name = "request_path", length = 500)
    private String requestPath;

    @Column(name = "request_method", length = 16)
    private String requestMethod;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(columnDefinition = "text")
    private String metadata;

    protected AuditEvent() {
    }

    public AuditEvent(String action, String resourceType, String resourceId, String outcome, String summary) {
        this.timestamp = Instant.now();
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.outcome = outcome;
        this.summary = summary;
    }

    public UUID getId() { return id; }
    public Instant getTimestamp() { return timestamp; }
    public UUID getActorUserId() { return actorUserId; }
    public String getActorEmail() { return actorEmail; }
    public String getActorRole() { return actorRole; }
    public String getAction() { return action; }
    public String getResourceType() { return resourceType; }
    public String getResourceId() { return resourceId; }
    public String getOutcome() { return outcome; }
    public String getSummary() { return summary; }
    public String getRequestPath() { return requestPath; }
    public String getRequestMethod() { return requestMethod; }
    public String getIpAddress() { return ipAddress; }

    public String getMetadata() { return metadata; }

    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public void setActorUserId(UUID actorUserId) { this.actorUserId = actorUserId; }
    public void setActorEmail(String actorEmail) { this.actorEmail = actorEmail; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }
    public void setRequestPath(String requestPath) { this.requestPath = requestPath; }
    public void setRequestMethod(String requestMethod) { this.requestMethod = requestMethod; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
}
