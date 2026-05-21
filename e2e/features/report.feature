Feature: End of Shift Report

  Background:
    Given I am logged in as cook

  Scenario: Cook can open report modal when tasks exist
    When I open the Today screen
    Then I should see the report button

  Scenario: Cook can send end of shift report
    When I open the Today screen
    And I click the report button
    Then I should see the report modal
    And I should see my completion percentage
    When I click Send Report
    Then I should see report sent confirmation
