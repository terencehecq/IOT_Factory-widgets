app.controller( 'dashboard/widgets/heatmapchart/view', function heatmapChartWidget(
	$scope,
	$q,
	$http,
    $rootScope,
    $filter,
    timeframeConfigService,
    WIDGET_MAX_INPUT_DATA
){
	// Init widget size
	if($scope.widget.sizeY < 2 || !$scope.widget.sizeY){ $scope.widget.sizeY = 2; }
	if($scope.widget.sizeX < 3 || !$scope.widget.sizeX){ $scope.widget.sizeX = 3; }

	// Init scope variables if don't exist
	$scope.widget.options = $scope.widget.options || {};
	$scope.widget.options.inputs = $scope.widget.options.inputs || []; 
	$scope.widget.options.chartOptions = $scope.widget.options.chartOptions || {}

	// middleman dashboard options
	if ( !$scope.middleman ) $scope.middleman = {};
		
	$scope.widget.refresh = init;

	/**
	 * @description update when select/unselect device,asset, ...
	 */
	$scope.updateFunction = function () {
		init();
	};

    // do not 'init()' if it should wait for 'refreshDashboardOptions' event
    if(!($scope.middleman.options && $scope.middleman.options.dateBrowser)){
      init();
    }

	// DASHBOARD REFRESH
    var rootEventListener = [];
    rootEventListener.push($scope.$root.$on( 'refreshWidgets', function() {
      refreshWidget(true);
    } ));
    rootEventListener.push($scope.$root.$on( 'refreshDashboardOptions', function() {
      refreshWidget(false);
	} ));
	
    function refreshWidget(doInit){
	  var doInit = false;
	  // -- About DateBrowser
      if($scope.middleman.options && $scope.middleman.options.dateBrowser && $scope.widget.options.timeframe && $scope.widget.options.timeframe.indice && $scope.widget.options.timeframe.indice === 'toDateSelector'){
        doInit = true
      }
      if($scope.middleman.options && $scope.middleman.options.deviceSelector && angular.isArray($scope.widget.options.inputs)){
        $scope.widget.options.inputs.some(function(i){
          if(i.kind == "global"){
            doInit = true;
          }
          return doInit;
        });
      }

      if(doInit){
        init();
      }
    }

	// Unregister
    $scope.$on('$destroy', function () {
      rootEventListener.forEach(function(rel){
        rel();
      });
	});
	
	// Init widget
	function init() {
		$scope.loading = true;
		if ( !$scope.widget.options ) return;

		$scope.widget.options.chartOptions = angular.isObject( $scope.widget.options.chartOptions ) ? $scope.widget.options.chartOptions : {};
		$scope.widget.options.chartOptions.color = $scope.widget.options.chartOptions.color || "#0394fc";
	

		$scope.widget.chartObject = {
			series: [],
			chart: {
				height:'100%',
				type: 'heatmap',
				redrawOnParentResize: true,
				toolbar:{
					show: false
				},
				offsetY: -15,
				animations: {
					enabled: true,
					animateGradually: {
						enabled: false
					},
					dynamicAnimation: {
						enabled: true,
						speed: 100
					}
				}
			},
			dataLabels: {
			  enabled: false
			},
			noData: {
				text: "No data",
				style: {
					color:"#333333"
				}
			},
			colors: [$scope.widget.options.chartOptions.color],
			legend: {
				show: false
			},
			tooltip:{
				x:{
					show: true,
					formatter: function(xdate, series){
						let tooltipDate = $scope.widget.options.chartOptions.xDates[series.seriesIndex][series.dataPointIndex]
						if($scope.widget.options.chartOptions.accuracy === "seconds"){
							return moment(tooltipDate).format("YYYY.MM.DD HH:mm:ss")
						}else{
							return moment(tooltipDate).format("YYYY.MM.DD HH:mm")
						}
					}
				},
				y: {
					title: {
						formatter: (x) => null
					},
					formatter: function(x){
						if(x != null){
							return  x + " " + $scope.widget.options.chartOptions.unit 
						}
						return "No data"
					},
					style:{
						fontSize: '14px',
						width: '100%',
						textAlign: 'center'
					}
				},
				offsetY: -15
			},
			title:{
				margin: 0
			},
			xaxis:{
				title:{
					text: ""
				},
				labels: {
					formatter: function(xdate){
						return moment(xdate).format($scope.widget.options.chartOptions.xDateFormat);
					}
				},
				tooltip:{
					enabled: false
				}
			},
			yaxis:{
				title:{
					text: ""
				}
			},
			states:{
				hover:{
					filter:{
						type: 'lighten',
						value: 0.05
					}
				}
			}
		  }

		var globalTimeFrame;
		if (
		  $scope.middleman.options &&
		  $scope.middleman.options.dateBrowser &&
		  $scope.widget.options.timeframe && $scope.widget.options.timeframe.indice && $scope.widget.options.timeframe.indice === 'toDateSelector'
		){
		  globalTimeFrame = angular.copy($scope.middleman.optionsData.timestamp);
		}

		$scope.timeFrame = timeframeConfigService.getValue($scope.widget.options.timeframe, globalTimeFrame);

		readInputs();
	}

	// Retrieve data in API
	function getData(input, after, before, frame, rBefore, isGlobalTimeframe, isGlobalInput) {

		console.log("INPUT -->", input)
		$scope.loading = true;

		var widgetStep = $scope.widget.options.chartOptions.step || "all";
		var strictRange = $scope.widget.options.strictRange || false;

		//console.log("Time for retrieve data" ,{before,after});

		var dfd = $q.defer();
		var limit = input.limit ? input.limit : WIDGET_MAX_INPUT_DATA;
		var mtype = input.type;
		var inputKind = input.kind;
		var inputId = input.id;

		var apiUrl = '/api/' + inputKind + (inputKind.substr(inputKind.length - 1) == 's' ? '/' : 's/');
		var aggregation = (inputKind == 'smartdevices' && widgetStep != "all") ? '/' + widgetStep : "";

		// if (isSingleDataChart) {
		// limit = 1;
		// }

		var url = apiUrl +
			inputId +
			'/measurements' +
			aggregation;

		var urlParams = {
			before: before,
			after: after,
			type: mtype,
			order: "desc",
			limit: limit
		};

		var isAggregate = inputKind == 'smartdevices' && aggregation;

		// only for assets inputs
		if (inputKind == 'assets' ) {
			if (frame == 'last' || frame == 'latest') {
				url = '/api/assets/' + input.id + '/last';
				urlParams = {
				before: rBefore,
				type: mtype,
				order: "desc",
				limit: limit
				};
			}
			if(input.device)
				urlParams['device'] = input.device;
			/*if(widgetStep != 'all'){
				urlParams.step = widgetStep;
				isAggregate = true;
			}*/
		}
		if (inputKind == 'assets') {
			if (widgetStep != 'all') {
				urlParams.step = widgetStep;
				urlParams.strictRange = strictRange || false;
				isAggregate = true;
			}

		// tags
			if (angular.isArray(input.tags) && input.tags.length) {
				urlParams['tags'] = input.tags;
				delete urlParams['device'];
			}
		}

		// only for smartdevices inputs
		if (inputKind == "smartdevices") {
			if (frame == 'last' || frame == 'latest') {
				url = '/api/smartmeasurements/last/' + inputId;
				urlParams = {
					before: rBefore,
					type: mtype,
					order: "desc",
					limit: limit
				};
				if (widgetStep != 'all') {
					urlParams.step = widgetStep;
				}
			}
		}

		// only for devices inputs
		if (inputKind == 'devices') {
			if (frame == 'last' || frame == 'latest') {
				url = '/api/measurements/last/' + inputId;
				urlParams = {
					before: rBefore,
					type: mtype,
					order: "desc",
					limit: limit
				};
				urlParams.strictRange = strictRange || false;

				if (widgetStep != 'all') {
					urlParams.step = widgetStep;
				}
			}
			else if (inputKind == 'devices' && widgetStep != 'all') {
				url = '/api/measurements/byStep';
				urlParams = {
					before: before,
					after: after,
					type: mtype,
					device: inputId,
					step: widgetStep
				};
				urlParams.strictRange = strictRange || false;
			}
		}

		var data = [];
		var result = {
			input: input,
			filtered: 0
		};

		// only for assets
		var resultByDevice = {
			input: input,
			byDevice: true,
			data: {}
		};

		//console.log("Time for retrieve data" ,{before,after});
		//console.log("urlParams: ", urlParams);

		$http({
		url: url,
		method: 'get',
		params: urlParams
		})
		.then(function (response) {
			// console.log("GetData response: ",response);
			if (input.kind == "tags") {
				result.data = response.data.data;
				return dfd.resolve(result);
			}

			if (angular.isObject(response.data) && response.data.data) {
				// if kind=asset and no device has been specified, create virtual inputs by device having
				// the type of measurements asked
				if (result.input.kind == "assets" && response.data.data.length && !result.input.device) {
					// console.log(" -- getData -> assets -- ")
					var measurementData = response.data.data;
					measurementData.map(function (md) {
						// console.log("md --> ", md)
						var deviceProp = "device";
						if (md["smartdevice"].id) {
							deviceProp = "smartdevice";
						}

						var deviceId = md[deviceProp].id;
						var deviceName = md[deviceProp].name || deviceId;

						var newVarname = result.input.varName + " ( " + deviceName + " )";

						// insert the new results for this device
						resultByDevice.data[deviceId] = resultByDevice.data[deviceId] || {};

						var resultDevice = resultByDevice.data[deviceId];

						if (!resultDevice.input) {
							resultDevice.input = {};
							Object.keys(result.input).forEach(
								function (p) {
									resultDevice.input[p] = result.input[p];
								}
							);
							resultDevice.input["varName"] = newVarname;
						}

						if (!resultDevice.data) resultDevice.data = [];

						 
						resultDevice.name = response.data.parent.name;
						// resultDevice.unit = response.data.parent.unit || "";

						if(response.data.parent.unit){
							resultDevice.unit = response.data.parent.unit
						}else if(response.data.data[0] && mtype){
							let dataArr = response.data.data[0].measurements;
							if(dataArr.find(x => x.type === mtype)){
								resultDevice.unit = (dataArr.find(x => x.type === mtype)).unit;
							}else if(dataArr.find(x => x.type === mtype + ' (first)')){
								resultDevice.unit = (dataArr.find(x => x.type === mtype + ' (first)')).unit
							}
						}else{ resultDevice.unit = ""}

						if (angular.isArray(md.measurements)) {
							md.measurements.some(function (measurement) {
								if (widgetStep == 'all' && measurement.type != mtype){
									return false;
								}

								if (widgetStep != 'all') {
									// var tp = mtype + ' (first)';
									if(measurement.type != mtype){
										return false;
									}
								};

								if (input.indice && (measurement.id != input.indice && deviceId != input.indice && !isGlobalInput)) return false;

								var date = new Date(md.timestamp);
								resultDevice.data.push([date, measurement.value, measurement.unit]);
								return true;
							});
						}
					});
				}else {
					// regular
					result.name = response.data.parent.name;
					result.filtered = response.data.recordsFiltered || 0;
					// result.unit = response.data.parent.unit || response.data.data[0].measurements[0].unit ||  "";

					if(response.data.parent.unit){
						result.unit = response.data.parent.unit
					}else if(response.data.data[0] && mtype){
						let dataArr = response.data.data[0].measurements;
						result.unit = (dataArr.find(x => x.type === mtype)).unit;
					}else{ result.unit = ""}

					if (response.data.filteredType) {
						mtype = response.data.filteredType;
					}
					else if (isAggregate && mtype.indexOf("(") == -1 && response.data.parent.aggregate) {
						mtype += " (first)"
					}

					var measurementData = response.data.data;
					measurementData.forEach(function (md) {
						if (angular.isArray(md.measurements)) {
							md.measurements.some(function (measurement) {

							// check type
							if (result.input.kind == "assets") {
								// assets check type
								if (!(measurement.type == mtype || measurement.type == (mtype + " (first)"))) {
									return false;
								}
							}
							else {
								// regular check type
								if (measurement.type != mtype) return false;
							}

							// check indice
							if (!isAggregate && input.indice && measurement.id != input.indice) return false;

							var date = new Date(md.timestamp);

							// insert date and value into data
							data.push([date, measurement.value]);
							return true;
							});
						}
					});

					if (result.filtered && measurementData.length == WIDGET_MAX_INPUT_DATA) {
						result.warnMe = true;
					}

				}
			} else {
				data = response.data;
			}
			if (Object.keys(resultByDevice.data).length) {
				// only for assets (see above)
				result = resultByDevice;
			}else {
				result.data = data;
			}
			dfd.resolve(result);
		}, dfd.reject);

		return dfd.promise;
	}


	function readInputs() {
		$scope.middleman.warningMessages = [];

		if ( angular.isArray( $scope.widget.options.inputs ) ){
			var promises = [];
	
			var inputs = $scope.widget.options.inputs.filter(function(input) {
				return !input.disabled && input.kind != "global";
			  });
		
			var globalInputs = [];
	
			$scope.widget.options.inputs
			.filter(function (inp) { 
			return inp.kind == "global" && 
				angular.isNumber(inp.selectorIndice) && 
				$scope.middleman.fullData.selected && 
				$scope.middleman.fullData.selected[inp.selectorIndice] && 
				$scope.middleman.fullData.selected[inp.selectorIndice].length; })
			.forEach(function (inp) {
				console.log("INP GLOBAL -->", inp)
				if(inp) {
					$scope.middleman.fullData.selected[inp.selectorIndice].forEach(
						function(dev){
							globalInputs.push({
								kind: $scope.middleman.dashboardType == "assets" ? "assets" : "devices",
								id: dev._id,
								varName: inp.varName,
								type: inp.type
							})
						}
					)
				}
			});
	
			inputs = inputs.concat(globalInputs);
		
			axisConfig()
	
			inputs.forEach(function(input) {
			promises.push(
				getData(
				input,
				$scope.timeFrame.from,
				$scope.timeFrame.to,
				$scope.timeFrame.frame,
				$scope.timeFrame.relativeBefore,
				$scope.timeFrame.isGlobal
				)
			);
			});
		
			// handle results
			if(!promises.length){
			  $scope.loading = false;
			}
			else{
				$q.all( promises ).then( function ( values ) {
					console.log("Values: ", values);
					$scope.loading = false;
					var arrayValues = values.filter(function(v){
						return angular.isArray(v);
					});
					var nonArrayValues = values.filter(function(v){
						return !angular.isArray(v);
					});

					arrayValues.forEach(function(v){
						nonArrayValues = nonArrayValues.concat(v);
					});

					nonArrayValues.forEach( function(res, ix, array) {

							if( res.input.kind == "tags" ) {
								res.data.forEach( function ( dtf ) {
									var formatableObj = {
										input: res.input,
										name: dtf.parent.name,
										unit: dtf.parent.unit || "",
										customName: res.input.varName + ( dtf.parent.name ? "(" + dtf.parent.name + ")" : "" )
									};
									var data = [];
									dtf.measurements.forEach( function ( m ) {
										data.push( [ new Date( m.timestamp ), m.value ] );
									} );
									formatableObj.data = data;
									handleData( formatableObj );
								} );
							} else {
								// only for assets (see 'getData' function)
								if(res.byDevice){
									Object.keys(res.data).forEach( function(id){
										res.data[id].data.forEach(function (tbm){
											if(res.input.average){
											tbm.push(res.input.average);
											}
											if(res.input.timezoneOffset){
											tbm[0].setHours(tbm[0].getHours()+(res.input.timezoneOffset/60));
											}
										});
										handleData( res.data[id] );
									});
								}
								// regular
								else{
									res.data.forEach(function (tbm){
									if(res.input.average){
										tbm.push(res.input.average);
									}
									if(res.input.timezoneOffset){
										tbm[0].setMinutes(tbm[0].getMinutes()+res.input.timezoneOffset);
									}
									});
									//console.log("res: ",res);
									handleData( res );
								}
							}

							if ( ix == array.length - 1 ) {
								$scope.loadingChart = false;
								$scope.middleman.loadingChart = $scope.loadingChart;
							}
						});
				}, function(){
				$scope.loading = false;
				});
			}
		}
	}


	function handleData(val){
		console.log("handleData VAL => ", val)

		let data = val.data // Array of objects
		let y = $scope.widget.options.chartOptions.yDates;
		let x = $scope.widget.options.chartOptions.xDates;

		let formattedData = data.map( d => ({'timestamp': d[0], 'measurement': d[1]}) )
		
		$scope.widget.options.chartOptions.unit = val.unit
		$scope.widget.chartObject.series = [] // Empty the series

		// Loop on full timeframe array to find corresponding data in measurements using moment.js
		for(let i=0; i<y.length; i++){
			newSerie = {};
			newSerie.name = moment(y[i]).format($scope.widget.options.chartOptions.yDateFormat)
			newSerie.data = [];

			for(let j=0; j<x[i].length; j++){
				newData = {}
				newData.x = x[i][j]
				dataExists = formattedData.find(d => (moment(x[i][j]).isSame(moment(d.timestamp), $scope.widget.options.chartOptions.accuracy)))
		
				newData.y = dataExists ? dataExists.measurement : null;

				newSerie.data.push(newData)
			}
			$scope.widget.chartObject.series.push(newSerie)
		}
		console.log("ChartObject :", $scope.widget.chartObject)

		$scope.loading = false;	
	}
	  
	// --- Set all needed variables according to chosen options
	function axisConfig(){

		let from = new Date($scope.timeFrame.from) // Date JavaScript
		let fromUnix = new Date($scope.timeFrame.from).getTime() // in ms
		// let fromUnix = new Date($scope.timeFrame.from).getTime() // TEST
		let toUnix = new Date($scope.timeFrame.to).getTime() // in ms
		// let toUnix = new Date($scope.timeFrame.to).getTime() // TEST

		// Period covered in the timeframe
		let period = toUnix - fromUnix // in ms
		// let period = $scope.timeFrame.relativeBefore

		let xSteps;
		let xUnit;
		let xDates = [] 
		let ySteps;
		let yUnit;
		let yDates= []

		// Set time variables
		switch(true){
			// case period < 3720000 :
			// 	xSteps = 60;
			// 	xUnit = "seconds";
			// 	ySteps = parseInt(period / 60000)+1;
			// 	yUnit = "minutes";
			// 	$scope.widget.options.chartOptions.step = "all";
			// 	$scope.widget.options.chartOptions.accuracy = 'seconds';
			// 	$scope.widget.options.chartOptions.xDateFormat = "s";
			// 	$scope.widget.options.chartOptions.yDateFormat = "YYYY.MM.DD HH:mm";
			// 	break;
			// case period < 90000000 :
			// 	xSteps = 60;
			// 	xUnit = "minutes";
			// 	ySteps = parseInt(period / 3600000)+1;
			// 	yUnit = "hours";
			// 	$scope.widget.options.chartOptions.step = "all";
			// 	$scope.widget.options.chartOptions.accuracy = 'minute';
			// 	$scope.widget.options.chartOptions.xDateFormat = "m";
			// 	$scope.widget.options.chartOptions.yDateFormat = "YYYY.MM.DD HH:mm";
			// 	break;
			case period < 691200000 :
				xSteps = 24;
				xUnit = "hours";
				ySteps = parseInt(period / 86400000)+1;
				yUnit = "days";
				$scope.widget.options.chartOptions.step = "hourly";
				$scope.widget.options.chartOptions.accuracy = 'hour';
				$scope.widget.options.chartOptions.xDateFormat = "H";
				$scope.widget.options.chartOptions.yDateFormat = "YYYY.MM.DD";
				break;
			case period >= 691200000 :
				xSteps = 7;
				xUnit = "days";
				ySteps = parseInt(period / 604800000)+1;
				yUnit = "isoWeeks";
				$scope.widget.options.chartOptions.step = "daily";
				$scope.widget.options.chartOptions.accuracy = 'day';
				$scope.widget.options.chartOptions.xDateFormat = "ddd";
				$scope.widget.options.chartOptions.yDateFormat = "YYYY [w]W";
				break;
		}

		// Loop to make dates arrays for Y & X axis
		for(let i=0; i<ySteps; i++){
			let newYDate = moment(from).clone().startOf(yUnit).add(i, yUnit)
			yDates.push(newYDate.format())
			xDates[i] = [];

			for(let j=0; j<xSteps; j++){
				let newXDate = newYDate.clone().add(j, xUnit)
				xDates[i].push(newXDate.format())
			}
		}

		// $scope.widget.chartObject.colors = [$scope.widget.options.chartOptions.color] || ["#0394fc"]
		$scope.widget.chartObject.yaxis.title.text = yUnit;
		$scope.widget.chartObject.xaxis.title.text = xUnit;
		$scope.widget.options.chartOptions.yDates = yDates;
		$scope.widget.options.chartOptions.xDates = xDates;
	}

})