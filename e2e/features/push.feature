Feature: Push notification subscription

  Background:
    Given I am on the login page

  Scenario: Push subscription is saved to DB after admin login
    When I log in as admin
    Then the app saves a push subscription to the database for the admin user
    And the Push tab shows at least one subscribed device
