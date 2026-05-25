Feature: Admin Recipe Management

  Background:
    Given I am logged in as admin
    And I navigate to Admin Recipes tab

  Scenario: Admin can create a new recipe with ingredients
    When I click "New Recipe"
    And I fill in recipe name "E2E Test Recipe"
    And I add ingredient "Flour" with amount "500" and unit "g"
    And I add ingredient "Water" with amount "300" and unit "ml"
    And I save the recipe
    Then I should see "E2E Test Recipe" in the recipes list

  Scenario: Admin can edit ingredient name and amount
    When I open recipe "E2E Test Recipe"
    And I click edit recipe
    And I change ingredient 1 name to "Wheat Flour"
    And I change ingredient 1 amount to "600"
    And I save the recipe
    Then I open recipe "E2E Test Recipe"
    And I click edit recipe
    And I should see ingredient "Wheat Flour" with amount "600"

  Scenario: Admin can reorder ingredients
    When I open recipe "E2E Test Recipe"
    And I click edit recipe
    And I move ingredient 1 down
    And I save the recipe
    Then I open recipe "E2E Test Recipe"
    And I click edit recipe
    And ingredient 1 should be "Water"

  Scenario: Admin can rename recipe
    When I open recipe "E2E Test Recipe"
    And I change the recipe name to "E2E Test Recipe Updated"
    And I save the recipe
    Then I should see "E2E Test Recipe Updated" in the recipes list

  Scenario: Admin can delete a recipe
    When I open recipe "E2E Test Recipe Updated"
    And I click delete recipe
    Then I should not see "E2E Test Recipe Updated" in the recipes list
