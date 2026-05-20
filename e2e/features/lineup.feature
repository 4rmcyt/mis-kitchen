Feature: Lineup Screen

  Background:
    Given I am logged in as cook

  Scenario: Lineup shows crew grouped by station
    When I navigate to Lineup tab
    Then I should see staff grouped by station

  Scenario: Each station section has a count
    When I navigate to Lineup tab
    Then each station should show a staff count
