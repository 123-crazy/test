// Copyright (c) 2020 Siemens

/**
 * Definition for the <aw-property-val> directive.
 *
 * @module js/aw-property-val.directive
 */
import app from 'app';
import 'js/uwSupportService';

// eslint-disable-next-line valid-jsdoc
/**
 * Definition for the <aw-property-val> directive.
 *
 * @example <aw-property-val><aw-property-val></aw-property-val>
 *
 * @member aw-property-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyVal', [
    'uwSupportService',
    function( uwSupportSvc ) {
        /**
         * Initialize the properties and API objects necessary to manage the given viewModelProperty.
         *
         * @param {Object} $scope -
         * @param {JqueryElement} jqParentElement -
         * @param {Element} $element -
         *
         * @returns {Boolean} TRUE  if prop 'isEditable'
         */
        function initPropInfo( $scope, jqParentElement, $element ) {
            // non editable case
            if( $scope.hint ) {
                $scope.prop.renderingHint = $scope.hint;
            }

            if( $scope.parameterMap ) {
                $scope.prop.parameterMap = $scope.parameterMap;
            }

            if( $scope.maxRowCount ) {
                $scope.prop.maxRowCount = $scope.maxRowCount;
            }

            /**
             * The integration with GWT sometimes causes the edit mode to change before watcher is started so cache
             * the initial edit mode for the initial watch check.
             */
            uwSupportSvc.includePropertyValue( $scope.prop.isEditable, jqParentElement, $element, $scope.prop, $scope.modifiable, $scope.inTableCell );

            return $scope.prop.isEditable;
        }

        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '=',
                modifiable: '=?',
                hint: '<',
                parameterMap: '<?',
                maxRowCount: '=?',
                inTableCell: '@'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-val.directive.html',
            link: function( $scope, $element ) {
                var initialEditMode = null;

                var jqParentElement = $element.find( '.aw-widgets-propertyValContainer' );

                if( $scope.prop ) {
                    initialEditMode = initPropInfo( $scope, jqParentElement, $element );
                } else {
                    /**
                     * Watch for when/if the property becomes valid later.
                     */
                    var lsnr = $scope.$watch( 'prop', function _watchProp( propIn ) {
                        if( propIn ) {
                            lsnr();

                            initialEditMode = initPropInfo( $scope, jqParentElement, $element );
                        }
                    } );
                }

                // Watcher of editable state
                $scope.$watch( 'prop.isEditable', function _watchIsEditable( newValue, oldValue ) {
                    if( jqParentElement && $scope.prop ) {
                        /**
                         * If the value has changed (newValue = oldValue only in initial update) or it is the
                         * initial update and the edit mode does not match the expected edit mode
                         */
                        if( newValue !== oldValue || newValue !== initialEditMode ) {
                            if( $scope.hint ) {
                                $scope.prop.renderingHint = $scope.hint;
                            }

                            uwSupportSvc.includePropertyValue( $scope.prop.isEditable, jqParentElement, $element,
                                $scope.prop, $scope.modifiable, $scope.inTableCell );
                        }
                    }
                } );

                // Watcher of type state
                $scope.$watch( 'prop.type', function _watchPropType( newValue, oldValue ) {
                    if( jqParentElement && newValue !== oldValue && $scope.prop ) {
                        uwSupportSvc.includePropertyValue( $scope.prop.isEditable, jqParentElement, $element,
                            $scope.prop, $scope.modifiable, $scope.inTableCell );
                    }
                } );
            }
        };
    }
] );
