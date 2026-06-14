package com.testcaseiq.api.domain.model;

import java.util.ArrayList;
import java.util.List;

import com.testcaseiq.api.domain.enums.TestLayer;

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
@Table(name = "test_suites")
public class TestSuite extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @NotBlank
    @Size(max = 180)
    @Column(nullable = false, length = 180)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_layer", length = 64)
    private TestLayer testLayer;

    @OneToMany(mappedBy = "testSuite", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestCase> testCases = new ArrayList<>();

    protected TestSuite() {
    }

    public TestSuite(String name) {
        this.name = name;
    }

    public void addTestCase(TestCase testCase) {
        testCases.add(testCase);
        testCase.setTestSuite(this);
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public TestLayer getTestLayer() {
        return testLayer;
    }

    public List<TestCase> getTestCases() {
        return testCases;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setTestLayer(TestLayer testLayer) {
        this.testLayer = testLayer;
    }
}
