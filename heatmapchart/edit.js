app.controller("dashboard/widgets/heatmapchart/edit", function heatmapChartWidget(
    $scope,
    $http,
    $q,
    $timeout,
    $filter,
    WIDGET_MAX_INPUT_DATA,
    colorPickerService,
    timeframeConfigService,
    $rootScope,
    DashboardDataService
  ) {
    //!important function is used in timeframeConfig directive, if the entered date is correct, the directive calls
    //the function validateDate and send true or false, the function will then activate or deactivate the comfirm button in edit.pug
    $scope.validDate = false;
    $scope.validateDate = function(bool) {
      $scope.validDate = bool;
    };
  
    $scope.isEdit = false;
  
    $scope.WIDGET_MAX_INPUT_DATA = WIDGET_MAX_INPUT_DATA;

    $scope.colorPicker = {
      value: null
    }; 
    $scope.colorPicker.options = colorPickerService.createDefaultOptions();
  
    if (!$scope.widget.options) $scope.widget.options = {};
  
    $scope.numberFormaterArray = [".", ","];
  
    var locale =
      $rootScope.user && $rootScope.user.locale ? $rootScope.user.locale : "us";
  
    var commonProperties = [
      "_id",
      "name",
      "status",
      {type:"timestamp", isProperty: true, name: $filter('translate')('timestamp'), fromData: true}
    ];
    var smartAndDevicesProperties = [
      "type",
      "notes"
    ];
    var devicesProperties = [
      "brand",
      "model",
      "spentTime",
    ];
    var smartdevicesProperties = [
      "degree",
      "aggragate",
      "delta",
      "unit",
      "offset",
      "title",
      "location"
    ];
    var assetsProperties = [];
  
    $scope.globalServiceData = DashboardDataService.getGlobalData($scope.dashboardData,$scope.dashboardType);

    $scope.devicesProperties = commonProperties.concat(smartAndDevicesProperties).concat(devicesProperties);
    $scope.smartdevicesProperties = commonProperties.concat(smartAndDevicesProperties).concat(smartdevicesProperties);
    $scope.smartAndDevicesProperties = commonProperties.concat(smartAndDevicesProperties).concat(devicesProperties).concat(smartdevicesProperties);
    $scope.assetsProperties = commonProperties.concat(assetsProperties);
  
    
    // convert timeframe string to date
    if ($scope.widget.options.timeframe) {
      if (angular.isString($scope.widget.options.timeframe.from)) {
        $scope.widget.options.timeframe.from = new Date(
          $scope.widget.options.timeframe.from
        );
      }
      if (angular.isString($scope.widget.options.timeframe.to)) {
        $scope.widget.options.timeframe.to = new Date(
          $scope.widget.options.timeframe.to
        );
      }
    }
  
    // copy of widget
    $scope.widgetCopy = angular.copy($scope.widget);
  
    if (!$scope.widgetCopy.optionsCopy) {
      $scope.widgetCopy.optionsCopy = {};
    }
  
    $scope.widgetCopy.optionsCopy["page"] =
      $scope.widget.options.chartOptions &&
      $scope.widget.options.chartOptions.page == "enable"
        ? true
        : false;
  
    if (!$scope.widgetCopy.options.timeframe) {
      $scope.widgetCopy.options.timeframe = timeframeConfigService.getDefaultConfig();
      $scope.widgetCopy.options.timeframe.frame = "latest";
      $scope.widgetCopy.options.step = "all";
    }
  
    if (!$scope.widgetCopy.options.inputs) {
      $scope.widgetCopy.options.inputs = [];
    }

    if(!$scope.widgetCopy.options.chartOptions){
      $scope.widgetCopy.options.chartOptions = {}
    }
    
    if(!$scope.widgetCopy.options.chartOptions.color){
      $scope.widgetCopy.options.chartOptions.color = "#0394fc"
    }

    $scope.inputDocuments = {};
  
    console.log("Dashboard => ", $scope.dashboardType);
  
  
    /**
     * @description get the name of a document from 'kind' and 'id'
     * @return document's name
     */
    $scope.getInputDocumentName = function getInputDocumentName(kind, id) {
      if (!kind || kind == "tags") return id;
  
      $scope.inputDocuments[kind] = $scope.inputDocuments[kind] || {};
  
      if ($scope.inputDocuments[kind][id]) return $scope.inputDocuments[kind][id];
  
      $scope.inputDocuments[kind][id] = id;
  
      $http({
        url: "/api/" + kind + "/" + id,
        method: "GET"
      }).then(function(res) {
        if (res.data && res.data.name) {
          $scope.inputDocuments[kind][id] = res.data.name;
        }
      }, console.error);
    };
  
    $scope.tab = "timeframe";
    $scope.newInput = {};
    $scope.filters = [];

    if(!$scope.newInput.source){
      $scope.newInput.source = "measurement"
    }
  
    // selection of a name
    $scope.selectInputId = function selectInputId() {
      // alert("Hello Select Input Id");
      if (!$scope.newInput.source) return;
      $scope.search = "";
      switch ($scope.newInput.source) {
        case "measurement":
          $scope.filters =
            $scope.dashboardType == "assets"
              ? ["assets"]
              : ["devices", "smartdevices"];
          break;
        case "system":
          $scope.filters = ["agents", "dataloggers"];
          break;
      }
      $scope.onSelected = function(input) {
        $scope.newInput.id = input._id;
        $scope.newInput.types = input.types;
        $scope.newInput.kind = input.kind;
      };
    };
  
    $scope.removeInput = function removeInput(i){
      $scope.widgetCopy.options.inputs.splice(i,1);
    }
  
    $scope.addInput = function addInput() {

      if ( !$scope.newInput.type ) return console.warn( 'No type' );
      
      if ( !$scope.widgetCopy.options.inputs ) $scope.widgetCopy.options.inputs = [];
      
      var newFormattedInput = {};

      if ( $scope.newInput.source == "global" ) {
          newFormattedInput.kind = $scope.newInput.source;
          newFormattedInput.type = $scope.newInput.type.type;
          if ($scope.newInput.type && $scope.newInput.type.id) {
              newFormattedInput.indice = $scope.newInput.type.id;
          }
          newFormattedInput.selectorIndice = $scope.newInput.selectorIndice == 0 || $scope.newInput.selectorIndice >= 1 ? $scope.newInput.selectorIndice : "";
          newFormattedInput.isProperty = $scope.newInput.type.isProperty;
          newFormattedInput.inData = $scope.newInput.type.inData;
      } else {
          newFormattedInput.id = $scope.newInput.id;
          newFormattedInput.kind = $scope.newInput.kind;
          if ( $scope.newInput.types && angular.isArray( $scope.newInput.types[ $scope.newInput.type ] ) ) {
              newFormattedInput.type = $scope.newInput.types[ $scope.newInput.type ][ 0 ];
              newFormattedInput.indice = $scope.newInput.types[ $scope.newInput.type ][ 1 ];
          } else if ( $scope.newInput.type && angular.isObject( $scope.newInput.type ) ) {
              newFormattedInput.type = $scope.newInput.type.type;
              if ( $scope.newInput.type.id )
                  newFormattedInput.indice = $scope.newInput.type.id;
          }
      }

      $scope.widgetCopy.options.inputsFull = true;
      $scope.tab = "input";
      $scope.widgetCopy.options.inputs.push( newFormattedInput );
      $scope.newInput = {};
    };
  
    $scope.preSave = function preSave() {
      $scope.widgetCopy.options.firstConfig = true;
  
      // insert needed properties into original widget
      ["title", "options"].map(function(prop) {
        $scope.widget[prop] = $scope.widgetCopy[prop];
      });
  
      $scope.widget.options.onLoaded = function() {
        $scope.Widgets.edit($scope.widget);
      };
      $scope.confirm($scope.widget);
    };
  
    $scope.preEdit = function preEdit() {
      
      [("title", "options")].map(function(prop) {
        $scope.widget[prop] = $scope.widgetCopy[prop];
      });
  
      $scope.widget.title = $scope.widgetCopy.title;
  
      $scope.confirm($scope.widget);
    };
  });
  