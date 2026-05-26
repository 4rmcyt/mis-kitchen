Feature: Velocity Tab

  Background:
    Given I am logged in as admin

  Scenario: Admin can navigate to Velocity tab
    When I navigate to Admin Velocity tab
    Then I should see the velocity tab

  Scenario: Velocity tab shows empty state without data
    When I navigate to Admin Velocity tab
    Then I should see the velocity empty state or heatmap
