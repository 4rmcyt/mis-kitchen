Feature: Today Screen Progress

  Background:
    Given I am logged in as cook

  Scenario: Progress ring shows 0% when no tasks done
    When I open the Today screen
    And not all Opening tasks are done
    Then the progress ring should show low completion

  Scenario: Add task button is always visible
    When I open the Today screen
    Then the add task button should be visible
