// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-text-box-val) directive.
 *
 * @module js/aw-property-text-box-val.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/uwPropertyService';
import 'js/aw-property-error.directive';
import 'js/aw-autofocus.directive';
import 'js/aw-widget-initialize.directive';
import 'js/aw-validator.directive';
import 'js/aw-command-bar.directive';
import 'js/exist-when.directive';

/**
 * Definition for the (aw-property-text-box-val) directive.
 *
 * @example TODO
 *
 * @member aw-property-text-box-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyTextBoxVal', [
    'uwPropertyService',
    function( uwPropertySvc ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            var _kcEnter = 13;

            /**
             * Bound via 'ng-change' on the 'input' element and called on value change.
             *
             * @memberof TextBoxValController
             */
            $scope.changeFunction = function() {
                if( !$scope.prop.isArray ) {
                    // this is needed for test harness
                    $scope.prop.dbValues = [ $scope.prop.dbValue ];
                    uwPropertySvc.updateViewModelProperty( $scope.prop );
                }
            };

            /**
             * Bound via 'ng-keydown' on the 'input' element and called on key down on 'input'
             *
             * @memberof TextBoxValController
             */
            $scope.evalKey = function( $event ) {
                if( $event.keyCode === _kcEnter ) {
                    if( $scope.prop.isArray ) {
                        $scope.prop.updateArray( $event );
                        $event.preventDefault();
                    }
                }
            };

            /**
             * Bound via 'ng-blur' on the 'input' element and called on called on input 'blur' (i.e. they leave the
             * field)
             *
             * @memberof TextBoxValController
             */
            $scope.blurTextBoxFunction = function( $event ) {
                eventBus.publish( $scope.prop.propertyName + '.blured', {
                    prop: $scope.prop
                } );

                if( $scope.prop.isArray ) {
                    $scope.prop.updateArray( $event );
                }
            };
        }

        myController.$inject = [ '$scope' ];

        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '='
            },
            controller: myController,
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-text-box-val.directive.html'
        };
    }
] );
