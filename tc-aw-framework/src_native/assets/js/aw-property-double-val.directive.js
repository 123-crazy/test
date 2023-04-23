// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-double-val) directive.
 *
 * @module js/aw-property-double-val.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/uwPropertyService';
import 'js/aw-property-error.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-autofocus.directive';
import 'js/aw-double-validator.directive';
import 'js/aw-validator.directive';
import 'js/aw-widget-initialize.directive';
import 'js/viewModelService';

/**
 * Definition for the (aw-property-double-val) directive.
 *
 * @example <aw-property-double-val></aw-property-double-val>
 *
 * @member aw-property-double-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyDoubleVal', [
    'uwPropertyService', 'viewModelService',
    function( uwPropertySvc, viewModelSvc ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            var uiProperty = $scope.prop;

            var _kcEnter = 13;
            let _kcTab = 9;

            /**
             * Bound via 'ng-change' on the 'input' element and called on value change
             *
             * @memberof NumericValController
             */
            $scope.changeFunction = function() {
                if( ngModule.isUndefined( uiProperty.dbValue ) ) {
                    uiProperty.dbValue = '';
                }

                if( $scope.changeAction ) {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );
                    viewModelSvc.executeCommand( declViewModel, $scope.changeAction, $scope );
                }
            };

            /**
             * Bound via 'ng-blur' on the 'input' element and called on input 'blur' (i.e. they leave the field)
             *
             * @memberof NumericValController
             */
            $scope.blurNumericFunction = function( $event ) {
                /**
                 * In most cases, updateViewModelProperty will overwrite this, but in a few cases, e.g., if there is a
                 * validation error, uiValue won't get updated, so manually do it here
                 * <P>
                 * Note: Setting 'dbValues' is needed for test harness
                 * <P>
                 * Note: We HAVE to check for 'null' since value can be '0' (which is otherwise 'false')
                 */
                if( uiProperty.isArray ) {
                    uiProperty.updateArray( $event );
                } else {
                    if( uiProperty.dbValue === null || uiProperty.dbValue === undefined ) {
                        uiProperty.uiValue = '';
                        uiProperty.dbValues = [];
                    } else if( uiProperty.dbValue === uiProperty.value ) {
                        uiProperty.dbValues = [ uiProperty.dbValue.toString() ];
                    } else {
                        uiProperty.uiValue = uiProperty.dbValue.toString();
                        uiProperty.dbValues = [ uiProperty.dbValue.toString() ];
                    }

                    uwPropertySvc.updateViewModelProperty( uiProperty );
                }
            };

            /**
             * Bound via 'ng-keydown' on the 'input' element and called on key down on 'input'
             *
             * @memberof NumericValController
             */
            $scope.evalKey = function( $event ) {
                if( $event.keyCode === _kcEnter || $event.keyCode === _kcTab && !uiProperty.isArray ) {
                    if( uiProperty.isArray ) {
                        uiProperty.updateArray( $event );
                        $event.preventDefault();
                    } else {
                        $scope.prop.dbValues = [ $scope.prop.dbValue ];
                        uwPropertySvc.updateViewModelProperty( $scope.prop );
                    }
                }
            };
        }

        myController.$inject = [ '$scope' ];

        return {
            restrict: 'E',
            controller: myController,
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '=',
                changeAction: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-double-val.directive.html'
        };
    }
] );
