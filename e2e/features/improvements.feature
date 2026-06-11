Feature: Improvement Log

  Background:
    Given I am logged in as admin

  Scenario: Admin can navigate to Wins tab
    When I navigate to Admin Wins tab
    Then I should see the improvements tab

  Scenario: Admin can post an improvement
    When I navigate to Admin Wins tab
    And I post an improvement "E2E Reduced opening checklist time by 5 minutes"
    Then I should see the improvement in the list
