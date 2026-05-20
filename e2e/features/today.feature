Feature: Today Screen

  Background:
    Given I am logged in as cook

  Scenario: Tasks load automatically for today
    When I open the Today screen
    Then I should see tasks on the screen
    And I should see Opening section
    And I should see Closing section

  Scenario: Cook can complete a task
    When I open the Today screen
    And I tap the first task
    Then that task should be marked as done

  Scenario: Cook can filter by station
    When I open the Today screen
    And I select station "Grill"
    Then I should only see Grill tasks

  Scenario: Cook can switch to tomorrow
    When I open the Today screen
    And I tap "Tmrw"
    Then I should see tomorrow's date in the header
