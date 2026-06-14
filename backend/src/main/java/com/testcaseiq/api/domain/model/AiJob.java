package com.testcaseiq.api.domain.model;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.testcaseiq.api.domain.enums.AiJobStatus;

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
@Table(name = "ai_jobs")
public class AiJob extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @NotBlank
    @Size(max = 120)
    @Column(name = "job_type", nullable = false, length = 120)
    private String jobType;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private AiJobStatus status = AiJobStatus.PENDING;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_payload_json", columnDefinition = "jsonb")
    private String inputPayloadJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_payload_json", columnDefinition = "jsonb")
    private String outputPayloadJson;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    protected AiJob() {
    }

    public AiJob(String jobType) {
        this.jobType = jobType;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getJobType() {
        return jobType;
    }

    public AiJobStatus getStatus() {
        return status;
    }

    public void setStatus(AiJobStatus status) {
        this.status = status;
    }

    public void setInputPayloadJson(String inputPayloadJson) {
        this.inputPayloadJson = inputPayloadJson;
    }

    public void setOutputPayloadJson(String outputPayloadJson) {
        this.outputPayloadJson = outputPayloadJson;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
