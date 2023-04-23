// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-integer-val) directive.
 *
 * @module js/aw-property-integer-val.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import 'js/uwPropertyService';
import 'js/aw-property-error.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-autofocus.directive';
import 'js/aw-integer-validator.directive';
import 'js/aw-validator.directive';
import 'js/aw-widget-initialize.directive';

/**
 * Definition for the (aw-property-integer-val) directive.
 *
 * @example TODO
 *
 * @member aw-property-integer-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyIntegerVal', [
    'uwPropertyService',
    function( uwPropertySvc ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            var uiProperty = $scope.prop;

            const _kcEnter = 13;
            const _kc_S = 83;
            const _kcTab = 9;

            /**
             * Bound via 'ng-change' on the 'input' element and called on value change
             *
             * @memberof NumericValController
             */
            $scope.changeFunction = _.debounce(
                function() {
                    if( uiProperty.dbValue === null || uiProperty.dbValue === undefined ) {
                        uiProperty.uiValue = '';
                        uiProperty.dbValues = [];
                    } else {
                        uiProperty.uiValue = uiProperty.dbValue.toString();
                        uiProperty.dbValues = [ uiProperty.dbValue.toString() ];
                    }
                    uwPropertySvc.updateViewModelProperty( uiProperty );
                }, 300
            );

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
                    } else {
                        uiProperty.uiValue = uiProperty.dbValue.toString();
                        uiProperty.dbValues = [ uiProperty.dbValue.toString() ];
                    }

                    uwPropertySvc.updateViewModelProperty( uiProperty );
                }

                eventBus.publish( $scope.prop.propertyName + '.blured', {
                    prop: $scope.prop
                } );
            };

            /**
             * Bound via 'ng-keydown' on the 'input' element and called on key down on 'input'
             *
             * @memberof NumericValController
             * @param { KeyboardEvent } $event  the keyboardEvent
             */
            $scope.evalKey = function( $event ) {
                if( $event.keyCode === _kcEnter && uiProperty.isArray ) {
                        uiProperty.updateArray( $event );
                        $event.preventDefault();
                }
                // ctrl + s : update the display
                if( !$scope.prop.isArray && ( $event.keyCode === _kcTab || $event.ctrlKey && $event.keyCode === _kc_S ) ) {
                    // this is needed for test harness
                    $scope.prop.dbValues = [ $scope.prop.dbValue ];
                    uwPropertySvc.updateViewModelProperty( $scope.prop );
                }
            };
        }

        myController.$inject = [ '$scope' ];

        return {
            restrict: 'E',
            controller: myController,
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-integer-val.directive.html'
        };
    }
] );
