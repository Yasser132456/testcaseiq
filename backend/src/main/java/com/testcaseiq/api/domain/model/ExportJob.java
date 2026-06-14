package com.testcaseiq.api.domain.model;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.testcaseiq.api.domain.enums.ExportStatus;

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
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "export_jobs")
public class ExportJob extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @NotBlank
    @Size(max = 120)
    @Column(name = "export_type", nullable = false, length = 120)
    private String exportType;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private ExportStatus status = ExportStatus.PENDING;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "export_details_json", columnDefinition = "jsonb")
    private String exportDetailsJson;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    protected ExportJob() {
    }

    public ExportJob(String exportType) {
        this.exportType = exportType;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getExportType() {
        return exportType;
    }

    public ExportStatus getStatus() {
        return status;
    }

    public void setStatus(ExportStatus status) {
        this.status = status;
    }

    public void setExportDetailsJson(String exportDetailsJson) {
        this.exportDetailsJson = exportDetailsJson;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
