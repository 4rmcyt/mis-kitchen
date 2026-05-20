Feature: Recipes Screen

  Background:
    Given I am logged in as cook

  Scenario: Recipes load on screen
    When I navigate to Recipes tab
    Then I should see the recipes grid

  Scenario: Cook can search recipes
    When I navigate to Recipes tab
    And I type "Beurre" in the recipe search
    Then I should only see recipes matching "Beurre"

  Scenario: Cook can open a recipe detail
    When I navigate to Recipes tab
    And I tap the first recipe card
    Then I should see the recipe detail view
    And I should see ingredients list

  Scenario: Cook can adjust recipe multiplier
    When I navigate to Recipes tab
    And I tap the first recipe card
    And I increase the multiplier
    Then I should see updated quantities
