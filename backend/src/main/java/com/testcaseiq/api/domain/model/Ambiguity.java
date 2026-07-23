package com.testcaseiq.api.domain.model;

import java.time.Instant;

import com.testcaseiq.api.domain.enums.AmbiguityResolutionStatus;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "ambiguities")
public class Ambiguity extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @NotBlank
    @Column(nullable = false, columnDefinition = "text")
    private String question;

    @Column(columnDefinition = "text")
    private String context;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private AmbiguitySeverity severity;

    @Column(nullable = false)
    private boolean resolved;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_status", nullable = false, length = 32)
    private AmbiguityResolutionStatus resolutionStatus = AmbiguityResolutionStatus.OPEN;

    @Column(name = "resolution_notes", columnDefinition = "text")
    private String resolutionNotes;

    @Column(name = "resolved_by", length = 255)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    protected Ambiguity() {
    }

    public Ambiguity(String question, AmbiguitySeverity severity) {
        this.question = question;
        this.severity = severity;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getQuestion() {
        return question;
    }

    public AmbiguitySeverity getSeverity() {
        return severity;
    }

    public String getContext() {
        return context;
    }

    public boolean isResolved() {
        return resolved;
    }

    public String getResolutionNotes() {
        return resolutionNotes;
    }

    public AmbiguityResolutionStatus getResolutionStatus() {
        return resolutionStatus;
    }

    public String getResolvedBy() {
        return resolvedBy;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public void resolve(String resolutionNotes, String actor) {
        this.resolved = true;
        this.resolutionStatus = AmbiguityResolutionStatus.ANSWERED;
        this.resolutionNotes = resolutionNotes;
        this.resolvedBy = actor;
        this.resolvedAt = Instant.now();
    }

    public void dismiss(String actor) {
        this.resolved = true;
        this.resolutionStatus = AmbiguityResolutionStatus.DISMISSED;
        this.resolvedBy = actor;
        this.resolvedAt = Instant.now();
    }
}
