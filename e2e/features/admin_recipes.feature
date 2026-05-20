Feature: Admin Recipe Management

  Background:
    Given I am logged in as admin
    And I navigate to Admin Recipes tab

  Scenario: Admin can create a new recipe
    When I click "New Recipe"
    And I fill in recipe name "E2E Test Recipe"
    And I save the recipe
    Then I should see "E2E Test Recipe" in the recipes list

  Scenario: Admin can edit a recipe
    When I open recipe "E2E Test Recipe"
    And I change the recipe name to "E2E Test Recipe Updated"
    And I save the recipe
    Then I should see "E2E Test Recipe Updated" in the recipes list

  Scenario: Admin can delete a recipe
    When I open recipe "E2E Test Recipe Updated"
    And I click delete recipe
    Then I should not see "E2E Test Recipe Updated" in the recipes list
