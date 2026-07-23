package com.testcaseiq.api.story.dto;

import java.util.UUID;

import com.testcaseiq.api.domain.enums.ReviewStatus;

public record CaseRef(UUID id, String title, ReviewStatus status) {
}
