package com.testcaseiq.api.domain.model;

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

    @Column(name = "resolution_notes", columnDefinition = "text")
    private String resolutionNotes;

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

    public boolean isResolved() {
        return resolved;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public void resolve(String resolutionNotes) {
        this.resolved = true;
        this.resolutionNotes = resolutionNotes;
    }
}
