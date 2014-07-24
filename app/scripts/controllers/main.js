'use strict';

angular.module('lelylan.dashboards.device')
  .controller('MainCtrl', function ($scope, $rootScope, $timeout, $q, $location, $cacheFactory, ENV, Device, Type, Category, AccessToken, Dimension, Column, Menu, Notifications, Socket) {

    /*
     * Configs
     */

    // Flag telling us if the demo mode is active
    $scope.demo = !!($location.absUrl().match(/demo/));

    // App dimensions (to fit the page)
    $scope.dimensions = Dimension.get();

    // Visible columns
    $scope.columns = Column.get();

    // Visible menu (on the left)
    $scope.menu = Menu.get();

    // OAuth credentials
    $scope.credentials = ENV.credentials;

    // Notifications list
    $rootScope.notifications = { list: Notifications.get(), unread: 0 };

    // Notification for device update
    $rootScope.notification = {};

    // Types container
    $rootScope.types = [];


    /*
     * OAuth
     */

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


      /* ------------------------ *
      * AUTHORIZED INITIALIZATION *
      * ------------------------- */

      /*
      * Categories API request
      */

      // Verify if categories is already cached
      var cached = $cacheFactory.get('$http').get(ENV.endpoint + '/categories');

      // Get all categories
      var categories = Category.all().
        success(function(categories) {
          $rootScope.categories = categories;
          $rootScope.categories.unshift({ tag: 'all', name: 'All'});
          $rootScope.currentCategory = $rootScope.categories[0];
        });



      /*
      * Devices API request
      */

      var devices = Device.all().
        success(function(devices) {
          $rootScope.all = devices;
          $rootScope.devices = devices;

          if (devices.length == 0) { $location.path('/no-devices') }
          else                     { loadTypes($rootScope.devices); }
        });



      /*
      * Devices per category
      *
      * Counts the number of devices per category when all devices and
      * all categories are loaded.
      */

      $q.all([devices, categories]).then(function(values) {
        _.map($rootScope.categories, function(category) {
          category.devices = _.countBy($rootScope.all, function(device) {
            return (device.category == category.tag) ? 'count' : 'missed'
          }).count;
        });

        $rootScope.categories[0].devices = $rootScope.all.length;
      });



      /*
      * Types preloading
      *
      * Makes an API request to each device type to cache it. This let you
      * move between all devices instantaneously
      */

      var loadTypes = function(devices) {
        var requests = _.map(devices, function(device) {
          return Type.find(device.type.id)
        });

        $q.all(requests).then(function(values) {
          $rootScope.types = _.map(values, function(value) { return value.data });
          init(values);
        });
      }



      /*
      * Visualization
      *
      * All resources (categories, devices and types) are loaded and can be shown.
      */

      var init = function(values) {
        console.log('init')
        $rootScope.loading = false;
        $scope.currentDevice = $rootScope.devices[0];
      }

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
      $timeout(function() { window.location.replace('demo.html'); }, 300);
    };

    $rootScope.demoOff = function() {
      $timeout(function() {
        window.location.replace('index.html');
        $rootScope.loading = true;
      }, 300);
    };



    /*
     * Websocket definition
     */

    $timeout(function() {
      var logged = !!AccessToken.get();

      if (logged) {

        Socket.on('connect', function() {
          Socket.emit('subscribe', AccessToken.get().access_token);
        });

        Socket.on('update', function (event) {
          console.log("Websocket message received");

          var notifications = Notifications.push(event.data);
          $rootScope.$broadcast('lelylan:device:update:set', event.data);

          console.log(notifications, notifications[0].changes);
          if (notifications.length > 0 && notifications[0].changes.length > 0) {

            console.log("Gonna show the notification element");

            if ($rootScope.notification.timeout) {
              $timeout.cancel($rootScope.notification.timeout);
            }

            $rootScope.notification.show    = true;
            $rootScope.notification.message = notifications[0].message;
            $rootScope.notification.device  = notifications[0].device;

            $rootScope.notification.timeout = $timeout(function() {
              $rootScope.notification.show  = false;
            }, 5000);


          } else {
            // remove the notification id created from the same page
            $rootScope.notifications.list.shift();
          }

          $rootScope.notifications.unread = _.where($rootScope.notifications.list, { unread: true }).length

        });
      }
    });


    /*
     * Device updated
     */

    $scope.$on('lelylan:device:update:set', function(event, device) {
      var _device = _.find($rootScope.all, function(resource) {
        return resource.id == device.id;
      });

      angular.extend(_device, device);
    });



  });
