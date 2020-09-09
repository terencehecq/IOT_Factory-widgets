app.controller( 'dashboard/widgets/gauge/edit', function gaugeWidget(
	$scope,
    $http,
	colorPickerService,
){
	$scope.obj = {

	};

	if($scope.dashboardData && $scope.dashboardData.selected){
		var typesByNames = {};
		var customProperties = {};

		var bySelector = [];

		$scope.dashboardData.selected.forEach(
			function(selected, i){
				bySelector[i] = {
					typesByNames: {},
					customProperties: {}
				};
				if(!selected){
					return;
				}

				selected.forEach(
					function(d){
						if(angular.isArray(d.last)){
							d.last.forEach(
								function(meas){
									var typeName = meas.type;
									if(meas.type == "position" && meas.id){
										typeName =+ "__"+meas.id; 
									}
									typesByNames[typeName] = meas;
									bySelector[i].typesByNames[typeName] = meas;
								}
							);
						}

						if ($scope.dashboardType == "assets" && d.data && angular.isObject(d.data)) {
							Object.keys(d.data).forEach(
								function (prop) {
									customProperties[prop + ' (data)'] = {
										type: prop,
										id: "(data)",
										isProperty: true,
										inData: true
									};
									bySelector[i].customProperties[prop + ' (data)'] = customProperties[prop + ' (data)'];
								}
							);
						}
					}
				);
				var types=[];
				Object.keys(bySelector[i].typesByNames).forEach(function(prop){
					types.push(prop);
				})
				bySelector[i].types=types;
			}
		);
		$scope.dashboardData.bySelector=bySelector;
	}

    function init(){
        $scope.$parent.tab="main";
		$scope.form="editwidget";
    }
    init();
    var firstInit=false;
	$scope.widget.options = $scope.widget.options || {};
	
	$scope.widgetCopy = angular.copy( $scope.widget );

	$scope.widgetCopy.options.inputs = $scope.widgetCopy.options.inputs || [];
	$scope.widgetCopy.options.svgfile = $scope.widgetCopy.options.svgfile || "svg/gaugeWidget.svg";


    //we read the svg file and extract the parameters that it needs.
	$scope.$watch("widgetCopy.options.svgfile", function(nv,ov){
        var mustChangeTab;
		console.log($scope.widgetCopy.options.inputs)
        if(!firstInit) firstInit = true;
        else mustChangeTab = true;
		if (!nv) return;
		console.log(nv," --- ", ov)
        if (nv != ov && typeof ov != "undefined") {
            $scope.widgetCopy.options.inputs = [];
        }
		console.log(nv)
		console.log($scope.widgetCopy.options.inputs)
		$http.get("/" + $scope.$root.__appName+"/"+nv, {responseType:"document"}).then(function(res){
            if(!res.data) return;
			let params, groups;
            let unknownGroup = [];
            let xmlDoc = res.data;

            console.log(res.data)

            // get array of svg params
            params = xmlDoc.getElementsByTagName('ref');
            // loop
            for(var i = 0; i<params.length;i++){
                var varName = params[i].getAttribute('param');
                var value = params[i].getAttribute('default');
                var kind = params[i].getAttribute('kind');
                var groupid = params[i].getAttribute('groupid');

                if(["measurement","color","timestamp"].indexOf(kind) == -1){
                    kind = "";
                }

                var input = {
					varName: varName,
					value : value,
					source: kind
                };

                var inpFound;
                // if param not in inputs, insert the new input
                if(!$scope.widgetCopy.options.inputs.some(function(inp, idx){
					inpFound = inp;
                    return inp.varName == input.varName;
                })){
					if(groups && groupid && groups[groupid]){
						groups[groupid].push(input);
					}
					else{
						unknownGroup.push(input);
					}
					$scope.widgetCopy.options.inputs.push(input);
                }
				else{
					if(groups && groupid && groups[groupid]){
						groups[groupid].push(inpFound);
					}
					else{
						unknownGroup.push(inpFound);
					}
				}
            }
			$scope.inputGroups = groups;
			if(groups && Object.keys(groups).length && !unknownGroup.length){
				$scope.obj.selectedGroup = Object.keys(groups)[0];
			}
			$scope.unknownGroup = unknownGroup;
            if(mustChangeTab) $scope.tab="inputs";
		},
		function(err){
			console.error(err);
		});
	});

	$scope.getGroupInputVarname = function getGroupInputVarname(varName, groupName){
		if(groupName && varName){
			if(angular.isString(varName) && varName.startsWith(groupName+".")){
				var pos = groupName.length + 1;
				varName = varName.substring(pos);
			}
		}
		return varName;
	};

    $scope.input = {};

	if($scope.dashboardType == 'assets'){
		$scope.filters = {"assets": "/api/assets/list/all"};
	}
	else{
		$scope.filters = ['devices','smartdevices'];
	}

	$scope.changeSvgFile = function(){
		$scope.widgetCopy.options.inputs = [];
	}

    $scope.selectInputId = function selectInputId(inp) {
			$scope.onSelected = function ( input ) {
					inp.id = input._id;
					inp.types = input.types;
					inp.kind = input.kind;

			};
		};
    //we clear the data to avoid errors when someone switch from static to smart measurement and vice versa
    $scope.svgClearSelection = function ( input ) {
        input.name = undefined;
        input.id = undefined;
        input.value = undefined;
        input.type = undefined;
        input.types = undefined;
    };
    //we filter the data as to not polute the database
    $scope.preSave = function(){
        $scope.widgetCopy.options.inputs.forEach(function(input){
          	if(input.source != 'measurement' && input.source != 'timestamp' && input.source != 'global') return;

			if(input.source == 'global')
				input.kind="global";

          var validParams = [
            'varName',
            'kind',
            'source',
            'id',
            'type',
            'indice',
			'pretype',
			'selectorIndice'
          ];

			if(input.source != 'global'){
				var types = input.types;
				Object.keys(input).forEach(function(param){
					if(validParams.indexOf(param) == -1){
						delete input[param];
					}
					else{
						if('pretype' == param){
							console.log(types[ input.pretype ][ 0 ]);
							console.log(types[ input.pretype ][ 1 ]);
							input.type = types[ input.pretype ][ 0 ];
							input.indice = types[ input.pretype ][ 1 ];
							delete input.pretype;
						}
					}
				});
			}else{
				var types = $scope.dashboardData.bySelector.typesByNames;
				Object.keys(input).forEach(function(param){
					if(validParams.indexOf(param) == -1){
						delete input[param];
					}
					else{
						if('pretype' == param){
							input.type = input.pretype;
							delete input.pretype;
						}
					}
				});
			}
          
		});
		
		// insert needed properties into original widget
        [
            'title',
            'options'
        ].map(
            function ( prop ) {
                $scope.widget[ prop ] = $scope.widgetCopy[ prop ];
            }
        );

        $scope.confirm( $scope.widgetCopy );
	};
	
    $scope.eraseInputValue = function(input){
        if (['measurement','timestamp','global'].indexOf(input.source) == -1) return;
        var keepParam = [
            'varName',
            'source'
        ];
        Object.keys(input).forEach(function(param){
            if (keepParam.indexOf(param) == -1){
                delete input[param];
            };
        })
    };
    $scope.colorPicker = {
        value: null
    };
    $scope.colorPicker.options = colorPickerService.createDefaultOptions();
    $scope.changeViewForm = function changeViewForm(value){
      $scope.form = value;
    };
    $scope.changeViewTab = function changeViewTab(value){
      $scope.tab = value;
    };
    // database documents of the inputs
    // grouped by kind
    // filled by 'getInputDocumentName' function
    $scope.inputDocuments = {};

    /**
     * @description get the name of a document from 'kind' and 'id'
     * @return document's name
     */
    $scope.getInputDocumentName = function getInputDocumentName(kind, id){
      if(!kind || kind == 'tags') return id;

      $scope.inputDocuments[kind] = $scope.inputDocuments[kind] || {};

      if($scope.inputDocuments[kind][id])
        return $scope.inputDocuments[kind][id];

      $scope.inputDocuments[kind][id] = id;

      $http({
        url: '/api/' + kind + '/' + id,
        method: 'GET'
      }).then(
        function(res){
          if(res.data && res.data.name){
            $scope.inputDocuments[kind][id] = res.data.name;
          }
        },
        console.error
      );
    };
});
