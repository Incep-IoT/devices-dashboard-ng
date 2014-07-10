'use strict';

angular.module('lelylan.dashboards.device')
  .controller('MainCtrl', function ($scope, $rootScope, $timeout, $q, $location, $cacheFactory, Device, Type, Category, AccessToken, Dimension, Column, Menu) {


    /*
     * Configs
     */

    // Flag telling us if the demo mode is active
    $scope.demo = !!($location.absUrl().match(/demo/));
    console.log("DEMO", $scope.demo);

    // App dimensions (to fit the page)
    $scope.dimensions = Dimension.get();

    // Visible columns
    $scope.columns = Column.get();

    // Visible menu (on the left)
    $scope.menu = Menu.get();



    /*
     * OAuth
     */

    $scope.credentials = {
      site: 'http://people.lelylan.com',
      clientId: "e72c43c75adc9665e4d4c13354c41f337d5a2e439d3da1243bb47e39745f435c",
      redirectUri: "http://localhost:9000/",
      profileUri: "http://api.lelylan.com/me"
    };

    $timeout(function() {
      var logged = !!AccessToken.get();

      if (!$scope.demo) {
        if (!logged) {
          $location.path('login');
        }

        $scope.$on('oauth:logout', function(event) {
          $location.path('login');
        });
      };
    }, 0)



    /*
     * Token expiration
     */

    $scope.$on('oauth:expired', function(event) {
      $location.path('expired');
    });



    /*
     * Demo logic (with some timers to make the experience smoother)
     */

    $rootScope.demoOn = function() {
      $rootScope.loading = true;
      $timeout(function() { window.location.replace('/demo.html'); }, 300);
    };

    $rootScope.demoOff = function() {
      $timeout(function() {
        window.location.replace('/');
        $rootScope.loading = true;
      }, 300);
    };
  });
