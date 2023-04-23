// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-radio-button-val) directive.
 *
 * @module js/aw-property-radio-button-val.directive
 */
import app from 'app';
import 'js/uwPropertyService';
import 'js/aw-property-error.directive';
import 'js/aw-autofocus.directive';
import 'js/aw-widget-initialize.directive';
import 'js/aw-validator.directive';

/**
 * Definition for the (aw-property-radio-button-val) directive.
 *
 * @example <aw-property-radio-button-val></aw-property-radio-button-val>
 *
 * @member aw-property-radio-button-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyRadioButtonVal', [
    'uwPropertyService',
    function( uwPropertySvc ) {
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
             * @memberof RadioButtonValController
             */
            $scope.changeFunction = function() {
                if( !uiProperty.isArray ) {
                    // this is needed for test harness
                    uiProperty.dbValues = [ uiProperty.dbValue ];
                    uwPropertySvc.updateViewModelProperty( uiProperty );
                }
            };

            /**
             * Returns 'TRUE' if isRequired flag is set to true.
             *
             * @memberof RadioButtonValController
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
             * @memberof RadioButtonValController
             */
            $scope.evalKey = function( $event ) {
                if( $event.keyCode === _kcEnter ) {
                    if( uiProperty.isArray ) {
                        uiProperty.updateArray( $event );
                        $event.preventDefault();
                    }
                }
            };
        }

        myController.$inject = [ '$scope' ];

        // add directive controller for prop update or pass in using &?
        return {
            restrict: 'E',
            controller: myController,
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '=',
                list: '=?',
                vertical: '@?',
                // custom labels only set this way by gwt and can be removed in aw4.0
                customTrueLabel: '@?',
                customFalseLabel: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-radio-button-val.directive.html',
            link: function( $scope ) {
                // if list is provided, use it, otherwise create a binary one
                if( !$scope.list ) {
                    $scope.vals = [ {
                        propDisplayValue: $scope.prop.propertyRadioTrueText,
                        propInternalValue: true
                    }, {
                        propDisplayValue: $scope.prop.propertyRadioFalseText,
                        propInternalValue: false
                    } ];
                } else {
                    $scope.vals = $scope.list;
                }
            }
        };
    }
] );
