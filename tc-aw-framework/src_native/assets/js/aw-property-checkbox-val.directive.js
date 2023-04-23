// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-checkbox-val) directive.
 *
 * @module js/aw-property-checkbox-val.directive
 */
import app from 'app';
import 'js/uwPropertyService';
import 'js/aw-property-error.directive';
import 'js/aw-autofocus.directive';
import 'js/aw-widget-initialize.directive';
import 'js/viewModelService';

/**
 * Definition for the (aw-property-checkbox-val) directive. It supports an optional property 'action' to specify the
 * action to perform on check box value toggle.
 *
 * @example <aw-property-checkbox-val prop="prop" action="action"></aw-property-checkbox-val>
 *
 * @member aw-property-checkbox-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyCheckboxVal', [
    'uwPropertyService', 'viewModelService',
    function( uwPropertySvc, viewModelSvc ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            if( !$scope.prop ) {
                return;
            }
            var uiProperty = $scope.prop;

            var _kcEnter = 13;

            /**
             * Bound via 'ng-change' on the 'input' element and called on value change.
             *
             * @memberof CheckboxValController
             */
            $scope.changeFunction = function() {
                if( !uiProperty.isArray ) {
                    // this is needed for test harness
                    uiProperty.dbValues = [ Boolean( uiProperty.dbValue ) ];
                    uwPropertySvc.updateViewModelProperty( uiProperty );
                }
            };

            /**
             * Returns 'TRUE' if isRequired flag is set to true.
             *
             * @memberof CheckboxValController
             */
            $scope.showRequired = function() {
                if( uiProperty.dbValue === null ) {
                    return $scope.prop.isRequired;
                }

                return false;
            };

            /**
             * Bound via 'ng-keydown' on the 'input' element and called on key down on 'input'
             *
             * @memberof CheckboxValController
             */
            $scope.evalKey = function( $event ) {
                if( $event.keyCode === _kcEnter && uiProperty.isArray ) {
                    uiProperty.updateArray( $event );
                    $event.preventDefault();
                }
            };

            if( $scope.action ) {
                $scope.$watch( 'prop.dbValue', function _watchPropDbValue( newValue, oldValue ) {
                    if( newValue !== null && newValue !== undefined && $scope.prop && oldValue !== newValue ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                    }
                } );
            }
        }

        myController.$inject = [ '$scope' ];

        // add directive controller for prop update or pass in using &?
        return {
            restrict: 'E',
            controller: myController,
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '=',
                action: '<'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-checkbox-val.directive.html'
        };
    }
] );
