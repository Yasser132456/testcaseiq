package com.testcaseiq.api.testsuite.dto;

import com.testcaseiq.api.domain.enums.TestLayer;
import jakarta.validation.constraints.Size;

public record TestSuiteUpdateRequest(
        @Size(max = 2000) String description,
        TestLayer testLayer
) {}
