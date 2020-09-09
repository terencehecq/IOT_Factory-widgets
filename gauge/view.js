app.controller('dashboard/widgets/gauge/view', function gaugeWidget(
    $scope,
  $http,
  $q,
  $timeout,
  $filter){
        //!important function is used in deviceSelectorList directive, when the inputs are generated, the directive calls
    //the update function
    $scope.updateFunction = function(){
      init();
  }

  // add init refresh view
  $scope.widget.refresh = init;

  if ( !$scope.middleman )
      $scope.middleman = {};
  // do not 'init()' if it should wait for 'refreshDashboardOptions' event
  if(!($scope.middleman.options && $scope.middleman.options.dateBrowser)){
      init();
  }

  var rootEventListener = [];
  rootEventListener.push($scope.$root.$on( 'refreshWidgets', function() {
    refreshWidget(true);
  } ));
  rootEventListener.push($scope.$root.$on( 'refreshDashboardOptions', function() {
    refreshWidget(false);
  } ));
  
  function refreshWidget(doInit){
    if($scope.middleman.options && $scope.middleman.options.dateBrowser){
      doInit = true
    }
    if($scope.middleman.options && $scope.middleman.options.deviceSelector && angular.isArray($scope.widget.options.inputs)){
        $scope.widget.options.inputs.some(function(i){
            if(i.source == "global"){
                doInit = true;
            }
            return doInit;
        });
    }

    if(doInit){
        $scope.widget.options.inputs.forEach(function(input){
          if(input.source != "global") return;

          if(input.selectorIndice != null){
            var v= $scope.middleman.fullData.selected[input.selectorIndice];
            v[0].last.some(function(t){
              if(t.type == input.type)
                input.value=t.value;
            })
          }
        })
        init();        
    }
  }

    // Unregister
    $scope.$on('$destroy', function () {
      rootEventListener.forEach(function(rel){
        rel();
      });
    });

  	function init() {
      $scope.params = [];
      $scope.svgShow=false;
  		if (!($scope.widget.options && angular.isArray($scope.widget.options.inputs)) ) return;

      $scope.params = angular.copy($scope.widget.options.inputs);
      // array of promises
      var promises = [];

      // loop
  		$scope.params.forEach(function(input){
          $scope.loading=true;
          // create a deferred (to respond later via a promise)
          var dfd = $q.defer();
          //console.log('input',input);
          // if source != 'measurement', respond
          if(input.source != 'measurement' && input.source != 'timestamp' && input.source !="global") {
            $scope.loading = false;
            return dfd.resolve();
          }
          if(input.source == "global"){
            if(input.selectorIndice != null){
              var v= $scope.middleman.fullData.selected[input.selectorIndice];
              input.id = v[0]._id;
              input.kind =v[0].kind;
            }
          }

          if(!(input.kind && input.id)){
            $scope.loading = false;
            return dfd.resolve();
          }
          var query = {
            url: "/api/" + input.kind + '/' + input.id,
            method: "get",
          };

          if ($scope.middleman.options && $scope.middleman.options.dateBrowser) {
            query = {
              url: "/api/" + input.kind + '/' + input.id + '/measurements',
              method: "get",
              params: {
                limit: 1,
                before: $scope.middleman.optionsData.timestamp.to
              }
            }
          }
          //console.log('quey', query);
          $http(query).then(
            function(res){
              var item = res.data;
              if (item.data && item.data.length) {
                if (item.data.length)
                  item = item.data[0];
                else
                  item= item.parent;
              }
              $scope.loading = false;
              // console.log('**************',item);
              if (input.source == 'timestamp' || (input.source == "global" && input.varName === 'timestamp')) {
                input.value = $filter('localize')(item.timestamp);
              }
              else {
                // if no device.last, respond
                if (item.last && angular.isArray(item.last)) {
                  // loop through measurements
                  item.last.some(function(meas){
                    if (meas.type == input.type) {
                      if (input.indice) {
                        if (meas.id == input.indice) {
                          input.value = meas.value;
                          return true;
                        }
                      } else {
                        input.value = meas.value;
                        return true;
                      }
                    }
                  });
                } else if (item.measurements && angular.isArray(item.measurements)) {
                  // loop through measurements
                  item.measurements.some(function(meas){
                    if (meas.type == input.type) {
                      if (input.indice) {
                        if (meas.id == input.indice) {
                          input.value = meas.value;
                          return true;
                        }
                      } else {
                        input.value = meas.value;
                        return true;
                      }
                    }
                  });
                } else {
                  return dfd.resolve();
                }

                
              }

              // respond
              dfd.resolve();
            },
            function(e){
              $scope.loading = false;
              console.error(e);
              // respond
              dfd.resolve();
            }
          );

          // put the promise in array of promise
          promises.push(
            dfd.promise
          );
		  });

      // if no promises to execute (e.g. no inputs), show svg
      if(!promises.length){
        $timeout(function() {
          $scope.svgShow=true;
        }, 100);
      }
      else{
        // else, execute all the promises then, show svg
        $q.all(promises).then(
          function(){
            $timeout(function() {
              $scope.svgShow=true;
            }, 100);
          },
          console.error
        );
      }


  	};
});
