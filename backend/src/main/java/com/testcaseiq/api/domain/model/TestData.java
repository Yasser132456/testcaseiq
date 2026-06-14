package com.testcaseiq.api.domain.model;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "test_data")
public class TestData extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @NotBlank
    @Size(max = 160)
    @Column(nullable = false, length = 160)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data_value_json", columnDefinition = "jsonb")
    private String dataValueJson;

    @Column(columnDefinition = "text")
    private String notes;

    protected TestData() {
    }

    public TestData(String name, String dataValueJson) {
        this.name = name;
        this.dataValueJson = dataValueJson;
    }

    public TestCase getTestCase() {
        return testCase;
    }

    public void setTestCase(TestCase testCase) {
        this.testCase = testCase;
    }

    public String getName() {
        return name;
    }

    public String getDataValueJson() {
        return dataValueJson;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
