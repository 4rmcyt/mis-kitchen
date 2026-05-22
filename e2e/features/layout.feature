Feature: Mobile layout

  Background:
    Given I am logged in as cook

  Scenario: Bottom nav is fully visible on mobile
    When I open the Today screen
    Then the bottom nav should be fully visible
    And all nav buttons should be visible and not clipped

  Scenario: Station filter shows all stations on mobile
    When I open the Today screen
    Then the station filter should show all stations
    And no station pill should be clipped

  Scenario: Header logout button is visible on mobile
    When I open the Today screen
    Then the logout button should be visible and not clipped
