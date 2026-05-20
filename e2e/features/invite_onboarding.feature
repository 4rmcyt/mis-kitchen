Feature: Invite and Onboarding

  Scenario: Admin can invite a new cook
    Given I am logged in as admin
    When I navigate to Admin People tab
    And I fill in invite email "e2e-test-cook@mis-kitchen.test"
    And I select invite role "cook"
    And I select invite station "Grill"
    And I click Send Invite
    Then I should see invite confirmation for "e2e-test-cook@mis-kitchen.test"

  Scenario: Invited user receives email with onboarding link
    Given an invite was sent to "e2e-test-cook@mis-kitchen.test"
    Then Mailtrap should receive an email to "e2e-test-cook@mis-kitchen.test"
    And the email should contain an invite link

  Scenario: Invited user completes onboarding
    Given an invite was sent to "e2e-test-cook@mis-kitchen.test"
    When I follow the invite link from the email
    Then I should see the password setup screen
    When I set password "TestPass@2026"
    Then I should see the welcome screen
    When I proceed through onboarding with name "E2E Cook" and station "Grill"
    Then I should see the Today screen
    And I should not see the ADMIN button
