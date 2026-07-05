package com.testcaseiq.api.demo;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.audit.AuditEvent;
import com.testcaseiq.api.audit.AuditEventRepository;
import com.testcaseiq.api.domain.enums.ConfidenceLevel;
import com.testcaseiq.api.domain.enums.ExportStatus;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;
import com.testcaseiq.api.domain.model.ExportJob;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.model.ReviewEvent;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestStep;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.ProjectRepository;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@Component
public class DemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);
    private static final String DEMO_PASSWORD = "testcaseiq-demo-24A";

    private final UserAccountRepository userRepo;
    private final ProjectRepository projectRepo;
    private final AuditEventRepository auditRepo;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final boolean demoMode;

    public DemoDataInitializer(
            UserAccountRepository userRepo,
            ProjectRepository projectRepo,
            AuditEventRepository auditRepo,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate,
            @Value("${demo.mode:false}") boolean demoMode) {
        this.userRepo = userRepo;
        this.projectRepo = projectRepo;
        this.auditRepo = auditRepo;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.demoMode = demoMode;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!demoMode) {
            log.debug("Demo mode is disabled; skipping demo seed.");
            return;
        }
        long existingUsers = userRepo.count();
        long existingProjects = projectRepo.count();
        if (existingUsers > 0 || existingProjects > 0) {
            log.info("Demo mode is enabled, but the database is not empty; skipping demo seed.");
            return;
        }

        log.info("Demo mode is enabled; seeding portfolio workflow data.");
        seedUsers();
        seedProjects();
        seedAuditEvents();
        backfillAuditDates();
        log.info("Demo data loaded: 3 users, 3 projects, 12 stories, 7 suites, 18 test cases.");
    }

    private void seedUsers() {
        String hash = passwordEncoder.encode(DEMO_PASSWORD);
        userRepo.saveAll(List.of(
                new UserAccount("Mina Haddad", "demo@testcaseiq.local", hash, UserRole.QA_ENGINEER),
                new UserAccount("Priya Raman", "admin@testcaseiq.local", hash, UserRole.ADMIN),
                new UserAccount("Mateo Alvarez", "viewer@testcaseiq.local", hash, UserRole.VIEWER)
        ));
    }

    private void seedProjects() {
        projectRepo.save(harborlaneDispatch());
        projectRepo.save(willowbendPatientPortal());
        projectRepo.save(ledgerwellPaymentsConsole());
    }

    private Project harborlaneDispatch() {
        Project project = new Project("Harborlane Dispatch", "HARBOR");
        project.setDescription("Internal logistics workspace for dock appointments, route exceptions, and carrier delay handoffs.");

        Story resequence = story(
                "Dispatcher resequences late dock appointments",
                StoryType.USER_STORY,
                StoryStatus.TESTS_GENERATED,
                "HARBOR-101",
                """
                As a dispatch coordinator, I want to resequence late dock appointments so that the warehouse team can keep loading doors productive.
                AC: appointments more than 18 minutes late are flagged.
                AC: resequencing requires a reason code and coordinator name.
                AC: carriers receive an updated appointment window within 87 seconds.
                """);
        resequence.addTestSuite(suite(
                "Dock appointment resequencing",
                "UI and notification coverage for late-arrival resequencing.",
                TestLayer.E2E,
                testCase(
                        "Late appointment moves behind on-time trailer",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.E2E,
                        Priority.HIGH,
                        RiskLevel.HIGH,
                        ReviewStatus.APPROVED,
                        91,
                        ConfidenceLevel.HIGH,
                        "Two trailers are assigned to door 14; trailer HL-4832 is 23 minutes late.",
                        "The late trailer moves below the on-time appointment and an updated window is sent.",
                        List.of(
                                step(1, "Open the door 14 appointment board.", "The on-time and late appointments are visible."),
                                step(2, "Select trailer HL-4832 and choose Resequence.", "A reason-code field is required."),
                                step(3, "Enter reason code LATE_CARRIER and save.", "The board reorders and shows the coordinator audit note.")
                        ),
                        "Covers the primary late-appointment resequencing workflow.",
                        "Given trailer HL-4832 is 23 minutes late, When Mina resequences the appointment, Then the dock board updates and the carrier receives the new window.",
                        "Mina Haddad",
                        "Approved for regression coverage."
                ),
                testCase(
                        "Resequence is blocked without a reason code",
                        TestCaseType.NEGATIVE,
                        TestLayer.E2E,
                        Priority.HIGH,
                        RiskLevel.MEDIUM,
                        ReviewStatus.NEEDS_REVIEW,
                        84,
                        ConfidenceLevel.MEDIUM,
                        "A delayed appointment is selected by the coordinator.",
                        "The save action is blocked and the missing reason is announced inline.",
                        List.of(
                                step(1, "Open a delayed appointment from the dock board.", "The appointment action panel opens."),
                                step(2, "Clear the reason-code field.", "The field remains editable."),
                                step(3, "Click Save resequence.", "Inline validation says: Select a reason code before saving.")
                        ),
                        "Validates the required audit data for resequencing.",
                        "Given the reason code is empty, When the coordinator saves, Then validation prevents the change.",
                        null,
                        null
                ),
                testCase(
                        "Carrier notification timeout is surfaced",
                        TestCaseType.NEGATIVE,
                        TestLayer.API,
                        Priority.MEDIUM,
                        RiskLevel.HIGH,
                        ReviewStatus.REJECTED,
                        72,
                        ConfidenceLevel.MEDIUM,
                        "Carrier endpoint returns 504 for appointment-window updates.",
                        "The board keeps the new order but flags the failed notification for retry.",
                        List.of(
                                step(1, "Stub carrier HLX webhook to return HTTP 504.", "The webhook failure is active."),
                                step(2, "Resequence a late appointment.", "The application persists the new order."),
                                step(3, "Inspect the notification banner.", "The banner identifies the failed carrier notification and retry action.")
                        ),
                        "Covers delayed downstream notification handling.",
                        "Given the carrier webhook times out, When resequencing succeeds, Then the failed notification is visible for retry.",
                        "Priya Raman",
                        "Split this into one API contract test and one UI banner test before approval."
                )
        ));
        project.addStory(resequence);

        project.addStory(story(
                "Driver check-in captures trailer seal exceptions",
                StoryType.USER_STORY,
                StoryStatus.ANALYZED,
                "HARBOR-102",
                """
                As a gate clerk, I want to record seal mismatches during driver check-in so that damaged or substituted freight is reviewed before unloading.
                AC: mismatched seal numbers require a photo.
                AC: the dock lead receives a task within 3.8 minutes.
                AC: resolved exceptions remain searchable by trailer number.
                """));

        Story delayReport = story(
                "Operations manager exports carrier delay report",
                StoryType.BUSINESS_REQUIREMENT,
                StoryStatus.REVIEWED,
                "HARBOR-103",
                """
                As an operations manager, I want to export weekly carrier delay reasons so that supplier scorecards use reviewed dispatch data.
                AC: export includes carrier, lane, reason code, minutes late, and coordinator.
                AC: cancelled appointments are excluded.
                AC: exported totals match the dashboard filter.
                """);
        delayReport.addTestSuite(suite(
                "Carrier delay report export",
                "Reviewed export coverage for scorecard reporting.",
                TestLayer.API,
                testCase(
                        "Weekly export excludes cancelled appointments",
                        TestCaseType.API,
                        TestLayer.API,
                        Priority.HIGH,
                        RiskLevel.MEDIUM,
                        ReviewStatus.APPROVED,
                        88,
                        ConfidenceLevel.HIGH,
                        "The week contains 37 completed appointments and 4 cancelled appointments.",
                        "CSV contains 37 rows and no cancelled appointment IDs.",
                        List.of(
                                step(1, "Request GET /api/reports/carrier-delays?week=2026-W25.", "HTTP 200 with CSV content."),
                                step(2, "Count exported appointment rows.", "The export has 37 data rows."),
                                step(3, "Search for cancelled appointment IDs.", "No cancelled IDs are present.")
                        ),
                        "Confirms the exported population matches reviewed delay data.",
                        "Given cancelled appointments exist, When the weekly carrier-delay export runs, Then cancelled rows are excluded.",
                        "Priya Raman",
                        "Ready for scorecard export regression."
                ),
                testCase(
                        "Dashboard filtered total matches CSV total",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.UI,
                        Priority.MEDIUM,
                        RiskLevel.MEDIUM,
                        ReviewStatus.APPROVED,
                        86,
                        ConfidenceLevel.HIGH,
                        "The dashboard is filtered to lane ATL to CLT for the current week.",
                        "The displayed total delayed minutes matches the CSV aggregate.",
                        List.of(
                                step(1, "Apply lane filter ATL to CLT on the report dashboard.", "The total delayed minutes is shown."),
                                step(2, "Export the same filtered report.", "CSV downloads successfully."),
                                step(3, "Sum minutes_late in the CSV.", "The aggregate matches the dashboard value.")
                        ),
                        "Protects reporting trust between dashboard and export hub.",
                        "Given a lane filter is active, When the report is exported, Then CSV totals match the dashboard.",
                        "Mina Haddad",
                        "Approved after comparing against production support sample 47.2."
                )
        ));
        delayReport.addExportJob(exportJob("xray-csv", ExportStatus.COMPLETED, "{\"rows\":37,\"format\":\"xray-csv\"}"));
        project.addStory(delayReport);

        project.addStory(story(
                "Yard coordinator drafts overnight shuttle plan",
                StoryType.FEATURE_REQUEST,
                StoryStatus.DRAFT,
                "HARBOR-104",
                """
                As a yard coordinator, I want to draft an overnight shuttle plan so that late trailers can be staged before the morning receiving wave.
                AC: plan drafts save without notifying carriers.
                AC: overlapping trailer assignments are highlighted.
                AC: supervisors can approve the plan from the morning handoff queue.
                """));

        return project;
    }

    private Project willowbendPatientPortal() {
        Project project = new Project("Willowbend Patient Portal", "WILLOW");
        project.setDescription("Patient-facing care portal for appointments, lab messages, caregiver access, and insurance updates.");

        Story appointments = story(
                "Patient books a follow-up appointment",
                StoryType.USER_STORY,
                StoryStatus.TESTS_GENERATED,
                "WILLOW-201",
                """
                As a patient, I want to book a follow-up appointment from my visit summary so that I can schedule care without calling the clinic.
                AC: only clinicians from the visit summary are suggested.
                AC: appointment slots respect the clinic timezone.
                AC: confirmation includes clinic address and preparation notes.
                """);
        appointments.addTestSuite(suite(
                "Follow-up appointment booking",
                "Patient portal booking tests for clinician selection and timezone-safe slots.",
                TestLayer.E2E,
                testCase(
                        "Patient books follow-up with visit clinician",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.E2E,
                        Priority.HIGH,
                        RiskLevel.MEDIUM,
                        ReviewStatus.APPROVED,
                        89,
                        ConfidenceLevel.HIGH,
                        "Patient Sofia Chen has a completed cardiology visit summary with Dr. Neha Iyer.",
                        "The appointment is booked with Dr. Iyer and confirmation includes preparation notes.",
                        List.of(
                                step(1, "Open the cardiology visit summary.", "Follow-up action is visible."),
                                step(2, "Choose an available slot for Dr. Neha Iyer.", "The slot appears in the clinic timezone."),
                                step(3, "Confirm the appointment.", "Confirmation shows address and preparation notes.")
                        ),
                        "Covers the core self-scheduling path.",
                        "Given a visit summary suggests Dr. Iyer, When Sofia books a follow-up, Then the confirmation includes clinic details.",
                        "Mina Haddad",
                        "Approved with timezone assertion."
                ),
                testCase(
                        "Slot list uses clinic timezone during travel",
                        TestCaseType.BOUNDARY,
                        TestLayer.E2E,
                        Priority.MEDIUM,
                        RiskLevel.MEDIUM,
                        ReviewStatus.NEEDS_REVIEW,
                        79,
                        ConfidenceLevel.MEDIUM,
                        "Patient browser timezone is America/Los_Angeles; clinic timezone is America/Chicago.",
                        "Slots render in the clinic timezone with a clear label.",
                        List.of(
                                step(1, "Set browser timezone to America/Los_Angeles.", "The portal loads with patient session active."),
                                step(2, "Open follow-up booking for the Chicago clinic.", "Available slots display with CT label."),
                                step(3, "Select 9:20 AM CT.", "Confirmation preserves the clinic timezone.")
                        ),
                        "Targets timezone errors that create missed appointments.",
                        "Given patient and clinic timezones differ, When slots are shown, Then clinic timezone remains explicit.",
                        null,
                        null
                ),
                testCase(
                        "Clinician outside visit summary is not suggested",
                        TestCaseType.NEGATIVE,
                        TestLayer.API,
                        Priority.MEDIUM,
                        RiskLevel.LOW,
                        ReviewStatus.DRAFT,
                        76,
                        ConfidenceLevel.MEDIUM,
                        "Visit summary includes cardiology clinicians only.",
                        "The suggestion API omits unrelated dermatology clinicians.",
                        List.of(
                                step(1, "Request GET /api/appointments/suggestions for visit WIL-3328.", "HTTP 200 with clinician suggestions."),
                                step(2, "Inspect clinician specialties.", "Only clinicians attached to the visit summary are returned."),
                                step(3, "Search for dermatology clinician Luis Moreno.", "Luis Moreno is absent from the response.")
                        ),
                        "Prevents confusing cross-specialty suggestions.",
                        "Given a visit summary has limited clinicians, When suggestions load, Then unrelated clinicians are not shown.",
                        null,
                        null
                )
        ));
        project.addStory(appointments);

        Story labResults = story(
                "Nurse triage flags abnormal lab result messages",
                StoryType.USER_STORY,
                StoryStatus.REVIEWED,
                "WILLOW-202",
                """
                As a triage nurse, I want abnormal lab result messages to be flagged so that urgent patient outreach is handled before routine inbox work.
                AC: unread abnormal results appear above routine messages.
                AC: reviewing a result records nurse initials.
                AC: flagged messages leave the urgent queue after review.
                """);
        labResults.addTestSuite(suite(
                "Abnormal lab result triage",
                "Reviewed nurse-inbox coverage for urgent lab message handling.",
                TestLayer.UI,
                testCase(
                        "Unread abnormal result appears above routine message",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.UI,
                        Priority.CRITICAL,
                        RiskLevel.HIGH,
                        ReviewStatus.APPROVED,
                        94,
                        ConfidenceLevel.HIGH,
                        "Inbox contains one unread abnormal potassium result and 9 routine messages.",
                        "The abnormal result appears first with urgent label and patient identifier.",
                        List.of(
                                step(1, "Open the triage inbox as nurse Amara Okafor.", "The inbox loads unread messages."),
                                step(2, "Inspect the first message row.", "The abnormal potassium result is first."),
                                step(3, "Verify urgent label and patient ID.", "Both are visible and screen-reader accessible.")
                        ),
                        "Prioritizes urgent clinical work over routine inbox order.",
                        "Given an unread abnormal result exists, When the triage inbox loads, Then it appears above routine messages.",
                        "Priya Raman",
                        "Approved for clinical-priority smoke coverage."
                ),
                testCase(
                        "Reviewed abnormal result leaves urgent queue",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.UI,
                        Priority.HIGH,
                        RiskLevel.HIGH,
                        ReviewStatus.APPROVED,
                        89,
                        ConfidenceLevel.HIGH,
                        "An abnormal result is open in the urgent triage queue.",
                        "Reviewing it records nurse initials and removes it from urgent count.",
                        List.of(
                                step(1, "Open abnormal result WIL-LAB-8821.", "The result detail panel opens."),
                                step(2, "Click Mark reviewed and enter initials AO.", "The review action is saved."),
                                step(3, "Return to urgent queue.", "The result is no longer listed and urgent count decreases.")
                        ),
                        "Ensures urgent queue state is based on clinical review, not message read state alone.",
                        "Given a nurse reviews an abnormal result, When the result is marked reviewed, Then it leaves the urgent queue.",
                        "Mina Haddad",
                        "Approved after copy update to use nurse initials."
                )
        ));
        labResults.addExportJob(exportJob("playwright", ExportStatus.COMPLETED, "{\"cases\":2,\"format\":\"playwright\"}"));
        project.addStory(labResults);

        project.addStory(story(
                "Caregiver proxy access requires consent renewal",
                StoryType.BUSINESS_REQUIREMENT,
                StoryStatus.ANALYZED,
                "WILLOW-203",
                """
                As a privacy officer, I want caregiver proxy access to expire unless consent is renewed so that portal access follows the patient's current authorization.
                AC: expiring consent shows 13 days before expiration.
                AC: expired proxy users can view billing only.
                AC: renewed consent restores message and appointment access.
                """));

        project.addStory(story(
                "Patient updates insurance card images",
                StoryType.USER_STORY,
                StoryStatus.DRAFT,
                "WILLOW-204",
                """
                As a patient, I want to upload front and back insurance card images so that billing staff can verify coverage before my next visit.
                AC: images must be legible and under 7.6 MB.
                AC: the upload progress is visible.
                AC: billing staff receive a work item after both sides are uploaded.
                """));

        return project;
    }

    private Project ledgerwellPaymentsConsole() {
        Project project = new Project("Ledgerwell Payments Console", "LEDGER");
        project.setDescription("Payments operations dashboard for payout reconciliation, refund risk review, and dispute evidence exports.");

        Story payouts = story(
                "Finance analyst reconciles unsettled payouts",
                StoryType.USER_STORY,
                StoryStatus.TESTS_GENERATED,
                "LEDGER-301",
                """
                As a finance analyst, I want to reconcile unsettled payouts so that merchant settlements match bank transfer records.
                AC: payout mismatches above 2.5% require a variance note.
                AC: matched payouts move to the cleared ledger.
                AC: unresolved payouts remain visible after filter changes.
                """);
        payouts.addTestSuite(suite(
                "Unsettled payout reconciliation",
                "Finance workflow coverage for clearing and variance handling.",
                TestLayer.E2E,
                testCase(
                        "Matched payout moves to cleared ledger",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.E2E,
                        Priority.HIGH,
                        RiskLevel.HIGH,
                        ReviewStatus.APPROVED,
                        92,
                        ConfidenceLevel.HIGH,
                        "Merchant payout LW-7741 matches bank transfer BT-7741 at USD 18,423.17.",
                        "The payout leaves unsettled view and appears in cleared ledger.",
                        List.of(
                                step(1, "Open unsettled payouts for merchant Verdant Supply.", "Payout LW-7741 is visible."),
                                step(2, "Match payout LW-7741 to bank transfer BT-7741.", "The variance is 0.0%."),
                                step(3, "Click Clear payout.", "The payout appears in the cleared ledger with analyst name.")
                        ),
                        "Covers the primary reconciliation workflow.",
                        "Given payout and bank transfer amounts match, When the analyst clears the payout, Then it moves to the cleared ledger.",
                        "Priya Raman",
                        "Approved with exact currency fixture."
                ),
                testCase(
                        "Variance above threshold requires note",
                        TestCaseType.NEGATIVE,
                        TestLayer.UI,
                        Priority.HIGH,
                        RiskLevel.HIGH,
                        ReviewStatus.NEEDS_REVIEW,
                        83,
                        ConfidenceLevel.MEDIUM,
                        "Payout and bank transfer differ by 3.7%.",
                        "Clear action is blocked until the analyst enters a variance note.",
                        List.of(
                                step(1, "Match payout LW-1189 to transfer BT-1189.", "The variance displays as 3.7%."),
                                step(2, "Leave variance note empty.", "The note field remains empty."),
                                step(3, "Click Clear payout.", "Inline validation requires a variance note.")
                        ),
                        "Protects audit quality for high-variance payouts.",
                        "Given variance is above 2.5%, When the note is empty, Then clearing is blocked.",
                        null,
                        null
                ),
                testCase(
                        "Unresolved payout remains after filter change",
                        TestCaseType.REGRESSION,
                        TestLayer.UI,
                        Priority.MEDIUM,
                        RiskLevel.MEDIUM,
                        ReviewStatus.DRAFT,
                        78,
                        ConfidenceLevel.MEDIUM,
                        "Unresolved payout LW-6402 is tagged as needs bank research.",
                        "Changing filters does not remove the payout from unresolved work queue.",
                        List.of(
                                step(1, "Flag payout LW-6402 as needs bank research.", "The payout remains unresolved."),
                                step(2, "Apply merchant filter Northline Foods.", "Filtered view shows matching unresolved payouts."),
                                step(3, "Clear the filter.", "LW-6402 remains in the unresolved queue.")
                        ),
                        "Guards against losing unresolved finance work during filtering.",
                        "Given an unresolved payout exists, When filters change, Then it remains recoverable.",
                        null,
                        null
                )
        ));
        project.addStory(payouts);

        Story refundRisk = story(
                "Risk reviewer holds suspicious refund batch",
                StoryType.USER_STORY,
                StoryStatus.TESTS_GENERATED,
                "LEDGER-302",
                """
                As a risk reviewer, I want to hold suspicious refund batches so that high-risk refunds are checked before money leaves the platform.
                AC: batches over USD 12,475 with 5 or more cards are flagged.
                AC: hold reason is required.
                AC: approved batches resume within 4.7 minutes.
                """);
        refundRisk.addTestSuite(suite(
                "Suspicious refund batch review",
                "Risk review tests for refund holds and release timing.",
                TestLayer.API,
                testCase(
                        "High-risk refund batch is flagged for hold",
                        TestCaseType.API,
                        TestLayer.API,
                        Priority.CRITICAL,
                        RiskLevel.HIGH,
                        ReviewStatus.APPROVED,
                        95,
                        ConfidenceLevel.HIGH,
                        "Refund batch totals USD 14,238.42 across 6 distinct cards.",
                        "Risk API returns HOLD_REQUIRED and creates a reviewer task.",
                        List.of(
                                step(1, "POST /api/refunds/batches/risk-score with batch RB-9027.", "HTTP 200 with risk decision."),
                                step(2, "Inspect decision.", "Decision is HOLD_REQUIRED."),
                                step(3, "Query reviewer tasks.", "Task references RB-9027 and batch amount.")
                        ),
                        "Covers the suspicious-batch threshold rule.",
                        "Given a batch exceeds value and card-count thresholds, When risk scoring runs, Then a hold task is created.",
                        "Priya Raman",
                        "Approved for API regression."
                ),
                testCase(
                        "Hold cannot be saved without reason",
                        TestCaseType.NEGATIVE,
                        TestLayer.UI,
                        Priority.HIGH,
                        RiskLevel.HIGH,
                        ReviewStatus.REJECTED,
                        71,
                        ConfidenceLevel.MEDIUM,
                        "Risk reviewer opens a flagged refund batch.",
                        "The hold action requires a reason before saving.",
                        List.of(
                                step(1, "Open refund batch RB-9027 in the risk console.", "The hold action is enabled."),
                                step(2, "Choose Hold batch and leave reason empty.", "Reason textarea is empty."),
                                step(3, "Click Save hold.", "Validation prevents saving without reason.")
                        ),
                        "Validates the reviewer audit requirement.",
                        "Given hold reason is empty, When the reviewer saves, Then the hold is not persisted.",
                        "Mina Haddad",
                        "Rejected until this includes the audit-event assertion for previous and new hold state."
                )
        ));
        project.addStory(refundRisk);

        Story disputeExport = story(
                "Support lead exports dispute evidence packet",
                StoryType.USER_STORY,
                StoryStatus.EXPORTED,
                "LEDGER-303",
                """
                As a support lead, I want to export dispute evidence packets so that chargeback responses include the required payment and fulfillment proof.
                AC: packet includes transaction timeline, receipt, delivery proof, and customer messages.
                AC: missing evidence is listed before export.
                AC: exported packets are watermarked with case ID and generated timestamp.
                """);
        disputeExport.addTestSuite(suite(
                "Dispute evidence packet export",
                "Approved export coverage for chargeback response packets.",
                TestLayer.E2E,
                testCase(
                        "Complete evidence packet exports with watermark",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.E2E,
                        Priority.HIGH,
                        RiskLevel.HIGH,
                        ReviewStatus.APPROVED,
                        89,
                        ConfidenceLevel.HIGH,
                        "Dispute case D-4187 has timeline, receipt, delivery proof, and customer messages.",
                        "PDF export includes every evidence section and watermark D-4187.",
                        List.of(
                                step(1, "Open dispute case D-4187.", "All evidence sections show complete."),
                                step(2, "Click Export packet.", "The export preview opens."),
                                step(3, "Download the packet.", "PDF includes watermark D-4187 and generated timestamp.")
                        ),
                        "Covers the main downstream handoff for dispute operations.",
                        "Given all evidence exists, When the packet exports, Then it includes required sections and watermark.",
                        "Priya Raman",
                        "Approved with watermark check."
                ),
                testCase(
                        "Missing delivery proof blocks export",
                        TestCaseType.NEGATIVE,
                        TestLayer.UI,
                        Priority.HIGH,
                        RiskLevel.MEDIUM,
                        ReviewStatus.APPROVED,
                        87,
                        ConfidenceLevel.HIGH,
                        "Dispute case D-5204 is missing delivery proof.",
                        "Export is blocked and the missing evidence list names delivery proof.",
                        List.of(
                                step(1, "Open dispute case D-5204.", "Delivery proof is marked missing."),
                                step(2, "Click Export packet.", "The export preflight runs."),
                                step(3, "Inspect the preflight panel.", "Delivery proof appears in missing evidence list.")
                        ),
                        "Prevents incomplete chargeback response packets.",
                        "Given delivery proof is missing, When export is requested, Then preflight blocks the packet.",
                        "Mina Haddad",
                        "Approved after evidence label update."
                ),
                testCase(
                        "Customer messages are ordered by sent timestamp",
                        TestCaseType.REGRESSION,
                        TestLayer.API,
                        Priority.MEDIUM,
                        RiskLevel.MEDIUM,
                        ReviewStatus.APPROVED,
                        85,
                        ConfidenceLevel.MEDIUM,
                        "Dispute case D-4187 includes 11 customer messages imported out of order.",
                        "Exported packet lists messages chronologically by sent timestamp.",
                        List.of(
                                step(1, "Request evidence packet preview for D-4187.", "HTTP 200 with message section."),
                                step(2, "Inspect message timestamps.", "Messages are sorted oldest to newest."),
                                step(3, "Compare imported order.", "The export order is independent of import sequence.")
                        ),
                        "Guards dispute readability when message import order is inconsistent.",
                        "Given messages arrive out of order, When packet preview is generated, Then message order follows sent timestamp.",
                        "Priya Raman",
                        "Approved for export regression."
                )
        ));
        disputeExport.addExportJob(exportJob("postman", ExportStatus.COMPLETED, "{\"cases\":3,\"format\":\"postman\"}"));
        project.addStory(disputeExport);

        project.addStory(story(
                "Product ops drafts payout threshold rule",
                StoryType.FEATURE_REQUEST,
                StoryStatus.DRAFT,
                "LEDGER-304",
                """
                As a product operations manager, I want to draft payout threshold rules so that finance can review policy changes before they affect merchant settlements.
                AC: draft rules do not affect live scoring.
                AC: reviewers see estimated impact before approval.
                AC: approved rules record the approving user and timestamp.
                """));

        return project;
    }

    private void seedAuditEvents() {
        Instant now = Instant.now();
        auditRepo.saveAll(List.of(
                auditEvent(now.minus(41, ChronoUnit.DAYS), "PROJECT_CREATED", "PROJECT", "HARBOR", "SUCCESS", "admin@testcaseiq.local", "ADMIN", "Created Harborlane Dispatch demo workspace."),
                auditEvent(now.minus(39, ChronoUnit.DAYS), "STORY_CREATED", "STORY", "HARBOR-101", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Added dispatcher resequencing story."),
                auditEvent(now.minus(37, ChronoUnit.DAYS), "STORY_ANALYSIS_REQUESTED", "STORY", "HARBOR-101", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Analyzed dock appointment resequencing criteria."),
                auditEvent(now.minus(34, ChronoUnit.DAYS), "TEST_GENERATION_REQUESTED", "STORY", "HARBOR-101", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Generated 3 dock appointment test cases."),
                auditEvent(now.minus(31, ChronoUnit.DAYS), "TEST_CASE_STATUS_CHANGED", "TEST_CASE", "Carrier notification timeout is surfaced", "SUCCESS", "admin@testcaseiq.local", "ADMIN", "Rejected carrier notification timeout test for split coverage."),
                auditEvent(now.minus(27, ChronoUnit.DAYS), "PROJECT_CREATED", "PROJECT", "WILLOW", "SUCCESS", "admin@testcaseiq.local", "ADMIN", "Created Willowbend Patient Portal workspace."),
                auditEvent(now.minus(24, ChronoUnit.DAYS), "TEST_CASE_STATUS_CHANGED", "TEST_CASE", "Unread abnormal result appears above routine message", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Approved abnormal lab result triage test."),
                auditEvent(now.minus(21, ChronoUnit.DAYS), "TESTS_EXPORTED", "TEST_SUITE", "WILLOW-202", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Exported triage inbox coverage as Playwright."),
                auditEvent(now.minus(18, ChronoUnit.DAYS), "PROJECT_CREATED", "PROJECT", "LEDGER", "SUCCESS", "admin@testcaseiq.local", "ADMIN", "Created Ledgerwell Payments Console workspace."),
                auditEvent(now.minus(15, ChronoUnit.DAYS), "STORY_ANALYSIS_REQUESTED", "STORY", "LEDGER-301", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Analyzed unsettled payout reconciliation story."),
                auditEvent(now.minus(12, ChronoUnit.DAYS), "TEST_GENERATION_REQUESTED", "STORY", "LEDGER-302", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Generated suspicious refund batch tests."),
                auditEvent(now.minus(9, ChronoUnit.DAYS), "TEST_CASE_STATUS_CHANGED", "TEST_CASE", "Hold cannot be saved without reason", "SUCCESS", "admin@testcaseiq.local", "ADMIN", "Rejected hold-reason test pending audit-event assertion."),
                auditEvent(now.minus(5, ChronoUnit.DAYS), "TESTS_EXPORTED", "TEST_SUITE", "LEDGER-303", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Exported dispute evidence packet coverage."),
                auditEvent(now.minus(2, ChronoUnit.DAYS), "USER_LOGIN_SUCCESS", "USER", "demo@testcaseiq.local", "SUCCESS", "demo@testcaseiq.local", "QA_ENGINEER", "Demo user reviewed the mid-sprint queue.")
        ));
    }

    private void backfillAuditDates() {
        Instant now = Instant.now();
        stamp("app_users", "email", "demo@testcaseiq.local", now.minus(42, ChronoUnit.DAYS), now.minus(2, ChronoUnit.DAYS));
        stamp("app_users", "email", "admin@testcaseiq.local", now.minus(42, ChronoUnit.DAYS), now.minus(9, ChronoUnit.DAYS));
        stamp("app_users", "email", "viewer@testcaseiq.local", now.minus(38, ChronoUnit.DAYS), now.minus(6, ChronoUnit.DAYS));

        stamp("projects", "project_key", "HARBOR", now.minus(41, ChronoUnit.DAYS), now.minus(4, ChronoUnit.DAYS));
        stamp("projects", "project_key", "WILLOW", now.minus(29, ChronoUnit.DAYS), now.minus(3, ChronoUnit.DAYS));
        stamp("projects", "project_key", "LEDGER", now.minus(18, ChronoUnit.DAYS), now.minus(1, ChronoUnit.DAYS));

        stampStory("HARBOR-101", now.minus(39, ChronoUnit.DAYS), now.minus(31, ChronoUnit.DAYS));
        stampStory("HARBOR-102", now.minus(36, ChronoUnit.DAYS), now.minus(29, ChronoUnit.DAYS));
        stampStory("HARBOR-103", now.minus(33, ChronoUnit.DAYS), now.minus(22, ChronoUnit.DAYS));
        stampStory("HARBOR-104", now.minus(25, ChronoUnit.DAYS), now.minus(25, ChronoUnit.DAYS));
        stampStory("WILLOW-201", now.minus(27, ChronoUnit.DAYS), now.minus(16, ChronoUnit.DAYS));
        stampStory("WILLOW-202", now.minus(24, ChronoUnit.DAYS), now.minus(12, ChronoUnit.DAYS));
        stampStory("WILLOW-203", now.minus(21, ChronoUnit.DAYS), now.minus(11, ChronoUnit.DAYS));
        stampStory("WILLOW-204", now.minus(17, ChronoUnit.DAYS), now.minus(17, ChronoUnit.DAYS));
        stampStory("LEDGER-301", now.minus(15, ChronoUnit.DAYS), now.minus(7, ChronoUnit.DAYS));
        stampStory("LEDGER-302", now.minus(12, ChronoUnit.DAYS), now.minus(3, ChronoUnit.DAYS));
        stampStory("LEDGER-303", now.minus(9, ChronoUnit.DAYS), now.minus(1, ChronoUnit.DAYS));
        stampStory("LEDGER-304", now.minus(5, ChronoUnit.DAYS), now.minus(5, ChronoUnit.DAYS));

        stampByTitle("test_cases", "Late appointment moves behind on-time trailer", now.minus(34, ChronoUnit.DAYS), now.minus(31, ChronoUnit.DAYS));
        stampByTitle("test_cases", "Resequence is blocked without a reason code", now.minus(34, ChronoUnit.DAYS), now.minus(19, ChronoUnit.DAYS));
        stampByTitle("test_cases", "Carrier notification timeout is surfaced", now.minus(34, ChronoUnit.DAYS), now.minus(31, ChronoUnit.DAYS));
        stampByTitle("test_cases", "Unread abnormal result appears above routine message", now.minus(21, ChronoUnit.DAYS), now.minus(14, ChronoUnit.DAYS));
        stampByTitle("test_cases", "High-risk refund batch is flagged for hold", now.minus(12, ChronoUnit.DAYS), now.minus(8, ChronoUnit.DAYS));
        stampByTitle("test_cases", "Hold cannot be saved without reason", now.minus(12, ChronoUnit.DAYS), now.minus(9, ChronoUnit.DAYS));
        stampByTitle("test_cases", "Complete evidence packet exports with watermark", now.minus(8, ChronoUnit.DAYS), now.minus(1, ChronoUnit.DAYS));
    }

    private void stampStory(String externalReference, Instant createdAt, Instant updatedAt) {
        stamp("stories", "external_reference", externalReference, createdAt, updatedAt);
    }

    private void stampByTitle(String table, String title, Instant createdAt, Instant updatedAt) {
        stamp(table, "title", title, createdAt, updatedAt);
    }

    private void stamp(String table, String column, String value, Instant createdAt, Instant updatedAt) {
        jdbcTemplate.update(
                "update " + table + " set created_at = ?, updated_at = ? where " + column + " = ?",
                Timestamp.from(createdAt),
                Timestamp.from(updatedAt),
                value
        );
    }

    private Story story(String title, StoryType type, StoryStatus status, String ref, String text) {
        Story story = new Story(title, type);
        story.setStatus(status);
        story.setExternalReference(ref);
        story.setStoryText(text.stripIndent().trim());
        return story;
    }

    private TestSuite suite(String name, String description, TestLayer layer, TestCase... testCases) {
        TestSuite suite = new TestSuite(name);
        suite.setDescription(description);
        suite.setTestLayer(layer);
        for (TestCase testCase : testCases) {
            suite.addTestCase(testCase);
        }
        return suite;
    }

    private TestCase testCase(
            String title,
            TestCaseType type,
            TestLayer layer,
            Priority priority,
            RiskLevel risk,
            ReviewStatus reviewStatus,
            int qualityScore,
            ConfidenceLevel confidence,
            String preconditions,
            String expectedResult,
            List<TestStep> steps,
            String rationale,
            String acceptanceCriteria,
            String reviewer,
            String reviewComment) {
        TestCase testCase = new TestCase(title, type);
        testCase.setDescription(rationale);
        testCase.setTestLayer(layer);
        testCase.setPriority(priority);
        testCase.setRiskLevel(risk);
        testCase.setReviewStatus(reviewStatus);
        testCase.setQualityScore(qualityScore);
        testCase.setConfidenceLevel(confidence);
        testCase.setPreconditions(preconditions);
        testCase.setExpectedResult(expectedResult);
        testCase.setGenerationRationale(rationale);
        testCase.setLinkedAcceptanceCriteriaText(acceptanceCriteria);
        testCase.setAutomationCandidate(layer == TestLayer.API || reviewStatus == ReviewStatus.APPROVED);
        steps.forEach(testCase::addStep);
        if (reviewer != null) {
            testCase.addReviewEvent(reviewEvent(reviewStatus, reviewer, reviewComment));
        }
        return testCase;
    }

    private TestStep step(int order, String action, String expectedResult) {
        return new TestStep(order, action, expectedResult);
    }

    private ReviewEvent reviewEvent(ReviewStatus status, String reviewer, String comment) {
        ReviewEvent event = new ReviewEvent(status, reviewer);
        event.setActionType("STATUS_CHANGE");
        event.setPreviousValue(status == ReviewStatus.APPROVED ? "NEEDS_REVIEW" : "DRAFT");
        event.setNewValue(status.name());
        if (comment != null) {
            event.setComment(comment);
        }
        return event;
    }

    private ExportJob exportJob(String type, ExportStatus status, String detailsJson) {
        ExportJob exportJob = new ExportJob(type);
        exportJob.setStatus(status);
        exportJob.setExportDetailsJson(detailsJson);
        return exportJob;
    }

    private AuditEvent auditEvent(
            Instant timestamp,
            String action,
            String resourceType,
            String resourceId,
            String outcome,
            String actorEmail,
            String actorRole,
            String summary) {
        AuditEvent event = new AuditEvent(action, resourceType, resourceId, outcome, summary);
        event.setTimestamp(timestamp);
        event.setActorEmail(actorEmail);
        event.setActorRole(actorRole);
        return event;
    }
}
