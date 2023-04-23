// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.subLocationService} which provides access to the SubLocationService from native code
 *
 * @module js/postLoginPipeline.service
 * @requires app
 */
import app from 'app';
import _ from 'lodash';
import localStrg from 'js/localStorage';
import 'js/contribution.service';

var exports = {};

/**
 * get the Post Login Stages from server
 *
 * @return all the Post Login Stages
 */
export let getPostLoginStages = function() {
    var postLoginStages = [];
    var postLoginStagesString = localStrg.get( 'postLoginStagesKey' );

    if( postLoginStagesString && postLoginStagesString.length > 0 ) {
        postLoginStages = JSON.parse( postLoginStagesString );
    }

    return postLoginStages;
};

/**
 *
 * Reset Post Login Stages while signing in
 *
 */
export let resetPostLoginStages = function() {
    var postLoginStagesString = localStrg.get( 'postLoginStagesKey' );
    if( postLoginStagesString && postLoginStagesString.length > 0 ) {
        localStrg.removeItem( 'postLoginStagesKey' );
    }
};

/**
 * sorts the post login stages
 *
 * @param {list} get the list of step Definition from each contribution
 *
 * @return sorted pipeline steps
 */
export let sortPostLoginPipeline = function( contributors ) {
    var postLoginStages = exports.getPostLoginStages();
    var pipeLineStepsUnsorted = [];

    _.forEach( contributors, function( contrib ) {
        var step = contrib.getPipelineStepDefinition();
        for( var stageIndex = 0; stageIndex < postLoginStages.length; stageIndex++ ) {
            if( step.name === postLoginStages[ stageIndex ].name ) {
                step.priority = stageIndex;
                step.status = postLoginStages[ stageIndex ].status;
                pipeLineStepsUnsorted.push( step );
                break;
            }
        }
    } );

    var pipeLineSteps = [];
    if( pipeLineStepsUnsorted.length > 0 ) {
        pipeLineSteps = _.sortBy( pipeLineStepsUnsorted, function( step ) {
            return step.priority;
        } );
    }

    return pipeLineSteps;
};

/**
 * Check for Post Login Authenticated Stages
 *
 * @return {Object} with a boolean flag if all post login stages are authenticated
 */
export let checkPostLoginAuthenticatedStages = function() {
    var allStagesAuthenticated = true;
    var postLoginStageString = localStrg.get( 'postLoginStagesKey' );

    if( postLoginStageString && postLoginStageString.length > 0 ) {
        var postLoginStages = JSON.parse( postLoginStageString );

        for( var stageIndex = 0; stageIndex < postLoginStages.length; stageIndex++ ) {
            if( !postLoginStages[ stageIndex ].status ) {
                allStagesAuthenticated = false;
                break;
            }
        }
    }
    return allStagesAuthenticated;
};

exports = {
    getPostLoginStages,
    resetPostLoginStages,
    sortPostLoginPipeline,
    checkPostLoginAuthenticatedStages
};
export default exports;
/**
 * Provides access to the postLoginPipelineservices from native code
 *
 * @class postLoginPipelineservice
 * @memberOf NgServices
 */
app.factory( 'postLoginPipelineservice', () => exports );
