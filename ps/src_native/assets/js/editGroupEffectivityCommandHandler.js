// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the command handler for "Edit Group Effectivity" cell command
 *
 * @module js/editGroupEffectivityCommandHandler
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';

var exports = {};

export let getDateRangeEditContext = function( selectedCell ) {
    let inputDates = selectedCell.cellHeader2.split( '(' )[0].split( 'to' );
    return {
        nameBox: selectedCell.cellHeader1,
        startDateTime: new Date( inputDates[0] ).getTime(),
        endDateTime:  inputDates[1].includes( 'UP' ) || inputDates[1].includes( 'SO' )  ?
                    '' : new Date( inputDates[1] ).getTime(),
        endDateOption: inputDates[1].trim(),
        effectivity: selectedCell.props.Fnd0EffectivityList.dbValues[0],
        groupRevision: selectedCell.uid
    };
};

/**
 * Execute the command.
 */
export let execute = function( vmo, title ) {
    let editContext = { selectedCell: vmo };
    var context = {
        title: title,
        recreatePanel: true,
        supportGoBack: true
    };

    let isDateRangeEffectivity = vmo.cellHeader2.split( '(' )[0].includes( 'to' );
    if( isDateRangeEffectivity ) {
        context.destPanelId = 'EditDateRangeGroupEffectivity';
        editContext = { ...editContext, ...getDateRangeEditContext( vmo ) };
    }else{
        context.destPanelId = 'EditGroupEffectivity';
    }
    appCtxSvc.updatePartialCtx( 'editEffectivityContext', editContext );
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * "Edit Group Effectivity" cell command handler factory
 *
 * @member editGroupEffectivityCommandHandler
 */

export default exports = {
    execute
};
app.factory( 'editGroupEffectivityCommandHandler', () => exports );

/**
 */
