Feature: Invite and Onboarding

  Scenario: Admin can generate an invite link
    Given I am logged in as admin
    When I navigate to Admin People tab
    And I click "+ Invite"
    And I select invite role "cook"
    And I select invite station "Grill"
    And I click Generate Link
    Then I should see a copyable invite link

  Scenario: Invited user completes onboarding via link
    Given a token-based invite link exists for role "cook" and station "Grill"
    When I open the invite link
    Then I should see the join page
    When I fill in join form with name "E2E Cook", email "e2e-test-cook@mis-kitchen.test", password "TestPass@2026"
    And I submit the join form
    Then I should be signed in as a cook
    And I should not see the ADMIN button
