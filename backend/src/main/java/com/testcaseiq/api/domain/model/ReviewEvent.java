package com.testcaseiq.api.domain.model;

import com.testcaseiq.api.domain.enums.ReviewStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "review_events")
public class ReviewEvent extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private ReviewStatus status;

    @Size(max = 160)
    @Column(length = 160)
    private String reviewer;

    @Column(columnDefinition = "text")
    private String comment;

    protected ReviewEvent() {
    }

    public ReviewEvent(ReviewStatus status, String reviewer) {
        this.status = status;
        this.reviewer = reviewer;
    }

    public TestCase getTestCase() {
        return testCase;
    }

    public void setTestCase(TestCase testCase) {
        this.testCase = testCase;
    }

    public ReviewStatus getStatus() {
        return status;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
