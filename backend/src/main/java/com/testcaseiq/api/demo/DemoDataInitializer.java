package com.testcaseiq.api.demo;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.audit.AuditEvent;
import com.testcaseiq.api.audit.AuditEventRepository;
import com.testcaseiq.api.domain.enums.ConfidenceLevel;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;
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

/**
 * Loads realistic demo seed data when the "demo" Spring profile is active.
 * Idempotent: skips if any user accounts already exist.
 * Activate with: --spring.profiles.active=demo
 */
@Component
@Profile("demo")
public class DemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private final UserAccountRepository userRepo;
    private final ProjectRepository projectRepo;
    private final AuditEventRepository auditRepo;
    private final PasswordEncoder passwordEncoder;

    public DemoDataInitializer(
            UserAccountRepository userRepo,
            ProjectRepository projectRepo,
            AuditEventRepository auditRepo,
            PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.projectRepo = projectRepo;
        this.auditRepo = auditRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepo.count() > 0) {
            log.info("[Demo] Seed data already present — skipping initialization.");
            return;
        }
        log.info("[Demo] Seeding demo data...");
        seedUsers();
        seedProjects();
        seedAuditEvents();
        log.info("[Demo] Demo data loaded: 3 users, 3 projects, 6 stories, 4 test suites, 9 test cases.");
    }

    // -------------------------------------------------------------------------
    // Users
    // -------------------------------------------------------------------------

    private void seedUsers() {
        String hash = passwordEncoder.encode("demo123!");
        userRepo.saveAll(List.of(
            new UserAccount("Alice Admin",    "admin@demo.testcaseiq.io",  hash, UserRole.ADMIN),
            new UserAccount("Quinn QA",       "qa@demo.testcaseiq.io",     hash, UserRole.QA_ENGINEER),
            new UserAccount("Victor Viewer",  "viewer@demo.testcaseiq.io", hash, UserRole.VIEWER)
        ));
    }

    // -------------------------------------------------------------------------
    // Projects (saved via ProjectRepository; stories/suites/cases cascade)
    // -------------------------------------------------------------------------

    private void seedProjects() {
        projectRepo.save(buildEcommerceProject());
        projectRepo.save(buildBankingProject());
        projectRepo.save(buildHrProject());
    }

    private Project buildEcommerceProject() {
        Project p = new Project("E-commerce Platform QA", "ECOM");
        p.setDescription("QA coverage for the customer-facing shopping experience: cart, checkout, payment, and account management.");

        // Story 1 — Checkout (TESTS_GENERATED) --------------------------------
        Story checkout = story("User can checkout using a saved payment method", StoryType.USER_STORY,
            StoryStatus.TESTS_GENERATED, "ECOM-101",
            """
            As a returning customer, I want to checkout using my saved credit card \
            so I can complete purchases without re-entering payment details.
            AC: successful charge creates order; expired card shows clear error; empty cart redirects with message.""");

        TestSuite checkoutSuite = suite("Checkout Flow — Functional & Negative Tests",
            "End-to-end coverage for payment processing and cart boundary conditions.", TestLayer.E2E);

        TestCase tc1 = testCase("Successful checkout with saved credit card", TestCaseType.FUNCTIONAL,
            TestLayer.E2E, Priority.HIGH, RiskLevel.HIGH, ReviewStatus.APPROVED, 92, ConfidenceLevel.HIGH,
            "User is logged in; saved credit card on file; cart has ≥1 item.",
            "Order placed; confirmation number displayed; confirmation email sent.");
        tc1.addStep(step(1, "Navigate to cart with at least one item.", "Cart page shows items and subtotal."));
        tc1.addStep(step(2, "Click 'Proceed to Checkout'.", "Checkout page loads with saved card pre-selected."));
        tc1.addStep(step(3, "Confirm order without changing payment.", "HTTP 200; order confirmation page displays order number."));
        tc1.addReviewEvent(reviewEvent(ReviewStatus.APPROVED, "qa@demo.testcaseiq.io", null));
        tc1.setAutomationCandidate(true);

        TestCase tc2 = testCase("Checkout fails gracefully with expired credit card", TestCaseType.NEGATIVE,
            TestLayer.E2E, Priority.HIGH, RiskLevel.HIGH, ReviewStatus.APPROVED, 88, ConfidenceLevel.HIGH,
            "User's default card is expired; cart has ≥1 item.",
            "Payment declined; user-friendly error shown; cart preserved.");
        tc2.addStep(step(1, "Navigate to checkout — expired card is highlighted as default.", "Checkout page shows card expiry warning."));
        tc2.addStep(step(2, "Click 'Confirm Order'.", "System attempts charge."));
        tc2.addStep(step(3, "Observe response.", "Error: 'Your payment method has expired. Please update your card.' Cart not cleared."));
        ReviewEvent rejectedTc2 = reviewEvent(ReviewStatus.REJECTED, "admin@demo.testcaseiq.io",
            "Step 2 must verify that the expired-card indicator is visible before clicking Confirm.");
        tc2.addReviewEvent(rejectedTc2);
        ReviewEvent approvedTc2 = reviewEvent(ReviewStatus.APPROVED, "qa@demo.testcaseiq.io", "Updated per feedback.");
        tc2.addReviewEvent(approvedTc2);
        tc2.setAutomationCandidate(true);

        TestCase tc3 = testCase("Checkout redirects when cart is empty", TestCaseType.BOUNDARY,
            TestLayer.E2E, Priority.MEDIUM, RiskLevel.MEDIUM, ReviewStatus.NEEDS_REVIEW, 74, ConfidenceLevel.MEDIUM,
            "User is logged in; cart is empty.",
            "User redirected to /cart with message 'Your cart is empty.'");
        tc3.addStep(step(1, "Navigate directly to /checkout with an empty cart.", "Browser sends GET /checkout."));
        tc3.addStep(step(2, "Observe redirect.", "Redirect to /cart; inline message: 'Your cart is empty. Continue shopping.'"));
        tc3.setAutomationCandidate(false);

        checkoutSuite.addTestCase(tc1);
        checkoutSuite.addTestCase(tc2);
        checkoutSuite.addTestCase(tc3);
        checkout.addTestSuite(checkoutSuite);
        p.addStory(checkout);

        // Story 2 — Registration (ANALYZED, no test suite yet) ----------------
        Story registration = story("New users can self-register an account", StoryType.USER_STORY,
            StoryStatus.ANALYZED, "ECOM-102",
            """
            As a new visitor, I want to create an account with email and password \
            so I can track orders and save payment preferences.
            AC: unique email creates account; duplicate email shows inline error; weak password shows strength hint.""");
        p.addStory(registration);

        return p;
    }

    private Project buildBankingProject() {
        Project p = new Project("Banking API QA", "BANK");
        p.setDescription("API-level quality assurance for core banking operations: fund transfers, authentication, and account lifecycle.");

        // Story 1 — Fund Transfer (REVIEWED) ----------------------------------
        Story transfer = story("Transfer funds between accounts via REST API", StoryType.API_SPECIFICATION,
            StoryStatus.REVIEWED, "BANK-201",
            """
            As the banking API, I need to support fund transfers \
            so that customers and systems can move money securely.
            AC: 201 on valid transfer; 422/INSUFFICIENT_FUNDS on low balance; 422/ACCOUNT_INACTIVE for inactive account; 400 on invalid IDs or zero amount.""");

        TestSuite transferSuite = suite("Fund Transfer API — Contract Tests",
            "REST contract tests for POST /transfers: happy path, error codes, and boundary values.", TestLayer.API);

        TestCase at1 = testCase("Successful fund transfer between active accounts", TestCaseType.API,
            TestLayer.API, Priority.CRITICAL, RiskLevel.HIGH, ReviewStatus.APPROVED, 95, ConfidenceLevel.HIGH,
            "Account A (acc-001) balance: £5,000. Account B (acc-002) balance: £1,000. Both active.",
            "HTTP 201; acc-001 balance £4,000; acc-002 balance £2,000; transfer record persisted.");
        at1.addStep(step(1, "POST /api/transfers { fromAccountId:'acc-001', toAccountId:'acc-002', amount:1000, currency:'GBP' }",
            "HTTP 201 Created with transferId in body."));
        at1.addStep(step(2, "GET /api/accounts/acc-001", "Balance: 4000.00"));
        at1.addStep(step(3, "GET /api/accounts/acc-002", "Balance: 2000.00"));
        at1.addReviewEvent(reviewEvent(ReviewStatus.APPROVED, "admin@demo.testcaseiq.io", null));
        at1.setAutomationCandidate(true);

        TestCase at2 = testCase("Transfer rejected with INSUFFICIENT_FUNDS error", TestCaseType.NEGATIVE,
            TestLayer.API, Priority.HIGH, RiskLevel.HIGH, ReviewStatus.APPROVED, 93, ConfidenceLevel.HIGH,
            "Account A balance: £100. Transfer amount: £500.",
            "HTTP 422; body.errorCode = 'INSUFFICIENT_FUNDS'; both balances unchanged.");
        at2.addStep(step(1, "POST /api/transfers with amount (500) exceeding source balance (100).", "Server processes request."));
        at2.addStep(step(2, "Assert response.", "HTTP 422; { errorCode:'INSUFFICIENT_FUNDS', message:'Insufficient funds in source account.' }"));
        at2.addStep(step(3, "Confirm balances unchanged via GET.", "acc-001 still £100; acc-002 unchanged."));
        at2.addReviewEvent(reviewEvent(ReviewStatus.APPROVED, "qa@demo.testcaseiq.io", null));
        at2.setAutomationCandidate(true);

        TestCase at3 = testCase("Transfer rejected for inactive destination account", TestCaseType.NEGATIVE,
            TestLayer.API, Priority.HIGH, RiskLevel.HIGH, ReviewStatus.REJECTED, 76, ConfidenceLevel.MEDIUM,
            "Source account active, sufficient balance. Destination acc-closed is inactive.",
            "HTTP 422; body.errorCode = 'ACCOUNT_INACTIVE'.");
        at3.addStep(step(1, "POST /api/transfers targeting inactive destination account.", "Request submitted."));
        at3.addStep(step(2, "Assert HTTP 422 and ACCOUNT_INACTIVE error code.", "Response matches expected error contract."));
        at3.addReviewEvent(reviewEvent(ReviewStatus.REJECTED, "admin@demo.testcaseiq.io",
            "Preconditions must distinguish 'suspended' from 'closed' accounts — these have different error codes. Split into two separate test cases."));
        at3.setAutomationCandidate(true);

        transferSuite.addTestCase(at1);
        transferSuite.addTestCase(at2);
        transferSuite.addTestCase(at3);
        transfer.addTestSuite(transferSuite);
        p.addStory(transfer);

        // Story 2 — MFA (TESTS_GENERATED) -------------------------------------
        Story mfa = story("Users authenticate using multi-factor authentication (TOTP)", StoryType.USER_STORY,
            StoryStatus.TESTS_GENERATED, "BANK-202",
            """
            As a banking customer, I want TOTP as a second factor \
            so my account is protected even if my password is compromised.
            AC: valid TOTP grants session token; expired code rejected; 3 consecutive failures lock the account.""");

        TestSuite mfaSuite = suite("MFA Authentication — Security Tests",
            "Security and functional tests for TOTP-based multi-factor authentication.", TestLayer.E2E);

        TestCase mfa1 = testCase("Valid TOTP code grants session token", TestCaseType.FUNCTIONAL,
            TestLayer.E2E, Priority.CRITICAL, RiskLevel.HIGH, ReviewStatus.APPROVED, 94, ConfidenceLevel.HIGH,
            "User has MFA enabled. Valid TOTP code is available for this 30-second window.",
            "HTTP 200; response includes { token:'...', mfaVerified:true }.");
        mfa1.addStep(step(1, "POST /api/auth/login with valid credentials.", "Server returns MFA challenge token."));
        mfa1.addStep(step(2, "POST /api/auth/mfa/verify with challenge token + current TOTP code.", "Server validates TOTP."));
        mfa1.addStep(step(3, "Assert response.", "HTTP 200; body.mfaVerified = true; session token issued."));
        mfa1.addReviewEvent(reviewEvent(ReviewStatus.APPROVED, "admin@demo.testcaseiq.io", null));
        mfa1.setAutomationCandidate(true);

        TestCase mfa2 = testCase("Account locked after three consecutive failed TOTP attempts", TestCaseType.NEGATIVE,
            TestLayer.E2E, Priority.CRITICAL, RiskLevel.HIGH, ReviewStatus.APPROVED, 91, ConfidenceLevel.HIGH,
            "User has MFA enabled and holds a valid MFA challenge token.",
            "After 3 invalid TOTP submissions: HTTP 423 Locked with { lockedUntil:'<timestamp>' }.");
        mfa2.addStep(step(1, "POST /api/auth/mfa/verify with invalid TOTP (attempt 1).", "HTTP 401."));
        mfa2.addStep(step(2, "POST /api/auth/mfa/verify with invalid TOTP (attempt 2).", "HTTP 401."));
        mfa2.addStep(step(3, "POST /api/auth/mfa/verify with invalid TOTP (attempt 3).", "HTTP 401."));
        mfa2.addStep(step(4, "POST /api/auth/mfa/verify with any code (attempt 4).", "HTTP 423 Locked; body.lockedUntil is a future timestamp."));
        mfa2.addReviewEvent(reviewEvent(ReviewStatus.APPROVED, "qa@demo.testcaseiq.io", null));
        mfa2.setAutomationCandidate(true);

        mfaSuite.addTestCase(mfa1);
        mfaSuite.addTestCase(mfa2);
        mfa.addTestSuite(mfaSuite);
        p.addStory(mfa);

        return p;
    }

    private Project buildHrProject() {
        Project p = new Project("HR System QA", "HRSYS");
        p.setDescription("QA coverage for employee lifecycle management: digital onboarding, leave requests, and performance reviews.");

        // Story 1 — Onboarding (TESTS_GENERATED) ------------------------------
        Story onboarding = story("New employee completes digital onboarding checklist", StoryType.USER_STORY,
            StoryStatus.TESTS_GENERATED, "HRSYS-301",
            """
            As a new hire, I want to complete my onboarding checklist digitally \
            so I can start work without paper-based processes.
            AC: first login shows checklist; all items complete triggers manager notification; partial submit lists outstanding items.""");

        TestSuite onboardingSuite = suite("Employee Onboarding — Workflow Tests",
            "E2E tests for the new hire digital onboarding flow from first login to manager notification.", TestLayer.E2E);

        TestCase ob1 = testCase("New hire sees onboarding checklist on first login", TestCaseType.FUNCTIONAL,
            TestLayer.E2E, Priority.HIGH, RiskLevel.MEDIUM, ReviewStatus.DRAFT, 82, ConfidenceLevel.MEDIUM,
            "Account with role EMPLOYEE_NEW_HIRE exists. Account has never been logged into.",
            "After login, the onboarding checklist page is the landing page (not the standard dashboard).");
        ob1.addStep(step(1, "Log in with new hire credentials.", "Login succeeds."));
        ob1.addStep(step(2, "Observe landing page.", "Onboarding checklist is displayed. Standard dashboard is NOT shown."));
        ob1.addStep(step(3, "Verify checklist items.", "Shows: Profile Setup, Emergency Contacts, IT Equipment, Policy Acknowledgement, Direct Debit Setup."));
        ob1.setAutomationCandidate(true);

        TestCase ob2 = testCase("Submitting incomplete onboarding lists outstanding items", TestCaseType.NEGATIVE,
            TestLayer.E2E, Priority.MEDIUM, RiskLevel.LOW, ReviewStatus.DRAFT, 77, ConfidenceLevel.MEDIUM,
            "New hire has completed Profile Setup and Emergency Contacts only (2 of 5 items).",
            "Validation message lists the 3 incomplete items. Form does not submit.");
        ob2.addStep(step(1, "Navigate to onboarding checklist with 2 of 5 items checked.", "Checklist shows partial completion."));
        ob2.addStep(step(2, "Click 'Submit Onboarding'.", "System validates checklist."));
        ob2.addStep(step(3, "Observe validation.", "Message: 'Please complete all required items. Outstanding: IT Equipment, Policy Acknowledgement, Direct Debit Setup.'"));
        ob2.setAutomationCandidate(false);

        onboardingSuite.addTestCase(ob1);
        onboardingSuite.addTestCase(ob2);
        onboarding.addTestSuite(onboardingSuite);
        p.addStory(onboarding);

        // Story 2 — Leave Request (DRAFT, no tests yet) -----------------------
        Story leave = story("Employee submits annual leave request for manager approval", StoryType.USER_STORY,
            StoryStatus.DRAFT, "HRSYS-302",
            """
            As an employee, I want to submit a leave request with dates and type \
            so my manager can approve or reject my time off.
            AC: valid dates appear in manager queue; overlapping dates show conflict warning; approval deducts leave balance.""");
        p.addStory(leave);

        return p;
    }

    // -------------------------------------------------------------------------
    // Audit events
    // -------------------------------------------------------------------------

    private void seedAuditEvents() {
        auditRepo.saveAll(List.of(
            auditEvent("USER_LOGIN_SUCCESS",       "USER",       null,           "SUCCESS", "admin@demo.testcaseiq.io", "ADMIN",       "Admin user logged in."),
            auditEvent("USER_LOGIN_SUCCESS",       "USER",       null,           "SUCCESS", "qa@demo.testcaseiq.io",    "QA_ENGINEER", "QA engineer logged in."),
            auditEvent("PROJECT_CREATED",          "PROJECT",    "ECOM",         "SUCCESS", "admin@demo.testcaseiq.io", "ADMIN",       "Created project: E-commerce Platform QA"),
            auditEvent("PROJECT_CREATED",          "PROJECT",    "BANK",         "SUCCESS", "admin@demo.testcaseiq.io", "ADMIN",       "Created project: Banking API QA"),
            auditEvent("PROJECT_CREATED",          "PROJECT",    "HRSYS",        "SUCCESS", "qa@demo.testcaseiq.io",    "QA_ENGINEER", "Created project: HR System QA"),
            auditEvent("STORY_CREATED",            "STORY",      "ECOM-101",     "SUCCESS", "qa@demo.testcaseiq.io",    "QA_ENGINEER", "Added story: User can checkout using a saved payment method"),
            auditEvent("STORY_ANALYSIS_REQUESTED", "STORY",      "ECOM-101",     "SUCCESS", "qa@demo.testcaseiq.io",    "QA_ENGINEER", "Story analysis completed for ECOM-101"),
            auditEvent("TEST_GENERATION_REQUESTED","STORY",      "ECOM-101",     "SUCCESS", "qa@demo.testcaseiq.io",    "QA_ENGINEER", "AI test generation completed for ECOM-101 — 3 test cases generated"),
            auditEvent("TEST_CASE_STATUS_CHANGED", "TEST_CASE",  "ECOM-101-TC1", "SUCCESS", "admin@demo.testcaseiq.io", "ADMIN",       "Approved: Successful checkout with saved credit card"),
            auditEvent("TEST_GENERATION_REQUESTED","STORY",      "BANK-201",     "SUCCESS", "qa@demo.testcaseiq.io",    "QA_ENGINEER", "AI test generation completed for BANK-201 — 3 test cases generated"),
            auditEvent("TEST_CASE_STATUS_CHANGED", "TEST_CASE",  "BANK-201-TC1", "SUCCESS", "admin@demo.testcaseiq.io", "ADMIN",       "Approved: Successful fund transfer between active accounts"),
            auditEvent("TEST_CASE_STATUS_CHANGED", "TEST_CASE",  "BANK-201-TC3", "SUCCESS", "admin@demo.testcaseiq.io", "ADMIN",       "Rejected: Transfer to inactive account — requires split into suspended vs. closed cases"),
            auditEvent("TESTS_EXPORTED",           "TEST_SUITE", "BANK-201",     "SUCCESS", "qa@demo.testcaseiq.io",    "QA_ENGINEER", "Exported approved banking API test cases as Postman collection"),
            auditEvent("USER_LOGIN_SUCCESS",       "USER",       null,           "SUCCESS", "viewer@demo.testcaseiq.io","VIEWER",      "Viewer accessed the platform.")
        ));
    }

    // -------------------------------------------------------------------------
    // Factories
    // -------------------------------------------------------------------------

    private Story story(String title, StoryType type, StoryStatus status, String ref, String text) {
        Story s = new Story(title, type);
        s.setStatus(status);
        s.setExternalReference(ref);
        s.setStoryText(text.stripIndent());
        return s;
    }

    private TestSuite suite(String name, String description, TestLayer layer) {
        TestSuite ts = new TestSuite(name);
        ts.setDescription(description);
        ts.setTestLayer(layer);
        return ts;
    }

    private TestCase testCase(String title, TestCaseType type, TestLayer layer,
                               Priority priority, RiskLevel risk, ReviewStatus reviewStatus,
                               int qualityScore, ConfidenceLevel confidence,
                               String preconditions, String expectedResult) {
        TestCase tc = new TestCase(title, type);
        tc.setTestLayer(layer);
        tc.setPriority(priority);
        tc.setRiskLevel(risk);
        tc.setReviewStatus(reviewStatus);
        tc.setQualityScore(qualityScore);
        tc.setConfidenceLevel(confidence);
        tc.setPreconditions(preconditions);
        tc.setExpectedResult(expectedResult);
        return tc;
    }

    private TestStep step(int order, String action, String expectedResult) {
        return new TestStep(order, action, expectedResult);
    }

    private ReviewEvent reviewEvent(ReviewStatus status, String reviewer, String comment) {
        ReviewEvent re = new ReviewEvent(status, reviewer);
        if (comment != null) re.setComment(comment);
        return re;
    }

    private AuditEvent auditEvent(String action, String resourceType, String resourceId,
                                   String outcome, String actorEmail, String actorRole, String summary) {
        AuditEvent e = new AuditEvent(action, resourceType, resourceId, outcome, summary);
        e.setActorEmail(actorEmail);
        e.setActorRole(actorRole);
        return e;
    }
}
