Feature: T-shaped skills tracker

  Background:
    Given I am logged in as admin

  Scenario: Admin can see coverage matrix in People tab
    When I navigate to Admin People tab
    Then I should see the coverage matrix

  Scenario: Admin can assign secondary station to a user
    When I navigate to Admin People tab
    And I open the first user in the list
    Then I should see the secondary stations selector
