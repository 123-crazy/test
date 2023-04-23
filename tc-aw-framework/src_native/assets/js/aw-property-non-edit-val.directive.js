// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-non-edit-val) directive.
 *
 * @module js/aw-property-non-edit-val.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-parse-html.directive';
import 'js/aw-highlight-property-html.directive';
import 'js/aw-command-bar.directive';
import 'js/showObjectCommandHandler';
import 'js/navigationTokenService';
import 'js/exist-when.directive';

/**
 * Definition for the (aw-property-non-edit-val) directive.
 *
 * @example <aw-property-non-edit-val></aw-property-non-edit-val>
 *
 * @member aw-property-non-edit-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyNonEditVal', [
    'showObjectCommandHandler', '$timeout', '$sce', 'navigationTokenService',
    function( showObjectCommandHndlr, $timeout, $sce, navigationTokenSvc ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            $scope.openObjectLinkPage = function( $event ) {
                if( $event.target.tagName.toLowerCase() === 'a' && $event.target.href !== '' ) {
                    return;
                }
                var uiProperty = $scope.prop;
                var uid = '';

                // This is to prevent this event being lost in table if link is in a cell.
                $event.stopPropagation();

                // UI might be nicer if we didn't tease the link when editable, but could argue it is a nice reminder that
                // the text represents an object. Also, more efficient to 1-way bind the ng-show in aw-property-non-edit-val.directive.html.
                // so handling that here
                if( uiProperty.isEditable ) {
                    return;
                }

                if( uiProperty.isArray ) {
                    uid = uiProperty.dbValue[ $scope.index ];
                } else {
                    uid = uiProperty.dbValue;
                }

                if( uiProperty.whatAmI === 'propDC' ) {
                    /**
                     * FIXME: This is temp code in phase 0 to get r-o object links working... proper solution coming in
                     * p1.
                     */
                    window.location = '#com.siemens.splm.clientfx.tcui.xrt.showObject;uid=' + uid;
                } else if( uiProperty.propApi && uiProperty.propApi.openObjectLinkPage ) {
                    uiProperty.propApi.openObjectLinkPage( uiProperty.propertyName, uid );
                } else {
                    showObjectCommandHndlr.execute( {
                        propertyName: uiProperty.propertyName,
                        uid: uid
                    } );
                }
            };
            $scope.hasOldValue = function() {
                let oldValue = $scope?.prop?.oldValue;
                let oldValues = $scope?.prop?.oldValues;
                return oldValue && oldValue.length > 0 || oldValues && oldValues.length > 0;
            };
        }

        myController.$inject = [ '$scope' ];

        // add directive controller for prop update or pass in using &?
        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '<',
                index: '@',
                inTableCell: '@'
            },
            link: function( $scope, $element ) {
                if( !$scope.prop ) {
                    return;
                }

                if( $scope.prop && $scope.prop.isRichText ) {
                    var trustedHtml = '<ul>' + '<li>' + $scope.prop.uiValue + '</li>' + '</ul>';
                    $scope.trustedRichtext = $sce.trustAsHtml( trustedHtml );

                    $scope.showTooltip = false;
                    $scope.toggleTooltip = function( toggle ) {
                        if( toggle ) {
                            $timeout.cancel( $scope.timeoutPromise );
                            $scope.timeoutPromise = $timeout( function() {
                                $scope.showTooltip = true;
                            }, 750 );
                        } else {
                            $timeout.cancel( $scope.timeoutPromise );
                            $scope.timeoutPromise = $timeout( function() {
                                $scope.showTooltip = false;
                            }, 500 );
                        }
                    };
                }

                var viewModelProperty = $scope.prop;
                if( ( viewModelProperty.type === 'OBJECT' || viewModelProperty.type === 'OBJECTARRAY' ) &&
                    viewModelProperty.dbValue !== null && viewModelProperty.dbValue.length !== 0 ) {
                    var uidToBeEvaluated = null;
                    if( viewModelProperty.isArray ) {
                        uidToBeEvaluated = viewModelProperty.dbValue[ $scope.index ];
                    } else {
                        uidToBeEvaluated = viewModelProperty.dbValue;
                    }
                    navigationTokenSvc.getNavigationContent( $scope, uidToBeEvaluated ).then( function( urlDetails ) {
                        if( !_.isUndefined( urlDetails ) ) {
                            $scope.associatedURL = {
                                url: urlDetails.urlContent,
                                target: urlDetails.target
                            };
                        }
                    } );
                }

                $scope.$on( '$destroy', function() {
                    if( $scope.timeoutPromise ) {
                        $timeout.cancel( $scope.timeoutPromise );
                    }
                    $element.remove();
                    $element.empty();
                } );
            },
            controller: myController,
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-non-edit-val.directive.html'
        };
    }
] );
