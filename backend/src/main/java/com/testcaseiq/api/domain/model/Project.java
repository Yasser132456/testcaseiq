package com.testcaseiq.api.domain.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "projects")
public class Project extends AuditableEntity {

    @NotBlank
    @Size(max = 160)
    @Column(nullable = false, length = 160)
    private String name;

    @NotBlank
    @Size(max = 64)
    @Column(name = "project_key", nullable = false, unique = true, length = 64)
    private String key;

    @Column(columnDefinition = "text")
    private String description;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Story> stories = new ArrayList<>();

    protected Project() {
    }

    public Project(String name, String key) {
        this.name = name;
        this.key = key;
    }

    public void addStory(Story story) {
        stories.add(story);
        story.setProject(this);
    }

    public void removeStory(Story story) {
        stories.remove(story);
        story.setProject(null);
    }

    public String getName() {
        return name;
    }

    public String getKey() {
        return key;
    }

    public String getDescription() {
        return description;
    }

    public List<Story> getStories() {
        return stories;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
