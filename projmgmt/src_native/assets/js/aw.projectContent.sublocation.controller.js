// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines the {@link NgControllers.ProjectContentSubLocationCtrl}
 *
 * @module js/aw.projectContent.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/aw.base.sublocation.controller
 * @requires js/aw-sublocation.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw.base.sublocation.controller';
import 'js/aw-sublocation.directive';

'use strict';

/**
 * Project Content sublocation controller.
 *
 * @class ProjectContentSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'ProjectContentSubLocationCtrl', [ '$scope', '$controller', '$state', '$q', 'appCtxService',
    'soa_kernel_clientDataModel', 'soa_kernel_clientMetaModel',
    function( $scope, $controller, $state, $q, appCtxService, cdm, cmm ) {
        var ctrl = this;

        //DefaultSubLocationCtrl will handle setting up context correctly
        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * Do additional processing when updating search context
         *
         * @function addSearchContext
         * @memberOf NgControllers.ProjectContentSubLocationCtrl
         *
         * @param {Object} searchContext - The new search context
         */
        $scope.addSearchContext = function( searchContext ) {
            if( !searchContext.criteria || $state.params.uid ) {
                searchContext.criteria = {};
            }
            var criteria = '';
            if( $state.params.uid ) {
                var mo = cdm.getObject( $state.params.uid );
                if( mo ) {
                    var wsoType = cmm.getType( 'WorkspaceObject' );
                    var projList = wsoType.propertyDescriptorsMap.project_list;
                    var projId = mo.props.project_id.dbValues[0];

                    criteria = '"' + projList.displayName + '":"' + projId + '"';
                    $state.params.searchCriteria = criteria;
                    var ctx = appCtxService.getCtx( 'search' );
                    var selected = appCtxService.ctx.selected;
                    var mselected = appCtxService.ctx.mselected;
                    if( ctx && !selected && mselected.length === 0 ) {
                        ctx.searchString = criteria;
                        appCtxService.updateCtx( 'search', ctx );
                    }
                    var locationCtx = appCtxService.getCtx( 'location.titles' );
                    if( locationCtx ) {
                        locationCtx.headerTitle = projId;
                        appCtxService.updateCtx( 'location.titles', locationCtx );
                    }
                }

                searchContext.criteria.searchString = criteria;
            }

            return $q.when( searchContext );
        };
    }
] );
