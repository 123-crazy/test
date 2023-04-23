// Copyright (c) 2020 Siemens

/**
 * Container directive to add the contexts.
 *
 * @module js/aw-context-control.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/appCtxService';
import 'js/viewModelObjectService';
import 'js/contextContributionService';
import 'js/visible-when.directive';
import 'js/configurationService';

/**
 * Container  directive to add the contexts.
 *
 * @example <aw-context-control></aw-context-control> *
 *
 * @member aw-context-control
 * @memberof NgElementDirectives
 */
app.directive( 'awContextControl', [
    'appCtxService',
    'viewModelObjectService',
    'contextContributionService',
    'configurationService',
    function( appctxSvc, viewModelObjectSvc, contextSvc, cfgSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                anchor: '@'
            },

            templateUrl: app.getBaseUrlPath() + '/html/aw-context-control.directive.html',
            controller: [
                '$scope',
                function( $scope ) {
                    /*
                     * once the view model gets populated with the data , flag gets the value true
                     */

                    $scope.ctx = appctxSvc.ctx;

                    contextSvc.getVisiblePlacements().then( ( visiblePlacements ) => {
                        cfgSvc.getCfg( 'contextConfiguration' ).then( function( contextJson ) {
                            var allActivePlacements = [];
                            var sortedActiveList;

                            // get only active sortedlist
                            _.forEach( visiblePlacements, function( visiblePlacement ) {
                                var activeView = _.get( contextJson.contexts, visiblePlacement.contextId );
                                var headerContri = _.assign( visiblePlacement, activeView );
                                allActivePlacements.push( headerContri );
                            } );
                            var anchorFilteredList = _.filter( allActivePlacements, {
                                anchor: $scope.anchor
                            } );
                            sortedActiveList = _.sortBy( anchorFilteredList, 'priority' );
                            $scope.$parent.contributedViews = _.map( sortedActiveList, 'view' );
                        } );
                    } );

                    if( $scope.ctx.user && $scope.ctx.tcSessionData ) {
                        var userVMO = viewModelObjectSvc.createViewModelObject( $scope.ctx.user );
                        if( userVMO ) {
                            $scope.ctx.user = userVMO;
                        }
                    }

                    if( $scope.ctx.userSession && $scope.ctx.userSession.uid ) {
                        $scope.ctx.userSession = viewModelObjectSvc.createViewModelObject(
                            $scope.ctx.userSession.uid, 'Edit' );
                    }

                    $scope.$on( '$destroy', function() {
                        appctxSvc.unRegisterCtx( 'isNoProject' );
                        appctxSvc.unRegisterCtx( 'isCodeLovSet' );
                    } );
                }
            ]

        };
    }
] );
