app.directive( 'ngApexCharts', function () {
    return {
        restrict: 'E',
        scope: {
            options: '=',
        },
        template: '<div id="{{controlId}}"></div>',
        link: function ( $scope ) {
            $scope.controlId = 'apex_chart_' + Math.random()
                .toString( 36 )
                .replace( /[^a-z]+/g, '' )
				.substr( 0, 10 );
				
			$scope.$watch('options', function(nv){
                if(!nv){return console.log("empty options")}
                console.log("Options log")
				var chart = new ApexCharts(document.querySelector('#' + $scope.controlId), nv);
				chart.render()
			})
		}
	}
});
