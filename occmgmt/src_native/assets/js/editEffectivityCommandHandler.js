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
 * This is the command handler for "Edit Effectivity" cell command
 *
 * @module js/editEffectivityCommandHandler
 */
import app from 'app';
import eventBus from 'js/eventBus';
import viewModelService from 'js/viewModelService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};


var getViewModel = function( scope, setInScope ) {
    return viewModelService.getViewModel( scope, true );
};

var setEndItem = function( uid, object_string ) {
    var item = cdm.getObject( uid);

    appCtxSvc.ctx.elementEffectivity = appCtxSvc.ctx.elementEffectivity || {};
    appCtxSvc.ctx.elementEffectivity.author = appCtxSvc.ctx.elementEffectivity.author || {};
    appCtxSvc.ctx.elementEffectivity.author.endItem = appCtxSvc.ctx.elementEffectivity.author.endItem || {};

    appCtxSvc.ctx.editEffectivityContext = appCtxSvc.ctx.editEffectivityContext || {};
    appCtxSvc.ctx.editEffectivityContext.edit = appCtxSvc.ctx.editEffectivityContext.edit || {};
    appCtxSvc.ctx.editEffectivityContext.edit.endItem = appCtxSvc.ctx.editEffectivityContext.edit.endItem || {};

    appCtxSvc.ctx.elementEffectivity.author.endItem.type = item.type;
    appCtxSvc.ctx.elementEffectivity.author.endItem.uid = item.uid;
    appCtxSvc.ctx.editEffectivityContext.edit.endItem.type = item.type;
    appCtxSvc.ctx.editEffectivityContext.edit.endItem.uid = item.uid;

    appCtxSvc.ctx.elementEffectivity.author.endItem.dbValue = object_string;
    appCtxSvc.ctx.editEffectivityContext.edit.endItem.dbValue = object_string;
    
};

var populateEditEffectivityProperties = function(uid){
    var effProps = appCtxSvc.ctx.editEffectivityContext.responseObjects[uid].props;    
    var props = {};
    appCtxSvc.ctx.editEffectivityContext = appCtxSvc.ctx.editEffectivityContext || {};
    appCtxSvc.ctx.editEffectivityContext.props = props;

    props.nameBox = effProps.effectivity_id.dbValues[ 0 ]? effProps.effectivity_id.dbValues[ 0 ]:'';
    props.isShared = effProps.effectivity_id.dbValues[ 0 ] ? true : false;    
    props.isProtected = effProps.effectivity_protection.dbValues[ 0 ] === '1';
    
    if(effProps.effectivity_dates.dbValues[ 0 ]){
        props.dateOrUnitEffectivityTypeRadioButton = true;
        props.startDate = new Date( effProps.effectivity_dates.dbValues[ 0 ] ).getTime();
        props.endDate = effProps.effectivity_dates.dbValues[ 1 ]  ? new Date( effProps.effectivity_dates.dbValues[ 1 ] ).getTime(): '';
        props.endDateOption = effProps.effectivity_dates.dbValues[ 1 ] ? 'Date' : (effProps.range_text.dbValues[ 0 ].indexOf( 'UP' ) > -1 ? 'UP' : 'SO');
    }else{
        props.dateOrUnitEffectivityTypeRadioButton = false;
        //props.openEndedStatus=0;
        props.unitRangeText = effProps.range_text.dbValues[ 0 ];
    }

    var itemOrRevProp = effProps.end_item_rev.dbValues[ 0 ] ? effProps.end_item_rev : effProps.end_item;
    if(itemOrRevProp.dbValues[0]){
        props.endItemVal = itemOrRevProp.uiValues[ 0 ];
        setEndItem(itemOrRevProp.dbValues[0], itemOrRevProp.uiValues[ 0 ]);
    } 
};

/**
 * Execute the command.
 */
export let execute = function( vmo, $scope ) {

    var declViewModel = getViewModel( $scope, true );
    declViewModel.selectedCell = vmo;

    var context = {
        destPanelId: 'EditEffectivities',
        title: declViewModel.i18n.edit,
        recreatePanel: true,
        supportGoBack: true
    };

    populateEditEffectivityProperties(vmo.uid);
    eventBus.publish( 'awPanel.navigate', context );  
};

/**
 * "Edit Effectivity" cell command handler factory
 *
 * @member editEffectivityCommandHandler
 */
export default exports = {
    execute
};
app.factory( 'editEffectivityCommandHandler', () => exports );

/**
 */
