Feature: Add Task

  Background:
    Given I am logged in as cook

  Scenario: Cook can open add task modal
    When I open the Today screen
    And I tap the add task button
    Then I should see the add task modal

  Scenario: Cook can add a manual task
    When I open the Today screen
    And I tap the add task button
    And I fill in task text "Test manual task"
    And I submit the task form
    Then I should see "Test manual task" in the task list

  Scenario: Add task button is visible on Today screen
    When I open the Today screen
    Then I should see the add task button
