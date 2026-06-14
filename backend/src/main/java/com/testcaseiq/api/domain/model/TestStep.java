package com.testcaseiq.api.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "test_steps")
public class TestStep extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @Min(1)
    @Column(name = "step_order", nullable = false)
    private int stepOrder;

    @NotBlank
    @Column(nullable = false, columnDefinition = "text")
    private String action;

    @Column(name = "expected_result", columnDefinition = "text")
    private String expectedResult;

    protected TestStep() {
    }

    public TestStep(int stepOrder, String action, String expectedResult) {
        this.stepOrder = stepOrder;
        this.action = action;
        this.expectedResult = expectedResult;
    }

    public TestCase getTestCase() {
        return testCase;
    }

    public void setTestCase(TestCase testCase) {
        this.testCase = testCase;
    }

    public int getStepOrder() {
        return stepOrder;
    }

    public String getAction() {
        return action;
    }

    public String getExpectedResult() {
        return expectedResult;
    }
}
