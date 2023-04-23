// Copyright (c) 2020 Siemens

/**
 * Service to load the allcontextsViewModel.json file from the consumption
 *
 * @module js/contextContributionService
 */
import app from 'app';
import conditionService from 'js/conditionService';
import _ from 'lodash';
import workspaceValidationService from 'js/workspaceValidationService';
import appCtxService from 'js/appCtxService';
import workspaceService from 'js/workspaceService';
import configurationService from 'js/configurationService';
import contextService from 'js/contextContributionService';

import 'js/aw-context-control.directive';

var exports = {};

/**
 * Find all  placement for the given context.
 *
 * @param {Object} allContexts - container to store the placements against context
 * @param {Object} placements - all placement
 * @param {Object} contextId - context view ID
 * @param {Object} $scope - Scope to execute the command with
 *
 * @return {Object} most appropriate active placement for context.
 */
export let getAllPlacements = function( allContexts, placements, contextId, $scope ) {
    var dataOnCategoryType = _.filter( placements, {
        contextId: contextId
    } );

    // only single contribution

    if( dataOnCategoryType && dataOnCategoryType.length === 1 ) {
        return dataOnCategoryType[ 0 ];
    }

    // the active placement

    if( allContexts && allContexts.length > 0 ) {
        var activePlacement = _.filter( allContexts, {
            contextId: contextId
        } );

        if( activePlacement ) {
            return activePlacement;
        }
    } else {
        var placement = exports.findActivePlacement( dataOnCategoryType, $scope );

        allContexts[ contextId ] = placement;

        return placement;
    }
};

/**
 * Check the visibility of the active placement
 *
 * @param {Object} placement placement for the view
 * @param {Object} $scope - Scope to execute the command with
 *
 * @return {Object} most visibililty of placement.
 */
export let isPlacementVisible = function( placement, $scope ) {
    var isValidCondition = true;

    if( placement.hasOwnProperty( 'visibleWhen' ) ) {
        // Re-evaluate the visible when - condition change may have come from a different command bar
        if( placement.visibleWhen.condition ) {
            var conditionExpression = _.get( placement, 'visibleWhen.condition' );

            isValidCondition = conditionService.evaluateCondition( $scope, conditionExpression );
        } else {
            isValidCondition = _.get( placement, 'visibleWhen' );
        }
    }

    return isValidCondition;
};

/**
 * Find active placement for the given context..
 *
 * @param {Object} allPlacements - all placements for the view
 * @param {Object} $scope - Scope to execute the command with
 *
 * @return {Object} most appropriate active placement.
 */
export let findActivePlacement = function( allPlacements, $scope ) {
    var mostAppropriateActionHandler = null;
    var mostAppropriateConditionLength = -1;

    _.forEach( allPlacements, function( placement ) {
        var conditions = _.get( placement, 'activeWhen.condition' );
        if( conditions ) {
            var isValidCondition = conditionService.evaluateCondition( $scope, conditions );
            var expressionLength = conditions.length;
            if( _.isObject( conditions ) ) {
                expressionLength = JSON.stringify( conditions ).length;
            }
            if( isValidCondition &&
                expressionLength > mostAppropriateConditionLength ) {
                mostAppropriateConditionLength = expressionLength;
                mostAppropriateActionHandler = placement;
            }
        } else {
            mostAppropriateActionHandler = placement;
        }
    } );
    return mostAppropriateActionHandler;
};

/**
 * Gets all of the currently visible placements.
 *
 * @return {Promise<Array>} Array of currently visible placemenst
 */
export const getVisiblePlacements = async function() {
    const visiblePlacements = [];
    if( !appCtxService.ctx.workspace || !appCtxService.ctx.workspace.workspaceId ) {
        await workspaceValidationService.setWorkspaceId();
    }

    const workspaceId = appCtxService.ctx.workspace.workspaceId;
    const workspaceContexts = await workspaceService.getAvailableContexts( workspaceId );

    const contextJson = await configurationService.getCfg( 'contextConfiguration' );
    if( contextJson.contexts ) {
        let filterContextList;
        var availContexts = Object.keys( contextJson.contexts );
        var allowedContexts = _.intersection( availContexts, workspaceContexts );

        if( allowedContexts && allowedContexts.length > 0 ) {
            filterContextList = allowedContexts;
        } else {
            filterContextList = availContexts;
        }

        // get only active sortedlist
        _.forEach( filterContextList, function( contextId ) {
            const AllContexts = {};
            var activePlacement = contextService.getAllPlacements( AllContexts, contextJson.placements, contextId, { ctx: appCtxService.ctx } );
            var isActivePlacementVisible = contextService.isPlacementVisible( activePlacement, { ctx: appCtxService.ctx } );
            if( isActivePlacementVisible ) {
                visiblePlacements.push( activePlacement );
            }
        } );
    }
    return visiblePlacements;
};

exports = {
    getAllPlacements,
    isPlacementVisible,
    findActivePlacement,
    getVisiblePlacements
};
export default exports;
/**
 * @memberof NgServices
 * @member contextContributionService
 *
 * @param {viewModelService} viewModelSvc - Service to use.
 * @param {configurationService} cfgSvc - Service to use.
 * @param {conditionService} conditionService - Service to use.
 *
 * @returns {contextContributionService} Reference to service API object.
 */
app.factory( 'contextContributionService', () => exports );
