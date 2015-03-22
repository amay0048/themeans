'use strict';
/**
 * @ngdoc directive
 * @name creemWebApp.directive:mdParsePlacesAutosuggest
 * @description
 * # mdParsePlacesAutosuggest
 */
angular.module('tm.md-parse-places-autosuggest', [
  'uiGmapgoogle-maps',
  'tm.parse'
]).config([
  '$provide',
  'uiGmapGoogleMapApiProvider',
  function ($provide, uiGmapGoogleMapApiProvider) {
    var libraries = 'places';
    if (uiGmapGoogleMapApiProvider.options.libraries) {
      if (uiGmapGoogleMapApiProvider.options.libraries.indexOf('places') < 0) {
        libraries = uiGmapGoogleMapApiProvider.options.libraries + ',places';
      } else {
        return;
      }
    }
    uiGmapGoogleMapApiProvider.configure({ libraries: libraries });
  }
]).directive('mdParsePlacesAutosuggest', [
  '$document',
  function ($document) {
    return {
      template: '<md-autocomplete flex ' + 'ng-model="model" ' + 'md-selected-item="selectedItem" ' + 'md-search-text="searchText" ' + 'md-items="item in querySearch(searchText)" ' + 'md-item-text="selectedItem.description" ' + 'md-floating-label="{{label}}">' + '<span md-highlight-text="searchText">{{item.description}}</span>' + '</md-autocomplete>',
      restrict: 'E',
      scope: {
        selectedItem: '=ngModel',
        label: '@'
      },
      link: function (scope, el) {
        scope.el = el;
        scope.tmpEl = $document[0].createElement('google-places-detail-tmp');
      },
      controller: [
        '$scope',
        '$q',
        '$timeout',
        'uiGmapGoogleMapApi',
        'Parse',
        function ($scope, $q, $timeout, uiGmapGoogleMapApi, Parse) {
          $scope.lookupItem = {};
          $scope.validation = {
            loadingText: 'Loading address details...',
            deferred: null
          };
          function placesSearch(searchText) {
            var deferred = $q.defer();
            uiGmapGoogleMapApi.then(function (maps) {
              var service = new maps.places.AutocompleteService();
              service.getPlacePredictions({
                input: searchText,
                types: ['address'],
                componentRestrictions: { country: 'au' }
              }, function (predictions, status) {
                if (status != maps.places.PlacesServiceStatus.OK) {
                  deferred.reject(status);
                  return;
                }
                deferred.resolve(predictions);
              });
            });
            return deferred.promise;
          }
          function fake() {
            $scope.validation.deferred = $q.defer();
            return $scope.validation.deferred.promise;
          }
          $scope.querySearch = function (searchText) {
            if (searchText === $scope.validation.loadingText) {
              return fake();
            }
            if ($scope.selectedItem && searchText === $scope.selectedItem.description) {
              return fake();
            }
            return placesSearch(searchText);
          };
          $scope.$watch('selectedItem', function (newVal, oldVal) {
            if (newVal) {
              if (oldVal && newVal.description === oldVal.description) {
                return;
              }
              $scope.searchText = angular.copy($scope.validation.loadingText);
              uiGmapGoogleMapApi.then(function (maps) {
                var service = new maps.places.PlacesService($scope.tmpEl);
                service.getDetails({ placeId: newVal.place_id }, function (place, status) {
                  if (status == maps.places.PlacesServiceStatus.OK) {
                    newVal = angular.extend(newVal, place);
                    newVal.geoPoint = new Parse.GeoPoint({
                      latitude: newVal.geometry.location.k,
                      longitude: newVal.geometry.location.B
                    });
                    delete newVal.html_attributions;
                  }
                  $timeout(function () {
                    $scope.selectedItem = $scope.ngModel = newVal;
                    $scope.validation.deferred.resolve([]);
                    $scope.searchText = $scope.selectedItem.description;
                  }, 0);
                  $scope.validation.requesting = false;
                });
              });
            }
          });
        }
      ]
    };
  }
]);