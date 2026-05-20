Feature: Admin Template Management

  Background:
    Given I am logged in as admin
    And I navigate to Admin Tasks tab

  Scenario: Admin can create a new template
    When I click "New Template"
    And I fill in template name "E2E Test Template"
    And I save the template
    Then I should see "E2E Test Template" in the templates list

  Scenario: Admin can add an entry to a template
    When I open template "Grill Default"
    And I fill in entry text "E2E test task"
    And I select entry station "Grill"
    And I select entry section "Opening"
    And I click Add entry
    Then I should see "E2E test task" in the template entries

  Scenario: Admin can delete a template
    When I open template "E2E Test Template"
    And I click delete template
    Then I should not see "E2E Test Template" in the templates list
