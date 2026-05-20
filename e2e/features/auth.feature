Feature: Authentication

  Scenario: Admin can log in
    Given I am on the login page
    When I log in as admin
    Then I should see the Today screen
    And I should see the ADMIN button

  Scenario: Cook can log in
    Given I am on the login page
    When I log in as cook
    Then I should see the Today screen
    And I should not see the ADMIN button

  Scenario: Invalid credentials show error
    Given I am on the login page
    When I enter email "wrong@email.com" and password "wrongpass"
    And I click Sign In
    Then I should see a login error
