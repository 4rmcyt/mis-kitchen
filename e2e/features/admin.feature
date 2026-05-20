Feature: Admin Panel

  Background:
    Given I am logged in as admin

  Scenario: Admin can access admin panel
    When I click the ADMIN button
    Then I should see the Admin panel
    And I should see the People tab

  Scenario: Admin can see people list
    When I navigate to Admin People tab
    Then I should see a list of users

  Scenario: Admin can navigate to Tasks tab
    When I navigate to Admin Tasks tab
    Then I should see the templates list

  Scenario: Admin can navigate to Recipes tab
    When I navigate to Admin Recipes tab
    Then I should see the recipes list
