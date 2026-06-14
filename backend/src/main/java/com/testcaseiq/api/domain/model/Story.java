package com.testcaseiq.api.domain.model;

import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "stories")
public class Story extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @NotBlank
    @Size(max = 240)
    @Column(nullable = false, length = 240)
    private String title;

    @Column(name = "story_text", columnDefinition = "text")
    private String storyText;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private StoryType type = StoryType.USER_STORY;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private StoryStatus status = StoryStatus.DRAFT;

    @Size(max = 160)
    @Column(name = "external_reference", length = 160)
    private String externalReference;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    private String metadataJson;

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Requirement> requirements = new ArrayList<>();

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Ambiguity> ambiguities = new ArrayList<>();

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CoverageItem> coverageItems = new ArrayList<>();

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestSuite> testSuites = new ArrayList<>();

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AiJob> aiJobs = new ArrayList<>();

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExportJob> exportJobs = new ArrayList<>();

    protected Story() {
    }

    public Story(String title, StoryType type) {
        this.title = title;
        this.type = type;
    }

    public void addRequirement(Requirement requirement) {
        requirements.add(requirement);
        requirement.setStory(this);
    }

    public void addAmbiguity(Ambiguity ambiguity) {
        ambiguities.add(ambiguity);
        ambiguity.setStory(this);
    }

    public void addCoverageItem(CoverageItem coverageItem) {
        coverageItems.add(coverageItem);
        coverageItem.setStory(this);
    }

    public void addTestSuite(TestSuite testSuite) {
        testSuites.add(testSuite);
        testSuite.setStory(this);
    }

    public void addAiJob(AiJob aiJob) {
        aiJobs.add(aiJob);
        aiJob.setStory(this);
    }

    public void addExportJob(ExportJob exportJob) {
        exportJobs.add(exportJob);
        exportJob.setStory(this);
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public String getTitle() {
        return title;
    }

    public String getStoryText() {
        return storyText;
    }

    public StoryType getType() {
        return type;
    }

    public StoryStatus getStatus() {
        return status;
    }

    public List<Requirement> getRequirements() {
        return requirements;
    }

    public List<Ambiguity> getAmbiguities() {
        return ambiguities;
    }

    public List<CoverageItem> getCoverageItems() {
        return coverageItems;
    }

    public List<TestSuite> getTestSuites() {
        return testSuites;
    }

    public List<AiJob> getAiJobs() {
        return aiJobs;
    }

    public List<ExportJob> getExportJobs() {
        return exportJobs;
    }

    public void setStoryText(String storyText) {
        this.storyText = storyText;
    }

    public void setStatus(StoryStatus status) {
        this.status = status;
    }

    public String getExternalReference() {
        return externalReference;
    }

    public void setExternalReference(String externalReference) {
        this.externalReference = externalReference;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }
}
