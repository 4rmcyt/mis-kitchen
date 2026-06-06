Feature: ROTA schedule builder
  As an admin
  I want to manage weekly staff schedules
  So I can plan shifts for the team

  Background:
    Given I am logged in as admin

  Scenario: Navigate to Rota tab
    When I navigate to the admin panel
    And I click the "Schedule" tab
    Then I should see the weekly rota grid

  Scenario: Weekly grid shows 7 days
    When I navigate to the admin panel
    And I click the "Schedule" tab
    Then I should see 7 day columns in the rota

  Scenario: Week navigation
    When I navigate to the admin panel
    And I click the "Schedule" tab
    And I click the "Next" week button
    Then I should see the next week dates
