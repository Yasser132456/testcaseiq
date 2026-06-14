package com.testcaseiq.api.domain.model;

import java.util.HashSet;
import java.util.Set;

import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.RiskLevel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "requirements")
public class Requirement extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @NotBlank
    @Size(max = 240)
    @Column(nullable = false, length = 240)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private RequirementType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 64)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", length = 64)
    private RiskLevel riskLevel;

    @Size(max = 160)
    @Column(name = "source_reference", length = 160)
    private String sourceReference;

    @ManyToMany(mappedBy = "requirements")
    private Set<TestCase> testCases = new HashSet<>();

    protected Requirement() {
    }

    public Requirement(String title, RequirementType type) {
        this.title = title;
        this.type = type;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getTitle() {
        return title;
    }

    public RequirementType getType() {
        return type;
    }

    public String getDescription() {
        return description;
    }

    public Priority getPriority() {
        return priority;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public String getSourceReference() {
        return sourceReference;
    }

    public Set<TestCase> getTestCases() {
        return testCases;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public void setRiskLevel(RiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public void setSourceReference(String sourceReference) {
        this.sourceReference = sourceReference;
    }
}
