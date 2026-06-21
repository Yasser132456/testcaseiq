package com.testcaseiq.api.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.dashboard.dto.DashboardMetricsResponse;
import com.testcaseiq.api.dashboard.service.DashboardService;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/metrics")
    @PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public ResponseEntity<DashboardMetricsResponse> getMetrics() {
        return ResponseEntity.ok(dashboardService.getMetrics());
    }
}
